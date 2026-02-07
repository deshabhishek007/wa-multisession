import express from 'express';
import session from 'express-session';
import bcrypt from 'bcrypt';
import whatsapp from 'whatsapp-web.js';
import QRCode from 'qrcode';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();
const { Client, LocalAuth } = whatsapp;
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session configuration
app.use(session({
  secret: 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true if using HTTPS
}));

// Simple user storage (replace with database in production)
const users = {
  admin: await bcrypt.hash('admin123', 10) // username: admin, password: admin123
};

// WhatsApp instances storage
const whatsappInstances = new Map();
const instanceClients = new Map(); // Map to track WebSocket clients per instance

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Routes
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (users[username] && await bcrypt.compare(password, users[username])) {
    req.session.userId = username;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/check-auth', (req, res) => {
  res.json({ authenticated: !!req.session.userId });
});

// WhatsApp instance management
app.get('/api/instances', requireAuth, (req, res) => {
  const instances = Array.from(whatsappInstances.keys()).map(id => ({
    id,
    status: whatsappInstances.get(id).status
  }));
  res.json(instances);
});

app.post('/api/instances', requireAuth, async (req, res) => {
  const { instanceId } = req.body;
  
  if (!instanceId) {
    return res.status(400).json({ error: 'Instance ID required' });
  }
  
  if (whatsappInstances.has(instanceId)) {
    return res.status(400).json({ error: 'Instance already exists' });
  }
  
  try {
    const client = new Client({
      authStrategy: new LocalAuth({ clientId: instanceId }),
      puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });
    
    const instance = {
      client,
      status: 'initializing',
      qr: null
    };
    
    whatsappInstances.set(instanceId, instance);
    instanceClients.set(instanceId, new Set());
    
    // QR Code event
    client.on('qr', async (qr) => {
      instance.qr = qr;
      instance.status = 'qr_ready';
      
      // Generate QR code as data URL
      const qrDataUrl = await QRCode.toDataURL(qr);
      
      // Broadcast to all connected WebSocket clients for this instance
      broadcastToInstance(instanceId, {
        type: 'qr',
        instanceId,
        qr: qrDataUrl
      });
    });
    
    // Ready event
    client.on('ready', () => {
      instance.status = 'ready';
      instance.qr = null;
      
      broadcastToInstance(instanceId, {
        type: 'ready',
        instanceId
      });
    });
    
    // Authenticated event
    client.on('authenticated', () => {
      instance.status = 'authenticated';
      
      broadcastToInstance(instanceId, {
        type: 'authenticated',
        instanceId
      });
    });
    
    // Disconnected event
    client.on('disconnected', (reason) => {
      instance.status = 'disconnected';
      
      broadcastToInstance(instanceId, {
        type: 'disconnected',
        instanceId,
        reason
      });
    });
    
    // Initialize the client
    await client.initialize();
    
    res.json({ success: true, instanceId });
  } catch (error) {
    whatsappInstances.delete(instanceId);
    instanceClients.delete(instanceId);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/instances/:instanceId', requireAuth, async (req, res) => {
  const { instanceId } = req.params;
  
  if (!whatsappInstances.has(instanceId)) {
    return res.status(404).json({ error: 'Instance not found' });
  }
  
  try {
    const instance = whatsappInstances.get(instanceId);
    await instance.client.destroy();
    whatsappInstances.delete(instanceId);
    instanceClients.delete(instanceId);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  let currentInstanceId = null;
  let authenticated = false;
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // Handle authentication
      if (data.type === 'auth') {
        // In a real app, validate session token here
        authenticated = true;
        ws.send(JSON.stringify({ type: 'auth_success' }));
        return;
      }
      
      if (!authenticated) {
        ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
        return;
      }
      
      // Subscribe to instance updates
      if (data.type === 'subscribe' && data.instanceId) {
        currentInstanceId = data.instanceId;
        
        if (!instanceClients.has(currentInstanceId)) {
          instanceClients.set(currentInstanceId, new Set());
        }
        
        instanceClients.get(currentInstanceId).add(ws);
        
        // Send current state if available
        if (whatsappInstances.has(currentInstanceId)) {
          const instance = whatsappInstances.get(currentInstanceId);
          ws.send(JSON.stringify({
            type: 'status',
            instanceId: currentInstanceId,
            status: instance.status,
            qr: instance.qr
          }));
        }
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });
  
  ws.on('close', () => {
    if (currentInstanceId && instanceClients.has(currentInstanceId)) {
      instanceClients.get(currentInstanceId).delete(ws);
    }
  });
});

function broadcastToInstance(instanceId, message) {
  if (instanceClients.has(instanceId)) {
    const clients = instanceClients.get(instanceId);
    const messageStr = JSON.stringify(message);
    
    clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(messageStr);
      }
    });
  }
}

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});