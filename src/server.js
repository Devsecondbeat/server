import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import {} from 'dotenv/config';
import routes from './routes/apiroutes.js';
import logger from './config/logger.js';

const app = express();
const { PORT } = process.env;

// To display the global variables defined in codeGen js file.

app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Middleware to parse JSON bodies
app.use(express.json());

// parse incoming Request Object if object, with nested objects, or generally any type.
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ message: 'Hello, this is the root API endpoint!' });
});

// Health check endpoints
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/ready', (req, res) => {
  // Add database connection check here if needed
  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/v1', routes);

// Start server
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
