# WaHub API: Webhook implementation guide

This app receives **incoming WhatsApp events** from WaHub via HTTP webhooks. So that our endpoint works with your API, WaHub must send POST requests to our webhook URL when events occur (e.g. new message).

---

## 1. Webhook URL to register in WaHub

Register this URL in the WaHub dashboard (or config) **per instance** (include the instance ID in the path):

```text
https://YOUR_SERVER/public_url/webhook/wahub/:instanceId
```

Examples:

- Local dev (expose with ngrok): `https://abc123.ngrok.io/webhook/wahub/myinstance`
- Production: `https://yourdomain.com/webhook/wahub/myinstance`

Our app expects **POST** requests with **JSON** body. Authentication is by **instance API key**: send `X-API-Key: <key>` or `Authorization: Bearer <key>` (the key must belong to the instance in the URL).

---

## 2. Request format WaHub must send

### 2.1 Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |
| `X-Webhook-Signature` or `X-Wahub-Signature` | If secret set | HMAC-SHA256 signature (see § 3) |

### 2.2 Body: event + payload

We accept a **single event** per request. Prefer an explicit event type and a clear payload.

**Option A – Event wrapper (recommended)**

```json
{
  "event": "message",
  "data": {
    "from": "919876543210",
    "body": "Hello",
    "id": "msg-uuid-123"
  }
}
```

- `event` (or `type` or `eventType`): string — e.g. `"message"`, `"messages"`, `"status"`.
- `data`: object or array — event payload (see below for message shape).

**Option B – Multiple messages in one request**

```json
{
  "event": "messages",
  "data": [
    { "from": "919876543210", "body": "Hi", "id": "id1" },
    { "from": "919876543210", "body": "Bye", "id": "id2" }
  ]
}
```

**Option C – Flat message**

```json
{
  "message": {
    "from": "919876543210",
    "body": "Hello"
  }
}
```

We also accept `payload`, `payload.data`, or `data.messages` for the same shapes.

### 2.3 Message object shape

For **incoming message** events, each message object should include:

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `from` | Yes* | Sender WhatsApp number (digits, optional country code) | `"919876543210"` or `"9876543210"` |
| `body` or `text` or `content` | Yes* | Message text | `"Hello"` |
| `id` or `messageId` or `key.id` | No | Unique message id (for dedup) | `"3EB0XXXX"` |

\* We need at least `from` and one of `body`/`text`/`content` to process the message.

We also accept:

- `sender` as alias for `from`
- `message.conversation` for text (e.g. from Baileys-style payloads)
- `remoteJid` (we strip `@c.us` / `@s.whatsapp.net` to get the number)

So WaHub can send whatever it already has, as long as we can derive **from** and **body** from one of these field names.

---

## 3. Signature verification (optional but recommended)

If we set `WEBHOOK_SECRET` in our env, we verify the request:

1. WaHub must send header:  
   `X-Webhook-Signature` or `X-Wahub-Signature`
2. Value must be:  
   `sha256=<hex>`  
   where `<hex>` is **HMAC-SHA256**(**raw JSON body**, **WEBHOOK_SECRET**), encoded in hexadecimal.

**WaHub implementation (pseudocode):**

```text
rawBody = exact UTF-8 bytes of the JSON body (as sent in the HTTP request)
signature = HMAC-SHA256(key: WEBHOOK_SECRET, message: rawBody)
header "X-Webhook-Signature" = "sha256=" + hex(signature)
```

- Use the **exact** body bytes (no re-serialization, no extra spaces).
- Our app uses the same secret from env; if the header is missing or wrong we respond **401**.

If WaHub does not send a signature, we accept the webhook only when `WEBHOOK_SECRET` is not set.

---

## 4. Response WaHub will get

- We respond **immediately** with HTTP **200** and a small JSON body, e.g.:

```json
{ "success": true, "received": true }
```

- Processing (e.g. command handling, replying) is done **after** the response, so WaHub should not wait for side effects.
- On invalid JSON or (when secret is set) invalid signature we return **4xx** and a JSON error (e.g. `{ "success": false, "error": "..." }`).

WaHub should treat **200** as “delivered”; retries can follow normal webhook best practices (exponential backoff, max attempts).

---

## 5. Events we handle

| Event | Our behavior |
|-------|------------------|
| `message` / `messages` | We parse message(s), log, and optionally handle commands (e.g. `!ping`, `/nudge …`) and reply via your send-message API. |
| Other / unknown | We log the event type and a few keys; no command handling. |

So for “triggers” (e.g. run something when a message arrives), WaHub only needs to send **message** (or **messages**) events as in § 2. We do the rest (commands, replies, nudges) on our side.

---

## 6. Checklist for WaHub

- [ ] **Webhook URL** – Configurable per instance (or global), e.g. `https://your-server/webhook/wahub`.
- [ ] **HTTP** – POST, `Content-Type: application/json`, body = JSON.
- [ ] **Payload** – At least `event` + `data`, or `message`/`messages` with `from` and `body`/`text`/`content` (see § 2).
- [ ] **Signature** – If we use a secret: compute HMAC-SHA256 of raw body with that secret, send as `X-Webhook-Signature: sha256=<hex>`.
- [ ] **Retries** – On non-2xx or network error, retry with backoff (e.g. 1s, 2s, 4s, …).
- [ ] **Idempotency** – Sending a stable `id` per message helps us avoid duplicate handling if WaHub retries.

---

## 7. Our app env (for reference)

We need these set so we can **send** replies and nudges via WaHub:

- `MESSAGE_API_BASE_URL` – e.g. `https://wahub.whitepigeon.org`
- `MESSAGE_API_KEY` – API key for WaHub
- `MESSAGE_API_INSTANCE_ID` – Instance id (e.g. `dailyinsp`)

Optional:

- `WEBHOOK_SECRET` – Shared secret for `X-Webhook-Signature` (if WaHub supports it).

Our webhook endpoint is **POST** `/webhook/wahub/:instanceId` (authenticated with that instance’s API key; host/port depend on how you deploy this app).

---

## 8. See also

- **[MESSAGE_API.md](MESSAGE_API.md)** – How this app sends messages via WaHub (env vars, curl examples).
