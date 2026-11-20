<script lang="ts">
  import type { PageData, ActionData } from './$types';
  let { data }: { data: PageData } = $props();
  const names = { self: 'Für mich selbst', other: 'Für eine andere Person',
    volunteer: 'Ehrenamtliche Einrichtung', business: 'Unternehmen' };
  let listening = $state(false);
  function demoVoice() {
    // Bewusst KEIN Mikrofonzugriff: Die echte Spracheingabe benötigt Einwilligung,
    // Browser-Berechtigung und eine geprüfte Speech-/Realtime-Integration.
    listening = !listening;
  }
</script>
<div class:business={data.view === 'business'} class:volunteer={data.view === 'volunteer'} class:self={data.view === 'self'} class="workspace">
  <div class="heading"><div><p class="eyebrow">PFLEGEROUTER</p><h1>{names[data.view]}</h1></div><a href="/bereich">Ansicht wechseln</a></div>
  {#if data.view === 'self'}
    <section class="hero"><h2>Was kann ich heute für Sie tun?</h2><p>Ihre Hilfsanfragen und Termine an einem Ort.</p>
      <div class="cards"><article><h3>Meine Hilfsanfragen</h3>{#each data.requests as request}<p>{request.title} · {request.status}</p>{:else}<p>Keine Hilfsanfragen vorhanden.</p>{/each}</article><article><h3>Meine Termine</h3>{#each data.appointments as appointment}<p>{appointment.title} · {new Date(appointment.startsAt).toLocaleString('de-DE')}</p>{:else}<p>Keine Termine vorhanden.</p>{/each}</article></div>
      <div class="voice"><h3>Sprachassistent</h3><p>Der Sprachdialog wird in einem separaten Integrationsschritt aktiviert. Er ist noch nicht mit Mikrofon, KI oder anderen Geräten verbunden.</p><button type="button" onclick={demoVoice}>{listening ? 'Demo schließen' : 'Sprachfunktion ansehen'}</button>{#if listening}<p>Geplant: Spracheingabe, Bestätigung vor Aktionen und geräteübergreifende Synchronisation.</p>{/if}</div>
    </section>
  {:else if data.view === 'other'}
    <section><h2>Meine betreuten Personen</h2>
      {#if data.recipients.length === 0}<p>Sie haben noch keine aktive, freigegebene Vertretung.</p>{/if}
      <div class="cards">{#each data.recipients as person}<article><h3>{person.firstName} {person.lastName}</h3><p>Freigabe: {person.type === 'CONSENT' ? 'Zustimmung' : person.type === 'POWER_OF_ATTORNEY' ? 'Vollmacht' : 'Gesetzliche Vertretung'}</p><p>Hilfsanfragen: {person.canManageRequests ? 'Verwalten erlaubt' : 'Nicht freigegeben'}</p><p>Termine: {person.canManageAppointments ? 'Verwalten erlaubt' : 'Nicht freigegeben'}</p></article>{/each}</div>
      <div class="cards"><article><h3>Hilfsanfragen der betreuten Personen</h3>{#each data.requests as request}<p>{request.title} · {request.status}</p>{:else}<p>Keine Hilfsanfragen vorhanden.</p>{/each}</article><article><h3>Betreuungstermine</h3>{#each data.appointments as appointment}<p>{appointment.title} · {new Date(appointment.startsAt).toLocaleString('de-DE')}</p>{:else}<p>Keine Termine vorhanden.</p>{/each}</article></div>
      <a href="/vertretungen">Vertretungen verwalten</a>
    </section>
  {:else if data.view === 'volunteer'}
    <section class="hero"><h2>{data.active?.organizationName}</h2><p>Gemeinsam Hilfegesuche bearbeiten und Betreuungstermine koordinieren.</p><div class="actions"><a href="/dashboard/anfragen">Hilfsanfragen</a><a href="/dashboard/termine">Termine</a></div></section>
  {:else}
    <section class="hero"><h2>{data.active?.organizationName}</h2><p>Professionelle Übersicht für Betreuungsleistungen und Einsätze.</p><div class="cards"><article><h3>Betreuung</h3><p>Personen und Leistungen verwalten</p></article><article><h3>Einsatzplanung</h3><p>Termine und Mitarbeitende koordinieren</p></article><article><h3>Ehrenamt</h3><p>{data.volunteersEnabled ? 'Eingeschaltet' : 'Nicht aktiviert'}</p></article></div><div class="actions"><a href="/dashboard/anfragen">Hilfsanfragen</a><a href="/dashboard/termine">Termine</a></div></section>
  {/if}
</div>
<style>
  .workspace{--accent:#2f74ae}.workspace.self{--accent:#3b8c92}.workspace.volunteer{--accent:#268364}.workspace.business{--accent:#263d69}
  .heading{display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap}.eyebrow{font-size:.8rem;letter-spacing:.15em;color:var(--accent)}h1{margin:.25rem 0 1.5rem}h2{margin-top:0}
  .hero,section{background:white;padding:clamp(1rem,3vw,2rem);border:1px solid #dfe6ee;border-top:5px solid var(--accent);border-radius:16px}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin:1rem 0}.cards article,.voice{border:1px solid #dbe6ef;background:#f7fafc;border-radius:12px;padding:1rem}
  .actions{display:flex;gap:.8rem;flex-wrap:wrap;margin:1rem 0}.actions a,button{background:var(--accent);color:white;border:0;border-radius:10px;padding:.8rem 1rem;text-decoration:none;cursor:pointer}
</style>
