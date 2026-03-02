# Group Chat Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add group chat send support to `send-message` and `send-file` APIs (via optional `isGroup` flag), and add `chatType` field to all received message payloads.

**Architecture:** All changes are confined to `server.js`. A shared helper `toChatId(to, isGroup)` replaces the inline chatId construction in both send endpoints. Received messages get a `chatType` field derived from the `from` JID (`@g.us` = group, `@c.us` = private). `API.md` is updated to document the new fields.

**Tech Stack:** Node.js, Express, whatsapp-web.js, WebSocket (ws)

---

### Task 1: Add `toChatId` helper and wire into `send-message`

**Files:**
- Modify: `server.js` (around line 403 in `send-message` handler, and add helper near top of file)

**Step 1: Add the helper function after `getMimetype` (around line 49)**

In `server.js`, after the `getMimetype` function (after line 49), add:

```js
function toChatId(to, isGroup) {
  const raw = String(to).trim();
  if (raw.includes('@')) return raw; // already a full JID, use as-is
  if (isGroup) return raw + '@g.us';
  return raw.replace(/\D/g, '') + '@c.us';
}
```

**Step 2: Update `send-message` to extract `isGroup` and use `toChatId`**

In the `send-message` handler, change:
```js
// OLD (around line 391-394):
const { to, message } = req.body;
// ...
const chatId = String(to).replace(/\D/g, '') + '@c.us';
```
To:
```js
const { to, message, isGroup } = req.body;
// ...
const chatId = toChatId(to, isGroup);
```

**Step 3: Manual smoke test (no automated tests in this project)**

Start the server and run:
```bash
# DM (existing behavior, must still work)
curl -X POST http://localhost:3000/api/instances/client1/send-message \
  -H "X-API-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to": "919876543210", "message": "hello dm"}'
# Expected: { "success": true, "messageId": "..." }

# Group (new behavior)
curl -X POST http://localhost:3000/api/instances/client1/send-message \
  -H "X-API-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to": "120363xxxxxx", "isGroup": true, "message": "hello group"}'
# Expected: { "success": true, "messageId": "..." }
```

**Step 4: Commit**
```bash
git add server.js
git commit -m "feat: add toChatId helper and group send support to send-message"
```

---

### Task 2: Wire `toChatId` into `send-file`

**Files:**
- Modify: `server.js` (around line 440 in `send-file` handler)

**Step 1: Update `send-file` to extract `isGroup` and use `toChatId`**

In the `send-file` handler, change:
```js
// OLD (around line 416):
const { to, filename, fileBase64, caption, mimetype } = req.body;
// ...
const chatId = String(to).replace(/\D/g, '') + '@c.us';
```
To:
```js
const { to, filename, fileBase64, caption, mimetype, isGroup } = req.body;
// ...
const chatId = toChatId(to, isGroup);
```

**Step 2: Commit**
```bash
git add server.js
git commit -m "feat: add group send support to send-file"
```

---

### Task 3: Add `chatType` to received messages (native + webhook)

**Files:**
- Modify: `server.js` (native message handler ~line 297, webhook eventPayload ~line 575, GET /messages ~line 458)

**Step 1: Add `chatType` to the native `client.on('message')` payload**

In the `payload` object inside the native message handler (around line 297), add `chatType`:
```js
const payload = {
  messageId: messageIdSerialized,
  from: fromJid,
  to: message.to || null,
  body,
  timestamp: messageTimestamp,
  fromMe: false,
  hasMedia: Boolean(message.hasMedia),
  type: message.type || null,
  author: message.author || null,
  isStatus: Boolean(message.isStatus),
  isForwarded: Boolean(message.isForwarded),
  hasQuotedMsg: Boolean(message.hasQuotedMsg),
  senderDisplay,
  chatType: fromJid?.endsWith('@g.us') ? 'group' : 'private'  // ADD THIS
};
```

**Step 2: Add `chatType` to the webhook `eventPayload.message`**

In the webhook handler's `eventPayload` (around line 576), add `chatType`:
```js
message: {
  messageId: msg.messageId,
  from: msg.fromJid,
  to: null,
  body: msg.body,
  timestamp: now,
  fromMe: false,
  hasMedia: false,
  type: null,
  author: null,
  isStatus: false,
  isForwarded: false,
  hasQuotedMsg: false,
  senderDisplay: msg.senderDisplay,
  chatType: msg.fromJid?.endsWith('@g.us') ? 'group' : 'private'  // ADD THIS
}
```

**Step 3: Add `chatType` to `GET /messages` response**

In the `GET /messages` handler (around line 458), update the map:
```js
const messages = rows.map((r) => ({
  id: r.id,
  messageId: r.message_id,
  from: r.from_jid,
  senderDisplay: r.sender_display,
  body: r.body,
  timestamp: r.message_timestamp,
  createdAt: r.created_at,
  chatType: r.from_jid?.endsWith('@g.us') ? 'group' : 'private'  // ADD THIS
}));
```

**Step 4: Commit**
```bash
git add server.js
git commit -m "feat: add chatType field to received messages (native, webhook, REST)"
```

---

### Task 4: Update API.md documentation

**Files:**
- Modify: `API.md`

**Step 1: Update `send-message` request body docs**

Add `isGroup` field documentation to the `POST /api/instances/:instanceId/send-message` section:
```markdown
- **isGroup:** Optional boolean. Set to `true` if `to` is a WhatsApp group ID (e.g. `120363xxxxxx`). The group ID is the numeric portion of the group JID (without `@g.us`). If omitted or `false`, `to` is treated as a phone number (DM).
```

Update the example request body:
```json
{
  "to": "919876543210",
  "message": "Hello from API",
  "isGroup": false
}
```

Add a group example:
```json
{
  "to": "120363xxxxxx",
  "message": "Hello group!",
  "isGroup": true
}
```

**Step 2: Update `send-file` request body docs similarly**

Add `isGroup` to the field list in `POST /api/instances/:instanceId/send-file`:
```markdown
- **isGroup:** Optional boolean. Same behavior as in `send-message`. Set to `true` to send to a group.
```

**Step 3: Update incoming message payload docs**

In the WebSocket "Incoming message payload" section, add `chatType` to the JSON example and field list:
```json
{
  "type": "message",
  "instanceId": "client1",
  "message": {
    "messageId": "true_1234567890@c.us_3EB0XXXXX",
    "from": "1234567890@c.us",
    "to": "0987654321@c.us",
    "body": "Hello!",
    "timestamp": 1234567890,
    "fromMe": false,
    "hasMedia": false,
    "type": "chat",
    "author": null,
    "isStatus": false,
    "isForwarded": false,
    "hasQuotedMsg": false,
    "chatType": "private"
  }
}
```

Add field description:
```markdown
- **chatType:** `"private"` for direct messages, `"group"` for group chats. Derived from the `from` JID suffix (`@c.us` = private, `@g.us` = group).
```

Also update `GET /messages` response example to include `chatType`.

**Step 4: Commit**
```bash
git add API.md
git commit -m "docs: document isGroup parameter and chatType field"
```

---

### Task 5: Create PR

**Step 1: Push branch and open PR**
```bash
git push -u origin main
gh pr create \
  --title "feat: group chat send support and chatType on received messages" \
  --body "..."
```
