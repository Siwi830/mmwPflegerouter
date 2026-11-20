<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let mode = $state<'list' | 'create' | 'edit'>('list');
  let editingId = $state('');
  let organizationId = $state('');
  let firstName = $state('');
  let lastName = $state('');
  let email = $state('');
  let phone = $state('');
  let createAccess = $state(false);
  let saving = $state(false);
  let search = $state('');
  let confirmDelete = $state(false);
  const filtered = $derived(data.volunteers.filter(v =>
    `${v.firstName} ${v.lastName} ${v.email ?? ''} ${v.phone ?? ''}`
      .toLowerCase().includes(search.toLowerCase())
  ));

  function startCreate() {
    mode = 'create'; editingId = ''; organizationId = data.organizations[0]?.id ?? '';
    firstName = ''; lastName = ''; email = ''; phone = '';
    createAccess = false; confirmDelete = false;
  }
  function startEdit(volunteer: PageData['volunteers'][number]) {
    mode = 'edit'; editingId = volunteer.id;
    organizationId = volunteer.organizationId;
    firstName = volunteer.firstName; lastName = volunteer.lastName;
    email = volunteer.email ?? ''; phone = volunteer.phone ?? '';
    confirmDelete = false;
  }
  const enhanced = () => {
    saving = true;
    return async ({ result, update }: { result: { type: string }; update: (options?: { reset?: boolean; invalidateAll?: boolean }) => Promise<void> }) => {
      saving = false;
      await update({ reset: false, invalidateAll: false });
      if (result.type === 'success') {
        mode = 'list'; confirmDelete = false;
        await invalidateAll();
      }
    };
  };
</script>

<svelte:head><title>Ehrenamtliche | Pflegerouter </title></svelte:head>

<div class="page">
  <header class="header">
    <div>
      <p class="eyebrow">VERWALTUNG / EHRENAMTLICHE</p>
      <h1>Ehrenamtliche Mitarbeiter</h1>
      <p class="muted">Ehrenamtliche erfassen, bearbeiten und Benutzerzugänge einrichten.</p>
    </div>
    {#if data.organizations.length && mode === 'list'}
      <button class="primary" type="button" onclick={startCreate}>+ Ehrenamtliche erfassen</button>
    {:else if mode !== 'list'}
      <button class="outline" type="button" onclick={() => mode = 'list'}>Zurück zur Liste</button>
    {/if}
  </header>

  {#if form?.message}
    <div class="notice" class:ok={form.success} role="status">{form.message}</div>
  {/if}
  {#if form?.activationUrl}
    <div class="testlink">
      <strong>Test-Aktivierungslink (nur für Verwaltungsberechtigte)</strong>
      <p>Der Link ist einmalig und 24 Stunden gültig. Nicht öffentlich weitergeben.</p>
      <input aria-label="Aktivierungslink" readonly value={form.activationUrl} onclick={e => e.currentTarget.select()} />
      <button type="button" class="outline" onclick={() => navigator.clipboard.writeText(form.activationUrl!)}>Link kopieren</button>
    </div>
  {/if}

  {#if !data.organizations.length}
    <section class="card"><h2>Keine Berechtigung</h2><p>Du benötigst OWNER-, ADMIN- oder COORDINATOR-Rechte.</p></section>
  {:else if mode === 'create' || mode === 'edit'}
    <section class="card">
      <h2>{mode === 'create' ? 'Ehrenamtliche Person erfassen' : 'Ehrenamtliche Person bearbeiten'}</h2>
      <form method="POST" action={mode === 'create' ? '?/create' : '?/update'} use:enhance={enhanced}>
        {#if mode === 'edit'}<input type="hidden" name="id" value={editingId} />{/if}
        <div class="grid">
          <label class="full">Organisation
            {#if mode === 'edit'}
              <input readonly value={data.organizations.find(o => o.id === organizationId)?.name ?? ''} />
              <input type="hidden" name="organizationId" value={organizationId} />
            {:else}
              <select name="organizationId" bind:value={organizationId} required>
                {#each data.organizations as org}<option value={org.id}>{org.name}</option>{/each}
              </select>
            {/if}
          </label>
          <label>Vorname *<input name="firstName" bind:value={firstName} maxlength="100" required /></label>
          <label>Nachname *<input name="lastName" bind:value={lastName} maxlength="100" required /></label>
          <label>Telefonnummer<input name="phone" type="tel" bind:value={phone} maxlength="40" /></label>
          <label>E-Mail-Adresse<input name="email" type="email" bind:value={email} maxlength="320" /></label>
        </div>
        {#if mode === 'create'}
          <label class="access"><input type="checkbox" name="createAccess" bind:checked={createAccess} />
            <span><strong>Benutzerzugang erstellen</strong><small>Einladung per E-Mail versenden und Testlink anzeigen. E-Mail erforderlich.</small></span>
          </label>
        {:else}
          {#if data.volunteers.find(v => v.id === editingId)?.userId}
            <p class="muted">Benutzerkonto verknüpft. Die Login-E-Mail kann hier nicht geändert werden.</p>
          {:else}
            <p class="muted">Noch kein Benutzerkonto. Nach dem Speichern kannst du über „Einladen“ einen Zugang erstellen.</p>
          {/if}
        {/if}
        <div class="actions">
          <button class="outline" type="button" onclick={() => mode = 'list'}>Abbrechen</button>
          <button class="primary" type="submit" disabled={saving}>{saving ? 'Speichert …' : 'Änderungen speichern'}</button>
        </div>
      </form>
      {#if mode === 'edit'}
        <hr />
        <h3>Status und Löschung</h3>
        {#each data.volunteers.filter(v => v.id === editingId) as volunteer}
          <div class="actions left">
            <form method="POST" action="?/setActive" use:enhance={enhanced}>
              <input type="hidden" name="id" value={volunteer.id} />
              <input type="hidden" name="organizationId" value={volunteer.organizationId} />
              <input type="hidden" name="active" value={String(!volunteer.isActive)} />
              <button type="submit" class="outline" disabled={saving}>{volunteer.isActive ? 'Deaktivieren' : 'Aktivieren'}</button>
            </form>
            {#if !volunteer.userId && volunteer.isActive && volunteer.email}
              <form method="POST" action="?/invite" use:enhance={enhanced}>
                <input type="hidden" name="id" value={volunteer.id} />
                <input type="hidden" name="organizationId" value={volunteer.organizationId} />
                <button type="submit" class="outline" disabled={saving}>Benutzerzugang einladen</button>
              </form>
            {/if}
            <button type="button" class="danger" onclick={() => confirmDelete = !confirmDelete}>Löschen</button>
          </div>
          {#if confirmDelete}
            <div class="confirm"><strong>Wirklich löschen?</strong><p>Der Datensatz bleibt in PostgreSQL erhalten und wird ausgeblendet.</p>
              <form method="POST" action="?/delete" use:enhance={enhanced}>
                <input type="hidden" name="id" value={volunteer.id} />
                <input type="hidden" name="organizationId" value={volunteer.organizationId} />
                <button class="danger" type="submit">Löschen bestätigen</button>
                <button class="outline" type="button" onclick={() => confirmDelete = false}>Abbrechen</button>
              </form>
            </div>
          {/if}
        {/each}
      {/if}
    </section>
  {:else}
    <section class="card">
      <div class="listhead"><div><h2>Alle Ehrenamtlichen</h2><p class="muted">{data.volunteers.length} Personen erfasst</p></div>
        <input class="search" type="search" placeholder="Ehrenamtliche suchen …" bind:value={search} />
      </div>
      {#if filtered.length === 0}<p class="muted">Keine Ehrenamtlichen gefunden.</p>{/if}
      {#each filtered as volunteer (volunteer.id)}
        <div class="person">
          <div class="avatar">{volunteer.firstName[0]}{volunteer.lastName[0]}</div>
          <div class="info"><strong>{volunteer.firstName} {volunteer.lastName}</strong>
            <span>{volunteer.email || 'Keine E-Mail'} · {volunteer.phone || 'Kein Telefon'}</span>
            <small>{volunteer.organizationName} · {volunteer.userId ? 'Benutzerkonto verknüpft' : 'Ohne Zugang'}</small>
          </div>
          <span class:inactive={!volunteer.isActive} class="status">{volunteer.isActive ? 'Aktiv' : 'Deaktiviert'}</span>
          <button class="outline" type="button" onclick={() => startEdit(volunteer)}>Bearbeiten</button>
        </div>
      {/each}
    </section>
  {/if}
</div>

<style>
  .page{max-width:1250px;margin:auto;padding:32px;color:#172b4d}
  .header,.listhead,.actions{display:flex;align-items:center;justify-content:space-between;gap:18px}
  .header{margin-bottom:28px}.eyebrow{color:#2464c8;font-size:11px;font-weight:800;letter-spacing:1px}
  h1{font-size:30px;margin:7px 0}h2{font-size:21px;margin:0 0 20px}h3{margin-top:26px}
  .muted{color:#71819b;font-size:13px;line-height:1.6}
  .card{background:#fff;border:1px solid #e9eef6;border-radius:20px;padding:30px;box-shadow:0 8px 28px #1c3e720d}
  .primary,.outline,.danger{border-radius:11px;min-height:43px;padding:11px 17px;font:inherit;font-size:13px;font-weight:700;cursor:pointer}
  .primary{background:#1649a0;color:#fff;border:1px solid #1649a0}.outline{background:#fff;color:#1649a0;border:1px solid #dce5f1}
  .danger{background:#fff;color:#b42318;border:1px solid #efc7c2}button:disabled{opacity:.55;cursor:wait}
  .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.full{grid-column:1/-1}
  label{display:grid;gap:8px;color:#526580;font-size:13px;font-weight:700}
  input:not([type=checkbox]),select{width:100%;min-width:0;min-height:46px;padding:11px 13px;border:1px solid #dce5f1;border-radius:10px;background:#fbfcff;color:#172b4d;font:inherit;font-size:14px}
  .access{display:flex;align-items:flex-start;gap:13px;margin-top:26px;padding:19px;border-radius:13px;background:#f3f7ff}
  .access input{margin-top:3px;accent-color:#1649a0}.access span{display:grid;gap:6px}.access small{font-weight:400;color:#71819b}
  .actions{justify-content:flex-end;flex-wrap:wrap;margin-top:25px}.actions.left{justify-content:flex-start}
  .person{display:flex;align-items:center;gap:17px;border-top:1px solid #edf1f7;padding:20px 0}
  .avatar{width:46px;height:46px;display:grid;place-items:center;border-radius:13px;background:#e7f0ff;color:#1649a0;font-weight:800;flex-shrink:0}
  .info{display:grid;gap:6px;flex:1;min-width:0}.info span,.info small{color:#71819b;font-size:12px;overflow-wrap:anywhere}
  .status{background:#e5f7ee;color:#188654;border-radius:20px;padding:7px 11px;font-size:11px;font-weight:700}.status.inactive{background:#f1f4f8;color:#71819b}
  .search{max-width:290px}.notice,.testlink,.confirm{margin-bottom:20px;padding:18px 20px;border:1px solid #ffc9c5;border-radius:12px;background:#fff1f0;color:#b42318}
  .notice.ok,.testlink{background:#eaf8f0;border-color:#c2ead2;color:#176c47}.testlink input{margin:12px 0}.testlink p,.confirm p{font-size:13px}
  .confirm{margin-top:20px}.confirm form{display:flex;gap:10px;flex-wrap:wrap}hr{border:0;border-top:1px solid #edf1f7;margin-top:30px}
  @media(max-width:750px){.page{padding:20px 16px}.header,.listhead{align-items:stretch;flex-direction:column}.grid{grid-template-columns:1fr}.card{padding:20px}.person{flex-wrap:wrap}.search{max-width:none}}
</style>
