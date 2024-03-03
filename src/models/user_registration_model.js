import pkg from 'pg';
import {dbConfig} from '../config/database.js';
const { Pool } = pkg;
const pool = new Pool(dbConfig);

//user Registration will be async, as the user gets a confirmation email

//Database save, activation code generation, send email code generation. 

const userRegistration = async(firstName, lastName, phoneNumber,emailID,password) => {
//

try{
          const query = `insert into users(first_name,last_name,contact_number,email,encrypted_password) values($1,$2,$3,$4,$5)`;
          const values = [firstName, lastName, phoneNumber,emailID, password];
          await pool.query(query, values);
          console.log('User inserted successfully');
      }
      catch(error)
      {
          console.error('Error inserting user:',error);
      }
}

export {userRegistration};