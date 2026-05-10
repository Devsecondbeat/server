import pkg from 'pg';
import dbConfig from '../config/database.js';

const { Pool } = pkg;
const pool = new Pool(dbConfig);

// user Registration will be async, as the user gets a confirmation email

// Database save, activation code generation, send email code generation.

export const userRegistration = async (firstName, lastName, phoneNumber, emailID, password) => {
  //

  try {
    const query = 'insert into users(first_name,last_name,contact_number,email,encrypted_password) values($1,$2,$3,$4,$5) RETURNING id';
    const values = [firstName, lastName, phoneNumber, emailID, password];
    const result = await pool.query(query, values);

    if (result.rowCount > 0) {
      console.log('User inserted successfully');
      // Return the ID of the inserted user
      return result.rows[0].id;
    }
    console.log('No rows were inserted');
    return null;
  } catch (error) {
    console.error('Error inserting user:', error);
  }
};

export const checkifUserExists = async (emailID) => {
  try {
    const checkUserExistsQuery = 'select * from users where email=$1';
    const values = [emailID];
    const result = await pool.query(checkUserExistsQuery, values);
    console.log(`result:${result.rows.length}`);
    return result.rows.length > 0;
  } catch (err) {
    console.error(err);
  }
};
