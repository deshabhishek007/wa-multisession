<script>
  import { onMount } from 'svelte';
  import { checkAuth } from './lib/api.js';
  import Login from './components/Login.svelte';
  import Dashboard from './components/Dashboard.svelte';

  let authenticated = false;
  let user = null;
  let checking = true;

  onMount(async () => {
    try {
      const { authenticated: auth, user: u } = await checkAuth();
      authenticated = auth;
      user = u;
    } catch {
      authenticated = false;
      user = null;
    }
    checking = false;
  });

  function onLogin(ev) {
    authenticated = true;
    user = ev.detail?.user ?? null;
  }

  function onLogout() {
    authenticated = false;
    user = null;
  }
</script>

{#if checking}
  <div class="container">
    <div class="card login-card">
      <p class="subtitle">Checking authentication…</p>
    </div>
  </div>
{:else if authenticated}
  <Dashboard {user} on:logout={onLogout} />
{:else}
  <Login on:login={onLogin} />
{/if}
