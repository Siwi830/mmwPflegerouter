
<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const categoryLabels: Record<string, string> = {
    SHOPPING: 'Einkaufen',
    COMPANIONSHIP: 'Gesellschaft',
    TRANSPORT: 'Begleitung & Fahrten',
    HOUSEHOLD: 'Haushalt',
    DIGITAL_HELP: 'Digitale Hilfe',
    OTHER: 'Sonstiges'
  };

  const statusLabels: Record<string, string> = {
    OPEN: 'Offen',
    MATCHED: 'Vermittelt',
    IN_PROGRESS: 'In Bearbeitung',
    COMPLETED: 'Abgeschlossen',
    CANCELLED: 'Abgebrochen'
  };

  function formatDate(value: Date | string) {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(value));
  }
  let selectedPriority = $state<string | null>(null);

const filteredRequests = $derived(
  data.recentRequests.filter(
    (ticket) =>
      selectedPriority === null ||
      ticket.priority === selectedPriority
  )
);

function togglePriority(priority: string) {
  selectedPriority =
    selectedPriority === priority ? null : priority;
}
</script>

<svelte:head>
  <title>Dashboard | Pflegerouter</title>
  <meta
    name="description"
    content="Dein Dashboard für Nachbarschaftshilfe und Ehrenamt."
  />
</svelte:head>

<div class="dashboard">


  <main class="content">
    <div class="welcome">
      <div>
        <p class="eyebrow">DEIN ÜBERBLICK</p>
        <h1>Hallo, {data.user.name.split(' ')[0]}! 👋</h1>
        <p class="subtitle">
          Schön, dass du da bist. Gemeinsam machen wir den Alltag leichter.
        </p>
      </div>

      <span class="date">
        {new Intl.DateTimeFormat('de-DE', {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        }).format(new Date())}
      </span>
    </div>

    {#if data.canViewAdminStats}
    <section class="stats" aria-label="Kennzahlen">
      <div class="stat-card">
        <div class="stat-icon blue">♡</div>
        <p>Offene Hilfsanfragen</p>
        <strong>{data.stats.openRequests}</strong>
        <span>Warten auf Unterstützung</span>
      </div>

      <div class="stat-card">
        <div class="stat-icon purple">♧</div>
        <p>Aktive Ehrenamtliche</p>
        <strong>{data.stats.volunteers}</strong>
        <span>Engagieren sich gemeinsam</span>
      </div>

      <div class="stat-card">
        <div class="stat-icon orange">♙</div>
        <p>Betreute Personen</p>
        <strong>{data.stats.recipients}</strong>
        <span>In deinen Organisationen</span>
      </div>

      <div class="stat-card">
        <div class="stat-icon green">▦</div>
        <p>Anstehende Termine</p>
        <strong>{data.stats.upcomingAppointments}</strong>
        <span>Geplante Begegnungen</span>
      </div>
    </section>
    {/if}

    {#if !data.canViewAdminStats && data.organizations.some((organization) => organization.role === 'VOLUNTEER')}
      <section class="personal-tasks panel" aria-labelledby="my-tasks-heading">
        <div class="section-heading">
          <h2 id="my-tasks-heading">Meine Aufgaben</h2>
          <span>{data.myRequests.length} zugewiesen</span>
        </div>
        {#if data.myRequests.length === 0}
          <p class="section-empty">Du hast aktuell keine Hilfsanfragen übernommen.</p>
        {:else}
          <div class="personal-task-list">
            {#each data.myRequests as ticket (ticket.id)}
              <a class="personal-task" href={`/dashboard/anfragen/${ticket.id}`}>
                <strong>{ticket.title}</strong>
                <small>{ticket.organizationName} · {statusLabels[ticket.status] ?? ticket.status}</small>
              </a>
            {/each}
          </div>
        {/if}
      </section>
    {/if}

    <section class="priority-overview" aria-labelledby="priority-heading">
  <h2 id="priority-heading">Hilfsanfragen nach Dringlichkeit</h2>
  <p class="priority-intro">{data.stats.openRequests} offene Anfragen · Kachel anklicken, um die Liste zu filtern</p>
  <div class="priority-grid">
  <button
  type="button"
  class="priority-counter emergency"
  class:selected={selectedPriority === 'EMERGENCY'}
  aria-pressed={selectedPriority === 'EMERGENCY'}
  onclick={() => togglePriority('EMERGENCY')}
>
  <strong>{data.requestPriorities.emergency}</strong>
  <span>Notfall</span>
</button>
  <button
    type="button"
    class="priority-counter urgent"
    class:selected={selectedPriority === 'URGENT'}
    aria-pressed={selectedPriority === 'URGENT'}
    onclick={() => togglePriority('URGENT')}
  >
    <strong>{data.requestPriorities.urgent}</strong>
    <span>Dringend</span>
  </button>
    <button
      type="button"
      class="priority-counter normal"
      class:selected={selectedPriority === 'NORMAL'}
      aria-pressed={selectedPriority === 'NORMAL'}
      onclick={() => togglePriority('NORMAL')}
  >
    <strong>{data.requestPriorities.normal}</strong>
    <span>Normal</span>
  </button>
    <button
      type="button"
      class="priority-counter wish"
      class:selected={selectedPriority === 'WISH'}
      aria-pressed={selectedPriority === 'WISH'}
      onclick={() => togglePriority('WISH')}
    >
      <strong>{data.requestPriorities.wish}</strong>
      <span>Wunsch</span>
    </button>
  </div>
  </section>

    <div class="main-grid">
      <section class="priority-section" aria-label="Liste der Hilfsanfragen">
        <div class="priority-tickets">
        {#if filteredRequests.length === 0}
          <div class="empty-state">
            <h3>Keine Hilfsanfragen vorhanden</h3>
            <p>
              {selectedPriority === null ? 'Es liegen aktuell keine sichtbaren Hilfsanfragen vor.' : 'Für die ausgewählte Dringlichkeitsstufe liegen keine sichtbaren Hilfsanfragen vor.'}
            </p>
          </div>
        {:else}
          {#each filteredRequests as ticket (ticket.id)}
              <a href={`/dashboard/anfragen/${ticket.id}`} class:emergency={ticket.priority === 'EMERGENCY'} class:urgent={ticket.priority === 'URGENT'} class:normal={ticket.priority === 'NORMAL'} class:wish={ticket.priority === 'WISH'} class="priority-ticket">
                <div class="ticket-head">
                  <span class="priority-pill">{ticket.priority === 'EMERGENCY' ? 'NOTFALL' : ticket.priority === 'URGENT' ? 'DRINGEND' : ticket.priority === 'WISH' ? 'WUNSCH' : 'NORMAL'}</span>
                  <span class:unprocessed={ticket.status === 'OPEN'} class="processing-pill">{ticket.status === 'OPEN' ? '● UNBEARBEITET' : ticket.status === 'IN_PROGRESS' ? 'In Bearbeitung' : ticket.status === 'COMPLETED' ? 'Erledigt' : ticket.status === 'CANCELLED' ? 'Abgebrochen' : ticket.status === 'MATCHED' ? 'Zugeordnet' : ticket.status}</span>
                </div>
                <h3>{ticket.title}</h3>
                <p>{ticket.recipientFirstName} {ticket.recipientLastName} · {ticket.organizationName}</p>
                <small>{new Date(ticket.createdAt).toLocaleString('de-DE')}</small>
              </a>
          {/each}
        {/if}
  </div>
</section>
      
      <aside class="sidebar">
        <section class="panel upcoming-panel" aria-labelledby="upcoming-heading">
          <h2 id="upcoming-heading">Nächste Termine</h2>
          {#if data.upcomingAppointments.length === 0}
            <p class="section-empty">Keine anstehenden Termine verfügbar.</p>
          {:else}
            <div class="appointment-list">
              {#each data.upcomingAppointments as appointment (appointment.id)}
                <div class="appointment-entry">
                  <strong>{new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(appointment.startsAt))}</strong>
                  <span>{new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(new Date(appointment.startsAt))} Uhr · Geplant</span>
                </div>
              {/each}
            </div>
          {/if}
        </section>
        <section class="panel quick-actions">
          <h2>Schnellzugriff</h2>
          <p>Was möchtest du heute tun?</p>

          <div class="action-list">
            <a href="/dashboard/anfragen" class="action">
              <span class="action-icon blue">＋</span>
              <span>Hilfsanfragen</span>
              <span class="arrow">→</span>
            </a>

            {#if data.canViewAdminStats}
            <a href="/dashboard/ehrenamtliche" class="action">
              <span class="action-icon purple">♧</span>
              <span>Ehrenamtliche</span>
              <span class="arrow">→</span>
            </a>

            <a href="/dashboard/personen" class="action">
              <span class="action-icon orange">♙</span>
              <span>Betreute Personen</span>
              <span class="arrow">→</span>
            </a>

            {/if}
            <a href="/dashboard/termine" class="action">
              <span class="action-icon green">▦</span>
              <span>Termine</span>
              <span class="arrow">→</span>
            </a>
          </div>
        </section>

      </aside>
    </div>

    {#if data.organizations.length === 0}
      <div class="notice">
        <strong>Noch keiner Organisation zugeordnet</strong>
        <p>
          Dein Konto ist bereit. Sobald du einer Organisation
          zugeordnet wirst, erscheinen hier ihre Daten.
        </p>
      </div>
    {/if}
  </main>
</div>
{#if data.canReviewChanges}
  <section class="changes-panel">
    <div class="changes-icon">✎</div>

    <div class="changes-content">
      <h2>Datenänderungen</h2>

      {#if data.pendingChanges > 0}
        <p>
          {data.pendingChanges}
          {data.pendingChanges === 1
            ? ' Antrag wartet'
            : ' Anträge warten'}
          auf deine Freigabe.
        </p>
      {:else}
        <p>Aktuell liegen keine offenen Änderungsanträge vor.</p>
      {/if}
    </div>

    {#if data.pendingChanges > 0}
      <span class="changes-count">
        {data.pendingChanges} offen
      </span>
    {/if}

    <a
      href="/dashboard/datenaenderungen"
      class="changes-link"
    >
      Anträge prüfen →
    </a>
  </section>
{/if}
<style>
  .organization-panel, .personal-tasks { margin-bottom: 24px; }
  .organization-list, .personal-task-list, .appointment-list { display: grid; gap: 10px; }
  .organization-entry, .appointment-entry { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; padding: 12px 14px; border: 1px solid #e9eef6; border-radius: 10px; }
  .organization-entry span, .appointment-entry span, .section-heading span { color: #71819b; font-size: 12px; }
  .section-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
  .section-heading h2 { margin: 0; }
  .personal-task { display: grid; gap: 6px; padding: 13px 15px; border: 1px solid #e4eaf3; border-radius: 10px; background: #f8fbff; color: #173b70; text-decoration: none; }
  .personal-task:hover { border-color: #98baf0; }
  .personal-task small, .section-empty { color: #71819b; font-size: 13px; }
  .upcoming-panel { margin-bottom: 0; }
  .appointment-entry { display: grid; gap: 5px; }
  .priority-counter:focus-visible, .priority-ticket:focus-visible { outline: 3px solid #2464c8; outline-offset: 3px; }

.priority-counter {
  border: 2px solid transparent;
  cursor: pointer;
  text-align: left;
  font: inherit;
}

.priority-counter.selected {
  border-color: currentColor;
  box-shadow: 0 0 0 2px rgba(25, 65, 120, 0.08);
}
.priority-overview { margin: 24px 0 0; }
  .priority-section { margin: 0; }
  .priority-overview h2 { color: #173b70; margin-bottom: 4px; }
  .priority-intro { color: #65758b; margin-bottom: 16px; }
  .priority-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 24px; }
  .priority-counter { padding: 18px; border-radius: 14px; display: flex; flex-direction: column; gap: 4px; }
  .priority-counter strong { font-size: 30px; }
  .priority-counter.emergency { background: #fde8e8; color: #a91d25; }
  .priority-counter.urgent { background: #fff0dd; color: #9d5000; }
  .priority-counter.normal { background: #fff8d6; color: #846400; }
  .priority-counter.wish { background: #e9f1ff; color: #1c57aa; }
  .priority-tickets { display: grid; gap: 12px; }
  .priority-ticket { display: block; text-decoration: none; color: inherit; background: #fff; padding: 18px; border: 1px solid #e4eaf3; border-left: 6px solid #e0b830; border-radius: 12px; }
  .priority-ticket:hover { box-shadow: 0 6px 22px #1649a01c; border-top-color: #b5c8e6; }
  .priority-ticket.emergency { border-left-color: #c62828; }
  .priority-ticket.urgent { border-left-color: #e57b19; }
  .priority-ticket.normal { border-left-color: #d1a400; }
  .priority-ticket.wish { border-left-color: #2872c8; }
  .ticket-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
  .priority-pill { font-size: 12px; font-weight: 800; letter-spacing: .04em; }
  .processing-pill { color: #52647a; font-size: 12px; font-weight: 700; }
  .processing-pill.unprocessed { background: #fde8e8; color: #b71c1c; padding: 5px 10px; border-radius: 100px; }
  .priority-ticket h3 { margin: 10px 0 6px; color: #18365c; }
  .priority-ticket p, .priority-ticket small { color: #63738a; }
  @media (max-width: 700px) { .priority-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }

.changes-panel {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
  padding: 22px 26px;
  margin-bottom: 28px;
  background: white;
  border: 1px solid #e9eef6;
  border-radius: 16px;
  box-shadow: 0 5px 24px #1c3e7210;
}

.changes-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 12px;
  background: #e7f0ff;
  color: #2464c8;
  font-size: 25px;
}

.changes-content {
  flex: 1;
  min-width: 180px;
}

.changes-content h2 {
  margin: 0 0 6px;
  font-size: 18px;
  color: #172b4d;
}

.changes-content p {
  margin: 0;
  color: #71819b;
  font-size: 13px;
}

.changes-count {
  padding: 7px 12px;
  border-radius: 20px;
  background: #fff3df;
  color: #99620c;
  font-size: 12px;
  font-weight: 700;
}

.changes-link {
  padding: 11px 16px;
  border-radius: 10px;
  background: #1649a0;
  color: white;
  text-decoration: none;
  font-size: 13px;
  font-weight: 700;
}

.changes-link:hover {
  background: #2464c8;
}

@media (max-width: 600px) {
  .changes-panel {
    padding: 18px;
  }

  .changes-link {
    width: 100%;
    text-align: center;
  }
}

  :global(body) {
    margin: 0;
    background: #f6f8fc;
    font-family: Arial, Helvetica, sans-serif;
    color: #172b4d;
  }

  :global(*) {
    box-sizing: border-box;
  }

  .dashboard {
    min-height: 100vh;
  }

  .topbar {
    height: 76px;
    padding: 0 max(24px, calc((100vw - 1200px) / 2));
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: white;
    border-bottom: 1px solid #e8edf5;
  }

  .logo {
    font-size: 27px;
    font-weight: 800;
    color: #1649a0;
    text-decoration: none;
    letter-spacing: -1.5px;
  }

  .logo span {
    color: #4d9eff;
  }

  .profile {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .profile-name {
    font-size: 14px;
    font-weight: 600;
  }

  .avatar {
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #e4efff;
    color: #1755b3;
    font-weight: 700;
  }

  .content {
    max-width: 1248px;
    margin: 0 auto;
    padding: 42px 24px 80px;
  }

  .welcome {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 20px;
    margin-bottom: 32px;
  }

  .eyebrow {
    color: #2865c4;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 2px;
    margin: 0 0 12px;
  }

  h1 {
    font-size: clamp(28px, 4vw, 38px);
    letter-spacing: -1.2px;
    margin: 0 0 12px;
  }

  .subtitle,
  .panel-heading p,
  .quick-actions > p {
    color: #7c8ba3;
    font-size: 14px;
    margin: 0;
  }

  .date {
    font-size: 13px;
    color: #7c8ba3;
    text-transform: capitalize;
    white-space: nowrap;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 18px;
    margin-bottom: 28px;
  }

  .stat-card,
  .panel {
    background: white;
    border: 1px solid #e9eef6;
    border-radius: 16px;
    box-shadow: 0 5px 24px #1c3e7210;
  }

  .stat-card {
    padding: 24px;
  }

  .stat-icon,
  .action-icon {
    display: grid;
    place-items: center;
    border-radius: 12px;
    font-size: 25px;
  }

  .stat-icon {
    width: 48px;
    height: 48px;
    margin-bottom: 22px;
  }

  .blue {
    background: #e7f0ff;
    color: #2464c8;
  }

  .purple {
    background: #f0eaff;
    color: #8755cc;
  }

  .orange {
    background: #fff1e2;
    color: #e49a45;
  }

  .green {
    background: #e5f7ee;
    color: #279e68;
  }

  .stat-card p {
    color: #71819b;
    font-size: 13px;
    margin: 0 0 8px;
  }

  .stat-card strong {
    display: block;
    font-size: 36px;
    letter-spacing: -1px;
    margin-bottom: 8px;
  }

  .stat-card > span {
    color: #99a5b8;
    font-size: 12px;
  }

  .main-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.7fr) minmax(280px, 1fr);
    gap: 24px;
    align-items: start;
  }

  .panel {
    padding: 26px;
  }

  .panel-heading {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 26px;
  }

  h2 {
    font-size: 18px;
    margin: 0 0 8px;
    letter-spacing: -.3px;
  }

  .text-link {
    color: #2464c8;
    text-decoration: none;
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
  }

  .request {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 17px 0;
    border-bottom: 1px solid #eef1f6;
  }

  .request:last-child {
    border-bottom: 0;
  }

  .request-icon {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: #eaf1ff;
    color: #2865c4;
    font-size: 24px;
  }

  .request-details {
    flex: 1;
    min-width: 0;
  }

  .request-details h3 {
    font-size: 14px;
    margin: 0 0 6px;
  }

  .request-details p,
  .request-details small {
    color: #8794a8;
    font-size: 12px;
  }

  .request-details p {
    margin: 0 0 6px;
  }

  .status {
    border-radius: 20px;
    padding: 7px 11px;
    font-size: 11px;
    font-weight: 700;
    background: #eef1f5;
    color: #64748b;
    white-space: nowrap;
  }

  .status.open {
    background: #e8f6ee;
    color: #208653;
  }

  .empty-state {
    text-align: center;
    padding: 45px 15px;
  }

  .empty-icon {
    color: #b6cae8;
    font-size: 48px;
    margin-bottom: 12px;
  }

  .empty-state h3 {
    font-size: 16px;
  }

  .empty-state p {
    color: #8794a8;
    font-size: 13px;
    line-height: 1.7;
  }

  .sidebar {
    display: grid;
    gap: 24px;
  }

  .quick-actions > p {
    margin-bottom: 22px;
  }

  .action-list {
    display: grid;
    gap: 10px;
  }

  .action {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px;
    border: 1px solid #eef1f6;
    border-radius: 12px;
    color: #253957;
    text-decoration: none;
    font-size: 13px;
    font-weight: 600;
  }

  .action:hover {
    border-color: #aac9f6;
    background: #f8fbff;
  }

  .action-icon {
    width: 38px;
    height: 38px;
    font-size: 20px;
  }

  .arrow {
    margin-left: auto;
    color: #9aaac0;
  }

  .community-card {
    background: linear-gradient(135deg, #16489c, #2678dc);
    border-radius: 16px;
    padding: 28px;
    color: white;
  }

  .community-symbol {
    display: block;
    font-size: 34px;
    margin-bottom: 20px;
  }

  .community-card h2 {
    font-size: 21px;
    margin-bottom: 12px;
  }

  .community-card p {
    font-size: 13px;
    line-height: 1.8;
    color: #d8e9ff;
    margin: 0;
  }

  .notice {
    margin-top: 28px;
    padding: 20px 24px;
    border-radius: 12px;
    background: #fff8e8;
    color: #8a621c;
  }

  .notice p {
    font-size: 13px;
    margin-bottom: 0;
  }

  @media (max-width: 950px) {
    .stats {
      grid-template-columns: repeat(2, 1fr);
    }

    .main-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 600px) {
    .topbar {
      padding: 0 20px;
    }

    .content {
      padding: 30px 16px 60px;
    }

    .welcome {
      display: block;
    }

    .date {
      display: block;
      margin-top: 16px;
    }

    .stats {
      gap: 12px;
    }

    .stat-card {
      padding: 18px;
    }

    .stat-card strong {
      font-size: 30px;
    }

    .panel {
      padding: 20px;
    }

    .panel-heading {
      flex-direction: column;
    }

    .request {
      flex-wrap: wrap;
    }

    .status {
      margin-left: 58px;
    }
  }
</style>
