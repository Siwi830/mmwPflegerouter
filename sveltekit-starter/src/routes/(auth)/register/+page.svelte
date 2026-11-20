
<script lang="ts">
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();

  let step = $state(1);

  let firstName = $state('');
  let lastName = $state('');
  let email = $state('');
  let password = $state('');

  let accountType = $state<'ORGANIZATION' | 'PRIVATE' | ''>('');
  let organizationName = $state('');

  function nextStep(event: SubmitEvent) {
    event.preventDefault();
    step = 2;
  }
</script>

<svelte:head>
  <title>Registrieren | Pflegerouter </title>
</svelte:head>

<div class="register-page">
  <div class="register-card">
    <a class="logo" href="/">♡ Pflegerouter </a>

    <div class="progress">
      <div class:active={step >= 1}></div>
      <div class:active={step >= 2}></div>
    </div>

    <p class="step-label">Schritt {step} von 2</p>

    {#if form?.message}
      <div class="error-message" role="alert">
        {form.message}
      </div>
    {/if}

    {#if step === 1}
      <h1>Konto erstellen</h1>
      <p class="subtitle">
        Gib zunächst deine persönlichen Daten ein.
      </p>

      <form onsubmit={nextStep}>
        <div class="form-grid">
          <div class="field">
            <label for="firstName">Vorname *</label>
            <input
              id="firstName"
              type="text"
              bind:value={firstName}
              autocomplete="given-name"
              required
            />
          </div>

          <div class="field">
            <label for="lastName">Nachname *</label>
            <input
              id="lastName"
              type="text"
              bind:value={lastName}
              autocomplete="family-name"
              required
            />
          </div>

          <div class="field full">
            <label for="email">E-Mail-Adresse *</label>
            <input
              id="email"
              type="email"
              bind:value={email}
              autocomplete="email"
              required
            />
          </div>

          <div class="field full">
            <label for="password">Passwort *</label>
            <input
              id="password"
              type="password"
              bind:value={password}
              minlength="12"
              autocomplete="new-password"
              required
            />
            <small>Mindestens 12 Zeichen</small>
          </div>
        </div>

        <button class="primary-button full-button" type="submit">
          Weiter →
        </button>
      </form>
    {:else}
      <h1>Wie möchtest du Pflegerouter  nutzen?</h1>
      <p class="subtitle">
        Wähle aus, ob du einen privaten Bereich
        oder eine Organisation einrichten möchtest.
      </p>

      <form method="POST">
        <input type="hidden" name="firstName" value={firstName} />
        <input type="hidden" name="lastName" value={lastName} />
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="password" value={password} />

        <div class="account-types">
          <label
            class="type-card"
            class:selected={accountType === 'ORGANIZATION'}
          >
            <input
              type="radio"
              name="accountType"
              value="ORGANIZATION"
              bind:group={accountType}
              required
            />

            <span class="type-icon">▤</span>
            <strong>Organisation</strong>
            <small>
              Für Vereine, soziale Einrichtungen,
              Initiativen und Hilfsdienste.
            </small>
          </label>

          <label
            class="type-card"
            class:selected={accountType === 'PRIVATE'}
          >
            <input
              type="radio"
              name="accountType"
              value="PRIVATE"
              bind:group={accountType}
              required
            />

            <span class="type-icon">⌂</span>
            <strong>Privatperson</strong>
            <small>
              Für Familien, Angehörige und
              private Unterstützung.
            </small>
          </label>
        </div>

        {#if accountType === 'ORGANIZATION'}
          <div class="field organization-name">
            <label for="organizationName">
              Name der Organisation *
            </label>
            <input
              id="organizationName"
              name="organizationName"
              bind:value={organizationName}
              placeholder="z. B. Nachbarschaftshilfe Musterstadt"
              maxlength="200"
              required
            />
          </div>
        {/if}

        <div class="info-box">
          <strong>Das kannst du anschließend tun:</strong>
          <p>
            Betreute Personen erfassen, Angehörige
            hinterlegen, Hilfsanfragen verwalten
            und Termine organisieren.
          </p>
        </div>

        <div class="buttons">
          <button
            type="button"
            class="secondary-button"
            onclick={() => step = 1}
          >
            ← Zurück
          </button>

          <button
            type="submit"
            class="primary-button"
            disabled={!accountType}
          >
            Registrierung abschließen
          </button>
        </div>
      </form>
    {/if}

    <p class="login-link">
      Bereits registriert?
      <a href="/login">Jetzt anmelden</a>
    </p>
  </div>
</div>

<style>
  .register-page {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 24px;
    background: #f6f8fc;
    color: #172b4d;
  }

  .register-card {
    width: 100%;
    max-width: 650px;
    padding: 42px;
    background: white;
    border: 1px solid #e9eef6;
    border-radius: 22px;
    box-shadow: 0 12px 40px rgba(28, 62, 114, .07);
  }

  .logo {
    display: inline-block;
    margin-bottom: 28px;
    color: #1649a0;
    font-size: 24px;
    font-weight: 800;
    text-decoration: none;
  }

  .progress {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 14px;
  }

  .progress div {
    height: 5px;
    border-radius: 5px;
    background: #e5eaf3;
  }

  .progress div.active {
    background: #1649a0;
  }

  .step-label {
    font-size: 12px;
    font-weight: 700;
    color: #2464c8;
    margin-bottom: 20px;
  }

  h1 {
    font-size: 29px;
    margin: 0 0 10px;
  }

  .subtitle {
    color: #71819b;
    font-size: 14px;
    line-height: 1.7;
    margin-bottom: 28px;
  }

  .form-grid,
  .account-types {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
  }

  .field {
    display: grid;
    gap: 9px;
  }

  .field.full {
    grid-column: 1 / -1;
  }

  .field label {
    font-size: 13px;
    font-weight: 700;
  }

  .field input {
    width: 100%;
    min-height: 48px;
    padding: 12px 14px;
    border: 1px solid #dce5f1;
    border-radius: 11px;
    font: inherit;
    font-size: 14px;
  }

  .field input:focus {
    outline: 3px solid #c4ddff;
    border-color: #2464c8;
  }

  .field small {
    color: #71819b;
    font-size: 12px;
  }

  .account-types {
    margin-top: 20px;
  }

  .type-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 22px;
    border: 2px solid #e5eaf3;
    border-radius: 15px;
    cursor: pointer;
    transition: .2s;
  }

  .type-card:hover {
    border-color: #a7c5f0;
  }

  .type-card.selected {
    border-color: #2464c8;
    background: #f3f7ff;
  }

  .type-card input {
    align-self: flex-start;
    accent-color: #1649a0;
  }

  .type-icon {
    font-size: 30px;
    color: #1649a0;
  }

  .type-card strong {
    font-size: 15px;
  }

  .type-card small {
    font-size: 12px;
    line-height: 1.6;
    color: #71819b;
  }

  .organization-name {
    margin-top: 25px;
  }

  .info-box {
    margin-top: 25px;
    padding: 20px;
    border-radius: 12px;
    background: #f3f7ff;
  }

  .info-box strong {
    font-size: 13px;
    color: #1649a0;
  }

  .info-box p {
    margin: 8px 0 0;
    color: #526580;
    font-size: 13px;
    line-height: 1.7;
  }

  .primary-button,
  .secondary-button {
    min-height: 48px;
    padding: 12px 20px;
    border-radius: 11px;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }

  .primary-button {
    border: none;
    background: #1649a0;
    color: white;
  }

  .primary-button:hover {
    background: #103b85;
  }

  .primary-button:disabled {
    opacity: .5;
    cursor: not-allowed;
  }

  .secondary-button {
    background: white;
    color: #1649a0;
    border: 1px solid #dce5f1;
  }

  .full-button {
    width: 100%;
    margin-top: 25px;
  }

  .buttons {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-top: 28px;
  }

  .login-link {
    text-align: center;
    margin-top: 30px;
    color: #71819b;
    font-size: 13px;
  }

  .login-link a {
    color: #1649a0;
    font-weight: 700;
    text-decoration: none;
  }

  .error-message {
    padding: 14px;
    margin-bottom: 20px;
    background: #fff1f0;
    color: #b42318;
    border-radius: 10px;
    font-size: 13px;
  }

  @media (max-width: 600px) {
    .register-card {
      padding: 25px;
    }

    .form-grid,
    .account-types {
      grid-template-columns: 1fr;
    }

    .buttons {
      flex-direction: column-reverse;
    }
  }
</style>
