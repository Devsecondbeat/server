import {userRegistration, checkifUserExists} from '../models/user_registration_model.js';
import {sendActivationEmail} from '../Utils/sendEmail.js';
import { generateEncryptedPassword, generateActivationLink } from '../Utils/codeGen.js';

const userRegistrationResponse = (userID,success, message) => {

    return{
        ID:userID,
        success:success,
        message:message
    }
}


/*
Is this the right way to use async and await. 
*/

const registerUser = async (req, res, next) => {

    try{
        console.log("Register User request");
        const {firstName, lastName, phoneNumber, emailID, password} = req.body;

        const userExists = await checkifUserExists(emailID);
        console.log(userExists);
        
        //need to check if the user already exists in the database. 
        if(userExists)
           return res.status(400).json(userRegistrationResponse(null,false,"User already registered with the emailID"));

        const userName=`${firstName} ${lastName}`;

        const encryptedPassword = await generateEncryptedPassword(password);
               
        const newUser = await userRegistration(firstName,lastName,phoneNumber,emailID,encryptedPassword);
        console.log("User Registration Successful!!");

         console.log(newUser);
         res.status(201).json(userRegistrationRepsonse(newUser,true,"User Registered successfully"));

        //Need another function that generates activation link.
        const link = await generateActivationLink(emailID); 
        
        sendActivationEmail(emailID, link, userName);


    }
    catch(error){
        next(error);
    }
};

export {registerUser};
