const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    
    const userResult = await pool.query(
      'SELECT id, email FROM users WHERE email = $1 AND jwt_token = $2',
      [decoded.email, token]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid token - user not found' });
    }

    req.user = userResult.rows[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
};

module.exports = {
  authenticateToken,
};
