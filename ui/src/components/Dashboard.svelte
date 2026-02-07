<script>
  import { onMount, onDestroy } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { getWsUrl } from '../lib/api.js';
  import * as api from '../lib/api.js';
  import InstanceCard from './InstanceCard.svelte';

  const dispatch = createEventDispatcher();

  let instances = [];
  let newInstanceId = '';
  let error = '';
  let success = '';
  let ws = null;

  function setError(msg) {
    error = msg;
    success = '';
    setTimeout(() => (error = ''), 5000);
  }

  function setSuccess(msg) {
    success = msg;
    error = '';
    setTimeout(() => (success = ''), 5000);
  }

  function initWebSocket() {
    const url = getWsUrl();
    ws = new WebSocket(url);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'auth' }));
      instances.forEach((inst) => {
        ws.send(JSON.stringify({ type: 'subscribe', instanceId: inst.id }));
      });
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const idx = instances.findIndex((i) => i.id === data.instanceId);
      if (idx === -1) return;

      if (data.type === 'qr') {
        instances[idx] = { ...instances[idx], status: 'qr_ready', qr: data.qr };
      } else if (data.type === 'ready') {
        instances[idx] = { ...instances[idx], status: 'ready', qr: null };
      } else if (data.type === 'authenticated') {
        instances[idx] = { ...instances[idx], status: 'authenticated' };
      } else if (data.type === 'disconnected') {
        instances[idx] = { ...instances[idx], status: 'disconnected' };
      } else if (data.type === 'status') {
        instances[idx] = {
          ...instances[idx],
          status: data.status,
          qr: data.qr ?? instances[idx].qr
        };
      }
      instances = instances;
    };

    ws.onclose = () => {
      setTimeout(initWebSocket, 3000);
    };
  }

  async function loadInstances() {
    try {
      instances = await api.getInstances();
      if (ws && ws.readyState === WebSocket.OPEN) {
        instances.forEach((inst) => {
          ws.send(JSON.stringify({ type: 'subscribe', instanceId: inst.id }));
        });
      }
    } catch (e) {
      setError('Failed to load instances');
    }
  }

  async function handleCreate() {
    const id = newInstanceId.trim();
    if (!id) {
      setError('Please enter an instance ID');
      return;
    }
    try {
      await api.createInstance(id);
      newInstanceId = '';
      setSuccess('Instance created successfully');
      await loadInstances();
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'subscribe', instanceId: id }));
      }
    } catch (e) {
      setError(e.message || 'Failed to create instance');
    }
  }

  async function handleDelete(event) {
    const { instanceId } = event.detail;
    try {
      await api.deleteInstance(instanceId);
      instances = instances.filter((i) => i.id !== instanceId);
      setSuccess('Instance deleted successfully');
    } catch (e) {
      setError('Failed to delete instance');
    }
  }

  async function handleLogout() {
    await api.logout();
    if (ws) ws.close();
    dispatch('logout');
  }

  onMount(() => {
    loadInstances();
    initWebSocket();
  });

  onDestroy(() => {
    if (ws) ws.close();
  });
</script>

<div class="container">
  <div class="card">
    <div class="header">
      <div>
        <h1>📱 WhatsApp Instances</h1>
        <p class="subtitle">Manage multiple WhatsApp Web instances</p>
      </div>
      <button type="button" class="secondary" on:click={handleLogout}>Logout</button>
    </div>

    {#if error}
      <div class="error">{error}</div>
    {/if}
    {#if success}
      <div class="success">{success}</div>
    {/if}

    <div class="new-instance-form">
      <input type="text" bind:value={newInstanceId} placeholder="Enter instance ID (e.g., client1)" />
      <button type="button" on:click={handleCreate}>Create Instance</button>
    </div>

    <div class="instances-grid">
      {#if instances.length === 0}
        <p style="grid-column: 1/-1; text-align: center; color: #888;">No instances yet. Create one to get started!</p>
      {:else}
        {#each instances as instance (instance.id)}
          <InstanceCard {instance} on:delete={handleDelete} />
        {/each}
      {/if}
    </div>
  </div>
</div>
