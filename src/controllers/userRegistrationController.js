import { userRegistration, checkifUserExists } from '../models/user_registration_model.js';
import { sendActivationEmail } from '../Utils/sendEmail.js';
import { generateEncryptedPassword, generateActivationLink } from '../Utils/codeGen.js';

const userRegistrationResponse = (userID, success, message) => ({
  ID: userID,
  success,
  message,
});

/*
Is this the right way to use async and await.
*/

const registerUser = async (req, res, next) => {
  try {
    console.log('Register User request');
    const {
      firstName, lastName, phoneNumber, emailID, password,
    } = req.body;

    const userExists = await checkifUserExists(emailID);
    console.log(userExists);

    if (userExists) {
      return res
        .status(400)
        .json(userRegistrationResponse(null, false, 'User already registered with the emailID'));
    }

    const userName = `${firstName} ${lastName}`;

    const encryptedPassword = await generateEncryptedPassword(password);

    const newUser = await userRegistration(
      firstName,
      lastName,
      phoneNumber,
      emailID,
      encryptedPassword,
    );
    console.log('User Registration Successful!!');

    console.log(newUser);
    res.status(201).json(userRegistrationResponse(newUser, true, 'User Registered successfully'));

    const link = await generateActivationLink(emailID);
    // save link to the database.

    sendActivationEmail(emailID, link, userName);
  } catch (error) {
    next(error);
  }
};

export { registerUser };
