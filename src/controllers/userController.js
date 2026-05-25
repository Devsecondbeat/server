import moment from 'moment';
import {
  gethashedPwdByEmailID,
  getActivationTokenAndExpiryByEmailID,
  setAccountActivation,
  setPasswordCodeWithExpiry,
} from '../models/user_model.js';
import {
  comparePassword,
  genAuthToken,
  isTokenValid,
  genResetPasswordCode,
} from '../Utils/codeGen.js';
import { checkifUserExists } from '../models/user_registration_model.js';
import { sendResetPasswordCode } from '../Utils/sendEmail.js';

export const accountActivation = async (req, res, next) => {
  /*
    Validate token against DB token generated for emailID.
    check if the expiry_date is less than or equal to current date
    set status of the user to active if the above steps are true.
    */
  const { emailID, token } = req.query;

  try {
    console.log(emailID);
    console.log(token);
    // field validation for the emailID, token, expiry_date;

    // validate token against DB token for email ID.
    const { activation_token, activation_token_expiry } = await getActivationTokenAndExpiryByEmailID(emailID);

    console.log('From account activation functioon:', activation_token, activation_token_expiry);
    if (activation_token_expiry && moment().isAfter(activation_token_expiry)) {
      console.log('Accont token expiry check failed');
      return res
        .status(500)
        .json(
          'Account activation token expired, please reach out to customer support: support@secondbeat.in',
        );
    }

    if (isTokenValid(activation_token, token)) {
      console.log('Is Token Valid');
      await setAccountActivation(emailID, true);
      return res.status(200).json('account activated successfully, please login to second beat');
    }
    return res
      .status(500)
      .json(
        'Account activation Token invalid, please retry with a valid token or reach out to customer support: support@secondbeat.in ',
      );
  } catch (error) {
    return res
      .status(500)
      .json(
        `Account activation failed, please reach out to customer support: support@secondbeat.in ${error}`,
      );
  }
};

export const forgotPassword = async (req, res, next) => {
  /*
    Validate if the email ID exists, if so, send the forgot password link to the email
    */
  const { emailID } = req.query;
  try {
    if (checkifUserExists(emailID)) {
      // generate Random 6 digit code and insert into the database along with the 15min expiry_date
      // send code to the email

      const code = genResetPasswordCode();
      const resetPwdCodeExpiry = moment().add(15, 'minutes').toISOString();
      setPasswordCodeWithExpiry(code, resetPwdCodeExpiry, emailID);
      sendResetPasswordCode(emailID, code);
    }

    return res.json({
      message:
        'If an account with that email address exists, you will receive an email with instructions to reset your password.',
    });
  } catch (error) {
    console.error(error);
  }
};

export const validateResetToken = (token) => {};

export const resetPassword = (token, newPassword) => {};

const userLoginResponse = (token, status, msg) => ({
  token,
  success: status,
  message: msg,
});

export const userLogin = async (req, res, next) => {
  // get the hashed password for the emailID, if it exists and call compare method, if compare is successful, then generate jwt token and provide as part of response.
  // sanitize the request and response.

  const { emailID, password } = req.body;
  console.log(emailID, password, emailID && password);
  if (!(emailID && password)) {
    return res
      .status(400)
      .json(userLoginResponse(null, false, 'Provide valid emailID and password'));
  }
  try {
    const hashedPwd = await gethashedPwdByEmailID(emailID);
    const isUserPasswordValid = await comparePassword(password, hashedPwd);
    if (!isUserPasswordValid) {
      // User password is incorrect,
      return res.status(400).json(userLoginResponse(null, false, 'Invalid password'));
    }
    console.log('isUserValid', isUserPasswordValid);
    // Generate JSON WebToken to authorize the requests.
    const authToken = genAuthToken(emailID);
    if (authToken) return res.status(200).json(userLoginResponse(authToken, true, 'Login successful'));
    return res
      .status(500)
      .json(userLoginResponse(null, false, 'Internal Server Error, please login again'));
  } catch (err) {
    next(err);
  }
};
