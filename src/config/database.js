import fs from 'fs';
const dbConfig = {
  user: process.env.DBUSERNAME,
  database: process.env.DATABASENAME,
  password: process.env.DBPASSWORD,
  port: process.env.DBPORT,
  host: process.env.DBHOST,
  ssl:{
    ca : fs.readFileSync(process.env.certPath).toString()
  }
};
export {dbConfig};
