import express from 'express';
import {
  getinstrumentMakes,
  createinstrumentAds,
  getinstrumentAds,
  getinstrumentAdsbyUser,
  updateinstrumentAds,
  deleteinstrumentAds,
} from '../controllers/instrumentMakesController.js';

const usedInstrumentsRouter = express.Router();

usedInstrumentsRouter.put('/uploadImages' ,(req, res) => {
  console.log(req);
  console.log('received requeset');

  res.send('Uploaded successfully to S3 bucket');
});

usedInstrumentsRouter.get('/getImageURL', (req, res) => {
  console.log('getImageURL request');
});

usedInstrumentsRouter.get('/getinstrumentMakes', getinstrumentMakes);

usedInstrumentsRouter.post('/createinstrumentAds', createinstrumentAds);

usedInstrumentsRouter.get('/getinstrumentAds', getinstrumentAds);

usedInstrumentsRouter.get('/getinstrumentAdsbyUser/:id', getinstrumentAdsbyUser);

usedInstrumentsRouter.put('/updateinstrumentAds/:id', updateinstrumentAds);

usedInstrumentsRouter.delete('/deleteinstrumentAds/:id', deleteinstrumentAds);

export default usedInstrumentsRouter;
