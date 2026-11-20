<script lang="ts">
  let { data } = $props();
  const date = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const shortcuts = [
    { href: '/projects', icon: '♡', title: 'Unterstützung organisieren', detail: 'Bestehende Projekte ansehen' },
    { href: '/projects', icon: '＋', title: 'Neue Initiative', detail: 'Projektbereich öffnen' },
    ...(data.user.role === 'admin' ? [{ href: '/users', icon: '♙', title: 'Engagierte verwalten', detail: 'Team und Rollen ansehen' }] : [])
  ];
</script>
<svelte:head><title>Übersicht | Pflegerouter </title></svelte:head>
<div class="connect-dashboard">
  <div class="connect-dash-head"><div><span class="connect-kicker">{date.toUpperCase()}</span><h1>Schön, dass du da bist, {data.user.name.split(' ')[0]} <span>♡</span></h1><p>Gemeinsam können wir den Alltag ein Stück leichter machen. Hier beginnt deine Organisation.</p></div><a class="connect-button" href="/projects">Projekte öffnen →</a></div>
  <section class="connect-dash-banner"><div><span>GEMEINSAM FÜR MEHR NÄHE</span><h2>Hilfe verbindet.<br />Jeden Tag aufs Neue.</h2><p>Organisiere Initiativen und Menschen an einem zentralen Ort – klar, einfach und wertschätzend.</p><a href="/projects">Zum Projektbereich ↗</a></div><div class="connect-dash-illustration" aria-hidden="true"><span>👵</span><b>♥</b><span>🙋</span></div></section>
  <div class="connect-dash-title"><h2>Deine Schnellzugriffe</h2><p>Direkt zu den wichtigsten Bereichen</p></div>
  <section class="connect-dash-shortcuts">{#each shortcuts as shortcut}<a href={shortcut.href}><span class="connect-shortcut-icon">{shortcut.icon}</span><strong>{shortcut.title}</strong><small>{shortcut.detail}</small><span class="connect-shortcut-arrow">↗</span></a>{/each}</section>
  <section class="connect-dash-bottom"><article><span class="connect-kicker">DEIN ARBEITSBEREICH</span><h2>Alles Wichtige an einem Ort</h2><p>Plane und verwalte deine bestehenden Projekte. Weitere Funktionen für die Vermittlung von Alltagshilfe können hier später ergänzt werden.</p><a href="/projects">Projekte verwalten →</a></article><article><span class="connect-kicker">UNSER LEITGEDANKE</span><h2>Jede Begegnung zählt.</h2><p>Ein offenes Ohr, ein gemeinsamer Einkauf oder etwas Gesellschaft – Ehrenamt lebt von menschlicher Nähe.</p><span class="connect-dash-heart">♥</span></article></section>
  <p class="connect-disclaimer">Hinweis: Dies ist eine organisatorische Demo. Es gibt noch keine echte Vermittlungsfunktion. Bitte keine echten Gesundheits- oder Patientendaten eingeben.</p>
</div>
