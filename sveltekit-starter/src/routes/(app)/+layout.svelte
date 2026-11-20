<script lang="ts">
  import { page } from '$app/state';
  let { data, children } = $props();
  let menuOpen = $state(false);
  const items = [
    { href: '/dashboard', icon: '▦', label: 'Übersicht' },
    { href: '/projects', icon: '▤', label: 'Projekte' },
    ...(data.user.role === 'admin' ? [{ href: '/users', icon: '♙', label: 'Teamverwaltung' }] : [])
  ];
</script>
<svelte:head><meta name="theme-color" content="#f2f7fd" /></svelte:head>
<div class="app-shell">
  <aside class:mobile-open={menuOpen} class="app-sidebar" aria-label="Seitennavigation">
    <a class="brand sidebar-brand" href="/dashboard"><span class="brand-symbol">✳</span><span>Pflegerouter<span class="brand-dot">.</span></span></a>
    <div class="sidebar-caption">Pflegerouter</div>
    <nav class="sidebar-nav" aria-label="Arbeitsbereiche">{#each items as item}<a onclick={() => menuOpen = false} class:active={page.url.pathname === item.href || (item.href !== '/dashboard' && page.url.pathname.startsWith(item.href + '/'))} href={item.href}><span class="nav-icon" aria-hidden="true">{item.icon}</span>{item.label}{#if page.url.pathname === item.href}<span class="active-mark"></span>{/if}</a>{/each}</nav>
    <div class="sidebar-bottom"><div class="sidebar-help"><span>✧</span><strong>Gemeinsam helfen</strong><p>Unterstützung, die Menschen verbindet.</p></div><div class="sidebar-profile"><span class="profile-avatar">{data.user.name.slice(0, 1).toUpperCase()}</span><div class="profile-text"><strong>{data.user.name}</strong><small>{data.user.role === 'admin' ? 'Administration' : 'Teammitglied'}</small></div></div><form method="POST" action="/logout"><button class="logout-btn" type="submit">↪ Abmelden</button></form></div>
  </aside>
  {#if menuOpen}<button class="mobile-scrim" aria-label="Menü schließen" onclick={() => menuOpen = false}></button>{/if}
  <div class="app-main"><header class="app-topbar"><div class="topbar-left"><button class="menu-toggle" aria-label="Menü öffnen" onclick={() => menuOpen = !menuOpen}>☰</button><span class="breadcrumb">Arbeitsbereich <span>/</span> <strong>{page.url.pathname.startsWith('/projects') ? 'Projekte' : page.url.pathname.startsWith('/users') ? 'Teamverwaltung' : 'Übersicht'}</strong></span></div><div class="topbar-right"><span class="status-pill"><span class="pulse-dot"></span> Gemeinsam</span><span class="topbar-avatar">{data.user.name.slice(0, 1).toUpperCase()}</span></div></header><main class="app-content">{@render children()}</main></div>
</div>
