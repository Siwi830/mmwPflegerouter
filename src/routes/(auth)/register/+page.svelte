<script lang="ts">
  import '$lib/styles/pflegerouter-auth.css';
  import type { ActionData } from './$types';
  let { form }: { form: ActionData } = $props();
  let step = $state(1);
  let firstName = $state(''); let lastName = $state(''); let email = $state(''); let password = $state('');
  let accountType = $state<'ORGANIZATION' | 'PRIVATE' | ''>(''); let organizationName = $state('');
  function nextStep(event: SubmitEvent) { event.preventDefault(); step = 2; }
  import logo from '$lib/assets/logo.png';
</script>
<svelte:head><title>Registrieren | Pflegerouter</title><meta name="description" content="Pflegerouter Konto erstellen" /></svelte:head>
<div class="pr-auth"><div class="pr-auth-shell">
  <main class="pr-form-panel pr-register">
    <a class="pr-brand" href="/" aria-label="Pflegerouter Startseite">
      <span class="pflegerouter-logo">
      <img src={logo} alt="Pflegerouter Logo" class="logo-image" />
      <span>Pflegerouter</span></a>


  <div class="pr-progress-header"><span>DEIN START BEI PFLEGEROUTER</span><span>Schritt {step} von 2</span></div><div class="pr-progress" aria-label="Registrierungsfortschritt"><span class:active={step >= 1}></span><span class:active={step >= 2}></span></div>
  {#if form?.message}<div class="pr-error" role="alert">{form.message}</div>{/if}
  {#if step === 1}
    <h1>Gemeinsam starten.</h1><p class="pr-intro">Erstelle dein Konto. Im nächsten Schritt wählst du deinen Bereich aus.</p>
    <form onsubmit={nextStep} class="pr-form"><div class="pr-two-col"><div><label for="firstName">Vorname</label><input id="firstName" type="text" bind:value={firstName} autocomplete="given-name" required /></div><div><label for="lastName">Nachname</label><input id="lastName" type="text" bind:value={lastName} autocomplete="family-name" required /></div></div>
      <label for="email">E-Mail-Adresse</label><input id="email" type="email" bind:value={email} autocomplete="email" required />
      <label for="password">Passwort</label><input id="password" type="password" bind:value={password} autocomplete="new-password" minlength="12" required /><small class="pr-hint">Mindestens 12 Zeichen</small>
      <button class="pr-primary" type="submit">Weiter zur Bereichsauswahl <span aria-hidden="true">→</span></button></form>
  {:else}
    <h1>Wie möchtest du starten?</h1><p class="pr-intro">Wähle einen privaten Bereich oder eine Organisation. Weitere Ansichten kannst du später ergänzen.</p>
    <form method="POST" class="pr-form"><input type="hidden" name="firstName" value={firstName}/><input type="hidden" name="lastName" value={lastName}/><input type="hidden" name="email" value={email}/><input type="hidden" name="password" value={password}/>
      <div class="pr-options"><label class="pr-option" class:chosen={accountType === 'PRIVATE'}><input type="radio" name="accountType" value="PRIVATE" bind:group={accountType} required /><span class="pr-option-icon">⌂</span><span><strong>Privatperson</strong><small>Für mich selbst oder für eine andere Person</small></span></label>
      <label class="pr-option" class:chosen={accountType === 'ORGANIZATION'}><input type="radio" name="accountType" value="ORGANIZATION" bind:group={accountType} required /><span class="pr-option-icon">♧</span><span><strong>Organisation</strong><small>Ehrenamtliche Einrichtung oder Unternehmen</small></span></label></div>
      {#if accountType === 'ORGANIZATION'}<label for="organizationName">Name der Organisation</label><input id="organizationName" name="organizationName" bind:value={organizationName} maxlength="200" placeholder="Name deiner Einrichtung" required />{/if}
      <div class="pr-note">Nach der Registrierung kannst du Hilfsanfragen und Termine verwalten. Berechtigungen für andere Personen werden gesondert geprüft.</div>
      <div class="pr-actions"><button class="pr-secondary" type="button" onclick={() => step = 1}>← Zurück</button><button class="pr-primary" type="submit" disabled={!accountType}>Konto erstellen <span aria-hidden="true">→</span></button></div>
    </form>
  {/if}
  <p class="pr-bottom">Bereits registriert? <a href="/login">Jetzt anmelden</a></p>
  </main><aside class="pr-showcase"><div class="pr-showcase-inner"><span class="pr-pill">GEMEINSAM GUT ORGANISIERT</span><div class="pr-orbit" aria-hidden="true"><span>♡</span><i></i><b></b></div><h2>Ein Ort.<br/>Viele Möglichkeiten.</h2><p>Für private Unterstützung, engagierte Helferinnen und Helfer und professionelle Betreuung.</p><div class="pr-features"><span>✓ Persönlich</span><span>✓ Übersichtlich</span><span>✓ Verlässlich</span></div></div></aside>
</div></div>
