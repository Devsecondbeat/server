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

const usedInstrumentsRouter = express.Router();

usedInstrumentsRouter.put('/uploadImages', (req, res) => {
  logger.debug('Upload images request received', { body: req.body, headers: req.headers });
  logger.info('Received upload images request');

  res.send('Uploaded successfully to S3 bucket');
});

usedInstrumentsRouter.get('/getImageURL', (_req, _res) => {
  logger.info('Get image URL request received');
});

usedInstrumentsRouter.get('/getinstrumentMakes', getinstrumentMakes);

usedInstrumentsRouter.post('/createinstrumentAds', createinstrumentAds);

usedInstrumentsRouter.get('/getinstrumentAds', getinstrumentAds);

usedInstrumentsRouter.get('/getinstrumentAdsbyUser/:id', getinstrumentAdsbyUser);

usedInstrumentsRouter.put('/updateinstrumentAds/:id', updateinstrumentAds);

usedInstrumentsRouter.delete('/deleteinstrumentAds/:id', deleteinstrumentAds);

export default usedInstrumentsRouter;
