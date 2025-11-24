import pkg from 'pg';
import fs from 'fs';

// Logger - replace with Winston logger import if available
// import logger from './logger.js';
// For now, using console as fallback
const logger = {
  info: (...args) => console.log('[DB-MANAGER]', ...args),
  warn: (...args) => console.warn('[DB-MANAGER]', ...args),
  error: (...args) => console.error('[DB-MANAGER]', ...args),
  debug: (...args) => console.debug('[DB-MANAGER]', ...args),
};

const { Pool } = pkg;

// Connection state tracking
const connectionState = {
  currentPool: null,
  currentType: null,
  lastHealthCheck: null,
  isHealthy: false,
  healthCheckInterval: null,
};

/**
 * Build Supabase connection configuration
 * @returns {Object} Connection configuration object for pg Pool
 */
const buildSupabaseConfig = () => {
  const config = {
    host: process.env.SUPABASE_DB_HOST,
    port: parseInt(process.env.SUPABASE_DB_PORT || '5432', 10),
    database: process.env.SUPABASE_DB_NAME || 'postgres',
    user: process.env.SUPABASE_DB_USER || 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: {
      rejectUnauthorized: false,
    },
  };

  // Handle SSL mode
  const sslMode = process.env.SUPABASE_DB_SSL_MODE || 'require';
  if (sslMode === 'disable') {
    config.ssl = false;
  }
  else{
  try {
    config.ssl = {
      ca: fs.readFileSync(process.env.CERTPATH).toString(),
      rejectUnauthorized: true,
    };
  } catch (error) {
    logger.warn('Failed to load SSL certificate, proceeding without SSL', { error: error.message });
    config.ssl = false;
  }
  }
  return config;
};

/**
 * Build self-hosted PostgreSQL connection configuration
 * @returns {Object} Connection configuration object for pg Pool
 */
const buildPostgreSQLConfig = () => {
  const config = {
    host: process.env.DBHOST,
    port: parseInt(process.env.DBPORT || '5432', 10),
    database: process.env.DATABASENAME,
    user: process.env.DBUSERNAME,
    password: process.env.DBPASSWORD,
  };

  // Handle SSL certificate if provided
  if (process.env.CERTPATH) {
    try {
      config.ssl = {
        ca: fs.readFileSync(process.env.CERTPATH).toString(),
        rejectUnauthorized: true,
      };
    } catch (error) {
      logger.warn('Failed to load SSL certificate, proceeding without SSL', { error: error.message });
      config.ssl = false;
    }
  } else {
    config.ssl = false;
  }

  return config;
};

/**
 * Test database connection health
 * @param {Pool} pool - Database connection pool to test
 * @param {number} timeout - Connection timeout in milliseconds
 * @returns {Promise<boolean>} True if connection is healthy
 */
const testConnectionHealth = async (pool, timeout = 5000) => {
  if (!pool) {
    return false;
  }

  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), timeout);
    });

    const queryPromise = pool.query('SELECT 1 as health_check');

    await Promise.race([queryPromise, timeoutPromise]);
    return true;
  } catch (error) {
    logger.debug('Connection health check failed', { error: error.message });
    return false;
  }
};

/**
 * Initialize database connection with retry logic
 * @param {string} type - Connection type: 'supabase' or 'postgresql'
 * @param {number} maxRetries - Maximum retry attempts (defaults to DB_MAX_RETRIES env var or 3)
 * @returns {Promise<Pool|null>} Connection pool or null if failed
 */
const initializeConnection = async (type, maxRetries = null) => {
  // Use provided maxRetries, or read from environment variable, or default to 3
  const retries = maxRetries ?? parseInt(process.env.DB_MAX_RETRIES || '3', 10);
  let config;
  if (type === 'supabase') {
    config = buildSupabaseConfig();
  } else if (type === 'postgresql') {
    config = buildPostgreSQLConfig();
  } else {
    logger.error(`Invalid connection type: ${type}`);
    return null;
  }

  // Validate required configuration
  const missingFields = [];
  if (!config.host) {
    missingFields.push(type === 'supabase' ? 'SUPABASE_DB_HOST' : 'DBHOST');
  }
  if (!config.database) {
    missingFields.push(type === 'supabase' ? 'SUPABASE_DB_NAME' : 'DATABASENAME');
  }
  if (!config.user) {
    missingFields.push(type === 'supabase' ? 'SUPABASE_DB_USER' : 'DBUSERNAME');
  }
  if (!config.password) {
    missingFields.push(type === 'supabase' ? 'SUPABASE_DB_PASSWORD' : 'DBPASSWORD');
  }

  if (missingFields.length > 0) {
    logger.warn(`Missing required configuration for ${type} connection. Missing environment variables: ${missingFields.join(', ')}`);
    return null;
  }

  // Add connection pool settings
  const poolConfig = {
    ...config,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
  };

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    let pool = null;
    try {
      logger.info(`Attempting ${type} connection (attempt ${attempt}/${retries})`);
      logger.debug(`Connecting to: ${config.host}:${config.port}/${config.database} as ${config.user}`);

      pool = new Pool(poolConfig);
      const isHealthy = await testConnectionHealth(
        pool,
        parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
      );

      if (isHealthy) {
        logger.info(`Successfully connected to ${type} database`);
        return pool;
      }

      // If health check failed, close the pool
      if (pool) {
        await pool.end().catch(() => {});
      }
      logger.warn(`${type} connection health check failed on attempt ${attempt}`);
    } catch (error) {
      // Clean up pool if it was created
      if (pool) {
        await pool.end().catch(() => {});
      }

      // Provide detailed error information for DNS/connection issues
      if (error.code === 'ENOTFOUND' || error.message.includes('getaddrinfo')) {
        logger.error(`[${type.toUpperCase()}] DNS Resolution Failed`);
        logger.error(`  Hostname: ${config.host}`);
        logger.error(`  Error: ${error.message}`);
        logger.error(`  Possible causes:`);
        logger.error(`    1. Supabase project is paused (free tier pauses after inactivity)`);
        logger.error(`       → Check your Supabase dashboard and resume the project if paused`);
        logger.error(`    2. Incorrect hostname in SUPABASE_DB_HOST`);
        logger.error(`       → Verify in Supabase: Settings > Database > Connection string`);
        logger.error(`    3. Network/DNS connectivity issues`);
        logger.error(`       → Check your internet connection`);
        logger.error(`    4. Wrong hostname format`);
        logger.error(`       → Direct connection: db.xxxxx.supabase.co`);
        logger.error(`       → Connection pooling: aws-0-us-east-1.pooler.supabase.com`);
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
        logger.error(`[${type.toUpperCase()}] Connection Timeout/Refused`);
        logger.error(`  Host: ${config.host}:${config.port}`);
        logger.error(`  Error: ${error.message}`);
        logger.error(`  Check if the host and port are correct`);
      } else {
        logger.warn(`${type} connection attempt ${attempt} failed: ${error.message}`);
        if (error.code) {
          logger.debug(`  Error code: ${error.code}`);
        }
      }
    }

    // Exponential backoff: 1s, 2s, 4s
    if (attempt < retries) {
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  logger.error(`Failed to connect to ${type} after ${retries} attempts`);
  return null;
};

/**
 * Attempt connection with fallback logic
 * @returns {Promise<Pool|null>} Connection pool or null if both fail
 */
const attemptConnectionWithFallback = async () => {
  const preferredSource = process.env.DB_PREFERRED_SOURCE || 'supabase';
  const fallbackEnabled = process.env.DB_FALLBACK_ENABLED !== 'false';

  let pool = null;
  let activeType = null;

  // Try preferred source first
  pool = await initializeConnection(preferredSource);
  if (pool) {
    activeType = preferredSource;
  } else if (fallbackEnabled) {
    // Try fallback source
    const fallbackType = preferredSource === 'supabase' ? 'postgresql' : 'supabase';
    logger.info(`Attempting fallback to ${fallbackType} database`);
    pool = await initializeConnection(fallbackType);
    if (pool) {
      activeType = fallbackType;
    }
  }

  if (pool && activeType) {
    logger.info(`Active database connection: ${activeType}`);
    return { pool, type: activeType };
  }

  logger.error('Failed to establish connection to any database');
  return null;
};

/**
 * Start periodic health checks
 */
const startHealthChecks = () => {
  const interval = parseInt(process.env.DB_HEALTH_CHECK_INTERVAL || '30000', 10);

  if (connectionState.healthCheckInterval) {
    clearInterval(connectionState.healthCheckInterval);
  }

  connectionState.healthCheckInterval = setInterval(async () => {
    const currentPool = connectionState.currentPool;
    const currentType = connectionState.currentType;

    if (!currentPool) {
      logger.warn('No active database connection, attempting to reconnect');
      const result = await attemptConnectionWithFallback();
      if (result) {
        // Close old pool if exists
        if (connectionState.currentPool) {
          await connectionState.currentPool.end().catch(() => {});
        }
        connectionState.currentPool = result.pool;
        connectionState.currentType = result.type;
        connectionState.isHealthy = true;
      }
      connectionState.lastHealthCheck = new Date();
      return;
    }

    const isHealthy = await testConnectionHealth(currentPool);
    connectionState.isHealthy = isHealthy;
    connectionState.lastHealthCheck = new Date();

    if (!isHealthy) {
      logger.warn(`Health check failed for ${currentType}, attempting reconnection`);
      const result = await attemptConnectionWithFallback();
      if (result && result.type !== currentType) {
        // Connection type changed, update pool
        await currentPool.end().catch(() => {});
        connectionState.currentPool = result.pool;
        connectionState.currentType = result.type;
        connectionState.isHealthy = true;
        logger.info(`Switched to ${result.type} database`);
      } else if (result) {
        // Same type, but reconnected
        await currentPool.end().catch(() => {});
        connectionState.currentPool = result.pool;
        connectionState.isHealthy = true;
        logger.info(`Reconnected to ${result.type} database`);
      }
    }
  }, interval);

  logger.info(`Health checks started with interval: ${interval}ms`);
};

/**
 * Get current database connection pool
 * @returns {Pool} Current active connection pool
 * @throws {Error} If no connection is available
 */
const getPool = () => {
  if (!connectionState.currentPool) {
    throw new Error('No database connection available. Please check your database configuration and ensure connection manager initialized successfully.');
  }
  return connectionState.currentPool;
};

/**
 * Get current connection type
 * @returns {string|null} 'supabase', 'postgresql', or null
 */
const getConnectionType = () => connectionState.currentType;

/**
 * Check if connection is healthy
 * @returns {boolean} True if connection is healthy
 */
const isConnectionHealthy = () => connectionState.isHealthy;

/**
 * Initialize database connection manager
 * @returns {Promise<void>}
 */
const initializeConnectionManager = async () => {
  logger.info('Initializing database connection manager...');

  const result = await attemptConnectionWithFallback();

  if (result) {
    connectionState.currentPool = result.pool;
    connectionState.currentType = result.type;
    connectionState.isHealthy = true;
    connectionState.lastHealthCheck = new Date();

    // Set up error handlers
    result.pool.on('error', (err) => {
      logger.error('Unexpected error on idle database client', { error: err.message });
      connectionState.isHealthy = false;
    });

    // Start health checks
    startHealthChecks();
  } else {
    logger.error('Failed to initialize database connection manager');
    throw new Error('Unable to establish database connection');
  }
};

/**
 * Gracefully shutdown database connections
 * @returns {Promise<void>}
 */
const shutdown = async () => {
  logger.info('Shutting down database connection manager...');

  if (connectionState.healthCheckInterval) {
    clearInterval(connectionState.healthCheckInterval);
    connectionState.healthCheckInterval = null;
  }

  if (connectionState.currentPool) {
    await connectionState.currentPool.end();
    connectionState.currentPool = null;
    connectionState.currentType = null;
    connectionState.isHealthy = false;
  }

  logger.info('Database connection manager shut down');
};

// Initialize on module load
// Note: Initialization is async, but we don't block module export
// The connection will be established in the background
// If initialization fails, it will be retried on first getPool() call
initializeConnectionManager().catch((error) => {
  logger.error('Failed to initialize database connection manager on startup', { error: error.message });
  // Don't throw - allow server to start and retry on first database operation
});

// Handle process termination
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export {
  getPool,
  getConnectionType,
  isConnectionHealthy,
  initializeConnectionManager,
  shutdown,
};

