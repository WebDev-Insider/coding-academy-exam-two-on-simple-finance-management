const { body, validationResult } = require('express-validator');


const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),
];


const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  body('password').notEmpty().withMessage('Password is required'),
];


const transactionValidation = [
  body('title')
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be between 1 and 255 characters'),

  body('type')
    .isIn(['income', 'expense'])
    .withMessage('Type must be either "income" or "expense"'),

  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
];


const updateTransactionValidation = [
  body('title')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be between 1 and 255 characters'),

  body('type')
    .optional()
    .isIn(['income', 'expense'])
    .withMessage('Type must be either "income" or "expense"'),

  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
];


const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

module.exports = {
  registerValidation,
  loginValidation,
  transactionValidation,
  updateTransactionValidation,
  handleValidationErrors,
};
