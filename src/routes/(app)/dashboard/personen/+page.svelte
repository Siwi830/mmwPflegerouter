<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type Relative = {
    id?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };

  type Person = PageData['persons'][number];
  type Mode = 'list' | 'create' | 'edit';

  let mode = $state<Mode>('list');
  let search = $state('');
  let saving = $state(false);
  let createAccess = $state(false);
  let confirmDelete = $state(false);
  let selectedPerson = $state<Person | null>(null);
  let relatives = $state<Relative[]>([]);

  let organizationId = $state('');
  let firstName = $state('');
  let lastName = $state('');
  let email = $state('');
  let phone = $state('');
  let addressLine = $state('');
  let postalCode = $state('');
  let city = $state('');
  let isActive = $state(true);

  const filteredPersons = $derived(
    data.persons.filter((person) =>
      [person.firstName, person.lastName, person.email ?? '', person.city ?? '']
        .join(' ')
        .toLowerCase()
        .includes(search.trim().toLowerCase())
    )
  );

  function openCreate() {
    selectedPerson = null;
    organizationId = data.organizations[0]?.id ?? '';
    firstName = '';
    lastName = '';
    email = '';
    phone = '';
    addressLine = '';
    postalCode = '';
    city = '';
    isActive = true;
    createAccess = false;
    relatives = [];
    confirmDelete = false;
    mode = 'create';
  }

  function openEdit(person: Person) {
    selectedPerson = person;
    organizationId = person.organizationId;
    firstName = person.firstName;
    lastName = person.lastName;
    email = person.email ?? '';
    phone = person.phone ?? '';
    addressLine = person.addressLine ?? '';
    postalCode = person.postalCode ?? '';
    city = person.city ?? '';
    isActive = person.isActive;
    relatives = person.relatives.map((relative) => ({
      id: relative.id,
      firstName: relative.firstName,
      lastName: relative.lastName,
      email: relative.email ?? '',
      phone: relative.phone ?? ''
    }));
    confirmDelete = false;
    mode = 'edit';
  }

  function closeForm() {
    mode = 'list';
    selectedPerson = null;
    confirmDelete = false;
  }

  function addRelative() {
    if (relatives.length < 20) {
      relatives.push({ firstName: '', lastName: '', email: '', phone: '' });
    }
  }

  function removeRelative(index: number) {
    relatives.splice(index, 1);
  }
</script>

<svelte:head>
  <title>Personenverwaltung | Pflegerouter </title>
</svelte:head>

<div class="persons-page">
  <div class="page-header">
    <div>
      <p class="eyebrow">VERWALTUNG / PERSONEN</p>
      <h1>Betreute Personen</h1>
      <p class="subtitle">Personen erfassen, bearbeiten und Angehörige verwalten.</p>
    </div>
    {#if data.organizations.length > 0}
      <button class="primary-button" type="button" onclick={mode === 'list' ? openCreate : closeForm}>
        {mode === 'list' ? '+ Neue Person erfassen' : '✕ Zurück zur Liste'}
      </button>
    {/if}
  </div>

  {#if form?.message}
    <div class="notice" class:success={form.success} role="status">{form.message}</div>
  {/if}

  {#if data.organizations.length === 0}
    <section class="card">
      <h2>Keine Berechtigung vorhanden</h2>
      <p>Du benötigst die Rolle OWNER, ADMIN oder COORDINATOR in einer Organisation, um Personen zu verwalten.</p>
    </section>
  {:else if mode === 'create' || mode === 'edit'}
    <section class="card">
      <div class="section-header">
        <h2>{mode === 'create' ? 'Neue Person erfassen' : 'Person bearbeiten'}</h2>
        <p>{mode === 'create' ? 'Persönliche Daten und Angehörige eintragen.' : 'Angaben ändern, Status festlegen oder Person löschen.'}</p>
      </div>

      <form
        method="POST"
        action={mode === 'create' ? '?/create' : '?/update'}
        use:enhance={() => {
          saving = true;
          return async ({ result, update }) => {
            saving = false;
            await update({ reset: false, invalidateAll: false });
            if (result.type === 'success') {
              closeForm();
              await invalidateAll();
            }
          };
        }}
      >
        {#if mode === 'edit' && selectedPerson}
          <input type="hidden" name="personId" value={selectedPerson.id} />
        {/if}

        <h3>1. Persönliche Daten</h3>
        <div class="form-grid">
          <div class="field full">
            <label for="organizationId">Organisation / Bereich *</label>
            <select id="organizationId" name="organizationId" bind:value={organizationId} disabled={mode === 'edit'} required>
              {#each data.organizations as org}
                <option value={org.id}>{org.name}</option>
              {/each}
            </select>
            {#if mode === 'edit'}
              <input type="hidden" name="organizationId" value={organizationId} />
            {/if}
          </div>
          <div class="field">
            <label for="firstName">Vorname *</label>
            <input id="firstName" name="firstName" bind:value={firstName} maxlength="100" required />
          </div>
          <div class="field">
            <label for="lastName">Nachname *</label>
            <input id="lastName" name="lastName" bind:value={lastName} maxlength="100" required />
          </div>
          <div class="field">
            <label for="email">E-Mail-Adresse</label>
            <input id="email" name="email" type="email" bind:value={email} maxlength="320" />
          </div>
          <div class="field">
            <label for="phone">Telefonnummer</label>
            <input id="phone" name="phone" type="tel" bind:value={phone} maxlength="40" />
          </div>
        </div>

        <h3>2. Adresse</h3>
        <div class="form-grid">
          <div class="field full">
            <label for="addressLine">Straße und Hausnummer</label>
            <input id="addressLine" name="addressLine" bind:value={addressLine} maxlength="250" />
          </div>
          <div class="field">
            <label for="postalCode">Postleitzahl</label>
            <input id="postalCode" name="postalCode" bind:value={postalCode} maxlength="20" />
          </div>
          <div class="field">
            <label for="city">Ort</label>
            <input id="city" name="city" bind:value={city} maxlength="120" />
          </div>
        </div>

        <div class="subheading">
          <h3>3. Angehörige</h3>
          <button type="button" class="outline-button" onclick={addRelative} disabled={relatives.length >= 20}>
            + Angehörige hinzufügen
          </button>
        </div>

        {#if relatives.length === 0}
          <p class="helper">Noch keine Angehörigen hinterlegt.</p>
        {/if}

        {#each relatives as relative, index (relative.id ?? index)}
          <div class="relative-card">
            <div class="relative-header">
              <strong>Angehörige Person {index + 1}</strong>
              <button type="button" class="remove-button" onclick={() => removeRelative(index)}>Entfernen</button>
            </div>
            <div class="form-grid">
              <div class="field">
                <label for={`rel-first-${index}`}>Vorname *</label>
                <input id={`rel-first-${index}`} bind:value={relative.firstName} maxlength="100" required />
              </div>
              <div class="field">
                <label for={`rel-last-${index}`}>Nachname *</label>
                <input id={`rel-last-${index}`} bind:value={relative.lastName} maxlength="100" required />
              </div>
              <div class="field">
                <label for={`rel-email-${index}`}>E-Mail-Adresse</label>
                <input id={`rel-email-${index}`} type="email" bind:value={relative.email} maxlength="320" />
              </div>
              <div class="field">
                <label for={`rel-phone-${index}`}>Telefonnummer</label>
                <input id={`rel-phone-${index}`} type="tel" bind:value={relative.phone} maxlength="40" />
              </div>
            </div>
          </div>
        {/each}
        <input type="hidden" name="relatives" value={JSON.stringify(relatives)} />

        {#if mode === 'create'}
          <h3>4. Benutzerzugang</h3>
          <label class="access-card">
            <input type="checkbox" name="createAccess" bind:checked={createAccess} />
            <span>
              <strong>Zugang zur Anwendung erstellen</strong>
              <small>Die Person erhält eine Einladungs-E-Mail mit einem Aktivierungslink. Eine E-Mail-Adresse ist erforderlich.</small>
            </span>
          </label>
        {:else}
          <h3>4. Status</h3>
          <label class="access-card">
            <input type="checkbox" name="isActive" bind:checked={isActive} />
            <span>
              <strong>{isActive ? 'Person ist aktiv' : 'Person ist deaktiviert'}</strong>
              <small>Deaktivierte Personen bleiben gespeichert und können später wieder aktiviert werden.</small>
            </span>
          </label>
        {/if}

        <div class="form-actions">
          <button type="button" class="outline-button" onclick={closeForm}>Abbrechen</button>
          <button type="submit" class="primary-button" disabled={saving}>
            {saving ? 'Wird gespeichert ...' : mode === 'create' ? 'Person speichern →' : 'Änderungen speichern'}
          </button>
        </div>
      </form>

      {#if mode === 'edit' && selectedPerson}
        <div class="danger-zone">
          <h3>Person löschen</h3>
          <p>Die Person wird als gelöscht markiert und aus der normalen Liste ausgeblendet. Der Datensatz bleibt in der Datenbank erhalten.</p>
          {#if confirmDelete}
            <div class="delete-confirmation">
              <strong>Wirklich löschen: {selectedPerson.firstName} {selectedPerson.lastName}?</strong>
              <form
                method="POST"
                action="?/delete"
                use:enhance={() => {
                  saving = true;
                  return async ({ result, update }) => {
                    saving = false;
                    await update({ reset: false, invalidateAll: false });
                    if (result.type === 'success') {
                      closeForm();
                      await invalidateAll();
                    }
                  };
                }}
              >
                <input type="hidden" name="personId" value={selectedPerson.id} />
                <input type="hidden" name="organizationId" value={selectedPerson.organizationId} />
                <div class="form-actions">
                  <button type="button" class="outline-button" onclick={() => confirmDelete = false}>Abbrechen</button>
                  <button type="submit" class="danger-button" disabled={saving}>Löschen bestätigen</button>
                </div>
              </form>
            </div>
          {:else}
            <button type="button" class="danger-outline" onclick={() => confirmDelete = true}>Person löschen</button>
          {/if}
        </div>
      {/if}
    </section>
  {:else}
    <section class="card">
      <div class="list-header">
        <div>
          <h2>Alle Personen</h2>
          <p>{data.persons.length} Personen erfasst</p>
        </div>
        <input class="search" type="search" placeholder="Person suchen ..." aria-label="Person suchen" bind:value={search} />
      </div>

      {#if filteredPersons.length === 0}
        <div class="empty-state">
          <div class="empty-icon">♡</div>
          <h3>Keine Personen gefunden</h3>
          <p>Klicke auf „Neue Person erfassen“, um eine Person anzulegen.</p>
        </div>
      {:else}
        {#each filteredPersons as person (person.id)}
          <div class="person-row">
            <div class="avatar">{person.firstName.charAt(0)}{person.lastName.charAt(0)}</div>
            <div class="person-info">
              <strong>{person.firstName} {person.lastName}</strong>
              <span>{person.email || 'Keine E-Mail-Adresse'}</span>
              <small>{person.phone || 'Keine Telefonnummer'} · {person.city || 'Kein Ort'}</small>
              <div class="person-badges">
                <span class="badge" class:active={person.isActive}>{person.isActive ? 'Aktiv' : 'Deaktiviert'}</span>
                <span class="badge" class:active={Boolean(person.userId)}>{person.userId ? 'Konto angelegt' : 'Ohne Zugang'}</span>
              </div>
              {#if person.relatives.length > 0}
                <details>
                  <summary>Angehörige ({person.relatives.length})</summary>
                  {#each person.relatives as relative (relative.id)}
                    <div class="relative-detail">
                      <strong>{relative.firstName} {relative.lastName}</strong>
                      <span>{relative.email || 'Keine E-Mail'}</span>
                      <span>{relative.phone || 'Kein Telefon'}</span>
                    </div>
                  {/each}
                </details>
              {/if}
            </div>
            <button type="button" class="outline-button edit-button" onclick={() => openEdit(person)}>✎ Bearbeiten</button>
          </div>
        {/each}
      {/if}
    </section>
  {/if}
</div>

<style>
  .persons-page { max-width: 1250px; margin: 0 auto; padding: 32px; color: #172b4d; }
  .page-header, .list-header, .subheading, .relative-header, .form-actions { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
  .page-header { margin-bottom: 28px; }
  .eyebrow { color: #2464c8; font-size: 11px; font-weight: 800; letter-spacing: 1.3px; }
  h1 { font-size: 32px; margin: 8px 0; }
  h2 { font-size: 21px; margin: 0 0 8px; }
  h3 { font-size: 17px; margin: 34px 0 20px; }
  .subtitle, .section-header p, .list-header p, .helper { color: #71819b; font-size: 14px; line-height: 1.7; }
  .card { background: white; border: 1px solid #e9eef6; border-radius: 20px; padding: 32px; box-shadow: 0 8px 28px rgba(28, 62, 114, .05); }
  .primary-button, .outline-button, .danger-button, .danger-outline { min-height: 46px; padding: 12px 20px; border-radius: 11px; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
  .primary-button { background: #1649a0; border: none; color: white; }
  .primary-button:hover { background: #103b85; }
  .primary-button:disabled, .danger-button:disabled { opacity: .6; cursor: wait; }
  .outline-button { background: white; border: 1px solid #dce5f1; color: #1649a0; }
  .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
  .field { display: grid; gap: 9px; }
  .field.full { grid-column: 1 / -1; }
  .field label { font-size: 13px; font-weight: 700; color: #526580; }
  .field input, .field select, .search { width: 100%; min-height: 48px; padding: 12px 14px; border: 1px solid #dce5f1; border-radius: 11px; background: #fbfcff; color: #172b4d; font: inherit; font-size: 14px; }
  .field input:focus, .field select:focus, .search:focus { outline: 3px solid #c4ddff; border-color: #4d9eff; }
  .subheading { margin-top: 30px; margin-bottom: 20px; }
  .subheading h3 { margin: 0; }
  .relative-card { padding: 22px; margin-bottom: 15px; border: 1px solid #e4eaf3; border-radius: 14px; background: #f8faff; }
  .relative-header { margin-bottom: 20px; }
  .remove-button { border: none; background: none; color: #b42318; font: inherit; font-size: 12px; cursor: pointer; }
  .access-card { display: flex; align-items: flex-start; gap: 15px; padding: 22px; border-radius: 14px; background: #f3f7ff; cursor: pointer; }
  .access-card input { width: 19px; height: 19px; accent-color: #1649a0; }
  .access-card span { display: grid; gap: 8px; }
  .access-card small { color: #71819b; line-height: 1.6; }
  .form-actions { justify-content: flex-end; margin-top: 35px; padding-top: 25px; border-top: 1px solid #edf1f7; }
  .person-row { display: flex; align-items: flex-start; gap: 18px; padding: 22px 0; border-top: 1px solid #edf1f7; }
  .avatar { width: 48px; height: 48px; flex-shrink: 0; display: grid; place-items: center; border-radius: 14px; background: #e7f0ff; color: #1649a0; font-weight: 800; }
  .person-info { flex: 1; min-width: 0; display: grid; gap: 7px; }
  .person-info > span, .person-info > small { color: #71819b; font-size: 12px; }
  .person-info details { margin-top: 10px; font-size: 12px; }
  .person-info summary { color: #1649a0; cursor: pointer; font-weight: 700; }
  .relative-detail { display: grid; gap: 5px; padding: 12px 0; border-bottom: 1px solid #edf1f7; }
  .relative-detail span { color: #71819b; }
  .person-badges { display: flex; flex-wrap: wrap; gap: 6px; }
  .badge { display: inline-block; padding: 8px 12px; border-radius: 30px; background: #f1f4f8; color: #71819b; font-size: 11px; font-weight: 700; white-space: nowrap; }
  .badge.active { background: #e5f7ee; color: #188654; }
  .edit-button { flex-shrink: 0; }
  .search { max-width: 290px; }
  .empty-state { text-align: center; padding: 55px 20px; }
  .empty-icon { font-size: 42px; color: #2464c8; }
  .empty-state p { color: #71819b; font-size: 13px; }
  .notice { margin-bottom: 20px; padding: 18px 22px; border-radius: 12px; background: #fff1f0; color: #b42318; border: 1px solid #ffc9c5; }
  .notice.success { background: #eaf8f0; color: #176c47; border-color: #c2ead2; }
  .danger-zone { margin-top: 35px; padding: 22px; border: 1px solid #f4c6c3; border-radius: 14px; background: #fffafa; }
  .danger-zone h3 { margin: 0 0 10px; color: #b42318; }
  .danger-zone p { color: #865653; font-size: 13px; line-height: 1.6; }
  .danger-outline { color: #b42318; border: 1px solid #e9b7b2; background: white; }
  .danger-button { color: white; background: #b42318; border: 0; }
  .delete-confirmation { margin-top: 20px; }
  @media (max-width: 750px) {
    .persons-page { padding: 20px 16px; }
    .page-header, .list-header, .subheading { align-items: stretch; flex-direction: column; }
    .card { padding: 20px; }
    .form-grid { grid-template-columns: 1fr; }
    .search { max-width: none; }
    .person-row { flex-wrap: wrap; }
    .edit-button { width: 100%; }
    .form-actions { flex-direction: column-reverse; }
    .form-actions button, .page-header button { width: 100%; }
  }
</style>
