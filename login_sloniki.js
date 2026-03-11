import bcrypt from 'bcrypt';
// import { hash } from 'node:crypto';
// import { createReadStream, read } from 'node:fs';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import dotenv from 'dotenv'
import pg from 'pg';

dotenv.config()

const { Pool } = pg;
const pool = new Pool({
   connectionString: `${process.env.DB_URL}`,
   ssl: {
      rejectUnauthorized: false
   }
});

const initializeDatabase = async () => {
   console.log('🔄️ Initializing sloniki database...');

   const createTableQuery = `
    CREATE TABLE IF NOT EXISTS sloniki (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,           
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;
   try {
      await pool.query(createTableQuery);
    //   console.log('✅  The sloniki table is ready to go.');
   } catch (error) {
      console.error('❗ Error initializing database:', error.message);
      console.error('Full error:', error);
      throw error;
   }
};
const saltRounds = 10;
async function registerSlonik(username, password) {
   try {
      const hash = await bcrypt.hash(password, saltRounds);
      const query = `
      INSERT INTO sloniki (
            username, password_hash
        )
        VALUES ($1, $2) 
        RETURNING *`;
   const res = await pool.query(query, [username, hash]);
    
    console.log('✅ Slonik registered successfully:', res.rows[0].username);
    console.log('✅ Password hash stored securely.');
  } catch (err) {
    console.error('❗ Error registering slonik:', err.message);
  }
}

async function loginSlonik(username, password) {
   try {
      const res = await pool.query('SELECT * FROM sloniki WHERE username = $1', [username]);
      if (res.rows.length === 0) {
         console.log('❌ No slonik found with that username.');
         return;
      }
      const slonik = res.rows[0];
      const isMatch = await bcrypt.compare(password, slonik.password_hash);
      if (isMatch) {
         console.log('✅ Login successful.');
      } else {
         console.log('❌ Invalid password.');
      }
   } catch (err) {
      console.error('❗ Error during login:', err.message);
   }
}


async function deleteSlonik(id) {
   await pool.query('DELETE FROM sloniki WHERE id = $1', [id]);
   console.log(`✅  The slonik with ID ${id} has been removed from the database..`);
}

async function getAllSloniki() {
   const res = await pool.query('SELECT * FROM sloniki ORDER BY id ASC');
   console.log('✨ List of all sloniki:');
   console.table(res.rows);
}
const run = async () => {
   await initializeDatabase();
}
const username = process.argv[3];
const password = process.argv[4];


switch (process.argv[2]) {
   case 'list':
      await getAllSloniki();
      break;
   case 'register':
      if (!username || !password) {
         console.error('❗ Please enter both username and password: node <fileName>.js register <username> <password>');
         process.exit(1);
      }
      await registerSlonik(username, password);
      break;
    case 'delete':
        await deleteSlonik (process.argv[3]);
        break;
   case 'login':
      if (!username || !password) {
         console.error('❗ Please enter both username and password: node <fileName>.js login <username> <password>');
         process.exit(1);
      }
      await loginSlonik(username, password);
      break;

      case 'help':
      console.log('————————————————————————————————————————————');
      console.log('Available commands:');
      console.log('1️⃣  list - Display all elephants');
      console.log('2️⃣  register + <username> <password> - Register a new slonik');
      console.log('3️⃣  login + <username> <password> - Login as a slonik');
      console.log('4️⃣  delete + <id> - Delete a slonik by ID');
      console.log('5️⃣  help - Display available commands');
      console.log('—————————————————————————————————————————————')
      break;
   default:
      console.log('❗ Unknown command. Use "help" to see all available commands.');
      break;
}
