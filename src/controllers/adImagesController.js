import { getDirectUploadUrls, deleteImage, buildDeliveryUrl } from '../services/cloudflareImages.js';
import {
  MAX_IMAGES_PER_AD,
  getAdImages,
  deleteAdImage,
  canAddImages,
  getAdOwner,
} from '../models/marketplace_model.js';
import logger from '../config/logger.js';
import AppError from '../Utils/AppError.js';

export const getUploadUrls = async (req, res, next) => {
  try {
    const { count } = req.body;

    if (!count || typeof count !== 'number' || count < 1 || count > MAX_IMAGES_PER_AD) {
      throw new AppError(`Count must be a number between 1 and ${MAX_IMAGES_PER_AD}`, {
        status: 400,
        code: 'VALIDATION_ERROR',
      });
    }

    const uploadData = await getDirectUploadUrls(count);

    logger.info('Upload URLs generated', { count });
    return res.status(200).json({ uploadUrls: uploadData });
  } catch (error) {
    return next(error);
  }
};

export const getImagesForAd = async (req, res, next) => {
  try {
    const adId = parseInt(req.params.adId, 10);
    if (Number.isNaN(adId)) {
      throw new AppError('Invalid ad ID', { status: 400, code: 'INVALID_AD_ID' });
    }

    const images = await getAdImages(adId);
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
    return next(error);
  }
};

export const removeAdImage = async (req, res, next) => {
  try {
    const adId = parseInt(req.params.adId, 10);
    const { imageId } = req.params;

    if (Number.isNaN(adId)) {
      throw new AppError('Invalid ad ID', { status: 400, code: 'INVALID_AD_ID' });
    }

    if (!imageId) {
      throw new AppError('Invalid image ID', { status: 400, code: 'INVALID_IMAGE_ID' });
    }

    const ad = await getAdOwner(adId);
    if (!ad) {
      throw new AppError('Ad not found', { status: 404, code: 'AD_NOT_FOUND' });
    }

    if (ad.user_id !== req.user.sub) {
      throw new AppError('Unauthorized to delete this image', { status: 403, code: 'FORBIDDEN' });
    }

    const deleted = await deleteAdImage(adId, imageId);
    if (!deleted) {
      throw new AppError('Image not found for this ad', { status: 404, code: 'IMAGE_NOT_FOUND' });
    }

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
    return next(error);
  }
};

export const checkCanAddImages = async (req, res, next) => {
  try {
    const adId = parseInt(req.params.adId, 10);
    const count = parseInt(req.query.count, 10) || 1;

    if (Number.isNaN(adId)) {
      throw new AppError('Invalid ad ID', { status: 400, code: 'INVALID_AD_ID' });
    }

    const result = await canAddImages(adId, count);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};
