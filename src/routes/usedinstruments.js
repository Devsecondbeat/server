import express from 'express';
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
import { writeRateLimiter } from '../middleware/rateLimiter.js';

const usedInstrumentsRouter = express.Router();

usedInstrumentsRouter.post('/images/upload-urls', writeRateLimiter, getUploadUrls);
usedInstrumentsRouter.get('/ads/:adId/images', getImagesForAd);
usedInstrumentsRouter.get('/ads/:adId/images/can-add', checkCanAddImages);
usedInstrumentsRouter.delete('/ads/:adId/images/:imageId', removeAdImage);

usedInstrumentsRouter.get('/getinstrumentMakes', getinstrumentMakes);
usedInstrumentsRouter.post('/createinstrumentAds', writeRateLimiter, createinstrumentAds);
usedInstrumentsRouter.get('/getinstrumentAds', getinstrumentAds);
usedInstrumentsRouter.get('/getinstrumentAdsbyUser/:id', getinstrumentAdsbyUser);
usedInstrumentsRouter.put('/updateinstrumentAds/:id', writeRateLimiter, updateinstrumentAds);
usedInstrumentsRouter.delete('/deleteinstrumentAds/:id', deleteinstrumentAds);

export default usedInstrumentsRouter;
