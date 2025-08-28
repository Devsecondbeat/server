/**
 * Input Validation Middleware
 * Validates and sanitizes all incoming request data
 */

import { ValidationError } from './errorHandler.js';

// Validation schemas
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Helper validation functions
const isValidEmail = (email) => {
  return email && emailRegex.test(email) && email.length <= 254;
};

const isValidPassword = (password) => {
  return password && passwordRegex.test(password);
};

const isValidPhoneNumber = (phone) => {
  return phone && phoneRegex.test(phone) && phone.length >= 10 && phone.length <= 15;
};

const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/[<>]/g, ''); // Basic XSS prevention
};

// User Registration Validation
export const validateUserRegistration = (req, res, next) => {
  try {
    const { firstName, lastName, phoneNumber, emailId, password } = req.body;
    const errors = [];

    // Required field validation
    if (!firstName || firstName.trim().length < 2 || firstName.trim().length > 50) {
      errors.push('First name must be between 2 and 50 characters');
    }

    if (!lastName || lastName.trim().length < 2 || lastName.trim().length > 50) {
      errors.push('Last name must be between 2 and 50 characters');
    }

    if (!phoneNumber || !isValidPhoneNumber(phoneNumber)) {
      errors.push('Phone number must be valid and between 10-15 characters');
    }

    if (!emailId || !isValidEmail(emailId)) {
      errors.push('Email must be valid and less than 254 characters');
    }

    if (!password || !isValidPassword(password)) {
      errors.push('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
    }

    if (errors.length > 0) {
      return next(new ValidationError('Validation failed', errors));
    }

    // Sanitize inputs
    req.body.firstName = sanitizeString(firstName);
    req.body.lastName = sanitizeString(lastName);
    req.body.phoneNumber = phoneNumber.trim();
    req.body.emailId = emailId.toLowerCase().trim();
    
    next();
  } catch (error) {
    next(new ValidationError('Validation error occurred'));
  }
};

// User Login Validation
export const validateUserLogin = (req, res, next) => {
  try {
    const { emailId, password } = req.body;
    const errors = [];

    if (!emailId || !isValidEmail(emailId)) {
      errors.push('Valid email is required');
    }

    if (!password || password.length < 1) {
      errors.push('Password is required');
    }

    if (errors.length > 0) {
      return next(new ValidationError('Validation failed', errors));
    }

    // Sanitize inputs
    req.body.emailId = emailId.toLowerCase().trim();
    
    next();
  } catch (error) {
    next(new ValidationError('Validation error occurred'));
  }
};

// Forgot Password Validation
export const validateForgotPassword = (req, res, next) => {
  try {
    const { emailId } = req.query;
    const errors = [];

    if (!emailId || !isValidEmail(emailId)) {
      errors.push('Valid email is required');
    }

    if (errors.length > 0) {
      return next(new ValidationError('Validation failed', errors));
    }

    // Sanitize inputs
    req.query.emailId = emailId.toLowerCase().trim();
    
    next();
  } catch (error) {
    next(new ValidationError('Validation error occurred'));
  }
};

// Account Activation Validation
export const validateAccountActivation = (req, res, next) => {
  try {
    const { emailId, token } = req.query;
    const errors = [];

    if (!emailId || !isValidEmail(emailId)) {
      errors.push('Valid email is required');
    }

    if (!token || token.length < 32) {
      errors.push('Valid activation token is required');
    }

    if (errors.length > 0) {
      return next(new ValidationError('Validation failed', errors));
    }

    // Sanitize inputs
    req.query.emailId = emailId.toLowerCase().trim();
    
    next();
  } catch (error) {
    next(new ValidationError('Validation error occurred'));
  }
};

// Instrument Ad Validation
export const validateInstrumentAd = (req, res, next) => {
  try {
    const { make_id, name, description, price, condition } = req.body;
    const errors = [];

    if (!make_id || !Number.isInteger(Number(make_id)) || Number(make_id) < 1) {
      errors.push('Valid make ID is required');
    }

    if (!name || name.trim().length < 3 || name.trim().length > 100) {
      errors.push('Name must be between 3 and 100 characters');
    }

    if (description && description.length > 1000) {
      errors.push('Description must be less than 1000 characters');
    }

    if (!price || isNaN(price) || Number(price) < 0) {
      errors.push('Valid price is required');
    }

    if (!condition || !['New', 'Like New', 'Good', 'Fair', 'Poor'].includes(condition)) {
      errors.push('Valid condition is required');
    }

    if (errors.length > 0) {
      return next(new ValidationError('Validation failed', errors));
    }

    // Sanitize inputs
    req.body.name = sanitizeString(name);
    if (description) req.body.description = sanitizeString(description);
    req.body.price = Number(price);
    
    next();
  } catch (error) {
    next(new ValidationError('Validation error occurred'));
  }
};

// Generic ID validation
export const validateId = (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id || !Number.isInteger(Number(id)) || Number(id) < 1) {
      return next(new ValidationError('Valid ID is required'));
    }

    req.params.id = Number(id);
    next();
  } catch (error) {
    next(new ValidationError('Validation error occurred'));
  }
};
