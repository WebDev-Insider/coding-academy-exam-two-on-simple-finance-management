const request = require('supertest');
const app = require('../src/server');
const { pool } = require('../src/config/database');

describe('Transaction Endpoints', () => {
  let authToken;
  let userId;
  let transactionId;

  beforeAll(async () => {
    
    await pool.query('DELETE FROM transactions');
    await pool.query('DELETE FROM users');

    
    const userData = {
      email: 'test@example.com',
      password: 'password123',
    };

    const registerResponse = await request(app)
      .post('/auth/register')
      .send(userData);

    authToken = registerResponse.body.token;
    userId = registerResponse.body.user.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('POST /transactions', () => {
    it('should create a new income transaction', async () => {
      const transactionData = {
        title: 'Salary payment',
        type: 'income',
        amount: 1000.0,
      };

      const response = await request(app)
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transactionData)
        .expect(201);

      expect(response.body).toHaveProperty(
        'message',
        'Transaction added successfully'
      );
      expect(response.body).toHaveProperty('transaction');
      expect(response.body.transaction.title).toBe(transactionData.title);
      expect(response.body.transaction.type).toBe(transactionData.type);
      expect(response.body.transaction.amount).toBe(
        transactionData.amount.toString()
      );

      transactionId = response.body.transaction.id;
    });

    it('should create a new expense transaction', async () => {
      const transactionData = {
        title: 'Grocery shopping',
        type: 'expense',
        amount: 50.0,
      };

      const response = await request(app)
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transactionData)
        .expect(201);

      expect(response.body).toHaveProperty(
        'message',
        'Transaction added successfully'
      );
      expect(response.body.transaction.title).toBe(transactionData.title);
      expect(response.body.transaction.type).toBe(transactionData.type);
      expect(response.body.transaction.amount).toBe(
        transactionData.amount.toString()
      );
    });

    it('should reject transaction with invalid type', async () => {
      const transactionData = {
        title: 'Test transaction',
        type: 'invalid',
        amount: 100.0,
      };

      const response = await request(app)
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transactionData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should reject transaction with negative amount', async () => {
      const transactionData = {
        title: 'Test transaction',
        type: 'income',
        amount: -100.0,
      };

      const response = await request(app)
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transactionData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should reject transaction without authentication', async () => {
      const transactionData = {
        title: 'Test transaction',
        type: 'income',
        amount: 100.0,
      };

      const response = await request(app)
        .post('/transactions')
        .send(transactionData)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access token required');
    });
  });

  describe('GET /transactions', () => {
    it('should retrieve user transactions', async () => {
      const response = await request(app)
        .get('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('transactions');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.transactions)).toBe(true);
      expect(response.body.transactions.length).toBeGreaterThan(0);
    });

    it('should filter transactions by type', async () => {
      const response = await request(app)
        .get('/transactions?type=income')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.transactions.every((t) => t.type === 'income')).toBe(
        true
      );
    });

    it('should reject request without authentication', async () => {
      const response = await request(app).get('/transactions').expect(401);

      expect(response.body).toHaveProperty('error', 'Access token required');
    });
  });

  describe('GET /transactions/balance', () => {
    it('should return financial summary', async () => {
      const response = await request(app)
        .get('/transactions/balance')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('summary');
      expect(response.body.summary).toHaveProperty('total_income');
      expect(response.body.summary).toHaveProperty('total_expenses');
      expect(response.body.summary).toHaveProperty('balance');
    });

    it('should calculate balance correctly', async () => {
      const response = await request(app)
        .get('/transactions/balance')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { total_income, total_expenses, balance } = response.body.summary;
      expect(balance).toBe(total_income - total_expenses);
    });
  });

  describe('PUT /transactions/:id', () => {
    it('should update transaction successfully', async () => {
      const updateData = {
        title: 'Updated salary payment',
        amount: 1200.0,
      };

      const response = await request(app)
        .put(`/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty(
        'message',
        'Transaction updated successfully'
      );
      expect(response.body.transaction.title).toBe(updateData.title);
      expect(response.body.transaction.amount).toBe(
        updateData.amount.toString()
      );
    });

    it('should reject update of non-existent transaction', async () => {
      const updateData = {
        amount: 1500.0,
      };

      const response = await request(app)
        .put('/transactions/99999999-9999-9999-9999-999999999999')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Transaction not found');
    });
  });

  describe('DELETE /transactions/:id', () => {
    it('should delete transaction successfully', async () => {
      const response = await request(app)
        .delete(`/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty(
        'message',
        'Transaction deleted successfully'
      );
    });

    it('should reject deletion of non-existent transaction', async () => {
      const response = await request(app)
        .delete('/transactions/99999999-9999-9999-9999-999999999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Transaction not found');
    });
  });
});
