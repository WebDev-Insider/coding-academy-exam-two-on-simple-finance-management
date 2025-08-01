const request = require('supertest');
const app = require('../src/server');
const { pool } = require('../src/config/database');

describe('Authentication Endpoints', () => {
  beforeAll(async () => {
    
    await pool.query('DELETE FROM transactions');
    await pool.query('DELETE FROM users');
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty(
        'message',
        'User registered successfully'
      );
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user).toHaveProperty('id');
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123',
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        email: 'test3@example.com',
        password: '123',
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should reject duplicate email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'User already exists');
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(loginData.email);
    });

    it('should reject login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Authentication failed');
    });

    it('should reject login with wrong password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Authentication failed');
    });
  });
});
