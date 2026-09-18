// Run: node scripts/generate-admin-hash.js "yourPasswordHere"
// Paste the printed hash into api/_lib/admins.json as "passwordHash".
import bcrypt from 'bcryptjs';

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/generate-admin-hash.js "yourPassword"');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log('\nAdd this to api/_lib/admins.json as "passwordHash":\n');
console.log(hash);
console.log('');
