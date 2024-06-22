import {getInstrumentMakes} from '../models/instrument_makes.js';
import {createInstrumentAds, getInstrumentAds, getInstrumentAdsbyUser, updateInstrumentAds, deleteInstrumentAds} from '../models/instrument_makes.js';


export const getinstrumentMakes = async (req, res, next) => {

    try{
        console.log("getInstrumentMakes request");
        const instrumentMakes = await getInstrumentMakes();
        res.status(201).json(instrumentMakes);
    }
    catch(error){
        next(error);
    }
};

export const createinstrumentAds = async (req, res, next) => {

    try{
        
        createInstrumentAds(req, res);
    }
    catch(error){
        next;
    }
};

export const getinstrumentAds = async (req, res, next) => {

    try{
        
        const instrumentAds = await getInstrumentAds(req, res);
        res.status(201).json(instrumentAds);
        
    }
    catch(error){
        next(error);
    }
};

export const getinstrumentAdsbyUser = async (req, res, next) => {

    try{
        
        const instrumentAdsbyUser = await getInstrumentAdsbyUser(req, res);
        res.status(201).json(instrumentAdsbyUser);
        
    }
    catch(error){
        next(error);
    }
};

export const updateinstrumentAds = async (req, res, next) => {

    try{
        updateInstrumentAds(req, res);
        
    }
    catch(error){
        next;
    }
};

export const deleteinstrumentAds = async (req, res, next) => {

    try{
        deleteInstrumentAds(req, res);
        
    }
    catch(error){
        next;
    }
};