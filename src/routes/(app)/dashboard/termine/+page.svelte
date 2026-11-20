<script lang="ts">
  import type { ActionData, PageData } from './$types';
  let { data, form }: { data: PageData; form: ActionData } = $props();
  let requestId = $state(data.requests.some(r => r.id === data.selectedRequestId) ? data.selectedRequestId : '');
  let recipientId = $state('');
  let startsLocal = $state('');
  let endsLocal = $state('');
  let showPast = $state(false);
  const chosenRequest = $derived(data.requests.find(r => r.id === requestId));
  const shown = $derived(data.items.filter(a => showPast || new Date(a.endsAt).getTime() >= Date.now()));
  const format = (d: Date | string) => new Intl.DateTimeFormat('de-DE', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(d));
  function prepareDates(event: SubmitEvent) {
    const form = event.currentTarget as HTMLFormElement;
    (form.elements.namedItem('startsAtIso') as HTMLInputElement).value = startsLocal ? new Date(startsLocal).toISOString() : '';
    (form.elements.namedItem('endsAtIso') as HTMLInputElement).value = endsLocal ? new Date(endsLocal).toISOString() : '';
  }
</script>
<svelte:head><title>Termine | .</title></svelte:head>
<div class="page">
  <header><div><p class="eyebrow">{data.organizationName}</p><h1>Termine</h1><p>Termine zu Hilfegesuchen und eigenständige Begegnungen.</p></div><a href="/dashboard/anfragen">← Hilfsanfragen</a></header>
  {#if data.canManage}
    <section class="panel"><h2>Neuen Termin erstellen</h2><p>Wähle optional ein Hilfegesuch. Bei eigenständigen Terminen ist eine betreute Person erforderlich.</p>
      {#if form?.message}<p class="error" role="alert">{form.message}</p>{/if}
      <form method="POST" action="?/create" onsubmit={prepareDates}>
        <label>Bezeichnung<input name="title" maxlength="200" required placeholder="z. B. Begleitung zum Arzt" /></label>
        <div class="cols">
          <label>Hilfegesuch (optional)<select name="requestId" bind:value={requestId}><option value="">Ohne Hilfegesuch</option>{#each data.requests as r}<option value={r.id}>{r.title}</option>{/each}</select></label>
          <label>Betreute Person<select name="recipientId" bind:value={recipientId} disabled={!!chosenRequest} required={!chosenRequest}><option value="">Bitte wählen</option>{#each data.recipients as r}<option value={r.id}>{r.firstName} {r.lastName}</option>{/each}</select></label>
        </div>
        {#if chosenRequest}<p class="hint">Die betreute Person wird automatisch aus „{chosenRequest.title}“ übernommen.</p>{/if}
        <div class="cols"><label>Beginn<input type="datetime-local" bind:value={startsLocal} required /></label><label>Ende<input type="datetime-local" bind:value={endsLocal} required /></label></div>
        <input type="hidden" name="startsAtIso"  /><input type="hidden" name="endsAtIso"  />
        <fieldset><legend>Teilnehmende Organisationsmitglieder</legend><div class="people">{#each data.members as member}<label class="person"><input type="checkbox" name="participantIds" value={member.id} /><span>{member.firstName} {member.lastName} <small>({member.role})</small></span></label>{/each}</div></fieldset>
        <button type="submit">Termin erstellen</button>
      </form>
    </section>
  {/if}
  <section class="panel"><div class="sectionhead"><h2>Terminübersicht ({shown.length})</h2><label class="toggle"><input type="checkbox" bind:checked={showPast} /> Vergangene anzeigen</label></div>
    <div class="list">{#each shown as appointment (appointment.id)}
      <article class="event"><div><span class="date">{format(appointment.startsAt)}</span><h3>{appointment.title}</h3><p>Bis {format(appointment.endsAt)}</p><p>Betreute Person: {appointment.recipientFirstName} {appointment.recipientLastName}</p><p>{appointment.requestId ? 'Mit Hilfegesuch verknüpft' : 'Eigenständiger Termin'} · {appointment.status}</p><p><strong>Teilnehmende:</strong> {data.participants.filter(p => p.appointmentId === appointment.id).map(p => `${p.firstName} ${p.lastName}`).join(', ') || 'Keine weiteren Personen eingetragen'}</p></div></article>
    {:else}<p>Keine Termine im gewählten Zeitraum vorhanden.</p>{/each}</div>
  </section>
</div>
<style>
.page{max-width:1180px;margin:auto;padding:28px 24px;color:#17365d}header{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:22px}header a{color:#1d5598;font-weight:700;text-decoration:none}h1{font-size:32px;margin:0 0 8px}header p,.panel>p{color:#65758b;margin:6px 0 16px}.eyebrow{text-transform:uppercase;letter-spacing:.1em;font-size:12px;color:#4d73a7!important;font-weight:700}.panel{background:white;border:1px solid #e0e8f2;border-radius:14px;padding:24px;margin-bottom:20px;box-shadow:0 5px 20px #17365d0b}.panel h2{margin:0 0 14px;font-size:21px}form{display:grid;gap:16px}form label{display:grid;gap:7px;font-size:13px;font-weight:700}input:not([type=checkbox]),select{width:100%;padding:11px;border:1px solid #d7e1ef;border-radius:9px;font:inherit;color:#17365d;background:white;box-sizing:border-box}.cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}fieldset{border:1px solid #e0e8f2;border-radius:10px;padding:14px}legend{font-weight:700;font-size:14px}.people{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}.person{display:flex;align-items:center;gap:9px;font-weight:400}.person small{color:#6d7e93}button{justify-self:start;background:#1d5598;border:0;color:white;border-radius:10px;padding:12px 18px;cursor:pointer;font:inherit;font-weight:700}.hint{color:#536e8a;font-size:13px}.error{color:#aa1d2a;background:#fff0f0;padding:10px;border-radius:8px}.sectionhead{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}.toggle{font-size:13px}.list{display:grid;gap:12px}.event{padding:18px;border:1px solid #e4ebf4;border-left:5px solid #3476c1;border-radius:10px}.event h3{margin:8px 0}.event p{margin:6px 0;color:#5e7189;font-size:14px}.date{font-size:13px;color:#2460a2;font-weight:700}
</style>
