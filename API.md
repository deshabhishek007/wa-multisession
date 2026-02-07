# WhatsApp Multi-Instance API Specification

Base URL: `http://localhost:3000` (or your server origin)

All JSON responses use `Content-Type: application/json`. On error, the body typically includes an `error` string.

---

## Authentication

### Session (dashboard / browser)

- **Login:** `POST /api/login` with `{ username, password }`. On success, a session cookie is set.
- **Other endpoints:** Send the session cookie with each request (same origin or `credentials: 'include'` for cross-origin).

### Instance API key (server-to-server / scripts)

For instance-scoped routes you can use an **instance API key** instead of a session:

- **Header:** `X-API-Key: <instance-api-key>`  
  or **Header:** `Authorization: Bearer <instance-api-key>`
- The key must belong to the instance in the URL (e.g. `POST /api/instances/myinstance/send-message`).
- Keys are per instance; get or regenerate them via the dashboard or via session-authenticated API calls.

---

## Auth & current user

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/login` | None | Log in. |
| `POST` | `/api/logout` | None | Log out (destroy session). |
| `GET` | `/api/check-auth` | None | Check if session is valid. |
| `GET` | `/api/me` | Session | Get current user. |

### POST /api/login

**Request body:**

```json
{
  "username": "string",
  "password": "string"
}
```

**Success (200):**

```json
{
  "success": true,
  "user": { "id": 1, "username": "admin", "role": "admin" }
}
```

**Errors:** `401` — Invalid credentials.

---

### GET /api/check-auth

**Success (200):**

- Authenticated: `{ "authenticated": true, "user": { "id", "username", "role" } }`
- Not authenticated: `{ "authenticated": false }`

---

### GET /api/me

**Auth:** Session required.

**Success (200):**

```json
{
  "id": 1,
  "username": "admin",
  "role": "admin"
}
```

`role` is either `"admin"` or `"user"`.

**Errors:** `401` — Unauthorized.

---

## Instances

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/instances` | Session | List instances (filtered by user/role). |
| `POST` | `/api/instances` | Admin | Create instance. |
| `DELETE` | `/api/instances/:instanceId` | Admin | Delete instance. |
| `GET` | `/api/instances/:instanceId/api-key` | Session or API key | Get instance API key. |
| `POST` | `/api/instances/:instanceId/api-key/regenerate` | Session or API key | Regenerate instance API key. |
| `POST` | `/api/instances/:instanceId/send-message` | Session or API key | Send a WhatsApp message. |
| `GET` | `/api/instances/:instanceId/users` | Admin | List users assigned to instance. |

### GET /api/instances

**Auth:** Session. Admin sees all instances; users see only assigned instances.

**Success (200):**

```json
[
  { "id": "client1", "status": "ready" },
  { "id": "client2", "status": "qr_ready" }
]
```

`status`: `initializing` | `qr_ready` | `authenticated` | `ready` | `disconnected`

---

### POST /api/instances

**Auth:** Admin only.

**Request body:**

```json
{
  "instanceId": "string"
}
```

**Success (200):**

```json
{
  "success": true,
  "instanceId": "client1"
}
```

**Errors:** `400` — Instance ID required / Instance already exists. `500` — Server error.

---

### DELETE /api/instances/:instanceId

**Auth:** Admin only.

**Success (200):** `{ "success": true }`

**Errors:** `404` — Instance not found. `500` — Server error.

---

### GET /api/instances/:instanceId/api-key

**Auth:** Session (user must have access to this instance) or instance API key.

Returns the API key for the instance. If none exists, one is created and returned.

**Success (200):**

```json
{
  "apiKey": "64-char-hex-string"
}
```

**Errors:** `401` — Invalid API key or not allowed. `404` — Instance not found.

---

### POST /api/instances/:instanceId/api-key/regenerate

**Auth:** Session (with access) or instance API key.

Generates a new API key; the previous key stops working.

**Success (200):**

```json
{
  "apiKey": "64-char-hex-string"
}
```

---

### POST /api/instances/:instanceId/send-message

**Auth:** Session (with access to this instance) or instance API key.

**Request body:**

```json
{
  "to": "919876543210",
  "message": "Hello from API"
}
```

- **to:** Phone number with country code, digits only (e.g. `919876543210`). No `+` or spaces.
- **message:** Text to send.

**Success (200):**

```json
{
  "success": true,
  "messageId": "true_1234567890@c.us_3EB0XXXXX"
}
```

**Errors:** `400` — `to` and `message` required. `401` — Invalid API key or access. `404` — Instance not found. `503` — Instance not ready (e.g. WhatsApp not connected). `500` — Send failed.

**Example with API key:**

```bash
curl -X POST "http://localhost:3000/api/instances/client1/send-message" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_INSTANCE_API_KEY" \
  -d '{"to": "919876543210", "message": "Hello"}'
```

---

### GET /api/instances/:instanceId/users

**Auth:** Admin only.

**Success (200):** Array of users assigned to this instance:

```json
[
  { "id": 2, "username": "agent1", "role": "user" }
]
```

**Errors:** `404` — Instance not found.

---

## Users (admin only)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/users` | Admin | List all users. |
| `POST` | `/api/users` | Admin | Create user. |
| `DELETE` | `/api/users/:userId` | Admin | Delete user. |
| `PATCH` | `/api/users/:userId/password` | Admin | Set user password. |
| `GET` | `/api/users/:userId/instances` | Admin | List instances assigned to user. |
| `POST` | `/api/users/:userId/instances` | Admin | Assign instance to user. |
| `DELETE` | `/api/users/:userId/instances/:instanceId` | Admin | Remove instance from user. |

### GET /api/users

**Success (200):**

```json
[
  { "id": 1, "username": "admin", "role": "admin" },
  { "id": 2, "username": "agent1", "role": "user" }
]
```

---

### POST /api/users

**Request body:**

```json
{
  "username": "string",
  "password": "string",
  "role": "user"
}
```

`role` optional; `"admin"` or `"user"` (default `"user"`).

**Success (201):**

```json
{
  "id": 2,
  "username": "agent1",
  "role": "user"
}
```

**Errors:** `400` — Username and password required / Username already exists.

---

### DELETE /api/users/:userId

**Success (200):** `{ "success": true, "deleted": true }`  
If user was already missing: `{ "success": true, "deleted": false }`.

**Errors:** `400` — Cannot delete your own account / Cannot delete the last admin. `404` — User not found (when using strict behavior).

---

### PATCH /api/users/:userId/password

**Request body:**

```json
{
  "password": "newPassword"
}
```

**Success (200):** `{ "success": true }`

**Errors:** `400` — Password required. `404` — User not found.

---

### GET /api/users/:userId/instances

**Success (200):** Array of instance IDs assigned to the user:

```json
["client1", "client2"]
```

**Errors:** `404` — User not found.

---

### POST /api/users/:userId/instances

**Request body:**

```json
{
  "instanceId": "client1"
}
```

**Success (200):** `{ "success": true }`

**Errors:** `400` — Valid instanceId required. `404` — User not found.

---

### DELETE /api/users/:userId/instances/:instanceId

**Success (200):** `{ "success": true }`

Removes the instance assignment for the user.

---

## HTTP status summary

| Code | Meaning |
|------|--------|
| 200 | Success |
| 201 | Created (e.g. new user) |
| 400 | Bad request (validation, business rule) |
| 401 | Unauthorized (not logged in or invalid API key) |
| 403 | Forbidden (e.g. admin only, or no access to instance) |
| 404 | Not found (instance, user, etc.) |
| 500 | Server error |
| 503 | Service unavailable (e.g. instance not ready for send-message) |
