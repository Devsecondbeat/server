import { getHashedPwdByEmailId,getActivationTokenAndExpiryByEmailId,setAccountActivation, setPasswordCodeWithExpiry} from "../models/user_model.js";
import { comparePassword,genAuthToken, isTokenValid, genResetPasswordCode} from "../Utils/codeGen.js";
import {checkIfUserExists} from '../models/user_registration_model.js';
import { sendResetPasswordCode } from "../Utils/sendEmail.js";
import moment from "moment";
export const accountActivation = async (req, res, next) => {
    try{
        console.log("accountActivation request");
        let {emailId,token}= req.query;
        console.log(emailId,token);
        if(!emailId || !token)
        {
            return res.status(400).json({error:"emailId and token are required"});
        }
        const {activation_token, activation_token_expiry} = await getActivationTokenAndExpiryByEmailId(emailId);
        if(!activation_token || !activation_token_expiry)
        {
            return res.status(400).json({error:"Invalid emailId"});
        }
        const isTokenValidResult = isTokenValid(activation_token, token);
        if(!isTokenValidResult)
        {
            return res.status(400).json({error:"Invalid token"});
        }
        const currentTime = moment();
        const tokenExpiry = moment(activation_token_expiry);
        if(currentTime.isAfter(tokenExpiry))
        {
            return res.status(400).json({error:"Token expired"});
        }
        await setAccountActivation(emailId,true);
        res.status(200).json({message:"Account activated successfully"});
    }
    catch(error){
        next(error);
    }
};

export const forgotPassword = async (req, res, next) => {
    try{
        console.log("forgotPassword request");
        let emailId = req.query.emailId;
        console.log(emailId);
        if(!emailId)
        {
            return res.status(400).json({error:"emailId is required"});
        }
        const userExists = await checkIfUserExists(emailId);
        if(!userExists)
        {
            return res.status(400).json({error:"User does not exist"});
        }
        let code = genResetPasswordCode();
        const resetPwdCodeExpiry = moment().add(15, 'minutes').toISOString();
        await setPasswordCodeWithExpiry(code, resetPwdCodeExpiry, emailId);
        await sendResetPasswordCode(emailId, code);
        res.status(200).json({message:"Reset password code sent successfully"});
    }
    catch(error){
        next(error);
    }
};

export const validateResetToken = (token) => {
    // Implementation for token validation
    return true;
};

export const resetPassword = (token, newPassword) => {
    // Implementation for password reset
    return true;
};

const userLoginResponse = (token,status,msg) => {
    return {
        token: token,
        status: status,
        message: msg
    };
};

export const userLogin = async (req, res, next) => {
    try{
        console.log("userLogin request");
        const {emailId, password} = req.body;
        console.log(emailId, password);
        if(!emailId || !password)
        {
            return res.status(400).json({error:"emailId and password are required"});
        }
        const hashedPwd = await getHashedPwdByEmailId(emailId);
        let isUserPasswordValid = await comparePassword(password,hashedPwd);
        if(!isUserPasswordValid)
        {
            return res.status(400).json({error:"Invalid credentials"});
        }
        const authToken = genAuthToken(emailId);
        res.status(200).json(userLoginResponse(authToken,true,"Login successful"));
    }
    catch(error){
        next(error);
    }
};