<script>
  import { onMount } from 'svelte';
  import { checkAuth } from './lib/api.js';
  import Login from './components/Login.svelte';
  import Dashboard from './components/Dashboard.svelte';

  let authenticated = false;
  let checking = true;

  onMount(async () => {
    try {
      authenticated = await checkAuth();
    } catch {
      authenticated = false;
    }
    checking = false;
  });

  function onLogin() {
    authenticated = true;
  }

  function onLogout() {
    authenticated = false;
  }
</script>

{#if checking}
  <div class="container">
    <div class="card login-card">
      <p class="subtitle">Checking authentication…</p>
    </div>
  </div>
{:else if authenticated}
  <Dashboard on:logout={onLogout} />
{:else}
  <Login on:login={onLogin} />
{/if}
