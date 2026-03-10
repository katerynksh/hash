import bcrypt from 'bcrypt';
import { hash } from 'node:crypto';
import { createReadStream, read } from 'node:fs';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const saltRounds = 10;
const fileName = 'passwords.txt';
const inputPassword = process.argv[2];

if (!inputPassword) {
    console.error("Please enter a password: node hash.js <your_password>");
    process.exit(1);
}
let storedHash = '';
if (existsSync(fileName)) {
    storedHash = readFileSync(fileName, 'utf8').trim();
}

bcrypt.compare(
    inputPassword,
    storedHash,
).then ((data) => {
    console.log(data);        
}).catch((err) => {
    console.error(err);
});
if (!storedHash) {
    // Якщо хешу немає — створюємо його і зберігаємо у файл
    const hash = await bcrypt.hash(inputPassword, saltRounds);
    writeFileSync(fileName, hash);
    console.log(`Hash saved to ${fileName}`);
} else {
    // Якщо хеш є — порівнюємо його з введеним паролем
    const isMatch = await bcrypt.compare(inputPassword, storedHash);
    
    if (isMatch) {
        console.log("Authenticated successfully");
    } else {
        console.log("Wrong password");
    }
}