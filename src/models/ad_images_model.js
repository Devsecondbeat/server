import { getPool } from '../config/database.js';
import logger from '../config/logger.js';

const MAX_IMAGES_PER_AD = 5;

/**
 * Insert multiple images for an ad
 * @param {number} adId - The ad ID
 * @param {string[]} imageIds - Array of Cloudflare image IDs
 * @returns {Promise<Array>} Inserted image records
 */
const insertAdImages = async (adId, imageIds) => {
  if (!imageIds || imageIds.length === 0) {
    return [];
  }

  try {
    const pool = getPool();

    // Build bulk insert query
    const values = imageIds.map((imageId, index) => `($1, $${index + 2}, ${index})`).join(', ');
    const params = [adId, ...imageIds];

    const query = `
      INSERT INTO ad_images (ad_id, cloudflare_image_id, display_order)
      VALUES ${values}
      RETURNING *
    `;

    const result = await pool.query(query, params);
    logger.info('Ad images inserted successfully', { adId, count: result.rows.length });
    return result.rows;
  } catch (error) {
    logger.error('Error inserting ad images', { error: error.message, stack: error.stack, adId, imageIds });
    throw error;
  }
};

/**
 * Get all images for an ad
 * @param {number} adId - The ad ID
 * @returns {Promise<Array>} Array of image records
 */
const getAdImages = async (adId) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM ad_images WHERE ad_id = $1 ORDER BY display_order ASC',
      [adId],
    );
    return result.rows;
  } catch (error) {
    logger.error('Error fetching ad images', { error: error.message, stack: error.stack, adId });
    throw error;
  }
};

/**
 * Get image count for an ad
 * @param {number} adId - The ad ID
 * @returns {Promise<number>} Number of images
 */
const getAdImageCount = async (adId) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM ad_images WHERE ad_id = $1',
      [adId],
    );
    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    logger.error('Error counting ad images', { error: error.message, stack: error.stack, adId });
    throw error;
  }
};

/**
 * Delete a single image from an ad
 * @param {number} adId - The ad ID
 * @param {string} cloudflareImageId - The Cloudflare image ID
 * @returns {Promise<Object|null>} Deleted image record or null
 */
const deleteAdImage = async (adId, cloudflareImageId) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      'DELETE FROM ad_images WHERE ad_id = $1 AND cloudflare_image_id = $2 RETURNING *',
      [adId, cloudflareImageId],
    );
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error deleting ad image', { error: error.message, stack: error.stack, adId, cloudflareImageId });
    throw error;
  }
};

/**
 * Delete all images for an ad
 * @param {number} adId - The ad ID
 * @returns {Promise<Array>} Deleted image records
 */
const deleteAllAdImages = async (adId) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      'DELETE FROM ad_images WHERE ad_id = $1 RETURNING *',
      [adId],
    );
    logger.info('All ad images deleted', { adId, count: result.rows.length });
    return result.rows;
  } catch (error) {
    logger.error('Error deleting all ad images', { error: error.message, stack: error.stack, adId });
    throw error;
  }
};

/**
 * Update images for an ad (replace existing with new set)
 * @param {number} adId - The ad ID
 * @param {string[]} imageIds - New array of Cloudflare image IDs
 * @returns {Promise<{removed: Array, added: Array}>} Removed and added image records
 */
const updateAdImages = async (adId, imageIds) => {
  try {
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get existing images
      const existingResult = await client.query(
        'SELECT cloudflare_image_id FROM ad_images WHERE ad_id = $1',
        [adId],
      );
      const existingIds = existingResult.rows.map((r) => r.cloudflare_image_id);

      // Determine what to add and remove
      const toRemove = existingIds.filter((id) => !imageIds.includes(id));
      const toAdd = imageIds.filter((id) => !existingIds.includes(id));

      // Remove images no longer in the list
      let removed = [];
      if (toRemove.length > 0) {
        const removeResult = await client.query(
          'DELETE FROM ad_images WHERE ad_id = $1 AND cloudflare_image_id = ANY($2) RETURNING *',
          [adId, toRemove],
        );
        removed = removeResult.rows;
      }

      // Add new images
      let added = [];
      if (toAdd.length > 0) {
        // Get the current max display_order
        const maxOrderResult = await client.query(
          'SELECT COALESCE(MAX(display_order), -1) as max_order FROM ad_images WHERE ad_id = $1',
          [adId],
        );
        let nextOrder = maxOrderResult.rows[0].max_order + 1;

        const addValues = toAdd.map((imageId, index) => `($1, $${index + 2}, ${nextOrder + index})`).join(', ');
        const addParams = [adId, ...toAdd];

        const addResult = await client.query(
          `INSERT INTO ad_images (ad_id, cloudflare_image_id, display_order) VALUES ${addValues} RETURNING *`,
          addParams,
        );
        added = addResult.rows;
      }

      await client.query('COMMIT');

      logger.info('Ad images updated', { adId, removed: removed.length, added: added.length });
      return { removed, added };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error updating ad images', { error: error.message, stack: error.stack, adId, imageIds });
    throw error;
  }
};

/**
 * Check if adding new images would exceed the limit
 * @param {number} adId - The ad ID
 * @param {number} newImageCount - Number of new images to add
 * @returns {Promise<{allowed: boolean, current: number, max: number}>}
 */
const canAddImages = async (adId, newImageCount) => {
  const currentCount = await getAdImageCount(adId);
  return {
    allowed: currentCount + newImageCount <= MAX_IMAGES_PER_AD,
    current: currentCount,
    max: MAX_IMAGES_PER_AD,
  };
};

/**
 * Get ad with owner info to check authorization
 * @param {number} adId - The ad ID
 * @returns {Promise<{id: number, user_id: number}|null>}
 */
const getAdOwner = async (adId) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, user_id FROM used_instrument_ads WHERE id = $1',
      [adId],
    );
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error fetching ad owner', { error: error.message, stack: error.stack, adId });
    throw error;
  }
};

export {
  MAX_IMAGES_PER_AD,
  insertAdImages,
  getAdImages,
  getAdImageCount,
  deleteAdImage,
  deleteAllAdImages,
  updateAdImages,
  canAddImages,
  getAdOwner,
};

