
<script lang="ts">
  import '$lib/styles/auth.css';
  import type { PageData, ActionData } from './$types';

  let {
    data,
    form
  }: {
    data: PageData;
    form: ActionData;
  } = $props();
</script>

<svelte:head>
  <title>Zugang aktivieren | Pflegerouter </title>
  <meta name="referrer" content="no-referrer" />
</svelte:head>

<div class="auth-page">
  <div class="auth-shell">
    <div class="auth-form-side">
      <a href="/" class="auth-logo">
        ✳ Pflegerouter 
      </a>

      <h1 class="auth-heading">Zugang aktivieren</h1>

      <p class="auth-subtitle">
        Willkommen bei Pflegerouter 
        Lege jetzt dein persönliches Passwort fest.
      </p>

      {#if form?.message}
        <div class="auth-error" role="alert">
          {form.message}
        </div>
      {/if}

      {#if data.token}
        <form method="POST" class="auth-form">
          <input
            type="hidden"
            name="token"
            value={data.token}
          />

          <div class="auth-field">
            <label for="password">Neues Passwort</label>
            <input
              id="password"
              type="password"
              name="password"
              minlength="12"
              maxlength="128"
              autocomplete="new-password"
              required
            />
          </div>

          <div class="auth-field">
            <label for="passwordRepeat">
              Passwort wiederholen
            </label>
            <input
              id="passwordRepeat"
              type="password"
              name="passwordRepeat"
              minlength="12"
              maxlength="128"
              autocomplete="new-password"
              required
            />
          </div>

          <button class="auth-submit" type="submit">
            Zugang aktivieren →
          </button>
        </form>
      {:else}
        <p>Es wurde kein Aktivierungslink angegeben.</p>
      {/if}
    </div>

    <aside class="auth-visual">
      <div class="auth-visual-content">
        <div class="auth-visual-icon">♡</div>

        <h2>Willkommen in unserer Gemeinschaft.</h2>

        <p>
          Gemeinsam schaffen wir Begegnungen,
          Unterstützung und mehr Pflegerouter im Alltag.
        </p>
      </div>
    </aside>
  </div>
</div>
