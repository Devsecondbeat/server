import {userRegistration, checkIfUserExists} from '../models/user_registration_model.js';
import {sendActivationEmail} from '../Utils/sendEmail.js';
import { generateEncryptedPassword, generateActivationLink } from '../Utils/codeGen.js';

const userRegistrationResponse = (userId,success, message) => {
    return {
        userId: userId,
        success: success,
        message: message
    };
};

/*
Is this the right way to use async and await. 
*/

const registerUser = async (req, res, next) => {
    try{
        console.log("registerUser request");
        const {firstName, lastName, phoneNumber, emailId, password} = req.body;
        console.log(firstName, lastName, phoneNumber, emailId, password);
        const userExists = await checkIfUserExists(emailId);
        if(userExists)
        {
            return res.status(400).json(userRegistrationResponse(null,false,"User already exists"));
        }
        const userName=`${firstName} ${lastName}`;
        console.log(userName);
        const encryptedPassword = await generateEncryptedPassword(password);
        console.log(encryptedPassword);
        const newUser = await userRegistration(firstName,lastName,phoneNumber,emailId,encryptedPassword);
        console.log(newUser);
        if(newUser)
        {
            const link = await generateActivationLink(emailId);
            console.log(link);
            await sendActivationEmail(emailId, link, userName);
            res.status(201).json(userRegistrationResponse(newUser,true,"User registered successfully"));
        }
        else
        {
            res.status(500).json(userRegistrationResponse(null,false,"User registration failed"));
        }
    }
    catch(error){
        next(error);
    }
};

export {registerUser};
