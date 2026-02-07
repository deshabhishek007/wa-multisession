const dev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;
export const API_BASE = dev ? 'http://localhost:3000' : '';
export function getWsUrl() {
  if (dev) return 'ws://localhost:3000';
  const protocol = typeof location !== 'undefined' && location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${typeof location !== 'undefined' ? location.host : ''}`;
}

export async function checkAuth() {
  const res = await fetch(`${API_BASE}/api/check-auth`);
  const data = await res.json();
  return { authenticated: data.authenticated, user: data.user || null };
}

export async function getMe() {
  const res = await fetch(`${API_BASE}/api/me`);
  if (!res.ok) return null;
  return res.json();
}

export async function login(username, password) {
  const res = await fetch(`${API_BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) return { ok: false };
  const data = await res.json();
  return { ok: true, user: data.user };
}

export async function logout() {
  await fetch(`${API_BASE}/api/logout`, { method: 'POST' });
}

export async function getInstances() {
  const res = await fetch(`${API_BASE}/api/instances`);
  if (!res.ok) throw new Error('Failed to load instances');
  return res.json();
}

export async function createInstance(instanceId) {
  const res = await fetch(`${API_BASE}/api/instances`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instanceId })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create instance');
  }
}

export async function deleteInstance(instanceId) {
  const res = await fetch(`${API_BASE}/api/instances/${instanceId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete instance');
}

export async function getUsers() {
  const res = await fetch(`${API_BASE}/api/users`);
  if (!res.ok) throw new Error('Failed to load users');
  return res.json();
}

export async function createUser(username, password, role) {
  const res = await fetch(`${API_BASE}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, role })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create user');
  }
  return res.json();
}

export async function assignInstanceToUser(userId, instanceId) {
  const res = await fetch(`${API_BASE}/api/users/${userId}/instances`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instanceId })
  });
  if (!res.ok) throw new Error('Failed to assign instance');
}

export async function removeInstanceFromUser(userId, instanceId) {
  const res = await fetch(`${API_BASE}/api/users/${userId}/instances/${instanceId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to remove assignment');
}

export async function getInstanceUsers(instanceId) {
  const res = await fetch(`${API_BASE}/api/instances/${instanceId}/users`);
  if (!res.ok) throw new Error('Failed to load users');
  return res.json();
}

export async function getUserInstances(userId) {
  const res = await fetch(`${API_BASE}/api/users/${userId}/instances`);
  if (!res.ok) throw new Error('Failed to load assignments');
  return res.json();
}
