import {userRegistration} from '../models/user_registration_model.js';
import {sendActivationEmail} from '../Utils/sendEmail.js';

const userRegistrationRepsonse = (success, message) => {

    return{
        success:success,
        message:message
    }
}


const registerUser = async (req, res, next) => {

    try{
        console.log("Register User request");

        //need to check if the user already exists in the database. 
        const userName=`${req.body.firstName} ${req.body.lastName}`;

        const registerUserResp = await userRegistration(req.body.firstName,req.body.lastName,req.body.phoneNumber, req.body.emailID,req.body.password);
        console.log("User Registration Successful!!");
        userRegistrationRepsonse(true, "User registered successfully.");
        res.status(201).json(registerUserResp);
        
        //Need to make this async call and create a promise for these methods. 

        //Need another function that generates activation link. 
        
        sendActivationEmail(req.body.emailID, Link, userName);

    }
    catch(error){
        next(error);
    }
};




export {registerUser};
