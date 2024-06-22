import pkg from 'pg';
import {dbConfig} from '../config/database.js';
const { Pool } = pkg;
const pool = new Pool(dbConfig);

 

export const gethashedPwdByEmailID = async (userEmailID) => {
//

try{
          const query = `select encrypted_password from users where email=$1;`;
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
};


export const setActivationTokenAndExpiry = async (token,expiry,emailID) => 
    
{
//

try{
                const query = `
                            UPDATE users
                            SET activation_token = $1,
                                activation_token_expiry = $2
                            WHERE email = $3
                        `;

                await pool.query(query, [token, expiry, emailID]);
    
      }
      catch(error)
      {
          console.error('Error inserting activation token:',error);
      }
}


export const getActivationTokenAndExpiryByEmailID = async (emailID) => {
//

  try{
                const query = `
                            SELECT activation_token, activation_token_expiry from users where email=$1;
                        `;
                console.log(emailID);
                const values = [emailID];
               const result = await pool.query(query, values);
               if (result.rowCount > 0) {
                    console.log('Retrieved token and expiry_date from users table');
                    console.log(result.rows[0]);
                    //console.log(result);
                    // Return the ID of the inserted user
                    return {activation_token: result.rows[0].activation_token,activation_token_expiry: result.rows[0].activation_token_expiry};
                  } else {
                        console.log("error");
                        throw new error("Query failed");
                }
      }
      catch(error)
      {
          console.error('Invalid Emaild');
      }
}

export const setAccountActivation = async (emailID,activationstatus) => {
//

  try{
                const query = `
                            UPDATE users
                            SET is_active = $1,
                            activation_token=null,
                            activation_token_expiry=null
                            WHERE email = $2
                        `;
                        

               const result = await pool.query(query, [activationstatus,emailID]);
               
      }
      catch(error)
      {
          console.error('Error inserting activation token:',error);
      }
}

export const setPasswordCodeWithExpiry = async (token,expiry,emailID) => 
    
{
//

try{
                const query = `
                            UPDATE users
                            SET  reset_password_token= $1,
                                reset_password_token_expiry = $2
                            WHERE email = $3
                        `;

                await pool.query(query, [token, expiry, emailID]);
    
      }
      catch(error)
      {
          console.error('Error inserting password token:',error);
      }
}