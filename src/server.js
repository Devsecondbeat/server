import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { pathToFileURL } from 'url';
import {} from 'dotenv/config';
import routes from './routes/apiroutes.js';
import { getConnectionType, isConnectionHealthy } from './config/database.js';
import logger from './config/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();
const { PORT } = process.env;
const isProduction = process.env.NODE_ENV === 'production';
const corsOrigin = process.env.CORS_ORIGIN;

if (isProduction && !corsOrigin) {
  logger.warn('CORS_ORIGIN is not set in production; cross-origin requests will be blocked');
}

app.use(helmet());

app.use(
  cors({
    origin: isProduction ? corsOrigin : (corsOrigin || '*'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '100kb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.JSON_BODY_LIMIT || '100kb' }));

app.get('/', (req, res) => {
  res.json({ message: 'Hello, this is the root API endpoint!' });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/database', (req, res) => {
  try {
    const connectionType = getConnectionType();
    const isHealthy = isConnectionHealthy();

    if (isHealthy) {
      res.status(200).json({
        status: 'healthy',
        database: connectionType,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        database: connectionType || 'none',
        timestamp: new Date().toISOString(),
        message: 'Database connection is not healthy',
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'error',
      database: 'none',
      timestamp: new Date().toISOString(),
      message: error.message,
    });
  }
});

app.use('/api/v1', routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

export function start() {
  const server = app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
  });
  return server;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  start();
}
