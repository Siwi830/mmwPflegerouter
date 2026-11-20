<script lang="ts">
  import type { PageData, ActionData } from './$types';
  let { data, form }: { data: PageData; form: ActionData } = $props();</script>
<h1>Vertretung: {data.recipientName} {data.recipientSurname}</h1>
<p>Art: {data.representation.type} · Status: <strong>{data.representation.status}</strong></p>
<p>Berechtigungen: Einsicht {data.representation.canView ? '✓' : '–'}, Anfragen {data.representation.canManageRequests ? '✓' : '–'}, Termine {data.representation.canManageAppointments ? '✓' : '–'}, Stammdaten {data.representation.canEditProfile ? '✓' : '–'}</p>
{#if data.representation.status === 'PENDING' && (data.canConsent || (data.canReview && data.representation.type !== 'CONSENT'))}
  <form method="POST" action="?/decide">
    {#if data.representation.type !== 'CONSENT'}
      <label>Referenz des extern geprüften Nachweises <input name="evidenceReference" placeholder="Prüfprotokoll / Aktenzeichen" /></label>
    {/if}
    <label>Prüfvermerk <textarea name="reviewNote" rows="3"></textarea></label>
    <button name="decision" value="approve">Freigeben</button>
    <button name="decision" value="reject">Ablehnen</button>
  </form>
{/if}
{#if data.representation.status === 'ACTIVE'}
  <form method="POST" action="?/decide"><button name="decision" value="revoke">Zugriff beenden</button></form>
{/if}
{#if form?.message}<p role="alert">{form.message}</p>{/if}
<style>form{display:grid;gap:.75rem;max-width:500px;padding:1rem;background:white;border-radius:12px;margin:1rem 0}button{padding:.7rem;cursor:pointer}label{display:grid;gap:.5rem}</style>
