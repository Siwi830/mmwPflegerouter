<script lang="ts">
  import type { PageData, ActionData } from './$types';
  let { data, form }: { data: PageData; form: ActionData } = $props();
  let showAll = $state(false);
  const fields = [
    { key: 'firstName', label: 'Vorname' },
    { key: 'lastName', label: 'Nachname' },
    { key: 'phone', label: 'Telefon' },
    { key: 'city', label: 'Ort' },
    { key: 'postalCode', label: 'Postleitzahl' },
    { key: 'addressLine', label: 'Anschrift' }
  ] as const;
  const date = (value: Date | string | null) => value
    ? new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : '–';
  const pending = $derived(data.requests.filter((r) => r.status === 'PENDING'));
  const displayed = $derived(showAll ? data.requests : pending);
</script>

<svelte:head><title>Datenänderungen | Pflegerouter </title></svelte:head>

<div class="page">
  <div class="heading">
    <div>
      <p class="eyebrow">ORGANISATION · VERWALTUNG</p>
      <h1>Datenänderungen</h1>
      <p>Prüfe Korrekturwünsche betreuter Personen und entscheide über die Übernahme.</p>
    </div>
    <span class="counter">{pending.length} offen</span>
  </div>

  {#if form?.message}
    <div class:failure={!form.success} class="feedback" role="status">{form.message}</div>
  {/if}

  <div class="toolbar">
    <strong>{showAll ? 'Alle Anträge' : 'Offene Anträge'}</strong>
    <button type="button" onclick={() => showAll = !showAll}>
      {showAll ? 'Nur offene anzeigen' : 'Auch entschiedene anzeigen'}
    </button>
  </div>

  {#if displayed.length === 0}
    <div class="empty"><span>✓</span><h2>Keine offenen Änderungsanträge</h2><p>Neue Vorschläge erscheinen hier automatisch.</p></div>
  {:else}
    <div class="requests">
      {#each displayed as item (item.id)}
        <article class="request">
          <div class="request-head">
            <div><h2>{item.firstName} {item.lastName}</h2><p>{item.organizationName} · Eingereicht am {date(item.createdAt)}</p></div>
            <span class:approved={item.status === 'APPROVED'} class:rejected={item.status === 'REJECTED'} class="status">
              {item.status === 'PENDING' ? 'Wartet auf Prüfung' : item.status === 'APPROVED' ? 'Genehmigt' : 'Abgelehnt'}
            </span>
          </div>
          {#if item.proposed}
            <div class="comparison">
              <div class="column-label">Bisherige Daten</div><div class="column-label">Vorgeschlagene Daten</div>
              {#each fields as field}
                {@const oldValue = item[field.key] ?? ''}
                {@const newValue = item.proposed[field.key]}
                <div class="value"><small>{field.label}</small><span>{oldValue || '–'}</span></div>
                <div class:changed={oldValue !== newValue} class="value"><small>{field.label}</small><span>{newValue || '–'}</span></div>
              {/each}
            </div>
          {:else}
            <p class="warning">Dieser Antrag enthält ungültige Daten und kann nicht genehmigt werden.</p>
          {/if}
          {#if item.status === 'PENDING'}
            <div class="actions">
              <form method="POST" action="?/approve">
                <input type="hidden" name="id" value={item.id} />
                <button class="approve" type="submit" disabled={!item.proposed}>Änderungen genehmigen</button>
              </form>
              <form method="POST" action="?/reject" class="reject-form">
                <input type="hidden" name="id" value={item.id} />
                <label for={'note-' + item.id}>Begründung bei Ablehnung</label>
                <textarea id={'note-' + item.id} name="reviewNote" maxlength="1000" required rows="2" placeholder="Warum wird die Änderung abgelehnt?"></textarea>
                <button class="reject" type="submit">Ablehnen</button>
              </form>
            </div>
          {:else}
            <div class="review">Entschieden am {date(item.reviewedAt)}{item.reviewNote ? ` · ${item.reviewNote}` : ''}</div>
          {/if}
        </article>
      {/each}
    </div>
  {/if}
</div>

<style>
  .page{max-width:1120px;margin:0 auto;padding:40px 24px 80px;color:#172b4d}
  .heading{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:30px}
  .eyebrow{font-size:11px;font-weight:800;letter-spacing:1.8px;color:#2865c4;margin:0 0 10px}
  h1{font-size:32px;margin:0 0 10px} .heading p:not(.eyebrow){color:#71819b;margin:0;font-size:14px}
  .counter{white-space:nowrap;background:#e7f0ff;color:#1649a0;border-radius:12px;padding:12px 16px;font-weight:800}
  .toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px}
  .toolbar button{border:1px solid #bfd2ee;background:white;color:#1649a0;border-radius:10px;padding:10px 14px;cursor:pointer}
  .requests{display:grid;gap:20px} .request,.empty{background:#fff;border:1px solid #e9eef6;border-radius:16px;padding:26px;box-shadow:0 5px 24px #1c3e7210}
  .request-head{display:flex;align-items:start;justify-content:space-between;gap:16px;border-bottom:1px solid #edf1f7;padding-bottom:20px;margin-bottom:20px}
  h2{margin:0 0 8px;font-size:19px}.request-head p{font-size:13px;color:#71819b;margin:0}
  .status{border-radius:20px;padding:8px 12px;background:#fff3da;color:#9b6b13;font-size:12px;font-weight:700;white-space:nowrap}
  .status.approved{background:#e5f7ee;color:#208653}.status.rejected{background:#fce9e9;color:#ae3d3d}
  .comparison{display:grid;grid-template-columns:1fr 1fr;gap:8px 14px}.column-label{font-weight:800;font-size:13px;color:#1649a0;padding:8px 0}
  .value{display:flex;flex-direction:column;gap:5px;background:#f6f8fc;padding:12px;border-radius:10px;min-width:0;overflow-wrap:anywhere;font-size:14px}
  .value small{color:#71819b;font-size:11px}.value.changed{background:#e7f0ff;border:1px solid #b9d3fa}
  .actions{display:grid;grid-template-columns:1fr 1fr;gap:20px;border-top:1px solid #edf1f7;padding-top:20px;margin-top:22px}
  button{font-family:inherit;font-weight:700}.approve,.reject{border:0;border-radius:10px;padding:12px 18px;cursor:pointer}
  .approve{background:#1649a0;color:white}.approve:disabled{opacity:.5;cursor:not-allowed}.reject{background:#fff0f0;color:#ad3737;border:1px solid #f2caca}
  .reject-form{display:grid;gap:8px}.reject-form label{font-size:12px;color:#526580;font-weight:700}
  textarea{width:100%;box-sizing:border-box;border:1px solid #dce5f2;border-radius:10px;padding:10px;font:inherit;resize:vertical}
  .review{font-size:13px;color:#71819b;margin-top:20px}.feedback{padding:14px 18px;background:#e5f7ee;color:#208653;border-radius:12px;margin-bottom:18px}
  .feedback.failure{background:#fff0f0;color:#ad3737}.warning{color:#ad3737}.empty{text-align:center;padding:60px 20px}.empty span{font-size:34px;color:#208653}.empty p{color:#71819b}
  @media(max-width:700px){.page{padding:24px 16px}.heading{align-items:flex-start;flex-direction:column}.request{padding:18px}.request-head{flex-direction:column}.actions{grid-template-columns:1fr}h1{font-size:27px}}
</style>
