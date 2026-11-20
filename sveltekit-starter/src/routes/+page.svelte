<script lang="ts">

  const values = [
    { icon: '♡', title: 'Pflegerouter statt allein', description: 'Ältere Menschen und freiwillig Engagierte finden über einen einfachen digitalen Zugang zueinander.' },
    { icon: '⌁', title: 'Hilfe im Alltag', description: 'Ob Begleitung, Einkäufe oder ein gemeinsamer Spaziergang: Kleine Gesten machen einen großen Unterschied.' },
    { icon: '✓', title: 'Klar organisiert', description: 'Anfragen, Aufgaben und die Zusammenarbeit können übersichtlich koordiniert werden.' }
  ];
</script>
<svelte:head>
  <title>Pflegerouter  – Unterstützung verbindet Generationen</title>
  <meta name="description" content="Eine digitale Plattform, die ältere Menschen, Angehörige und Ehrenamtliche für Unterstützung im Alltag verbindet." />
</svelte:head>
<div class="connect-landing">
  <header class="connect-nav">
    <a class="connect-logo" href="/" aria-label="Pflegerouter Startseite"><span class="connect-logo-icon">✳</span> Pflegerouter<span class="connect-logo-dot">.</span></a>
    <nav aria-label="Hauptnavigation"><a href="#so-gehts">So funktioniert's</a><a href="#vorteile">Unser Ansatz</a></nav>
    <div class="connect-nav-actions"><a class="connect-login" href="/login">Anmelden</a><a class="connect-button" href="/register">Jetzt mitmachen <span aria-hidden="true">↗</span></a></div>
  </header>
  <main>
    <section class="connect-hero">
      <div class="connect-hero-copy">
        <span class="connect-kicker"><span></span> DIGITAL VERBUNDEN. MENSCHLICH NAH.</span>
        <h1>Ein bisschen Hilfe.<br /><em>Ganz viel Pflegerouter </em></h1>
        <p>Wir bringen ältere Menschen und Ehrenamtliche zusammen – für mehr Nähe, praktische Unterstützung und wertvolle Begegnungen im Alltag.</p>
        <div class="connect-hero-actions"><a class="connect-button connect-button-large" href="/register">Gemeinsam starten <span aria-hidden="true">→</span></a><a class="connect-button-outline" href="#so-gehts">Mehr erfahren</a></div>
        <div class="connect-trust"><span>♡</span> Für Menschen gemacht <span class="connect-separator">•</span> Einfach & verständlich <span class="connect-separator">•</span> Gemeinsam stark</div>
      </div>
      <div class="connect-art" aria-label="Illustration: Ehrenamtliche und ältere Menschen sind Pflegerouter verbunden">
        <div class="connect-orbit"></div>
        <div class="connect-person connect-senior"><div class="connect-person-emoji">👵</div><strong>Ich brauche Unterstützung</strong><small>„Ein Spaziergang wäre schön.“</small></div>
        <div class="connect-person connect-volunteer"><div class="connect-person-emoji">🧑‍🤝‍🧑</div><strong>Ich möchte helfen</strong><small>„Ich habe heute Zeit.“</small></div>
        <div class="connect-center"><span>♥</span><strong>Wir verbinden.</strong></div>
        <div class="connect-art-tag">Zusammen geht mehr <span>✦</span></div>
      </div>
    </section>
    <section class="connect-steps" id="so-gehts"><div class="connect-inner"><div class="connect-section-head"><span class="connect-kicker">SO FUNKTIONIERT'S</span><h2>Aus einem Kontakt wird <em>ein Pflegerouter </em></h2><p>Unser Ziel: Unterstützung im Alltag einfacher zugänglich machen und Menschen Pflegerouter in Verbindung bringen.</p></div><div class="connect-steps-grid"><article><span>01</span><h3>Bedarf oder Hilfe teilen</h3><p>Beschreibe, wobei Unterstützung gewünscht ist oder wie du dich engagieren möchtest.</p></article><article><span>02</span><h3>Menschen verbinden</h3><p>Eine übersichtliche Organisation hilft dabei, passende Kontakte zu koordinieren.</p></article><article><span>03</span><h3>Gemeinsam Alltag gestalten</h3><p>Mehr Begegnungen, Entlastung und Zeit füreinander – Schritt für Schritt.</p></article></div></div></section>
    <section class="connect-values connect-inner" id="vorteile"><div class="connect-section-head"><span class="connect-kicker">WAS UNS ANTREIBT</span><h2>Technologie, die <em>Menschen näherbringt.</em></h2></div><div class="connect-values-grid">{#each values as value}<article><span class="connect-value-icon">{value.icon}</span><h3>{value.title}</h3><p>{value.description}</p></article>{/each}</div></section>
    <section class="connect-cta connect-inner"><div><span>GEMEINSAM MEHR BEWEGEN</span><h2>Gute Unterstützung beginnt mit einem Hallo.</h2><p>Werde Teil einer Idee, die Generationen verbindet.</p></div><a href="/register">Jetzt mitmachen →</a></section>
  </main>
  <footer class="connect-footer connect-inner"><strong>✳ Pflegerouter </strong><span>Konzeptplattform für Alltagshilfe und ehrenamtliche Vernetzung · Noch kein Vermittlungsdienst</span><small>© {new Date().getFullYear()}</small></footer>
</div>
