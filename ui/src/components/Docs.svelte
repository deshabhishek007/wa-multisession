<script>
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  function back() {
    window.location.hash = '';
    dispatch('back');
  }
</script>

<div class="container docs-page">
  <div class="card docs-card">
    <div class="header">
      <div>
        <h1>📖 Usage & docs</h1>
        <p class="subtitle">WhatsApp Multi-Instance Manager</p>
      </div>
      <button type="button" class="secondary" on:click={back}>← Back to Dashboard</button>
    </div>

    <div class="docs-content">
      <section class="doc-section">
        <h2>Getting started</h2>
        <ul>
          <li>Log in with your credentials (default: <strong>admin</strong> / <strong>admin123</strong>).</li>
          <li>Admins can create instances; regular users see only instances assigned to them.</li>
        </ul>
      </section>

      <section class="doc-section">
        <h2>Creating a WhatsApp instance</h2>
        <ol>
          <li>Enter an instance ID (e.g. <code>client1</code>, <code>sales-bot</code>).</li>
          <li>Click <strong>Create Instance</strong>.</li>
          <li>Scan the QR code with WhatsApp on your phone (Linked Devices).</li>
          <li>When connected, the instance status becomes <strong>ready</strong>.</li>
        </ol>
        <p>Each instance has its own session and runs independently.</p>
      </section>

      <section class="doc-section">
        <h2>Instance features</h2>
        <ul>
          <li><strong>View API key</strong> – Reveal, copy, or regenerate the instance API key. Use the <code>X-API-Key</code> header to call instance APIs (send message, send file) without logging in.</li>
          <li><strong>Send message</strong> – From the card, enter a phone number (with country code, digits only) and message text to send a WhatsApp message.</li>
          <li><strong>Message log</strong> – Open the message log for an instance to see incoming messages (live and history). Messages are stored and persist across server restarts.</li>
        </ul>
      </section>

      <section class="doc-section">
        <h2>Message listener</h2>
        <p>Each instance registers an incoming message listener (<code>client.on('message')</code>). When someone sends a message to that instance:</p>
        <ol>
          <li><strong>Filter</strong> – Your own messages are ignored.</li>
          <li><strong>Persist</strong> – The message is saved to the database (<code>instance_messages</code> table).</li>
          <li><strong>Broadcast</strong> – Subscribed WebSocket clients receive a <code>message</code> event in real time.</li>
        </ol>
        <p>You can view history via <code>GET /api/instances/:instanceId/messages?limit=500</code> and live updates by subscribing to the instance over WebSocket.</p>
      </section>

      <section class="doc-section">
        <h2>WebSocket events</h2>
        <p>After connecting to the WebSocket (with session cookie), send <code>{'{"type": "subscribe", "instanceId": "your-instance-id"}'}</code>. You will receive:</p>
        <ul>
          <li><code>qr</code> – New QR code generated</li>
          <li><code>ready</code> – Instance connected and ready</li>
          <li><code>authenticated</code> – WhatsApp authenticated</li>
          <li><code>disconnected</code> – Instance disconnected</li>
          <li><code>message</code> – Incoming WhatsApp message (includes <code>instanceId</code> and <code>message</code> payload: from, body, timestamp, hasMedia, senderDisplay, etc.)</li>
        </ul>
      </section>

      <section class="doc-section">
        <h2>API overview</h2>
        <p>Use the REST API for automation. Authenticate with a session cookie (browser) or instance API key (header <code>X-API-Key</code> or <code>Authorization: Bearer &lt;key&gt;</code>).</p>
        <ul>
          <li><strong>Auth:</strong> <code>POST /api/login</code>, <code>GET /api/check-auth</code>, <code>GET /api/me</code></li>
          <li><strong>Instances:</strong> <code>GET /api/instances</code>, <code>POST /api/instances</code> (admin), <code>DELETE /api/instances/:id</code> (admin)</li>
          <li><strong>Instance API key:</strong> <code>GET /api/instances/:id/api-key</code>, <code>POST /api/instances/:id/api-key/regenerate</code></li>
          <li><strong>Send:</strong> <code>POST /api/instances/:id/send-message</code> (body: <code>to</code>, <code>message</code>), <code>POST /api/instances/:id/send-file</code> (body: <code>to</code>, <code>filename</code>, <code>fileBase64</code>, optional <code>caption</code>, <code>mimetype</code>)</li>
          <li><strong>Message log:</strong> <code>GET /api/instances/:id/messages?limit=500</code></li>
          <li><strong>Users (admin):</strong> <code>GET /api/users</code>, <code>POST /api/users</code>, <code>DELETE /api/users/:id</code>, <code>PATCH /api/users/:id/password</code>, assign/remove instances per user</li>
        </ul>
        <p>Full request/response details are in the project <strong>API.md</strong> and Postman collection.</p>
      </section>

      <section class="doc-section">
        <h2>Database</h2>
        <p>Data is stored in <strong>data.db</strong> (SQLite) in the project root. Tables:</p>
        <ul>
          <li><code>users</code> – login, roles (admin/user)</li>
          <li><code>user_instances</code> – which users can access which instances</li>
          <li><code>instance_api_keys</code> – API key per instance</li>
          <li><code>instance_messages</code> – message log (persists across boots)</li>
        </ul>
        <p>SQLite uses WAL mode. To inspect the DB, stop the server and open <code>data.db</code>, or use a WAL-aware tool.</p>
      </section>

      <section class="doc-section">
        <h2>Security (production)</h2>
        <ul>
          <li>Change the session secret and default admin password.</li>
          <li>Use HTTPS and set <code>{'cookie: { secure: true }'}</code>.</li>
          <li>Use environment variables for secrets.</li>
        </ul>
      </section>

      <section class="doc-section">
        <h2>Troubleshooting</h2>
        <ul>
          <li><strong>QR code not appearing</strong> – Check WebSocket connection; ensure instance is in <em>qr_ready</em> status; try refreshing.</li>
          <li><strong>Instance stuck in Initializing</strong> – Check server logs; ensure Chromium/Puppeteer dependencies are installed.</li>
          <li><strong>WebSocket connection failed</strong> – Use <code>ws://</code> for HTTP and <code>wss://</code> for HTTPS; check firewall.</li>
        </ul>
      </section>
    </div>
  </div>
</div>

<style>
  .docs-page {
    max-width: 720px;
  }
  .docs-card {
    padding: 32px 40px;
  }
  .docs-content {
    margin-top: 24px;
  }
  .doc-section {
    margin-bottom: 28px;
  }
  .doc-section h2 {
    font-size: 18px;
    color: #333;
    margin-bottom: 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid #eee;
  }
  .doc-section p,
  .doc-section li {
    color: #555;
    line-height: 1.6;
    margin-bottom: 6px;
  }
  .doc-section ul,
  .doc-section ol {
    margin: 8px 0 12px 20px;
  }
  .doc-section code {
    background: #f0f0f0;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 13px;
  }
</style>
