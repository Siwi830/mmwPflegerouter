<script lang="ts">
  import type { PageData, ActionData } from './$types';
  let { data }: { data: PageData } = $props();</script>
<h1>Vertretungen</h1>
{#if data.incoming.length > 0}<h2>Meine offenen Zustimmungsanfragen</h2><ul>{#each data.incoming as item}<li>{item.recipientName} {item.recipientSurname} – <a href="/vertretungen/{item.id}">Anfrage prüfen</a></li>{/each}</ul>{/if}<p>Hier sehen Sie beantragte und freigegebene Betreuungsbeziehungen.</p>
<a href="/vertretungen/neu">Neue Vertretung beantragen</a>
{#if data.requests.length === 0}<p>Noch keine Anträge vorhanden.</p>{/if}
<ul>{#each data.requests as request}<li><strong>{request.recipientName} {request.recipientSurname}</strong> · {request.type} · {request.status}
  {#if request.status === 'ACTIVE'}<span> · Anfragen: {request.canManageRequests ? 'ja' : 'nein'} · Termine: {request.canManageAppointments ? 'ja' : 'nein'}</span>{/if}
  <a href="/vertretungen/{request.id}">Details</a></li>{/each}</ul>
<style>li{padding:1rem;margin:.7rem 0;background:white;border:1px solid #dae4ec;border-radius:12px}li a{margin-left:1rem}ul{padding:0;list-style:none}</style>
