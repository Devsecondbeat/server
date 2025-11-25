import { getPool } from '../config/database.js';

export const gethashedPwdByEmailID = async (userEmailID) => {
  try {
    const query = 'select encrypted_password from users where email=$1;';
    const values = [userEmailID];
    const pool = getPool();
    const result = await pool.query(query, values);

    if (result.rowCount > 0) {
      console.log('User found successfully');
      console.log(result);
      // Return the encrypted password
      return result.rows[0].encrypted_password;
    }
    console.log('No user found with this email');
    return null;
  } catch (error) {
    console.error('Error retrieving user password:', error);
    throw error;
  }
};

export const setActivationTokenAndExpiry = async (token, expiry, emailID) => {
  try {
    const query = `
      UPDATE users
      SET activation_token = $1,
          activation_token_expiry = $2
      WHERE email = $3
    `;
    const pool = getPool();
    await pool.query(query, [token, expiry, emailID]);
  } catch (error) {
    console.error('Error setting activation token:', error);
    throw error;
  }
};

export const getActivationTokenAndExpiryByEmailID = async (emailID) => {
  try {
    const query = 'SELECT activation_token, activation_token_expiry from users where email=$1;';
    const values = [emailID];
    const pool = getPool();
    const result = await pool.query(query, values);
    if (result.rowCount > 0) {
      console.log('Retrieved token and expiry_date from users table');
      console.log(result.rows[0]);
      // Return the activation token and expiry
      return {
        activation_token: result.rows[0].activation_token,
        activation_token_expiry: result.rows[0].activation_token_expiry,
      };
    }
    console.log('No user found with this email');
    throw new Error('Query failed - user not found');
  } catch (error) {
    console.error('Invalid Email:', error);
    throw error;
  }
};

export const setAccountActivation = async (emailID, activationstatus) => {
  try {
    const query = `
      UPDATE users
      SET is_active = $1,
          activation_token=null,
          activation_token_expiry=null
      WHERE email = $2
    `;
    const pool = getPool();
    const result = await pool.query(query, [activationstatus, emailID]);
    return result;
  } catch (error) {
    console.error('Error setting account activation:', error);
    throw error;
  }
};

export const setPasswordCodeWithExpiry = async (token, expiry, emailID) => {
  try {
    const query = `
      UPDATE users
      SET reset_password_token = $1,
          reset_password_token_expiry = $2
      WHERE email = $3
    `;
    const pool = getPool();
    await pool.query(query, [token, expiry, emailID]);
  } catch (error) {
    console.error('Error setting password reset token:', error);
    throw error;
  }
};
