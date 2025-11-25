import { getPool } from '../config/database.js';

const getInstrumentMakes = async () => {
  try {
    const query = 'select * from instrument_makes';
    const pool = getPool();
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const createInstrumentAds = async (req, res) => {
  try {
    // create an instrument ad
    const {
      user_id, make_id, name, description, price, condition,
    } = req.body;
    const pool = getPool();
    await pool.query(
      'Insert into used_instrument_ads (user_id, make_id, name, description, price, condition) values($1, $2, $3, $4, $5, $6) returning *',
      [user_id, make_id, name, description, price, condition],
      (error, results) => {
        if (error) {
          throw error;
        }
        return res.status(201).send(`Ad added with ID: ${results.rows[0].id}`);
      },
    );
  } catch (error) {
    console.log(error);
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
    console.log(error);
    throw error;
  }
};

const getInstrumentAdsbyUser = async (req, res) => {
  try {
    // get all instrument ads for the user
    const user_id = parseInt(req.params.id, 10);
    const pool = getPool();
    const result = await pool.query('select * from used_instrument_ads where user_id = $1', [user_id]);
    return result.rows;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const updateInstrumentAds = async (req, res) => {
  try {
    // update an instrument ad
    const ad_id = parseInt(req.params.id, 10);
    const { description, price, condition } = req.query;
    const pool = getPool();
    await pool.query(
      'update used_instrument_ads set description = $2, price = $3, condition = $4 where id = $1 ',
      [ad_id, description, price, condition],
      (error, results) => {
        if (error) {
          throw error;
        }
        return res.status(200).send(`User modified with ID: ${ad_id}`);
      },
    );
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const deleteInstrumentAds = async (req, res) => {
  try {
    // delete an instrument ad
    const ad_id = parseInt(req.params.id, 10);
    const pool = getPool();
    await pool.query(
      'delete from used_instrument_ads where id = $1 ',
      [ad_id],
      (error, results) => {
        if (error) {
          throw error;
        }
        return res.status(200).send(`User deleted with ID: ${ad_id}`);
      },
    );
  } catch (error) {
    console.log(error);
    throw error;
  }
};

    await pool.query(
      'delete from used_instrument_ads where id = $1 ',
      [ad_id],
      (error, results) => {
        if (error) {
          throw error;
        }
        return res.status(200).send(`User deleted with ID: ${ad_id}`);
      },
    );
  } catch (error) {
    console.log(error);
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
