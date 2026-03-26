import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config( )

const SALT_ROUNDS = 10;

const { Pool } = pg;
const pool = new Pool({
   connectionString: `${process.env.DB_URL}`,
   ssl: {
      rejectUnauthorized: false
   }
});

const initializeDatabase = async () => {
   console.log('-----------------------------------------------');
   console.log('Initializing sloniki database...');

   const createTableQuery = `
    CREATE TABLE IF NOT EXISTS sloniki (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    age TEXT NOT NULL,
    place_of_birth TEXT NOT NULL,           
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
      `;
   try {
      await pool.query(createTableQuery);
   } catch (error) {
      console.error('!! Error initializing database');
      // console.error('Full error:', error);
      throw error;
   }
};


async function getAllSloniki() {
   const res = await pool.query('SELECT * FROM sloniki ORDER BY id ASC'); //ASC - по зростанню, DESC - спадання
   console.log('✨ List of all sloniki:');
   console.table(res.rows.map(slonik => ({
      id: slonik.id,
      username: slonik.username,
      password_hash: slonik.password_hash,
      age: slonik.age,
      place_of_birth: slonik.place_of_birth,
      created_at: slonik.created_at
   })));
}

async function registerSlonik(username, password, age, place_of_birth) {
   try {
      const hash = await bcrypt.hash(password, SALT_ROUNDS);
      const query = `
      INSERT INTO sloniki (
            username, password_hash, age, place_of_birth
        )
        VALUES ($1, $2, $3, $4) 
        RETURNING *`;
   const res = await pool.query(query, [username, hash, age, place_of_birth]);
    
    console.log(`✓ Slonik registered successfully: @${res.rows[0].username}`);
    console.log('✓ Password hash stored securely.');
   } catch (err) { console.error(err)
      // console.error(`!! Error registering slonik: this slonik: @${username} is already exist`);
   }
}

async function loginSlonik(username, password) {
   try {
      const res = await pool.query('SELECT * FROM sloniki WHERE username = $1', [username]);
      if (res.rows.length === 0) {
         console.log(`??? No slonik found with that username @${username}.`);
         return;
      }
      const slonik = res.rows[0];
      const isMatch = await bcrypt.compare(password, slonik.password_hash);
      if (isMatch) {
         console.log('✓ Login successful.');
      } else {
         console.log('??? Invalid password.');
      }
   } catch (err) {
      console.error('!! Error during login');
   }
}


async function deleteSlonik(username, password) {
   try {
      const res = await pool.query('SELECT * FROM sloniki WHERE username = $1', [username]);
      if (res.rows.length === 0) {
         console.log('??? No slonik found with that username.');
         return;
      }
      const slonik = res.rows[0];
      const isMatch = await bcrypt.compare(password, slonik.password_hash);
      if (isMatch) {
         await pool.query('DELETE FROM sloniki WHERE username = $1', [username]);
         console.log(`✓  The slonik @${username} has been removed from the database..`);
      } else {
         console.log('??? Invalid password.');
      }
   } catch (err) {
      console.error('!! Error during deletion');
   }
}

async function updateSlonikPassword(username, password, newPassword) {
   try {
      const res = await pool.query('SELECT * FROM sloniki WHERE username = $1', [username]);
      if (res.rows.length === 0) {
         console.log('??? No slonik found with that username.');
         return;
      }

      const slonik = res.rows[0];
      const isMatch = await bcrypt.compare(password, slonik.password_hash);
      if (isMatch) {
         try {
            const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
            await pool.query('UPDATE sloniki SET password_hash = $1 WHERE username = $2', [hash, username]);
            console.log(`✓ Password updated for  @${username}`);
         } catch (err) {
            console.error('!! Error updating slonik password',);
         }
      } else {
         console.log('??? Invalid password.');
      }
   } catch (err) {
      console.error('!! Error during password update');
   }
}
async function updateSlonikAge (username, password, newAge) {
   try {
      const res = await pool.query('SELECT * FROM sloniki WHERE username = $1', [username]);
      if (res.rows.length === 0) {
         console.log('??? No slonik found with that username.');
         return;
      }
      const slonik = res.rows[0];
      const isMatch = await bcrypt.compare(password, slonik.password_hash);
      if (isMatch) {
         await pool.query('UPDATE sloniki SET age = $1 WHERE username = $2', [newAge, username]);
         console.log(`✓ Age updated for  @${username}`);
      } else {
         console.log('??? Invalid password.');
      }
   } catch (err) {
      console.error('!! Error during age update');
   }
}

async function updateSlonikPlaceOfBirth (username, password, newPlaceOfBirth) {
   try {
      const res = await pool.query('SELECT * FROM sloniki WHERE username = $1', [username]); 
      if (res.rows.length === 0) {
         console.log('??? No slonik found with that username.');
         return;
      }
      const slonik = res.rows[0];
      const isMatch = await bcrypt.compare(password, slonik.password_hash);
      if (isMatch) {
         await pool.query('UPDATE sloniki SET place_of_birth = $1 WHERE username = $2', [newPlaceOfBirth, username]);
         console.log(`✓ Place of birth updated for  @${username}`);
      } else {
         console.log('??? Invalid password.');
      }

   } catch (err) {
      console.error('!! Error during place of birth update');
   }
}

await initializeDatabase();

const command = process.argv[2];
const username = process.argv[3];
const password = process.argv[4];
const newPassword = process.argv[5];
const newAge = process.argv[5];
const newPlaceOfBirth = process.argv[6];

switch (command) {
   case 'list':
      await getAllSloniki();
      break;
   case 'register':
      if (!username || !password || !newAge || !newPlaceOfBirth) {
         console.error('!! Please enter all required fields: node <fileName>.js register <username> <password> <age> <place_of_birth>');
         process.exit(1);
      }
      await registerSlonik(username, password, newAge, newPlaceOfBirth);
      break;
   case 'login':
      if (!username || !password) {
         console.error('!! Please enter both username and password: node <fileName>.js login <username> <password>');
         process.exit(1);
      }
      await loginSlonik(username, password);
      break;
   case 'delete':
      await deleteSlonik (username, password);
      if (!username || !password) {
      console.error('!! Please enter username and current password: node <fileName>.js delete <username> <current_password>');
      process.exit(1);
   }
      break;
   case 'updatePassword':
      if (!username || !password || !newPassword) {
         console.error('!! Please enter username, current password and new password: node <fileName>.js update-password <username> <current_password> <new_password>');
         process.exit(1);
      }
      await updateSlonikPassword(username, password, newPassword);
      break;
   case 'updateAge':
      if (!username || !password || !newAge) {
         console.error('!! Please enter username, current password and new age: node <fileName>.js update-age <username> <current_password> <new_age>');
         process.exit(1);
      }
      await updateSlonikAge(username, password, newAge);
      break;
   case 'updatePlaceOfBirth':
      if (!username || !password || !newPlaceOfBirth) {
         console.error('!! Please enter username, current password and new place of birth: node <fileName>.js update-place-of-birth <username> <current_password> <new_place_of_birth>');
         process.exit(1);
      }
      await updateSlonikPlaceOfBirth(username, password, newPlaceOfBirth);
      break;
   case 'help':
      console.log('————————————————————————————————————————————');
      console.log('Available commands:');
      console.log('1️  list - Display all sloniki');
      console.log('2️  register + <username> <password> <age> <place_of_birth> - Register a new slonik');
      console.log('3️  login + <username> <password> - Login as a slonik');
      console.log('4️  updatePassword + <username> <current_password> <new_password> - Update a slonik password');
      console.log('5  updateAge + <username> <current_password> <new_age> - Update a slonik age');
      console.log('6️  updatePlaceOfBirth + <username> <current_password> <new_place_of_birth> - Update a slonik place of birth');
      console.log('7️  delete + <id> - Delete a slonik by ID');
      console.log('8️  help - Display available commands');
      console.log('—————————————————————————————————————————————')
      break;
   default:
      console.log('!! Unknown command. Use "help" to see all available commands.');
      break;
}
console.log('-----------------------------------------------');