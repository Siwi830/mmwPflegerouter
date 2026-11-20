<script lang="ts">
  import '$lib/styles/pflegerouter-auth.css';
  import type { ActionData } from './$types';
  let { form }: { form: ActionData } = $props();
  import logo from '$lib/assets/logo.png';

</script>
<svelte:head><title>Anmelden | Pflegerouter</title><meta name="description" content="Sicher bei Pflegerouter anmelden" /></svelte:head>
<div class="pr-auth"><div class="pr-auth-shell">
  <main class="pr-form-panel">
    <a class="pr-brand" href="/" aria-label="Pflegerouter Startseite">
    <!-- <span class="pr-mark" aria-hidden="true">♡</span> -->
    <span class="pflegerouter-logo">
      <img src={logo} alt="Pflegerouter Logo" class="logo-image" />
      <span>Pflegerouter</span></a>

   
    <div class="pr-eyebrow">DEIN BEREICH. DEINE UNTERSTÜTZUNG.</div>
    <h1>Willkommen zurück.</h1>
    <p class="pr-intro">Melde dich an und behalte Hilfsanfragen, Termine und deine Kontakte im Blick.</p>
    {#if form?.message}<div class="pr-error" role="alert">{form.message}</div>{/if}
    <form method="POST" class="pr-form"><label for="email">E-Mail-Adresse</label><input id="email" name="email" type="email" autocomplete="email" placeholder="name@beispiel.de" required />
    <label for="password">Passwort</label><input id="password" name="password" type="password" autocomplete="current-password" placeholder="Dein Passwort" required />
    <button type="submit" class="pr-primary">Sicher anmelden <span aria-hidden="true">→</span></button></form>
    <p class="pr-bottom">Noch kein Konto? <a href="/register">Jetzt registrieren</a></p>
  </main><aside class="pr-showcase"><div class="pr-showcase-inner"><span class="pr-pill">PFLEGEROUTER</span><div class="pr-orbit" aria-hidden="true"><span>♡</span><i></i><b></b></div><h2>Hilfe verbindet.<br/>Vertrauen trägt.</h2><p>Für Menschen, die Unterstützung brauchen, Angehörige, Ehrenamtliche und professionelle Teams.</p><div class="pr-features"><span>✓ Sicher organisiert</span><span>✓ Gemeinsam abgestimmt</span><span>✓ Einfach zugänglich</span></div></div></aside>
</div></div>
