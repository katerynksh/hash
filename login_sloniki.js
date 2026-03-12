import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config()

const SALT_ROUNDS = 10;

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
   } catch (error) {
      console.error('❗ Error initializing database:', error.message);
      console.error('Full error:', error);
      throw error;
   }
};

async function registerSlonik(username, password) {
   try {
      const hash = await bcrypt.hash(password, SALT_ROUNDS);
      const query = `
      INSERT INTO sloniki (
            username, password_hash
        )
        VALUES ($1, $2) 
        RETURNING *`;
   const res = await pool.query(query, [username, hash]);
    
    console.log(`✅ Slonik registered successfully: @${res.rows[0].username}`);
    console.log('✅ Password hash stored securely.');
  } catch (err) {
    console.error(`❗ Error registering slonik: this slonik: @${username} is already exist`);
  }
}

async function loginSlonik(username, password) {
   try {
      const res = await pool.query('SELECT * FROM sloniki WHERE username = $1', [username]);
      if (res.rows.length === 0) {
         console.log(`❌ No slonik found with that username @${username}.`);
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
   const res = await pool.query('SELECT * FROM sloniki ORDER BY id ASC'); //ASC - по зростанню, DESC - спадання
   console.log('✨ List of all sloniki:');
   console.table(res.rows);
}

await initializeDatabase();

const username = process.argv[3];
const password = process.argv[4];
const newPassword = process.argv[5];

async function updateSlonikPassword(username, password, newPassword) {
   try {
      const res = await pool.query('SELECT * FROM sloniki WHERE username = $1', [username]);
      if (res.rows.length === 0) {
         console.log('❌ No slonik found with that username.');
         return;
      }
   
      const slonik = res.rows[0];
      const isMatch = await bcrypt.compare(password, slonik.password_hash);
      if (isMatch) {
         try {
            const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
            await pool.query('UPDATE sloniki SET password_hash = $1 WHERE username = $2', [hash, username]);
            console.log(`✅ Password updated for  @${username}`);
         } catch (err) {
            console.error('❗ Error updating slonik password:', err.message);
         }
      } else {
         console.log('❌ Invalid password.');
      }
   } catch (err) {
      console.error('❗ Error during password update:', err.message);
   }
}


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
        await deleteSlonik (username);
        break;
    case 'update-password':
      if (!username || !password || !newPassword) {
         console.error('❗ Please enter username, current password and new password: node <fileName>.js update-password <username> <current_password> <new_password>');
         process.exit(1);
      }
      await updateSlonikPassword(username, password, newPassword);
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
      console.log('1️⃣  list - Display all sloniki');
      console.log('2️⃣  register + <username> <password> - Register a new slonik');
      console.log('3️⃣  login + <username> <password> - Login as a slonik');
      console.log('4️⃣  update-password + <username> <current_password> <new_password> - Update a slonik password');
      console.log('5️⃣  delete + <id> - Delete a slonik by ID');
      console.log('6️⃣  help - Display available commands');
      console.log('—————————————————————————————————————————————')
      break;
   default:
      console.log('❗ Unknown command. Use "help" to see all available commands.');
      break;
}
