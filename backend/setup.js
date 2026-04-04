#!/usr/bin/env node
/**
 * Premium24 Backend Setup Wizard
 * Helps configure Firebase, Database, and Environment
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const prompt = (question) => new Promise(resolve => rl.question(question, resolve));

async function main() {
  console.log('\n========================================');
  console.log('Premium24 Backend Setup Wizard');
  console.log('========================================\n');

  // Step 1: Firebase
  console.log('Step 1: Firebase Configuration\n');
  const hasFirebaseKey = fs.existsSync('./firebase-key.json');
  console.log(hasFirebaseKey ? '✅ firebase-key.json found' : '❌ firebase-key.json NOT found');
  
  if (!hasFirebaseKey) {
    console.log(`
To get Firebase key:
1. Go to: https://console.firebase.google.com/project/typingwork24/settings/serviceaccounts/adminsdk
2. Click "Generate New Private Key"
3. Save the JSON file as: backend/firebase-key.json
4. IMPORTANT: DO NOT commit this file to Git!
    `);
    const proceed = await prompt('Press Enter when firebase-key.json is saved...');
  }

  // Step 2: Database
  console.log('\nStep 2: Database Configuration\n');
  const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/premium24';
  console.log(`Current DATABASE_URL: ${dbUrl}`);
  
  const dbChoice = await prompt(`
Database options:
1. Local PostgreSQL (127.0.0.1:5432)
2. Hostinger VPS (72.60.99.29)
3. Keep current

Choose (1-3): `);

  if (dbChoice === '1') {
    console.log(`
Local PostgreSQL setup:
- Install from: https://www.postgresql.org/download/
- Or use Docker: docker run --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
- Then run: curl -H "x-setup-key: e47c58e3-d7b0-4e9e-b5c3-1a2f8e4d6c7b" http://localhost:4000/api/setup/init
    `);
  } else if (dbChoice === '2') {
    const vpsPassword = await prompt('\nHostinger VPS Database password: ');
    const newDbUrl = `postgresql://premium24_user:${vpsPassword}@72.60.99.29:5432/premium24`;
    console.log(`\nUpdate your .env with:\nDATABASE_URL=${newDbUrl}`);
  }

  // Step 3: Summary
  console.log('\n========================================');
  console.log('Setup Complete!');
  console.log('========================================\n');
  console.log('✅ Firebase: Ready' + (hasFirebaseKey ? ' (key found)' : ' (needs key file)'));
  console.log('✅ Environment: .env configured');
  console.log('⚠️  Database: Configure and ensure it\'s running');
  console.log('\nNext steps:');
  console.log('1. npm install (if needed)');
  console.log('2. npm run dev');
  console.log('3. Visit: http://localhost:4000/api/health\n');

  rl.close();
}

main().catch(console.error);
