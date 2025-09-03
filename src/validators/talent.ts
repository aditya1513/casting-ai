/**
 * Talent Validation Rules
 * Express-validator rules for talent-related endpoints
 */

import { body, param, query } from 'express-validator';

export const validateTalentCreation = [
  body('userId')
    .isUUID()
    .withMessage('User ID must be a valid UUID'),

  body('firstName')
    .isString()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),

  body('lastName')
    .isString()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),

  body('dateOfBirth')
    .isISO8601()
    .withMessage('Date of birth must be a valid date'),

  body('gender')
    .isIn(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'])
    .withMessage('Gender must be a valid option'),

  body('currentCity')
    .isString()
    .isLength({ min: 2, max: 100 })
    .withMessage('Current city must be between 2 and 100 characters'),

  body('currentState')
    .isString()
    .isLength({ min: 2, max: 100 })
    .withMessage('Current state must be between 2 and 100 characters'),

  body('primaryPhone')
    .isMobilePhone('any')
    .withMessage('Primary phone must be a valid mobile number'),

  body('email')
    .isEmail()
    .withMessage('Email must be valid'),

  body('height')
    .optional()
    .isFloat({ min: 100, max: 250 })
    .withMessage('Height must be between 100 and 250 cm'),

  body('weight')
    .optional()
    .isFloat({ min: 30, max: 200 })
    .withMessage('Weight must be between 30 and 200 kg'),

  body('yearsOfExperience')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('Years of experience must be between 0 and 50'),

  body('actingSkills')
    .optional()
    .isArray()
    .withMessage('Acting skills must be an array'),

  body('danceSkills')
    .optional()
    .isArray()
    .withMessage('Dance skills must be an array'),

  body('languages')
    .optional()
    .isArray()
    .withMessage('Languages must be an array'),

  body('minimumRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum rate must be a positive number'),

  body('maximumRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum rate must be a positive number')
];

export const validateTalentUpdate = [
  param('id')
    .isUUID()
    .withMessage('Talent ID must be a valid UUID'),

  body('firstName')
    .optional()
    .isString()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),

  body('lastName')
    .optional()
    .isString()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),

  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be a valid date'),

  body('gender')
    .optional()
    .isIn(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'])
    .withMessage('Gender must be a valid option'),

  body('currentCity')
    .optional()
    .isString()
    .isLength({ min: 2, max: 100 })
    .withMessage('Current city must be between 2 and 100 characters'),

  body('currentState')
    .optional()
    .isString()
    .isLength({ min: 2, max: 100 })
    .withMessage('Current state must be between 2 and 100 characters'),

  body('primaryPhone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Primary phone must be a valid mobile number'),

  body('email')
    .optional()
    .isEmail()
    .withMessage('Email must be valid'),

  body('height')
    .optional()
    .isFloat({ min: 100, max: 250 })
    .withMessage('Height must be between 100 and 250 cm'),

  body('weight')
    .optional()
    .isFloat({ min: 30, max: 200 })
    .withMessage('Weight must be between 30 and 200 kg'),

  body('yearsOfExperience')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('Years of experience must be between 0 and 50'),

  body('minimumRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum rate must be a positive number'),

  body('maximumRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum rate must be a positive number')
];

export const validateTalentQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('location')
    .optional()
    .isString()
    .isLength({ min: 2, max: 100 })
    .withMessage('Location must be between 2 and 100 characters'),

  query('skills')
    .optional()
    .isString()
    .withMessage('Skills must be a comma-separated string'),

  query('experience')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Experience must be a non-negative integer'),

  query('availability')
    .optional()
    .isIn(['AVAILABLE', 'BUSY', 'PARTIALLY_AVAILABLE', 'NOT_AVAILABLE', 'ON_PROJECT'])
    .withMessage('Availability must be a valid status')
];

export const validateTalentId = [
  param('id')
    .isUUID()
    .withMessage('Talent ID must be a valid UUID')
];