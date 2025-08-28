import bcrypt from 'bcrypt';
import crypto from 'crypto';
import moment from 'moment';
import jwt from 'jsonwebtoken';
import { env } from 'process';
import {setActivationTokenAndExpiry} from '../models/user_model.js';

const saltRounds = 10; // Number of salt rounds

export const generateEncryptedPassword = (password) => {
    return new Promise((resolve, reject) => {
        bcrypt.hash(password, saltRounds, function(err, hash) {
            if (err) {
                console.error(err);
                reject(err);
            } else {
                resolve(hash);
            }
        });
    });
};

// Function to generate a secure random token
const generateActivationToken = () => {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(32, (err, buffer) => {
      if (err) {
        reject(err);
      } else {
        resolve(buffer.toString('hex'));
      }
    });
  });
}

// Function to generate an activation link with a token and expiry time
export const  generateActivationLink = (userEmail) => {
  return generateActivationToken().then(token => {
    const expiry = moment().add(24, 'hours').toISOString(); // Token expiry in 24 hours
    //save the activation code into the database. This needs to be done at the controller level, utilities needs to just have helper functions. 
    setActivationTokenAndExpiry(token, expiry, userEmail);

    const activationLink = `https://${env.hostname}/api/v1/users/activateAccount?emailId=${encodeURIComponent(userEmail)}&token=${encodeURIComponent(token)}}`;
    return activationLink;
  });
}

//function to compare the password with the hashed password. 

export const comparePassword = (userPassword, hashPassword) => {

  return new Promise((resolve, reject) => {
    console.log(userPassword, hashPassword);
    bcrypt.compare(userPassword, hashPassword, function(err, result) {
            if (err) {
                console.error(err);
                reject(err);
            } else {
                resolve(result);
            }
        });
  });

}


export const genAuthToken = (emailId) => {

//generate token expires in 30mins. 
  
let token = jwt.sign({emailId:emailId},process.env.JWT_SECRET,{ expiresIn: 3600 });

console.log(token);
return token;

}


export const validateAuthToken  = (token, emailId) => {
  
  if(token)
  {
    const decode = jwt.verify(token,process.env.JWT_SECRET);

    console.log(decode);
    if(decode.emailId === emailId)
      return true;

  }
  return false;
}


/*
This function is used for account activation token validation. 
*/
 export const isTokenValid = (db_Token, token) => {

      if(!token) 
          return false;
      //Need to convert into buffer as the crypto package uses buffer
      const bufferA = Buffer.from(db_Token, 'hex');
      const bufferB = Buffer.from(token, 'hex');

    try {
      if (bufferA.length !== bufferB.length) {
        console.log("Inside buffer length comparison");
        throw new Error('Tokens have different lengths');
      }

      // Use timingSafeEqual to compare the tokens, which provides consistent timing in comparison that avoids timings attacks. 
      return crypto.timingSafeEqual(bufferA, bufferB);

    } 
    
    catch (err) {
      console.error('Error comparing tokens:', err.message);
      return false;
    }
        
}


export const genResetPasswordCode = () => {

  const buffer = crypto.randomBytes(3); // 3 bytes = 24 bits of randomness
  const hexCode = buffer.toString('hex'); // Convert to hexadecimal string
  return hexCode.substring(0, 6); //

} 