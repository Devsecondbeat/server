import express from 'express';
import {} from 'dotenv/config';
import logger from './config/logger.js';
import routes from './routes/apiroutes.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Environment validation for production readiness
const requiredEnvVars = ['PORT', 'DBUSERNAME', 'DATABASENAME', 'DBPASSWORD', 'DBHOST'];
const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);
if (missingEnvVars.length > 0) {
  logger.error('Missing required environment variables', { missing: missingEnvVars });
  process.exit(1);
}

logger.info('Environment validation passed', { port: PORT, nodeEnv: process.env.NODE_ENV || 'development' });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ message: 'Hello, this is the root API endpoint!' });
});

app.use('/api/v1', routes);

// Start server and capture instance for graceful shutdown
const server = app.listen(PORT, () => {
  logger.info('Server started successfully', { port: PORT });
});

// Graceful shutdown handler (suitable for PM2, Docker, K8s)
const shutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(async (err) => {
    if (err) {
      logger.error('Error closing HTTP server', { error: err.message });
      process.exit(1);
    }

    logger.info('HTTP server closed');

    // Close DB pools / stop health checks (using connection manager if available)
    try {
      // Attempt to dynamically import and call shutdown from database config/manager
      const dbModule = await import('./config/database.js').catch(() => null);
      if (dbModule && typeof dbModule.shutdown === 'function') {
        await dbModule.shutdown();
        logger.info('Database connections closed');
      } else if (dbModule && dbModule.getPool) {
        // Fallback: end pool directly if exposed
        const pool = dbModule.getPool?.();
        if (pool && typeof pool.end === 'function') {
          await pool.end();
          logger.info('Database pool closed');
        }
      }
    } catch (dbErr) {
      logger.error('Error during database shutdown', { error: dbErr.message });
    }

    logger.info('Graceful shutdown complete');
    process.exit(0);
  });

  // Force shutdown after timeout (e.g. 10s) for k8s/docker
  setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors for production stability
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
  shutdown('unhandledRejection');
});
