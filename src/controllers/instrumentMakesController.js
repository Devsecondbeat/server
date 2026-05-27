import {
  getInstrumentMakes,
  createInstrumentAds,
  getInstrumentAds,
  getInstrumentAdsbyUser,
  updateInstrumentAds,
  deleteInstrumentAds,
  getAdOwner,
  instrumentMakeExists,
} from '../models/marketplace_model.js';
import logger from '../config/logger.js';
import AppError from '../Utils/AppError.js';
import { validateCreateAdBody, validateUpdateAdBody } from '../validators/adValidator.js';

const throwValidationErrors = (errors) => {
  throw new AppError(errors[0], {
    status: 400,
    code: 'VALIDATION_ERROR',
    details: { errors },
  });
};

export const getinstrumentMakes = async (req, res, next) => {
  try {
    const instrumentMakes = await getInstrumentMakes();
    return res.status(200).json(instrumentMakes);
  } catch (error) {
    logger.error('Error getting instrument makes', { error: error.message });
    return next(error);
  }
};

export const createinstrumentAds = async (req, res, next) => {
  try {
    const validationErrors = validateCreateAdBody(req.body);
    if (validationErrors.length > 0) {
      throwValidationErrors(validationErrors);
    }

    const makeId = Number(req.body.make_id);
    const makeExists = await instrumentMakeExists(makeId);
    if (!makeExists) {
      throw new AppError('make_id not found', { status: 400, code: 'MAKE_NOT_FOUND' });
    }

    const adData = {
      ...req.body,
      make_id: makeId,
      price: Number(req.body.price),
      user_id: req.user.sub,
    };
    const createdAd = await createInstrumentAds(adData);
    return res.status(201).json({
      message: `Ad added with ID: ${createdAd.id}`,
      data: createdAd,
    });
  } catch (error) {
    logger.error('Error creating instrument ad', { error: error.message });
    return next(error);
  }
};

export const getinstrumentAds = async (req, res, next) => {
  try {
    const { type, make_id: makeId, condition } = req.query;
    const instrumentAds = await getInstrumentAds({
      type,
      make_id: makeId,
      condition,
    });
    return res.status(200).json(instrumentAds);
  } catch (error) {
    logger.error('Error getting instrument ads', { error: error.message });
    return next(error);
  }
};

export const getinstrumentAdsbyUser = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      throw new AppError('Invalid user ID format', { status: 400, code: 'INVALID_USER_ID' });
    }
    const instrumentAdsbyUser = await getInstrumentAdsbyUser(userId);
    return res.status(200).json(instrumentAdsbyUser);
  } catch (error) {
    return next(error);
  }
};

export const updateinstrumentAds = async (req, res, next) => {
  try {
    const adId = parseInt(req.params.id, 10);
    if (Number.isNaN(adId)) {
      throw new AppError('Invalid ad ID', { status: 400, code: 'INVALID_AD_ID' });
    }

    const validationErrors = validateUpdateAdBody(req.body);
    if (validationErrors.length > 0) {
      throwValidationErrors(validationErrors);
    }

    const ad = await getAdOwner(adId);
    if (!ad) {
      throw new AppError('Ad not found', { status: 404, code: 'AD_NOT_FOUND' });
    }
    if (ad.user_id !== req.user.sub) {
      throw new AppError('Unauthorized to update this ad', { status: 403, code: 'FORBIDDEN' });
    }

    const updateData = {
      ...req.body,
      ...(req.body.price !== undefined ? { price: Number(req.body.price) } : {}),
    };
    const updatedAd = await updateInstrumentAds(adId, updateData);
    return res.status(200).json({
      message: `Ad modified with ID: ${adId}`,
      data: updatedAd,
    });
  } catch (error) {
    logger.error('Error updating instrument ad', { error: error.message });
    return next(error);
  }
};

export const deleteinstrumentAds = async (req, res, next) => {
  try {
    const adId = parseInt(req.params.id, 10);
    if (Number.isNaN(adId)) {
      throw new AppError('Invalid ad ID', { status: 400, code: 'INVALID_AD_ID' });
    }

    const ad = await getAdOwner(adId);
    if (!ad) {
      throw new AppError('Ad not found', { status: 404, code: 'AD_NOT_FOUND' });
    }
    if (ad.user_id !== req.user.sub) {
      throw new AppError('Unauthorized to delete this ad', { status: 403, code: 'FORBIDDEN' });
    }

    const deletedAd = await deleteInstrumentAds(adId);
    return res.status(200).json({
      message: `Ad deleted with ID: ${adId}`,
      data: deletedAd,
    });
  } catch (error) {
    logger.error('Error deleting instrument ad', { error: error.message });
    return next(error);
  }
};
