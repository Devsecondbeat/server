import express from 'express';
import {registerUser} from '../controllers/userRegistrationController.js';
import {accountActivation,userLogin,forgotPassword} from '../controllers/userController.js';
import { 
  validateUserRegistration, 
  validateUserLogin, 
  validateForgotPassword, 
  validateAccountActivation 
} from '../middleware/validation.js';

const userRoutes = express.Router();

userRoutes.post('/register', validateUserRegistration, registerUser);
userRoutes.get('/activateAccount', validateAccountActivation, accountActivation);
userRoutes.post('/login', validateUserLogin, userLogin);
userRoutes.post('/forgotPassword', validateForgotPassword, forgotPassword);

export default userRoutes;