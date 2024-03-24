import bcrypt from 'bcrypt';
import crypto from 'crypto';
import moment from 'moment';
import jwt from 'jsonwebtoken';
import { env } from 'process';

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
    //save the activation link into the database. 
    const activationLink = `https://localhost:3000/api/v1/users/activateAccount?email=${encodeURIComponent(userEmail)}&token=${encodeURIComponent(token)}&expiry=${encodeURIComponent(expiry)}`;
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


export const genAuthToken = (emailID) => {

let token = jwt.sign({emailID:emailID},process.env.Token_Secret_Key,{ expiresIn: 3600 });

console.log(token);
return token;

}
