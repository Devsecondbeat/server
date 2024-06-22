import pg from 'pg';
const {Pool} = pg;

const pool = new Pool({
    host: 'bubble.db.elephantsql.com',       // You can change this to your host
    port: 5432,              // Change to your port if different
    user: 'aciknpsz',   // Your PostgreSQL username
    password: 'G4bbazVGla6JD1JrIPKRcPYMlh7lIldR',   // Your PostgreSQL password
    database: 'aciknpsz'    // Your database name
});


async function fetchAllRecords() {
    try {
        //await client.connect();

        const queryText = 'SELECT * FROM instrument_makes';  // Replace 'your_table_name' with your actual table name
        const { rows } = await pool.query(queryText);

        console.log(rows);

    } catch (err) {
        console.error('Error executing query', err.stack);
    } 
}
fetchAllRecords();


   

