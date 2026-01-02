import { getDirectUploadUrls, deleteImage, buildDeliveryUrl } from '../services/cloudflareImages.js';
import {
  MAX_IMAGES_PER_AD,
  getAdImages,
  deleteAdImage,
  canAddImages,
  getAdOwner,
} from '../models/ad_images_model.js';
import logger from '../config/logger.js';

/**
 * Get signed upload URLs from Cloudflare
 * POST /instruments/images/upload-urls
 * Body: { count: 1-5 }
 */
export const getUploadUrls = async (req, res, next) => {
  try {
    const { count } = req.body;

    // Validate count
    if (!count || typeof count !== 'number' || count < 1 || count > MAX_IMAGES_PER_AD) {
      return res.status(400).json({
        error: `Count must be a number between 1 and ${MAX_IMAGES_PER_AD}`,
      });
    }

    const uploadData = await getDirectUploadUrls(count);

    logger.info('Upload URLs generated', { count });
    return res.status(200).json({
      uploadUrls: uploadData,
    });
  } catch (error) {
    if (error.message.includes('Cloudflare')) {
      logger.error('Cloudflare service error', { error: error.message });
      return res.status(502).json({ error: 'Image service unavailable' });
    }
    next(error);
  }
};

/**
 * Get all images for a specific ad
 * GET /instruments/ads/:adId/images
 */
export const getImagesForAd = async (req, res, next) => {
  try {
    const adId = parseInt(req.params.adId, 10);
    if (Number.isNaN(adId)) {
      return res.status(400).json({ error: 'Invalid ad ID' });
    }

    const images = await getAdImages(adId);

    // Build delivery URLs for each image
    const imagesWithUrls = images.map((img) => ({
      ...img,
      urls: {
        thumbnail: buildDeliveryUrl(img.cloudflare_image_id, 'thumbnail'),
        card: buildDeliveryUrl(img.cloudflare_image_id, 'card'),
        full: buildDeliveryUrl(img.cloudflare_image_id, 'full'),
      },
    }));

    return res.status(200).json(imagesWithUrls);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a single image from an ad
 * DELETE /instruments/ads/:adId/images/:imageId
 */
export const removeAdImage = async (req, res, next) => {
  try {
    const adId = parseInt(req.params.adId, 10);
    const { imageId } = req.params;

    if (Number.isNaN(adId)) {
      return res.status(400).json({ error: 'Invalid ad ID' });
    }

    if (!imageId) {
      return res.status(400).json({ error: 'Invalid image ID' });
    }

    // Check if ad exists and get owner
    const ad = await getAdOwner(adId);
    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    // TODO: Add auth check here when user ID is available in request
    // if (req.userId !== ad.user_id) {
    //   return res.status(403).json({ error: 'Unauthorized' });
    // }

    // Delete from database
    const deleted = await deleteAdImage(adId, imageId);
    if (!deleted) {
      return res.status(404).json({ error: 'Image not found for this ad' });
    }

    // Delete from Cloudflare (best effort, don't fail if this fails)
    try {
      await deleteImage(imageId);
    } catch (cfError) {
      logger.warn('Failed to delete image from Cloudflare', { imageId, error: cfError.message });
    }

    logger.info('Ad image removed', { adId, imageId });
    return res.status(200).json({
      message: 'Image removed successfully',
      data: deleted,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check if more images can be added to an ad
 * GET /instruments/ads/:adId/images/can-add
 * Query: ?count=N
 */
export const checkCanAddImages = async (req, res, next) => {
  try {
    const adId = parseInt(req.params.adId, 10);
    const count = parseInt(req.query.count, 10) || 1;

    if (Number.isNaN(adId)) {
      return res.status(400).json({ error: 'Invalid ad ID' });
    }

    const result = await canAddImages(adId, count);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

