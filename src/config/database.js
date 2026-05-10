import fs from 'fs';
const dbConfig = {
  user: process.env.DBUSERNAME,
  database: process.env.DATABASENAME,
  password: process.env.DBPASSWORD,
  port: process.env.DBPORT,
  host: process.env.DBHOST,
  ssl: process.env.NODE_ENV === 'test' ? undefined : {
    ca : fs.readFileSync(process.env.CERTPATH).toString()
  }
};
export {dbConfig};
