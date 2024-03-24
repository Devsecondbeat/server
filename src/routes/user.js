import express from 'express';
import {registerUser} from '../controllers/userRegistrationController.js';
import {accountActivation,userLogin} from '../controllers/userController.js'

const userRoutes = express.Router();

userRoutes.post('/register',registerUser);
userRoutes.post('/accountActivation', accountActivation);
userRoutes.post('/login', userLogin);

export default userRoutes;