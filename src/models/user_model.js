import pkg from 'pg';
import {dbConfig} from '../config/database.js';
const { Pool } = pkg;
const pool = new Pool(dbConfig);

 

export const gethashedPwdByEmailID = async (userEmailID) => {
//

try{
          const query = `select encrypted_password from users where email=$1`;
          const values = [userEmailID];
          const result = await pool.query(query, values);
        
          if (result.rowCount > 0) {
             console.log('User inserted successfully');
            console.log(result);
        // Return the ID of the inserted user
            return result.rows[0].encrypted_password;
        } else {
            console.log('No rows were inserted');
            return null;
        }
    
      }
      catch(error)
      {
          console.error('Error inserting user:',error);
      }
}
