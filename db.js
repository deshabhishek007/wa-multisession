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
  `);
  seedAdminIfNeeded(database);
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
