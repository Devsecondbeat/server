import logger from '../config/logger.js';

const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4';

const getFetchTimeoutMs = () => parseInt(process.env.CLOUDFLARE_FETCH_TIMEOUT_MS || '5000', 10);
const getValidationConcurrency = () => parseInt(
  process.env.CLOUDFLARE_VALIDATION_CONCURRENCY || '5',
  10,
);

/**
 * fetch wrapper that aborts after a bounded timeout so a slow/hung Cloudflare
 * response can never tie up callers (or the DB pool) indefinitely.
 */
const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), getFetchTimeoutMs());
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Run an async worker over items with a bounded concurrency, preserving order.
 * Caps the number of simultaneous outbound Cloudflare calls per request.
 */
const mapWithConcurrency = async (items, limit, worker) => {
  const results = new Array(items.length);
  let cursor = 0;

  /* eslint-disable no-await-in-loop -- a pool worker must process its items sequentially */
  const runNext = async () => {
    while (cursor < items.length) {
      const current = cursor;
      cursor += 1;
      results[current] = await worker(items[current], current);
    }
  };
  /* eslint-enable no-await-in-loop */

  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => runNext()));
  return results;
};

/**
 * Get Cloudflare Images configuration from environment variables
 */
const getCloudflareConfig = () => {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const imagesHash = process.env.CLOUDFLARE_IMAGES_HASH;

  if (!accountId || !apiToken) {
    throw new Error(
      'Cloudflare Images configuration missing. '
      + 'Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN environment variables.',
    );
  }

  return { accountId, apiToken, imagesHash };
};

/**
 * Request a direct upload URL from Cloudflare Images
 * @returns {Promise<{uploadURL: string, id: string}>} Upload URL and image ID
 */
const getDirectUploadUrl = async () => {
  try {
    const { accountId, apiToken } = getCloudflareConfig();

    // Cloudflare requires multipart/form-data for direct upload requests
    const formData = new FormData();
    formData.append('requireSignedURLs', 'false');

    const response = await fetchWithTimeout(
      `${CLOUDFLARE_API_BASE}/accounts/${accountId}/images/v2/direct_upload`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
        body: formData,
      },
    );

    const data = await response.json();

    if (!data.success) {
      logger.error('Cloudflare direct upload URL request failed', { errors: data.errors });
      throw new Error(data.errors?.[0]?.message || 'Failed to get upload URL from Cloudflare');
    }

    return {
      uploadURL: data.result.uploadURL,
      id: data.result.id,
    };
  } catch (error) {
    logger.error('Error getting Cloudflare direct upload URL', { error: error.message, stack: error.stack });
    throw error;
  }
};

/**
 * Request multiple direct upload URLs from Cloudflare Images
 * @param {number} count - Number of upload URLs to request (1-5)
 * @returns {Promise<Array<{uploadURL: string, id: string}>>} Array of upload URLs and image IDs
 */
const getDirectUploadUrls = async (count) => {
  if (count < 1 || count > 5) {
    throw new Error('Count must be between 1 and 5');
  }

  try {
    const uploadPromises = Array.from({ length: count }, () => getDirectUploadUrl());
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    logger.error('Error getting multiple Cloudflare direct upload URLs', { error: error.message, count });
    throw error;
  }
};

/**
 * Delete an image from Cloudflare Images
 * @param {string} imageId - The Cloudflare image ID to delete
 * @returns {Promise<boolean>} True if deletion was successful
 */
const deleteImage = async (imageId) => {
  try {
    const { accountId, apiToken } = getCloudflareConfig();

    const response = await fetchWithTimeout(
      `${CLOUDFLARE_API_BASE}/accounts/${accountId}/images/v1/${imageId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      },
    );

    const data = await response.json();

    if (!data.success) {
      logger.error('Cloudflare image deletion failed', { imageId, errors: data.errors });
      return false;
    }

    logger.info('Cloudflare image deleted successfully', { imageId });
    return true;
  } catch (error) {
    logger.error('Error deleting Cloudflare image', { error: error.message, imageId });
    throw error;
  }
};

/**
 * Delete multiple images from Cloudflare Images
 * @param {string[]} imageIds - Array of Cloudflare image IDs to delete
 * @returns {Promise<{success: string[], failed: string[]}>} Results of deletion attempts
 */
const deleteImages = async (imageIds) => {
  const results = { success: [], failed: [] };

  const deletePromises = imageIds.map(async (imageId) => {
    try {
      const success = await deleteImage(imageId);
      if (success) {
        results.success.push(imageId);
      } else {
        results.failed.push(imageId);
      }
    } catch {
      results.failed.push(imageId);
    }
  });

  await Promise.all(deletePromises);
  return results;
};

/**
 * Build a Cloudflare Images delivery URL
 * @param {string} imageId - The Cloudflare image ID
 * @param {string} variant - The variant name (thumbnail, card, full, public)
 * @returns {string} The delivery URL
 */
const buildDeliveryUrl = (imageId, variant = 'public') => {
  const { imagesHash } = getCloudflareConfig();
  return `https://imagedelivery.net/${imagesHash}/${imageId}/${variant}`;
};

/**
 * Check if a Cloudflare image exists
 * @param {string} imageId - The Cloudflare image ID to check
 * @returns {Promise<boolean>} True if the image exists
 */
const imageExists = async (imageId) => {
  try {
    const { accountId, apiToken } = getCloudflareConfig();

    const response = await fetchWithTimeout(
      `${CLOUDFLARE_API_BASE}/accounts/${accountId}/images/v1/${imageId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      },
    );

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    logger.error('Error checking if Cloudflare image exists', { error: error.message, imageId });
    return false;
  }
};

/**
 * Validate that all provided image IDs exist in Cloudflare
 * @param {string[]} imageIds - Array of image IDs to validate
 * @returns {Promise<{valid: boolean, invalidIds: string[]}>} Validation result
 */
const validateImageIds = async (imageIds) => {
  if (!imageIds || imageIds.length === 0) {
    return { valid: true, invalidIds: [] };
  }

  const results = await mapWithConcurrency(
    imageIds,
    getValidationConcurrency(),
    async (id) => ({ id, exists: await imageExists(id) }),
  );
  const invalidIds = results.filter((r) => !r.exists).map((r) => r.id);

  return {
    valid: invalidIds.length === 0,
    invalidIds,
  };
};

export {
  getDirectUploadUrl,
  getDirectUploadUrls,
  deleteImage,
  deleteImages,
  buildDeliveryUrl,
  imageExists,
  validateImageIds,
};
