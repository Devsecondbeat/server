import fs from 'fs';

const dbConfig = {
  user: process.env.DBUSERNAME,
  database: process.env.DATABASENAME,
  password: process.env.DBPASSWORD,
  port: process.env.DBPORT,
  host: process.env.DBHOST,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  ssl: process.env.NODE_ENV === 'production' ? {
    ca: process.env.CERTPATH ? fs.readFileSync(process.env.CERTPATH).toString() : undefined,
    rejectUnauthorized: false
  } : false
};

// Environment-specific configurations
if (process.env.NODE_ENV === 'test') {
  dbConfig.max = 5;
  dbConfig.idleTimeoutMillis = 10000;
}

export { dbConfig };
