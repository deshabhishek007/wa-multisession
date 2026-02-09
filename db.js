import Database from 'better-sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, 'data.db');
let db = null;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

export function initDb() {
  const database = getDb();
  database.pragma('foreign_keys = ON');
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user'))
    );
    CREATE TABLE IF NOT EXISTS user_instances (
      user_id INTEGER NOT NULL,
      instance_id TEXT NOT NULL,
      PRIMARY KEY (user_id, instance_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_user_instances_user ON user_instances(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_instances_instance ON user_instances(instance_id);
    CREATE TABLE IF NOT EXISTS instance_api_keys (
      instance_id TEXT PRIMARY KEY,
      api_key TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS instance_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      instance_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      from_jid TEXT NOT NULL,
      sender_display TEXT NOT NULL,
      body TEXT NOT NULL,
      message_timestamp INTEGER,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      UNIQUE(instance_id, message_id)
    );
    CREATE INDEX IF NOT EXISTS idx_instance_messages_instance ON instance_messages(instance_id);
    CREATE INDEX IF NOT EXISTS idx_instance_messages_created ON instance_messages(instance_id, created_at DESC);
  `);
  seedAdminIfNeeded(database);
  // Checkpoint WAL so the main data.db file has schema + data (visible in external tools)
  try {
    database.pragma('wal_checkpoint(TRUNCATE)');
  } catch (_) {
    console.error('Error checkpointing WAL', _);
  }
  return database;
}

function seedAdminIfNeeded(database) {
  const row = database.prepare('SELECT 1 FROM users LIMIT 1').get();
  if (row) return;
  const hash = bcrypt.hashSync('admin123', 10);
  database.prepare("INSERT INTO users (username, password_hash, role) VALUES ('admin', ?, 'admin')").run(hash);
  console.log('Seeded default admin user: admin / admin123');
}

export function getUserById(id) {
  return getDb().prepare('SELECT id, username, role FROM users WHERE id = ?').get(id);
}

export function getUserByUsername(username) {
  return getDb().prepare('SELECT id, username, password_hash, role FROM users WHERE username = ?').get(username);
}

export function verifyLogin(username, password) {
  const user = getUserByUsername(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return null;
  return { id: user.id, username: user.username, role: user.role };
}

export function getAllUsers() {
  return getDb().prepare('SELECT id, username, role FROM users ORDER BY username').all();
}

export function createUser(username, password, role = 'user') {
  const hash = bcrypt.hashSync(password, 10);
  const result = getDb()
    .prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)')
    .run(username, hash, role);
  return result.lastInsertRowid;
}

export function userCanAccessInstance(userId, role, instanceId) {
  if (role === 'admin') return true;
  const row = getDb()
    .prepare('SELECT 1 FROM user_instances WHERE user_id = ? AND instance_id = ?')
    .get(userId, instanceId);
  return !!row;
}

export function getInstanceIdsForUser(userId, role) {
  if (role === 'admin') return null; // null = all instances
  return getDb()
    .prepare('SELECT instance_id FROM user_instances WHERE user_id = ?')
    .all(userId)
    .map((r) => r.instance_id);
}

export function assignInstanceToUser(userId, instanceId) {
  getDb().prepare('INSERT OR IGNORE INTO user_instances (user_id, instance_id) VALUES (?, ?)').run(userId, instanceId);
}

export function removeInstanceFromUser(userId, instanceId) {
  getDb().prepare('DELETE FROM user_instances WHERE user_id = ? AND instance_id = ?').run(userId, instanceId);
}

export function getAssignmentsForUser(userId) {
  return getDb()
    .prepare('SELECT instance_id FROM user_instances WHERE user_id = ?')
    .all(userId)
    .map((r) => r.instance_id);
}

export function getUsersForInstance(instanceId) {
  return getDb()
    .prepare('SELECT u.id, u.username, u.role FROM users u JOIN user_instances ui ON u.id = ui.user_id WHERE ui.instance_id = ?')
    .all(instanceId);
}

export function updateUserPassword(userId, newPassword) {
  const hash = bcrypt.hashSync(newPassword, 10);
  const result = getDb().prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId);
  return result.changes > 0;
}

export function deleteUser(userId) {
  const id = typeof userId === 'number' ? userId : parseInt(userId, 10);
  if (Number.isNaN(id)) return false;
  const result = getDb().prepare('DELETE FROM users WHERE id = ?').run(id);
  return result.changes > 0;
}

export function getAdminCount() {
  const row = getDb().prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'").get();
  return row?.n ?? 0;
}

export function setInstanceApiKey(instanceId, apiKey) {
  getDb()
    .prepare('INSERT OR REPLACE INTO instance_api_keys (instance_id, api_key) VALUES (?, ?)')
    .run(instanceId, apiKey);
}

export function getInstanceApiKey(instanceId) {
  const row = getDb().prepare('SELECT api_key FROM instance_api_keys WHERE instance_id = ?').get(instanceId);
  return row?.api_key ?? null;
}

export function getInstanceIdByApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') return null;
  const row = getDb().prepare('SELECT instance_id FROM instance_api_keys WHERE api_key = ?').get(apiKey.trim());
  return row?.instance_id ?? null;
}

export function deleteInstanceApiKey(instanceId) {
  getDb().prepare('DELETE FROM instance_api_keys WHERE instance_id = ?').run(instanceId);
}

export function insertMessage(instanceId, messageId, fromJid, senderDisplay, body, messageTimestamp) {
  const created = Math.floor(Date.now() / 1000);
  console.log('insertMessage', instanceId, messageId, fromJid, senderDisplay, body, messageTimestamp);
  const ts = messageTimestamp != null ? Number(messageTimestamp) : created;
  try {
  getDb()
    .prepare(
      `INSERT INTO instance_messages (instance_id, message_id, from_jid, sender_display, body, message_timestamp, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(instanceId, messageId, fromJid, senderDisplay || fromJid, body || '', ts, created);
  } catch (e) {
    console.error('Error inserting message', e);
  }
}

export function getMessagesForInstance(instanceId, limit = 500) {
  return getDb()
    .prepare(
      `SELECT id, instance_id, message_id, from_jid, sender_display, body, message_timestamp, created_at
       FROM instance_messages WHERE instance_id = ? ORDER BY created_at DESC LIMIT ?`
    )
    .all(instanceId, limit);
}

export function deleteMessagesForInstance(instanceId) {
  getDb().prepare('DELETE FROM instance_messages WHERE instance_id = ?').run(instanceId);
}
