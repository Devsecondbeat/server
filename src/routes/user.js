import express from 'express';
import {registerUser} from '../controllers/userRegistrationController.js';

const userRegistrationRoutes = express.Router();

userRegistrationRoutes.post('/register',registerUser);

export default userRegistrationRoutes;