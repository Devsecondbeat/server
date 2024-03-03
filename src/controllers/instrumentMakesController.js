import {getInstrumentMakes} from '../models/instrument_makes_model.js';

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

