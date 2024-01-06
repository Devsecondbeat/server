import pkg from 'pg';
import {dbConfig} from '../config/database.js';
const { Pool } = pkg;
const pool = new Pool(dbConfig);

const getInstrumentMakes = async () => {
      try{
          const query = 'select * from instrument_makes';
          const result = await pool.query(query);
          return result.rows;
      }
      catch(error)
      {
          console.log(error);
      }
}

export {getInstrumentMakes};
