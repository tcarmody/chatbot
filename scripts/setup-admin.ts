#!/usr/bin/env tsx

import * as readline from 'readline';
import { createAdminUser, getAdminUserByEmail } from '../lib/auth';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function main() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   Admin User Setup - Support Ticket System  ║');
  console.log('╚════════════════════════════════════════════╝\n');

  // Check for database configuration
  if (!process.env.POSTGRES_URL) {
    console.log('⚠️  POSTGRES_URL environment variable is not set.');
    console.log('   Make sure to set up Vercel Postgres and configure the connection string.\n');
    console.log('   For local development, add to .env.local:');
    console.log('   POSTGRES_URL=postgres://...\n');
    rl.close();
    return;
  }

  try {
    const email = await question('Email address: ');

    // Check if user already exists
    const existing = await getAdminUserByEmail(email);
    if (existing) {
      console.log('\n❌ An admin user with this email already exists.');
      rl.close();
      return;
    }

    const name = await question('Full name: ');
    const password = await question('Password (min 8 characters): ');

    if (password.length < 8) {
      console.log('\n❌ Password must be at least 8 characters long.');
      rl.close();
      return;
    }

    const roleInput = await question('Role (admin/support) [support]: ');
    const role = (roleInput || 'support') as 'admin' | 'support';

    if (role !== 'admin' && role !== 'support') {
      console.log('\n❌ Role must be either "admin" or "support".');
      rl.close();
      return;
    }

    console.log('\nCreating admin user...');

    const userId = await createAdminUser({
      email,
      name,
      password,
      role,
    });

    console.log('\n✅ Admin user created successfully!');
    console.log(`\nUser ID: ${userId}`);
    console.log(`Email: ${email}`);
    console.log(`Name: ${name}`);
    console.log(`Role: ${role}`);
    console.log('\nYou can now log in at: http://localhost:3000/admin/login\n');

  } catch (error) {
    console.error('\n❌ Error creating admin user:', error);
  } finally {
    rl.close();
  }
}

main();
