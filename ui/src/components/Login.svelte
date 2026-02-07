<script>
  import { createEventDispatcher } from 'svelte';
  import { login } from '../lib/api.js';

  const dispatch = createEventDispatcher();

  let username = '';
  let password = '';
  let error = '';
  let loading = false;

  async function handleSubmit() {
    error = '';
    if (!username.trim() || !password) {
      error = 'Please enter username and password';
      return;
    }
    loading = true;
    try {
      const ok = await login(username.trim(), password);
      if (ok) {
        dispatch('login');
      } else {
        error = 'Invalid credentials';
      }
    } catch (e) {
      error = 'Login failed';
    } finally {
      loading = false;
    }
  }
</script>

<div class="container">
  <div class="card login-card">
    <h1>🔐 Login</h1>
    <p class="subtitle">WhatsApp Multi-Instance Manager</p>

    {#if error}
      <div class="error">{error}</div>
    {/if}

    <form on:submit|preventDefault={handleSubmit}>
      <div class="form-group">
        <label for="username">Username</label>
        <input type="text" id="username" bind:value={username} autocomplete="username" />
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" bind:value={password} autocomplete="current-password" />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Logging in…' : 'Login'}
      </button>
    </form>

    <p class="subtitle" style="margin-top: 20px; font-size: 12px;">
      Default credentials: admin / admin123
    </p>
  </div>
</div>
