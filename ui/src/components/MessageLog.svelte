<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import * as api from '../lib/api.js';

  export let instanceId = '';
  export let newMessage = null; // when set (from WebSocket), append to list

  const dispatch = createEventDispatcher();

  let messages = [];
  let loading = true;
  let error = '';

  async function load() {
    if (!instanceId) return;
    loading = true;
    error = '';
    try {
      messages = await api.getInstanceMessages(instanceId);
      messages = messages.reverse();
    } catch (e) {
      error = e.message || 'Failed to load messages';
      messages = [];
    } finally {
      loading = false;
    }
  }

  function close() {
    dispatch('close');
  }

  $: if (newMessage && instanceId) {
    const dup = messages.some((m) => m.messageId === newMessage.messageId);
    if (!dup) {
      messages = [
        ...messages,
        {
          senderDisplay: newMessage.senderDisplay || newMessage.from || 'Unknown',
          body: newMessage.body || '',
          messageId: newMessage.messageId,
          timestamp: newMessage.timestamp
        }
      ];
    }
  }

  onMount(load);
</script>

<div class="message-log">
  <div class="message-log-header">
    <h3>Message log — {instanceId}</h3>
    <button type="button" class="secondary close-btn" on:click={close}>Close</button>
  </div>

  {#if loading}
    <p class="message-log-loading">Loading messages…</p>
  {:else if error}
    <p class="message-log-error">{error}</p>
  {:else if messages.length === 0}
    <p class="message-log-empty">No messages yet. Incoming messages will appear here.</p>
  {:else}
    <div class="message-log-list">
      {#each messages as msg (msg.messageId || msg.id)}
        <div class="message-log-row">
          <span class="sender">{msg.senderDisplay}</span>
          <span class="separator">:</span>
          <span class="body">{msg.body || '(media)'}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .message-log {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
    max-width: 560px;
    width: 100%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
  }
  .message-log-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #e0e0e0;
  }
  .message-log-header h3 {
    margin: 0;
    font-size: 18px;
    color: #333;
  }
  .close-btn {
    padding: 8px 16px;
  }
  .message-log-loading,
  .message-log-error,
  .message-log-empty {
    padding: 24px 20px;
    color: #666;
    text-align: center;
  }
  .message-log-error {
    color: #b91c1c;
  }
  .message-log-list {
    padding: 12px 20px 20px;
    overflow-y: auto;
    flex: 1;
    min-height: 200px;
  }
  .message-log-row {
    padding: 10px 12px;
    border-bottom: 1px solid #f0f0f0;
    font-size: 14px;
    line-height: 1.4;
  }
  .message-log-row:last-child {
    border-bottom: none;
  }
  .sender {
    font-weight: 600;
    color: #3730a3;
    margin-right: 6px;
  }
  .separator {
    color: #888;
    margin-right: 6px;
  }
  .body {
    color: #333;
    word-break: break-word;
  }
</style>
