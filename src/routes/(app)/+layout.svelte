
<script lang="ts">
  import { page } from '$app/state';
  import { onMount } from 'svelte';

    import type { LayoutData } from './$types';

  let {
    data,
    children
  }: {
    data: LayoutData;
    children: import('svelte').Snippet;
  } = $props();
  
  
import logo from '$lib/assets/logo.png';
  let sidebarOpen = $state(false);
  let sidebarCollapsed = $state(false);

  let isMobile = $state(false);

  const navigation = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: '▦'
    },
    {
      label: 'Hilfsanfragen',
      href: '/dashboard/anfragen',
      icon: '♡'
    },
    {
      label: 'Ehrenamtliche',
      href: '/dashboard/ehrenamtliche',
      icon: '♧'
    },
    {
      label: 'Betreute Personen',
      href: '/dashboard/personen',
      icon: '♙'
    },
    {
      label: 'Termine',
      href: '/dashboard/termine',
      icon: '▤'
    },
    {
      label: 'Datenänderungen',
      href: '/dashboard/datenaenderungen',
      icon: '✎'
    }
  ];

  
  const settingsNavigation = [
    {
      label: 'Einstellungen',
      href: '/dashboard/einstellungen',
      icon: '⚙'
    }
  ];
    const logoutNavigation = [
    {
      label: 'Abmelden',
      href: '/logout',
      icon: '↪'
    }
  ];

  onMount(() => {
    const mediaQuery = window.matchMedia('(max-width: 900px)');

    const updateMobile = () => {
      isMobile = mediaQuery.matches;

      if (!isMobile) {
        sidebarOpen = false;
      }
    };

    updateMobile();

    mediaQuery.addEventListener('change', updateMobile);

    return () => {
      mediaQuery.removeEventListener('change', updateMobile);
    };
  });

  function toggleSidebar() {
    if (isMobile) {
      sidebarOpen = !sidebarOpen;
    } else {
      sidebarCollapsed = !sidebarCollapsed;
    }
  }

  function closeSidebar() {
    sidebarOpen = false;
  }

  function isActive(href: string) {
    if (href === '/dashboard') {
      return page.url.pathname === href;
    }

    return (
      page.url.pathname === href ||
      page.url.pathname.startsWith(href + '/')
    );
  }
</script>

<svelte:head>
  <title>Pflegerouter  – Dashboard</title>
</svelte:head>

<svelte:window
  onkeydown={(event) => {
    if (event.key === 'Escape') {
      closeSidebar();
    }
  }}
/>

<div
  class="app-shell"
  class:collapsed={sidebarCollapsed}
  class:mobile-open={sidebarOpen}
>
  {#if sidebarOpen}
    <button
      class="sidebar-backdrop"
      type="button"
      aria-label="Menü schließen"
      onclick={closeSidebar}
    ></button>
  {/if}

  <aside
    class="sidebar"
    id="app-sidebar"
    aria-label="Seitennavigation"
  >

<div class="sidebar-header">
  <a
    href="/dashboard"
    class="nav-brand"
    onclick={closeSidebar}
  >
    <img
      src={logo}
      alt=""
      class="nav-brand-logo"
    />
    <span class="nav-brand-name">
      Pflegerouter
    </span>
  </a>

  <button
    class="sidebar-close"
    type="button"
    aria-label="Menü schließen"
    onclick={closeSidebar}
  >
    ✕
  </button>
</div>

    <div class="sidebar-content">
    <div class="tenant-selector">
  <p class="nav-section-title">AKTIVE ORGANISATION</p>

  {#if data.memberships.length > 1}
    <form
      method="POST"
      action="/organisation-wechseln"
    >
      <select
        name="organizationId"
        aria-label="Aktive Organisation"
        value={data.activeOrganization.organizationId}
        onchange={(event) =>
          event.currentTarget.form?.requestSubmit()
        }
      >
        {#each data.memberships as membership}
          <option value={membership.organizationId}>
            {membership.organizationName}
          </option>
        {/each}
      </select>
    </form>
  {:else}
    <div class="tenant-name">
      {data.activeOrganization.organizationName}
    </div>
  {/if}

  <small>
    Rolle: {data.activeOrganization.role}
  </small>
</div>
      <p class="nav-section-title">HAUPTMENÜ</p>

      <nav class="sidebar-nav" aria-label="Hauptmenü">
        {#each navigation as item}
          <a
            href={item.href}
            class="nav-item"
            class:active={isActive(item.href)}
            aria-current={isActive(item.href) ? 'page' : undefined}
            title={sidebarCollapsed ? item.label : undefined}
            onclick={closeSidebar}
          >
            <span class="nav-icon" aria-hidden="true">
              {item.icon}
            </span>

            <span class="nav-label">{item.label}</span>
          </a>
        {/each}
        {#if data.canManageOrganizations}
          <a href="/dashboard/organisationen" class="nav-item">
            <span class="nav-icon">⌂</span>
            <span class="nav-label">Organisationen</span>
          </a>
        {/if}
      </nav>

      <p class="nav-section-title settings-title">
        KONTO
      </p>

      <nav class="sidebar-nav" aria-label="Kontomenü">
        {#each settingsNavigation as item}
          <a
            href={item.href}
            class="nav-item"
            class:active={isActive(item.href)}
            aria-current={isActive(item.href) ? 'page' : undefined}
            title={sidebarCollapsed ? item.label : undefined}
            onclick={closeSidebar}
          >
            <span class="nav-icon" aria-hidden="true">
              {item.icon}
            </span>

            <span class="nav-label">{item.label}</span>
          </a>
        {/each}
        {#each logoutNavigation as item}
          <a
            href={item.href}
            class="nav-item"
            class:active={isActive(item.href)}
            aria-current={isActive(item.href) ? 'page' : undefined}
            title={sidebarCollapsed ? item.label : undefined}
            onclick={closeSidebar} 
          >
            <span class="nav-icon" aria-hidden="true">
              {item.icon}
            </span>

            <span class="nav-label">{item.label}</span>
          </a>
        {/each}
      
      </nav>
    </div>

    <div class="sidebar-footer">
      <div class="sidebar-help">
        <span class="help-heart">♡</span>
        <strong>Gemeinsam mehr bewegen.</strong>
        <p>Jede kleine Hilfe zählt.</p>
      </div>
    </div>
  </aside>

  <div class="app-main">
    <header class="app-header">
      <div class="header-left">
        <button
          type="button"
          class="menu-toggle"
          aria-label={isMobile
            ? sidebarOpen
              ? 'Menü schließen'
              : 'Menü öffnen'
            : sidebarCollapsed
              ? 'Navigation ausklappen'
              : 'Navigation einklappen'}
          aria-controls="app-sidebar"
          aria-expanded={isMobile
            ? sidebarOpen
            : !sidebarCollapsed}
          onclick={toggleSidebar}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>      
    </header>

    <main class="page-content" id="main-content">
      {@render children()}
    </main>
  </div>
</div>

<style>

/* Pflegerouter-Logo in der Sidebar */
.nav-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-width: 0;
  text-decoration: none;
  overflow: hidden;
}

.nav-brand-logo {
  display: block;
  width: 40px;
  height: 40px;
  min-width: 40px;
  max-width: 40px;
  max-height: 40px;
  flex: 0 0 40px;
  object-fit: contain;
}

.nav-brand-name {
  min-width: 0;
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.5px;
  line-height: 1.2;
  color: #16489c;
  white-space: nowrap;
}

/* Bei eingeklappter Sidebar nur das Logo */
.collapsed .nav-brand-name {
  display: none;
}

.collapsed .sidebar-header {
  padding: 0 19px;
}

/* Auf Mobilgeräten Schriftzug wieder anzeigen */
@media (max-width: 900px) {
  .collapsed .nav-brand-name {
    display: inline;
  }
}

.tenant-selector {
  margin: 0 0 24px;
  padding: 12px;
  background: #f3f7fd;
  border-radius: 12px;
}

.tenant-selector .nav-section-title {
  margin: 0 0 10px;
}

.tenant-selector select {
  width: 100%;
  padding: 10px;
  border: 1px solid #d8e3f2;
  border-radius: 8px;
  background: white;
  color: #172b4d;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.tenant-name {
  font-size: 13px;
  font-weight: 700;
  color: #173b70;
  overflow-wrap: anywhere;
}

.tenant-selector small {
  display: block;
  margin-top: 8px;
  font-size: 11px;
  color: #71819b;
}
  :global(body) {
    margin: 0;
    background: #f6f8fc;
    font-family: Arial, Helvetica, sans-serif;
    color: #172b4d;
  }

  :global(*) {
    box-sizing: border-box;
  }

  .app-shell {
    --sidebar-width: 264px;
    display: flex;
    min-height: 100vh;
    background: #f6f8fc;
  }

  .app-shell.collapsed {
    --sidebar-width: 78px;
  }

  /* Sidebar */

  .sidebar {
    width: var(--sidebar-width);
    flex-shrink: 0;
    position: sticky;
    top: 0;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: white;
    border-right: 1px solid #e9eef6;
    transition: width 0.25s ease;
    overflow: hidden;
    z-index: 50;
  }

  .sidebar-header {
    min-height: 76px;
    padding: 0 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #edf1f7;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 9px;
    white-space: nowrap;
    text-decoration: none;
    color: #1649a0;
    font-size: 23px;
    font-weight: 800;
    letter-spacing: -1px;
  }

  .brand-symbol {
    font-size: 27px;
    color: #4d9eff;
  }

  .sidebar-close {
    display: none;
    background: none;
    border: none;
    color: #71819b;
    font-size: 20px;
    cursor: pointer;
  }

  .sidebar-content {
    flex: 1;
    padding: 28px 14px;
    overflow-y: auto;
  }

  .nav-section-title {
    margin: 0 12px 15px;
    color: #a0aec0;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 1.5px;
    white-space: nowrap;
  }

  .settings-title {
    margin-top: 35px;
  }

  .sidebar-nav {
    display: grid;
    gap: 6px;
  }

  .nav-item {
    min-height: 48px;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 14px;
    border-radius: 12px;
    color: #526580;
    text-decoration: none;
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    transition: background 0.2s, color 0.2s;
  }

  .nav-item:hover {
    background: #f3f7fd;
    color: #1649a0;
  }

  .nav-item.active {
    background: #e7f0ff;
    color: #1649a0;
    font-weight: 800;
  }

  .nav-icon {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    font-size: 22px;
  }

  .nav-label {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sidebar-footer {
    padding: 16px;
    border-top: 1px solid #edf1f7;
  }

  .sidebar-help {
    padding: 20px;
    border-radius: 14px;
    background: linear-gradient(135deg, #16489c, #2678dc);
    color: white;
  }

  .help-heart {
    display: block;
    font-size: 30px;
    margin-bottom: 12px;
  }

  .sidebar-help strong {
    display: block;
    font-size: 13px;
    line-height: 1.5;
  }

  .sidebar-help p {
    font-size: 11px;
    color: #d8e9ff;
    margin: 7px 0 0;
  }

  /* Collapsed desktop sidebar */

  .collapsed .sidebar-header {
    padding-inline: 22px;
  }

  .collapsed .brand-name,
  .collapsed .nav-label,
  .collapsed .nav-section-title,
  .collapsed .sidebar-footer {
    display: none;
  }

  .collapsed .sidebar-content {
    padding-inline: 10px;
  }

  .collapsed .nav-item {
    justify-content: center;
    padding-inline: 10px;
  }

  /* Main content */

  .app-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .app-header {
    position: sticky;
    top: 0;
    z-index: 20;
    height: 76px;
    padding: 0 32px;
    background: rgba(255, 255, 255, 0.97);
    border-bottom: 1px solid #e9eef6;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
  }

  .header-left,
  .header-right {
    display: flex;
    align-items: center;
    gap: 18px;
  }

  .menu-toggle {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 5px;
    width: 42px;
    height: 42px;
    border: 1px solid #e4eaf3;
    border-radius: 11px;
    background: #fff;
    cursor: pointer;
  }

  .menu-toggle span {
    width: 18px;
    height: 2px;
    background: #1649a0;
    border-radius: 2px;
  }

  .menu-toggle:hover {
    background: #e7f0ff;
  }

  .header-title {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .header-title strong {
    color: #172b4d;
    font-size: 16px;
  }

  .header-title span {
    color: #8794a8;
    font-size: 11px;
  }

  .header-home {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    background: #f3f7fd;
    color: #1649a0;
    border-radius: 11px;
    text-decoration: none;
    font-size: 23px;
  }

  .user-avatar {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #e7f0ff;
    color: #1649a0;
    font-size: 15px;
    font-weight: 800;
  }

  .page-content {
    flex: 1;
    min-width: 0;
    padding: 0;
  }

  .sidebar-backdrop {
    display: none;
  }

  /* Mobile */

  @media (max-width: 900px) {
    .app-shell,
    .app-shell.collapsed {
      --sidebar-width: 264px;
    }

    .sidebar {
      position: fixed;
      top: 0;
      left: 0;
      height: 100dvh;
      width: 264px;
      transform: translateX(-100%);
      transition: transform 0.25s ease;
      z-index: 100;
    }

    .mobile-open .sidebar {
      transform: translateX(0);
    }

    .sidebar-close {
      display: block;
    }

    .collapsed .brand-name,
    .collapsed .nav-label,
    .collapsed .nav-section-title,
    .collapsed .sidebar-footer {
      display: initial;
    }

    .collapsed .sidebar-footer {
      display: block;
    }

    .collapsed .sidebar-content {
      padding: 28px 14px;
    }

    .collapsed .sidebar-header {
      padding: 0 24px;
    }

    .collapsed .nav-item {
      justify-content: flex-start;
      padding: 12px 14px;
    }

    .sidebar-backdrop {
      display: block;
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      background: rgba(18, 34, 61, 0.45);
      border: none;
      cursor: pointer;
      z-index: 90;
    }

    .app-header {
      padding: 0 20px;
    }
  }

  @media (max-width: 600px) {
    .app-header {
      height: 68px;
      padding: 0 16px;
    }

    .header-title span,
    .header-home {
      display: none;
    }

    .header-left,
    .header-right {
      gap: 12px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sidebar {
      transition: none;
    }
  }
</style>
