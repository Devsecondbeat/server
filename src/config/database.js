import fs from 'fs';
import logger from './logger.js';
import {
  getPool,
  getConnectionType,
  isConnectionHealthy,
  initializeConnectionManager,
  shutdown,
} from './databaseManager.js';

// Legacy dbConfig export for backward compatibility
// Note: This is deprecated. Use getPool() from databaseManager instead.
const dbConfig = {
  user: process.env.DBUSERNAME,
  database: process.env.DATABASENAME,
  password: process.env.DBPASSWORD,
  port: process.env.DBPORT,
  host: process.env.DBHOST,
  ssl: (() => {
    if (!process.env.CERTPATH) {
      return false;
    }
    try {
      const certPath = process.env.CERTPATH;
      if (!fs.existsSync(certPath)) {
        logger.error(`[Database Config] SSL certificate file not found at path: ${certPath}`);
        return false;
      }
      const certContent = fs.readFileSync(certPath).toString();
      return { ca: certContent };
    } catch (error) {
      logger.error(
        `[Database Config] Failed to read SSL certificate from path: ${process.env.CERTPATH}`,
      );
      logger.error(`[Database Config] Error: ${error.message}`);
      return false;
    }
  })(),
};

// Export connection manager functions
export {
  getPool, getConnectionType, isConnectionHealthy, initializeConnectionManager, shutdown,
};

// Export legacy dbConfig for backward compatibility
export { dbConfig };
