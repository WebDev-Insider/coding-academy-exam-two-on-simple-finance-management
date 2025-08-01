const express = require('express');
const { pool } = require('../common/database');
const { authenticateToken } = require('../middleware/auth');
const {
  transactionValidation,
  updateTransactionValidation,
  handleValidationErrors,
} = require('../middleware/validation');

const router = express.Router();


router.use(authenticateToken);


router.post(
  '/',
  transactionValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { title, type, amount } = req.body;
      const userId = req.user.id;

      const newTransaction = await pool.query(
        `INSERT INTO transactions (user_id, title, type, amount) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, user_id, title, type, amount, created_at`,
        [userId, title, type, amount]
      );

      res.status(201).json({
        message: 'Transaction added successfully',
        transaction: newTransaction.rows[0],
      });
    } catch (error) {
      console.error('Add transaction error:', error);
      res.status(500).json({
        error: 'Failed to add transaction',
        message: 'Unable to create transaction record',
      });
    }
  }
);


router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      page = 1,
      limit = 10,
      type,
    } = req.query;

    let query = `
      SELECT id, title, type, amount, created_at 
      FROM transactions 
      WHERE user_id = $1
    `;
    let queryParams = [userId];
    let paramCount = 1;

    
    if (type) {
      paramCount++;
      query += ` AND type = $${paramCount}`;
      queryParams.push(type);
    }

    
    const offset = (page - 1) * limit;
    paramCount++;
    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${
      paramCount + 1
    }`;
    queryParams.push(parseInt(limit), offset);

    const transactions = await pool.query(query, queryParams);

    
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM transactions 
      WHERE user_id = $1
    `;
    let countParams = [userId];
    let countParamCount = 1;

    if (type) {
      countParamCount++;
      countQuery += ` AND type = $${countParamCount}`;
      countParams.push(type);
    }

    const totalResult = await pool.query(countQuery, countParams);
    const total = parseInt(totalResult.rows[0].total);

    res.json({
      transactions: transactions.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      error: 'Failed to retrieve transactions',
      message: 'Unable to fetch transaction records',
    });
  }
});


router.get('/balance', async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses
      FROM transactions 
      WHERE user_id = $1
    `;

    const balanceResult = await pool.query(query, [userId]);
    const { total_income, total_expenses } = balanceResult.rows[0];

    const income = parseFloat(total_income) || 0;
    const expenses = parseFloat(total_expenses) || 0;
    const balance = income - expenses;

    res.json({
      summary: {
        total_income: income,
        total_expenses: expenses,
        balance: balance,
      },
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      error: 'Failed to retrieve balance',
      message: 'Unable to calculate financial summary',
    });
  }
});


router.put(
  '/:id',
  updateTransactionValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { title, type, amount } = req.body;

      
      const existingTransaction = await pool.query(
        'SELECT id FROM transactions WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (existingTransaction.rows.length === 0) {
        return res.status(404).json({
          error: 'Transaction not found',
          message: 'Transaction does not exist or does not belong to you',
        });
      }

      
      let updateQuery =
        'UPDATE transactions SET updated_at = CURRENT_TIMESTAMP';
      let queryParams = [];
      let paramCount = 0;

      if (title !== undefined) {
        paramCount++;
        updateQuery += `, title = $${paramCount}`;
        queryParams.push(title);
      }

      if (type !== undefined) {
        paramCount++;
        updateQuery += `, type = $${paramCount}`;
        queryParams.push(type);
      }

      if (amount !== undefined) {
        paramCount++;
        updateQuery += `, amount = $${paramCount}`;
        queryParams.push(amount);
      }

      paramCount++;
      updateQuery += ` WHERE id = $${paramCount} AND user_id = $${
        paramCount + 1
      } RETURNING *`;
      queryParams.push(id, userId);

      const updatedTransaction = await pool.query(updateQuery, queryParams);

      res.json({
        message: 'Transaction updated successfully',
        transaction: updatedTransaction.rows[0],
      });
    } catch (error) {
      console.error('Update transaction error:', error);
      res.status(500).json({
        error: 'Failed to update transaction',
        message: 'Unable to modify transaction record',
      });
    }
  }
);


router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    
    const existingTransaction = await pool.query(
      'SELECT id FROM transactions WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existingTransaction.rows.length === 0) {
      return res.status(404).json({
        error: 'Transaction not found',
        message: 'Transaction does not exist or does not belong to you',
      });
    }

    
    await pool.query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    res.json({
      message: 'Transaction deleted successfully',
    });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({
      error: 'Failed to delete transaction',
      message: 'Unable to remove transaction record',
    });
  }
});

module.exports = router;
