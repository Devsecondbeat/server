import pg from 'pg';
import logger from './config/logger.js';

const { Pool } = pg;

const pool = new Pool({
  host: 'xxxxxxx', // You can change this to your host
  port: 5432, // Change to your port if different
  user: 'sdfgfdsgdsfg', // Your PostgreSQL username
  password: 'dsfgsdfgsd', // Your PostgreSQL password
  database: 'sgdf', // Your database name
});

async function fetchAllRecords() {
  try {
    // await client.connect();

    const queryText = 'SELECT * FROM instrument_makes'; // Replace 'your_table_name' with your actual table name
    const { rows } = await pool.query(queryText);

    logger.info('Query results:', { rows });
  } catch (err) {
    logger.error('Error executing query', { error: err.stack });
  }
}
fetchAllRecords();
