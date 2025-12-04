import { getPool } from '../config/database.js';
import logger from '../config/logger.js';

const getInstrumentMakes = async () => {
  try {
    const query = 'select * from instrument_makes';
    const pool = getPool();
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    logger.error('Error fetching instrument makes', { error: error.message, stack: error.stack });
    throw error;
  }
};

const createInstrumentAds = async (adData) => {
  try {
    // create an instrument ad
    const {
      user_id, make_id, name, description, price, condition,
    } = adData;
    const pool = getPool();
    const result = await pool.query(
      'Insert into used_instrument_ads (user_id, make_id, name, description, price, condition) values($1, $2, $3, $4, $5, $6) returning *',
      [user_id, make_id, name, description, price, condition],
    );
    return result.rows[0];
  } catch (error) {
    logger.error('Error creating instrument ad', { error: error.message, stack: error.stack, adData });
    throw error;
  }
};

const getInstrumentAds = async () => {
  try {
    // get all instrument ads
    const query = 'select * from used_instrument_ads';
    const pool = getPool();
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    logger.error('Error fetching instrument ads', { error: error.message, stack: error.stack });
    throw error;
  }
};

const getInstrumentAdsbyUser = async (userId) => {
  try {
    // get all instrument ads for the user
    const pool = getPool();
    const result = await pool.query('select * from used_instrument_ads where user_id = $1', [
      userId,
    ]);
    return result.rows;
  } catch (error) {
    logger.error('Error fetching instrument ads by user', { error: error.message, stack: error.stack, userId });
    throw error;
  }
};

const updateInstrumentAds = async (adId, updateData) => {
  try {
    // update an instrument ad
    const { description, price, condition } = updateData;
    const pool = getPool();
    const result = await pool.query(
      'update used_instrument_ads set description = $2, price = $3, condition = $4 where id = $1 returning *',
      [adId, description, price, condition],
    );
    return result.rows[0];
  } catch (error) {
    logger.error('Error updating instrument ad', { error: error.message, stack: error.stack, adId, updateData });
    throw error;
  }
};

const deleteInstrumentAds = async (adId) => {
  try {
    // delete an instrument ad
    const pool = getPool();
    const result = await pool.query(
      'delete from used_instrument_ads where id = $1 returning *',
      [adId],
    );
    return result.rows[0];
  } catch (error) {
    logger.error('Error deleting instrument ad', { error: error.message, stack: error.stack, adId });
    throw error;
  }
};

export {
  getInstrumentMakes,
  createInstrumentAds,
  getInstrumentAds,
  getInstrumentAdsbyUser,
  updateInstrumentAds,
  deleteInstrumentAds,
};
