import express from 'express';
import helmet from 'helmet';
import {} from 'dotenv/config';
import { randomUUID } from 'crypto';
import logger from './config/logger.js';
import routes from './routes/apiroutes.js';


const app = express();
const PORT = process.env.PORT;
const authenticateToken = () => {};

// To display the global variables defined in codeGen js file. 

//app.use(helmet());
// Middleware to parse JSON bodies
app.use(express.json());

// parse incoming Request Object if object, with nested objects, or generally any type.
app.use(express.urlencoded({ extended: true }));

// Request ID middleware for correlation
app.use((req, res, next) => {
  req.id = randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
});

app.get('/', (req, res) => {
  res.json({ message: 'Hello, this is the root API endpoint!' });
});
// API routes

app.use('/api/v1', routes);

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    requestId: req?.id,
    error: err.message,
    stack: err.stack,
    method: req?.method,
    url: req?.originalUrl || req?.url,
  });

  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';
  const message = isProd ? 'Internal server error' : err.message || 'Internal server error';

  res.status(status).json({ error: message });
});

// Start serverls
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
