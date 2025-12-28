import bcrypt from 'bcrypt';
import crypto from 'crypto';
import moment from 'moment';
import jwt from 'jsonwebtoken';
import { env } from 'process';
import logger from '../config/logger.js';
import { setActivationTokenAndExpiry } from '../models/user_model.js';

const saltRounds = 10; // Number of salt rounds

export const generateEncryptedPassword = (password) => new Promise((resolve, reject) => {
  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
      logger.error('Error generating encrypted password', { error: err });
      reject(err);
    } else {
      resolve(hash);
    }
  });
});

// Function to generate a secure random token
const generateActivationToken = () => new Promise((resolve, reject) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      reject(err);
    } else {
      resolve(buffer.toString('hex'));
    }
  });
});

// Function to generate an activation link with a token and expiry time
export const generateActivationLink = (userEmail) => generateActivationToken().then((token) => {
  const expiry = moment().add(24, 'hours').toISOString(); // Token expiry in 24 hours
  // save the activation code into the database. This needs to be done at the controller level, utilities needs to just have helper functions.
  setActivationTokenAndExpiry(token, expiry, userEmail);

  const activationLink = `https://${env.hostname}/api/v1/users/activateAccount?emailID=${encodeURIComponent(userEmail)}&token=${encodeURIComponent(token)}}`;
  return activationLink;
});

// function to compare the password with the hashed password.

export const comparePassword = (userPassword, hashPassword) => new Promise((resolve, reject) => {
  logger.debug('Comparing passwords');
  bcrypt.compare(userPassword, hashPassword, (err, result) => {
    if (err) {
      logger.error('Error comparing passwords', { error: err });
      reject(err);
    } else {
      resolve(result);
    }
  });
});

export const genAuthToken = (emailID) => {
  // generate token expires in 30mins.

  const token = jwt.sign({ emailID }, process.env.Token_Secret_Key, { expiresIn: 3600 });

  logger.debug('Generated auth token');
  return token;
};

export const validateAuthToken = (token, emailID) => {
  if (token) {
    const decode = jwt.verify(token, process.env.Token_Secret_Key);

    logger.debug('Token decoded successfully');
    if (decode.emailID === emailID) return true;
  }
  return false;
};

/*
This function is used for account activation token validation.
*/
export const isTokenValid = (db_Token, token) => {
  if (!token) return false;
  // Need to convert into buffer as the crypto package uses buffer
  const bufferA = Buffer.from(db_Token, 'hex');
  const bufferB = Buffer.from(token, 'hex');

  try {
    if (bufferA.length !== bufferB.length) {
      logger.debug('Token buffer length comparison');
      throw new Error('Tokens have different lengths');
    }

    // Use timingSafeEqual to compare the tokens, which provides consistent timing in comparison that avoids timings attacks.
    return crypto.timingSafeEqual(bufferA, bufferB);
  } catch (err) {
    logger.error('Error comparing tokens:', { error: err.message });
    return false;
  }
};

export const genResetPasswordCode = () => {
  const buffer = crypto.randomBytes(3); // 3 bytes = 24 bits of randomness
  const hexCode = buffer.toString('hex'); // Convert to hexadecimal string
  return hexCode.substring(0, 6); //
};
