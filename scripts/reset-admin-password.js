#!/usr/bin/env node
/**
 * Reset the password for an admin user.
 * Usage:
 *   node scripts/reset-admin-password.js [username] [newPassword]
 *
 * Defaults to resetting the 'admin' user to 'admin123' if no args given.
 */

import bcrypt from 'bcrypt';
import Database from 'better-sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data.db');

const username = process.argv[2] || 'admin';
const newPassword = process.argv[3] || 'admin123';

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

const user = db.prepare("SELECT id, username, role FROM users WHERE username = ?").get(username);

if (!user) {
  console.error(`User '${username}' not found.`);
  process.exit(1);
}

if (user.role !== 'admin') {
  console.error(`User '${username}' is not an admin (role: ${user.role}). Aborting.`);
  process.exit(1);
}

const hash = bcrypt.hashSync(newPassword, 10);
const result = db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, user.id);

if (result.changes > 0) {
  console.log(`Password reset for admin user '${username}'.`);
  console.log(`New password: ${newPassword}`);
} else {
  console.error('Failed to update password.');
  process.exit(1);
}

db.close();
