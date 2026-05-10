import {
  getInstrumentMakes,
  createInstrumentAds,
  getInstrumentAds,
  getInstrumentAdsbyUser,
  updateInstrumentAds,
  deleteInstrumentAds,
  getAdOwner,
} from '../models/marketplace_model.js';
import logger from '../config/logger.js';

export const getinstrumentMakes = async (req, res, next) => {
  try {
    // get all instrument makes
    const instrumentMakes = await getInstrumentMakes();
    return res.status(200).json(instrumentMakes);
  } catch (error) {
    logger.error('Error getting instrument makes:', error);
    next(error);
  }
};

export const createinstrumentAds = async (req, res, next) => {
  try {
    const adData = {
      ...req.body,
      user_id: req.user.sub, // Use authenticated user's UUID from JWT
    };
    const createdAd = await createInstrumentAds(adData);
    return res.status(201).json({
      message: `Ad added with ID: ${createdAd.id}`,
      data: createdAd,
    });
  } catch (error) {
    logger.error('Error creating instrument ad:', error);
    next(error);
  }
};

export const getinstrumentAds = async (req, res, next) => {
  try {
    const instrumentAds = await getInstrumentAds();
    return res.status(200).json(instrumentAds);
  } catch (error) {
    logger.error('Error getting instrument ads:', error);
    next(error);
  }
};

export const getinstrumentAdsbyUser = async (req, res, next) => {
  try {
    const userId = req.params.id;
    // UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }
    const instrumentAdsbyUser = await getInstrumentAdsbyUser(userId);
    return res.status(200).json(instrumentAdsbyUser);
  } catch (error) {
    next(error);
  }
};

export const updateinstrumentAds = async (req, res, next) => {
  try {
    const adId = parseInt(req.params.id, 10);
    if (Number.isNaN(adId)) {
      return res.status(400).json({ error: 'Invalid ad ID' });
    }

    // Verify ownership - user can only update their own ads
    const ad = await getAdOwner(adId);
    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }
    if (ad.user_id !== req.user.sub) {
      return res.status(403).json({ error: 'Unauthorized to update this ad' });
    }

    const updateData = req.body;
    const updatedAd = await updateInstrumentAds(adId, updateData);
    return res.status(200).json({
      message: `Ad modified with ID: ${adId}`,
      data: updatedAd,
    });
  } catch (error) {
    logger.error('Error updating instrument ad:', error);
    next(error);
  }
};

export const deleteinstrumentAds = async (req, res, next) => {
  try {
    const adId = parseInt(req.params.id, 10);
    if (Number.isNaN(adId)) {
      return res.status(400).json({ error: 'Invalid ad ID' });
    }

    // Verify ownership - user can only delete their own ads
    const ad = await getAdOwner(adId);
    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }
    if (ad.user_id !== req.user.sub) {
      return res.status(403).json({ error: 'Unauthorized to delete this ad' });
    }

    const deletedAd = await deleteInstrumentAds(adId);
    return res.status(200).json({
      message: `Ad deleted with ID: ${adId}`,
      data: deletedAd,
    });
  } catch (error) {
    logger.error('Error deleting instrument ad:', error);
    next(error);
  }
};
