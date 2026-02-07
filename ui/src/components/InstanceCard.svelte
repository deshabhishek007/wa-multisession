<script>
  import { createEventDispatcher } from 'svelte';

  export let instance = { id: '', status: '', qr: null };
  export let canDelete = true;

  const dispatch = createEventDispatcher();

  let qrVisible = true;

  function toggleQr() {
    qrVisible = !qrVisible;
  }

  function onDelete() {
    if (confirm(`Delete instance ${instance.id}?`)) {
      dispatch('delete', { instanceId: instance.id });
    }
  }

  $: hasQr = instance.qr != null && instance.qr !== '';
  $: cardClass = instance.status === 'ready' ? 'active' : instance.status === 'qr_ready' ? 'pending' : '';
  $: statusClass = `status-${instance.status}`;
</script>

<div class="instance-card {cardClass}">
  <div class="instance-header">
    <div class="instance-id">{instance.id}</div>
    <span class="status-badge {statusClass}">{instance.status.replace('_', ' ')}</span>
  </div>

  {#if hasQr}
    <div class="instance-actions" style="margin-top: 10px; margin-bottom: 0;">
      <button type="button" class="secondary" on:click={toggleQr}>
        {qrVisible ? 'Hide QR' : 'Show QR'}
      </button>
    </div>
    {#if qrVisible}
      <div class="qr-container">
        <img src={instance.qr} alt="QR Code" />
        <p style="margin-top: 10px; color: #888; font-size: 14px;">Scan with WhatsApp</p>
      </div>
    {/if}
  {/if}

  {#if instance.status === 'ready'}
    <p style="color: #10b981; font-weight: 600; text-align: center; margin: 15px 0;">✓ Connected</p>
  {/if}

  {#if canDelete}
    <div class="instance-actions">
      <button type="button" class="danger" on:click={onDelete}>Delete</button>
    </div>
  {/if}
</div>
