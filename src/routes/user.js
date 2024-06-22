import express from 'express';
import {registerUser} from '../controllers/userRegistrationController.js';
import {accountActivation,userLogin,forgotPassword} from '../controllers/userController.js'

const userRoutes = express.Router();

userRoutes.post('/register',registerUser);
userRoutes.get('/activateAccount', accountActivation);
userRoutes.post('/login', userLogin);
userRoutes.post('/forgotPassword', forgotPassword);

export default userRoutes;