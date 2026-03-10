import express from 'express';
import logger from '../config/logger.js';
import {
  getinstrumentMakes,
  createinstrumentAds,
  getinstrumentAds,
  getinstrumentAdsbyUser,
  updateinstrumentAds,
  deleteinstrumentAds,
} from '../controllers/instrumentMakesController.js';
import {
  getUploadUrls,
  getImagesForAd,
  removeAdImage,
  checkCanAddImages,
} from '../controllers/adImagesController.js';

const usedInstrumentsRouter = express.Router();

// Legacy upload routes (deprecated - kept for backward compatibility)
usedInstrumentsRouter.put('/uploadImages', (req, res) => {
  logger.debug('Upload images request received', { body: req.body, headers: req.headers });
  logger.info('Received upload images request');

  res.send('Uploaded successfully to S3 bucket');
});

usedInstrumentsRouter.get('/getImageURL', (_req, _res) => {
  logger.info('Get image URL request received');
});

// Image upload routes (Cloudflare Images)
usedInstrumentsRouter.post('/images/upload-urls', getUploadUrls);
usedInstrumentsRouter.get('/ads/:adId/images', getImagesForAd);
usedInstrumentsRouter.get('/ads/:adId/images/can-add', checkCanAddImages);
usedInstrumentsRouter.delete('/ads/:adId/images/:imageId', removeAdImage);

usedInstrumentsRouter.get('/getinstrumentMakes', getinstrumentMakes);

usedInstrumentsRouter.post('/createinstrumentAds', createinstrumentAds);

usedInstrumentsRouter.get('/getinstrumentAds', getinstrumentAds);

usedInstrumentsRouter.get('/getinstrumentAdsbyUser/:id', getinstrumentAdsbyUser);

usedInstrumentsRouter.put('/updateinstrumentAds/:id', updateinstrumentAds);

usedInstrumentsRouter.delete('/deleteinstrumentAds/:id', deleteinstrumentAds);

export default usedInstrumentsRouter;
