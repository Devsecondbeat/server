import express from 'express';
import {getinstrumentMakes} from '../controllers/instrumentMakesController.js';
import {createinstrumentAds, getinstrumentAds, getinstrumentAdsbyUser, updateinstrumentAds, deleteinstrumentAds} from '../controllers/instrumentMakesController.js';
const usedInstrumentsRouter = express.Router();

usedInstrumentsRouter.get('/getinstrumentMakes',getinstrumentMakes);

usedInstrumentsRouter.post('/createinstrumentAds',(req,res) => {
  
  createinstrumentAds(req, res);
});

usedInstrumentsRouter.get('/getinstrumentAds', getinstrumentAds);

usedInstrumentsRouter.get('/getinstrumentAdsbyUser/:id',getinstrumentAdsbyUser);

usedInstrumentsRouter.put('/updateinstrumentAds/:id',(req,res) => {
  updateinstrumentAds(req, res);
});

usedInstrumentsRouter.delete('/deleteinstrumentAds/:id',(req,res) => {
  deleteinstrumentAds(req, res);
});

export default usedInstrumentsRouter;
