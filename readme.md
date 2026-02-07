# WhatsApp Multi-Instance Manager

A Node.js application for managing multiple WhatsApp Web instances with authentication, real-time QR code updates via WebSockets, and a clean UI.

## Features

- 🔐 **Session-based authentication** - Secure login system
- 📱 **Multiple WhatsApp instances** - Manage multiple WhatsApp connections simultaneously
- 🔄 **Real-time QR code updates** - WebSocket-powered live QR code refresh
- 💻 **Clean UI** - Responsive interface (vanilla JS with reactive patterns)
- 🚀 **Easy to extend** - Built on Express.js with modular architecture

## Prerequisites

- Node.js 16+ (required for ES modules)
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open your browser and navigate to:
```
http://localhost:3000
```

## Default Credentials

- **Username:** admin
- **Password:** admin123

⚠️ **Important:** Change these credentials in production! Edit the `users` object in `server.js`.

## Usage

### Creating a WhatsApp Instance

1. Log in with your credentials
2. Enter an instance ID (e.g., "client1", "sales-bot", etc.)
3. Click "Create Instance"
4. A QR code will appear - scan it with WhatsApp on your phone
5. Once connected, the instance status will change to "ready"

### Managing Multiple Instances

- Each instance runs independently with its own session
- Sessions are stored locally using `LocalAuth` from whatsapp-web.js
- You can have as many instances as your system resources allow

### WebSocket Events

The application uses WebSockets to push real-time updates:

- `qr` - New QR code generated
- `ready` - Instance is connected and ready
- `authenticated` - WhatsApp authentication successful
- `disconnected` - Instance disconnected

## Project Structure

```
whatsapp-multi-instance/
├── server.js           # Main server file (Express + WebSocket + WhatsApp logic)
├── public/
│   └── index.html      # Frontend UI
├── package.json        # Dependencies
└── README.md          # This file
```

## API Endpoints

### Authentication
- `POST /api/login` - Login with username/password
- `POST /api/logout` - Logout current session
- `GET /api/check-auth` - Check authentication status

### Instance Management
- `GET /api/instances` - List all instances
- `POST /api/instances` - Create new instance
- `DELETE /api/instances/:instanceId` - Delete instance

## Security Considerations

### For Production:

1. **Change the session secret** in `server.js`:
   ```javascript
   secret: 'your-secret-key-change-this'
   ```

2. **Use a proper database** for user storage instead of in-memory object

3. **Enable HTTPS** and set secure cookies:
   ```javascript
   cookie: { secure: true, httpOnly: true, sameSite: 'strict' }
   ```

4. **Add rate limiting** to prevent brute force attacks

5. **Use environment variables** for sensitive configuration

6. **Implement proper password policies** and user management

## Extending the Application

### Adding User Registration

Replace the in-memory `users` object with a database (MongoDB, PostgreSQL, etc.) and add registration endpoints.

### Sending Messages

Add endpoints to send messages through WhatsApp instances:

```javascript
app.post('/api/instances/:instanceId/send', requireAuth, async (req, res) => {
  const { instanceId } = req.params;
  const { number, message } = req.body;
  
  const instance = whatsappInstances.get(instanceId);
  if (!instance || instance.status !== 'ready') {
    return res.status(400).json({ error: 'Instance not ready' });
  }
  
  try {
    await instance.client.sendMessage(`${number}@c.us`, message);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Adding Webhooks

Implement webhook endpoints to receive WhatsApp messages and forward them to your backend:

```javascript
client.on('message', async (msg) => {
  // Forward to your webhook URL
  await fetch('https://your-webhook.com/whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instanceId: instanceId,
      from: msg.from,
      body: msg.body,
      timestamp: msg.timestamp
    })
  });
});
```

## Troubleshooting

### QR Code Not Appearing

- Check browser console for WebSocket connection errors
- Ensure the instance is in "qr_ready" status
- Try refreshing the page

### Instance Stuck in "Initializing"

- Check server logs for errors
- Ensure Chromium dependencies are installed (required by Puppeteer)
- On Linux, you may need: `apt-get install -y chromium-browser`

### WebSocket Connection Failed

- Verify the WebSocket URL matches your deployment (ws:// for HTTP, wss:// for HTTPS)
- Check firewall settings

## License

MIT License - feel free to use this for your projects!

## Contributing

Pull requests welcome! For major changes, please open an issue first to discuss what you would like to change.