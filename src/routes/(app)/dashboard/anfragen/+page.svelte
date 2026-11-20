<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  let query = $state('');
  let status = $state('ALL');
  let priority = $state('ALL');
  const filtered = $derived(data.requests.filter(r =>
    (status === 'ALL' || r.status === status) &&
    (priority === 'ALL' || r.priority === priority) &&
    `${r.title} ${r.description ?? ''} ${r.recipientFirstName} ${r.recipientLastName}`.toLocaleLowerCase('de').includes(query.toLocaleLowerCase('de'))
  ));
  const categories: Record<string, string> = { SHOPPING: 'Einkaufen', COMPANIONSHIP: 'Gesellschaft', TRANSPORT: 'Begleitung/Fahrten', HOUSEHOLD: 'Haushalt', DIGITAL_HELP: 'Digitale Hilfe', OTHER: 'Sonstiges' };
  const priorities: Record<string, string> = { EMERGENCY: 'Notfall', URGENT: 'Dringend', NORMAL: 'Normal', WISH: 'Wunsch' };
  const statuses: Record<string, string> = { OPEN: 'Offen', MATCHED: 'Zugeordnet', IN_PROGRESS: 'In Bearbeitung', COMPLETED: 'Erledigt', CANCELLED: 'Abgebrochen' };
  const format = (d: Date | string) => new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d));
</script>
<svelte:head><title>Hilfsanfragen | Pflegerouter .</title></svelte:head>
<div class="page">
  <header><div><p class="eyebrow">{data.organizationName}</p><h1>Hilfsanfragen</h1><p>Alle für dich sichtbaren Hilfegesuche und ihre Termine.</p></div><a class="primary" href="/dashboard/termine">Termine ansehen →</a></header>
  <div class="filters">
    <input aria-label="Hilfsanfragen durchsuchen" placeholder="Titel, Beschreibung, Person suchen …" bind:value={query} />
    <select aria-label="Status filtern" bind:value={status}><option value="ALL">Alle Status</option>{#each Object.entries(statuses) as [value, label]}<option {value}>{label}</option>{/each}</select>
    <select aria-label="Priorität filtern" bind:value={priority}><option value="ALL">Alle Prioritäten</option>{#each Object.entries(priorities) as [value, label]}<option {value}>{label}</option>{/each}</select>
  </div>
  <p class="count">{filtered.length} Hilfsanfragen</p>
  <div class="list">
    {#each filtered as request (request.id)}
      {@const linked = data.appointments.filter(a => a.requestId === request.id)}
      <article class="ticket" class:emergency={request.priority === 'EMERGENCY'} class:urgent={request.priority === 'URGENT'}>
        <div class="top"><span class="pill">{priorities[request.priority] ?? request.priority}</span><span class="status">{statuses[request.status] ?? request.status}</span></div>
        <h2>{request.title}</h2>
        <p>{request.description || 'Keine Beschreibung hinterlegt.'}</p>
        <dl><div><dt>Kategorie</dt><dd>{categories[request.category] ?? request.category}</dd></div><div><dt>Betreute Person</dt><dd>{request.recipientFirstName} {request.recipientLastName}</dd></div><div><dt>Erstellt</dt><dd>{format(request.createdAt)}</dd></div><div><dt>Zuweisung</dt><dd>{request.assignedUserId ? 'Zugewiesen' : 'Noch frei'}</dd></div></dl>
        <div class="appointments"><strong>Verknüpfte Termine ({linked.length})</strong>
          {#each linked as appointment (appointment.id)}<p>📅 {format(appointment.startsAt)} · {appointment.title} ({appointment.status})</p>{/each}
          {#if linked.length === 0}<p>Für dieses Hilfegesuch gibt es noch keinen Termin.</p>{/if}
        </div>
        {#if data.canManage}<a class="link" href={`/dashboard/termine?requestId=${encodeURIComponent(request.id)}`}>+ Termin zu dieser Hilfsanfrage erstellen</a>{/if}
      </article>
    {:else}<div class="empty">Keine passenden Hilfsanfragen gefunden.</div>{/each}
  </div>
</div>
<style>
  .page{max-width:1180px;margin:auto;padding:28px 24px;color:#17365d}header{display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap;margin-bottom:24px}h1{font-size:32px;margin:0 0 8px}header p{margin:0;color:#65758b}.eyebrow{text-transform:uppercase;letter-spacing:.1em;font-size:12px;font-weight:700;color:#4d73a7!important}.primary{background:#1d5598;color:white;text-decoration:none;padding:12px 16px;border-radius:10px}.filters{display:flex;flex-wrap:wrap;gap:12px;margin:20px 0}.filters input{flex:1;min-width:220px}.filters input,.filters select{border:1px solid #d7e1ef;border-radius:10px;padding:12px;background:white;color:#17365d}.count{font-size:13px;color:#69798c}.list{display:grid;gap:16px}.ticket{background:white;border:1px solid #dfe7f1;border-left:5px solid #d4aa38;border-radius:14px;padding:22px;box-shadow:0 4px 18px #17365d0b}.ticket.emergency{border-left-color:#bd3434}.ticket.urgent{border-left-color:#df8128}.top{display:flex;justify-content:space-between;gap:12px}.pill{font-weight:700;color:#a45b13}.status{font-size:13px;background:#edf4fd;padding:5px 10px;border-radius:30px}.ticket h2{font-size:20px;margin:12px 0}.ticket p{line-height:1.5;color:#51677e}dl{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}dt{font-size:12px;color:#72839a}dd{margin:5px 0;font-weight:600}.appointments{border-top:1px solid #e8edf4;margin-top:18px;padding-top:14px}.appointments p{margin:8px 0;font-size:14px}.link{display:inline-block;margin-top:12px;color:#1d5598;font-weight:700;text-decoration:none}.empty{padding:30px;background:white;border-radius:14px}
</style>
