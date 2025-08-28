import {getInstrumentMakes,createInstrumentAds, getInstrumentAds, getInstrumentAdsByUser, updateInstrumentAds, deleteInstrumentAds} from '../models/instrument_makes_model.js';


export const getInstrumentMakes = async (req, res, next) => {

    try{
        console.log("getInstrumentMakes request");
        const instrumentMakes = await getInstrumentMakes();
        res.status(201).json(instrumentMakes);
    }
    catch(error){
        next(error);
    }
};

export const createInstrumentAds = async (req, res, next) => {

    try{
        
        createInstrumentAds(req, res);
    }
    catch(error){
        next;
    }
};

export const getInstrumentAds = async (req, res, next) => {

    try{
        
        const instrumentAds = await getInstrumentAds(req, res);
        res.status(201).json(instrumentAds);
        
    }
    catch(error){
        next(error);
    }
};

export const getInstrumentAdsByUser = async (req, res, next) => {

    try{
        
        const instrumentAdsByUser = await getInstrumentAdsByUser(req, res);
        res.status(201).json(instrumentAdsByUser);
        
    }
    catch(error){
        next(error);
    }
};

export const updateInstrumentAds = async (req, res, next) => {

    try{
        updateInstrumentAds(req, res);
        
    }
    catch(error){
        next;
    }
};

export const deleteInstrumentAds = async (req, res, next) => {

    try{
        deleteInstrumentAds(req, res);
        
    }
    catch(error){
        next;
    }
};
