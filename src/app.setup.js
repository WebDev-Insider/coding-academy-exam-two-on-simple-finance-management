import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';


import authRouter from './routes/auth.js';
import transactionsRouter from './routes/transactions.js';

const app = express();
const server = createServer(app);

app.use(cors());
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use('/auth', authRouter);
app.use('/transactions', transactionsRouter);


app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The requested route ${req.originalUrl} does not exist for the ${req.method} method on this server`
  });
});

export { app, server };