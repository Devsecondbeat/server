import fs from 'fs';
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
  ssl: process.env.CERTPATH ? {
    ca: fs.readFileSync(process.env.CERTPATH).toString(),
  } : false,
};

// Export connection manager functions
export {
  getPool,
  getConnectionType,
  isConnectionHealthy,
  initializeConnectionManager,
  shutdown,
};

// Export legacy dbConfig for backward compatibility
export { dbConfig };
