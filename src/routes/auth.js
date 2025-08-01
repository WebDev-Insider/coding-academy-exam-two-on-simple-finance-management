const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const {
  registerValidation,
  loginValidation,
  handleValidationErrors,
} = require('../middleware/validation');

const router = express.Router();

router.post(
  '/register',
  registerValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({
          error: 'User already exists',
          message: 'Email is already taken',
        });
      }

      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      const token = jwt.sign({ email: email }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      });

      const newUser = await pool.query(
        'INSERT INTO users (email, password_hash, jwt_token) VALUES ($1, $2, $3) RETURNING id, email, created_at',
        [email, passwordHash, token]
      );

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: newUser.rows[0].id,
          email: newUser.rows[0].email,
          created_at: newUser.rows[0].created_at,
        },
        token,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        error: 'Registration failed',
        message: 'Unable to create user account',
      });
    }
  }
);

router.post(
  '/login',
  loginValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await pool.query(
        'SELECT id, email, password_hash FROM users WHERE email = $1',
        [email]
      );

      if (user.rows.length === 0) {
        return res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid email or password',
        });
      }

      const userData = user.rows[0];

      const isPasswordValid = await bcrypt.compare(
        password,
        userData.password_hash
      );

      if (!isPasswordValid) {
        return res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid email or password',
        });
      }

      const token = jwt.sign(
        { email: userData.email },
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        }
      );

      
      await pool.query(
        'UPDATE users SET jwt_token = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [token, userData.id]
      );

      res.json({
        message: 'Login successful',
        user: {
          id: userData.id,
          email: userData.email,
        },
        token,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'Login failed',
        message: 'Unable to authenticate user',
      });
    }
  }
);

module.exports = router;
