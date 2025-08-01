const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const { initializeDatabase } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use('/auth', authRoutes);
app.use('/transactions', transactionRoutes);


app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Simple Finance Manager API is running',
    timestamp: new Date().toISOString(),
  });
});


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'Internal server error',
  });
});


app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});


async function startServer() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(` Server running on port ${PORT}`);
      
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
