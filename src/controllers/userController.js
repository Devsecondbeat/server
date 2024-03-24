
import { gethashedPwdByEmailID } from "../models/user_model.js";
import { comparePassword,genAuthToken } from "../Utils/codeGen.js";

export const accountActivation = (emailID,token,expiry_date ) => {

    /*
    Validate token against DB token generated for emailID. 
    check if the expiry_date is less than or equal to current date
    set status of the user to active if the above steps are true. 
    */ 





}

const userLoginResponse = (token,status,msg) => {
    return {
        token:token,
        success:status,
        message:msg
    }
}


export const userLogin = async (req, res, next) => {
    //get the hashed password for the emailID, if it exists and call compare method, if compare is successful, then generate jwt token and provide as part of response. 
    //sanitize the request and response. 
    
    const {emailID, password} = req.body;
    console.log(emailID,password, emailID&&password);
    if(!(emailID && password))
         return res.status(400).json(userLoginResponse(null,false,"Provide valid emailID and password"));
    try{
        const hashedPwd = await gethashedPwdByEmailID(emailID);
        let isUserPasswordValid = await comparePassword(password,hashedPwd);
        if(!isUserPasswordValid)
        {
            //User password is incorrect, 
            return res.status(400).json(userLoginResponse(null,false,"Invalid password"));
        }
        console.log(`isUserValid`,isUserPasswordValid);
        //Generate JSON WebToken to authorize the requests. 
        const authToken = genAuthToken(emailID);
        if(authToken) 
         return res.status(200).json(userLoginResponse(authToken,true,"Login successful"));
        else
         return res.status(500).json(userLoginResponse(null,false,"Internal Server Error, please login again"));
    }
    catch(err)
    {
        next(err);
    }

}