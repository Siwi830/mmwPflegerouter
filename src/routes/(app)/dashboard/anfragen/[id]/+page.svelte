<script lang="ts">
  import type { PageData, ActionData } from './$types';
  let { data, form }: { data: PageData; form: ActionData } = $props();
  const categories = [
    ['SHOPPING', 'Einkaufen'], ['COMPANIONSHIP', 'Gesellschaft'], ['TRANSPORT', 'Begleitung & Fahrten'],
    ['HOUSEHOLD', 'Haushalt'], ['DIGITAL_HELP', 'Digitale Hilfe'], ['OTHER', 'Sonstiges']
  ];
  const priorities = [['EMERGENCY', 'Notfall'], ['URGENT', 'Dringend'], ['NORMAL', 'Normal'], ['WISH', 'Wunsch']];
  const statuses = [['OPEN', 'Unbearbeitet'], ['MATCHED', 'Zugeordnet'], ['IN_PROGRESS', 'In Bearbeitung'], ['COMPLETED', 'Erledigt'], ['CANCELLED', 'Abgebrochen']];
</script>

<svelte:head><title>{data.request.title} | </title></svelte:head>
<main class="wrap">
  <a href="/dashboard" class="back">← Zurück zum Dashboard</a>
  <div class="heading">
    <div><p class="eyebrow">HILFSANFRAGE</p><h1>{data.request.title}</h1><p class="meta">{data.recipient?.firstName} {data.recipient?.lastName} · Erstellt am {new Date(data.request.createdAt).toLocaleDateString('de-DE')}</p></div>
    <span class:emergency={data.request.priority === 'EMERGENCY'} class:urgent={data.request.priority === 'URGENT'} class:wish={data.request.priority === 'WISH'} class="priority">{priorities.find(([key]) => key === data.request.priority)?.[1] ?? 'Normal'}</span>
  </div>
  {#if form?.message}<p class="notice" role="status">{form.message}</p>{/if}
  {#if data.request.priority === 'EMERGENCY'}<p class="warning">Bei einem akuten medizinischen Notfall sofort 112 anrufen. Die Bearbeitung dieser Anfrage ersetzt keinen Notruf.</p>{/if}
  <div class="layout">
    <section class="panel">
      <h2>Aufgabe bearbeiten</h2>
      <p class="hint">{data.isManager ? 'Als Verwaltung kannst du alle Angaben bearbeiten.' : 'Als zuständige Person kannst du den Bearbeitungsstatus ändern.'}</p>
      <form method="POST" action="?/update">
        <label for="title">Titel</label><input id="title" name="title" maxlength="200" required value={data.request.title} readonly={!data.isManager} />
        <label for="description">Beschreibung</label><textarea id="description" name="description" rows="6" maxlength="5000" readonly={!data.isManager}>{data.request.description ?? ''}</textarea>
        <div class="two">
          <div><label for="category">Kategorie</label><select id="category" name="category" disabled={!data.isManager}>{#each categories as [key, label]}<option value={key} selected={data.request.category === key}>{label}</option>{/each}</select>{#if !data.isManager}<input type="hidden" name="category" value={data.request.category} />{/if}</div>
          <div><label for="priority">Dringlichkeit</label><select id="priority" name="priority" disabled={!data.isManager}>{#each priorities as [key, label]}<option value={key} selected={data.request.priority === key}>{label}</option>{/each}</select>{#if !data.isManager}<input type="hidden" name="priority" value={data.request.priority} />{/if}</div>
        </div>
        <label for="status">Bearbeitungsstatus</label>
        <select id="status" name="status" disabled={!data.isManager && !data.isMine}>
          {#each statuses as [key, label]}
            {#if data.isManager || ['IN_PROGRESS', 'COMPLETED'].includes(key) || key === data.request.status}
              <option value={key} selected={data.request.status === key}>{label}</option>
            {/if}
          {/each}
        </select>
        {#if data.isManager || data.isMine}<button type="submit">Änderungen speichern</button>{:else}<p class="hint">Übernimm die Aufgabe, um ihren Status zu bearbeiten.</p>{/if}
      </form>
    </section>
    <aside class="panel">
      <h2>Zuständigkeit</h2>
      <p class="hint">Aktuell zugewiesen an:</p>
      <p class="assignee">{data.assignedName ?? (data.request.assignedUserId ? 'Zugewiesene Person (nicht mehr aktiv)' : 'Niemanden – unbearbeitet')}</p>
      {#if !['COMPLETED', 'CANCELLED'].includes(data.request.status)}
        {#if !data.request.assignedUserId}<form method="POST" action="?/claim"><button type="submit">Mir selbst zuweisen</button></form>{/if}
        {#if data.isManager}
          <form method="POST" action="?/assign">
            <label for="userId">Person zuweisen / Zuordnung ändern</label>
            <select id="userId" name="userId" required><option value="">Bitte auswählen</option>{#each data.assignees as person}<option value={person.id} selected={person.id === data.request.assignedUserId}>{person.firstName} {person.lastName}</option>{/each}</select>
            <button type="submit">Zuordnung speichern</button>
          </form>
        {/if}
      {/if}
      {#if data.request.assignedUserId && (data.isManager || data.isMine)}<form method="POST" action="?/unassign"><button type="submit" class="secondary">Zuordnung lösen</button></form>{/if}
      <p class="hint">Eine Zuordnung kann von der zuständigen Person selbst oder von der Verwaltung gelöst werden. Danach ist die Aufgabe wieder offen.</p>
    </aside>
  </div>
</main>
<style>
  :global(body){background:#f6f8fc;color:#172b4d;font-family:Arial,Helvetica,sans-serif}
  :global(*){box-sizing:border-box}
  .wrap{max-width:1150px;margin:0 auto;padding:38px 22px 90px}
  .back{color:#2464c8;text-decoration:none;font-weight:700}
  .heading{display:flex;justify-content:space-between;gap:16px;align-items:center;margin:24px 0}
  h1{font-size:clamp(25px,3vw,35px);margin:5px 0 10px}
  h2{font-size:20px;margin:0 0 15px}
  .eyebrow{font-size:12px;color:#2464c8;letter-spacing:2px;font-weight:800}
  .meta,.hint{color:#6d7c92;font-size:14px;line-height:1.5}
  .priority{background:#fff6d7;color:#806300;border-radius:20px;padding:9px 15px;font-weight:800}
  .priority.emergency{background:#fde8e8;color:#b91c1c}.priority.urgent{background:#fff0dd;color:#9d5000}.priority.wish{background:#e9f1ff;color:#1c57aa}
  .layout{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(290px,1fr);gap:22px}
  .panel{background:white;border:1px solid #e4eaf3;border-radius:16px;padding:26px;box-shadow:0 5px 24px #1c3e7210}
  label{display:block;font-size:13px;font-weight:700;margin:18px 0 7px}
  input,textarea,select{width:100%;border:1px solid #ccd7e6;border-radius:9px;padding:12px;font:inherit;background:#fff;color:#172b4d}
  input[readonly],textarea[readonly],select:disabled{background:#f3f6fa}
  .two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  button{margin-top:18px;background:#1649a0;color:white;border:0;border-radius:10px;padding:12px 17px;cursor:pointer;font-weight:700;width:100%}
  button.secondary{background:#fff;color:#a62d2d;border:1px solid #e4b8b8}
  .assignee{font-weight:800;font-size:17px}.notice{background:#e8f5ec;border:1px solid #b3dcc1;padding:13px;border-radius:9px}
  .warning{background:#fde8e8;border:1px solid #f0b0b0;color:#8d1b1b;padding:14px;border-radius:9px}
  @media(max-width:760px){.layout,.two{grid-template-columns:1fr}.heading{align-items:flex-start;flex-direction:column}}
</style>
