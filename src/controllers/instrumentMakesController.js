import {
  getInstrumentMakes,
  createInstrumentAds,
  getInstrumentAds,
  getInstrumentAdsbyUser,
  updateInstrumentAds,
  deleteInstrumentAds,
} from '../models/instrument_makes_model.js';

export const getinstrumentMakes = async (req, res, next) => {
  try {
    // get all instrument makes
    const instrumentMakes = await getInstrumentMakes();
    return res.status(200).json(instrumentMakes);
  } catch (error) {
    next(error);
  }
};

export const createinstrumentAds = async (req, res, next) => {
  try {
    const adData = req.body;
    const createdAd = await createInstrumentAds(adData);
    return res.status(201).json({
      message: `Ad added with ID: ${createdAd.id}`,
      data: createdAd,
    });
  } catch (error) {
    next(error);
  }
};

export const getinstrumentAds = async (req, res, next) => {
  try {
    const instrumentAds = await getInstrumentAds();
    return res.status(200).json(instrumentAds);
  } catch (error) {
    next(error);
  }
};

export const getinstrumentAdsbyUser = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (Number.isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
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
    const updateData = req.body;
    const updatedAd = await updateInstrumentAds(adId, updateData);
    if (!updatedAd) {
      return res.status(404).json({ error: 'Ad not found' });
    }
    return res.status(200).json({
      message: `Ad modified with ID: ${adId}`,
      data: updatedAd,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteinstrumentAds = async (req, res, next) => {
  try {
    const adId = parseInt(req.params.id, 10);
    if (Number.isNaN(adId)) {
      return res.status(400).json({ error: 'Invalid ad ID' });
    }
    const deletedAd = await deleteInstrumentAds(adId);
    if (!deletedAd) {
      return res.status(404).json({ error: 'Ad not found' });
    }
    return res.status(200).json({
      message: `Ad deleted with ID: ${adId}`,
      data: deletedAd,
    });
  } catch (error) {
    next(error);
  }
};
