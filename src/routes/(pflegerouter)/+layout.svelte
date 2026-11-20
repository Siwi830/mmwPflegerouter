<script lang="ts">
  import type { Snippet } from 'svelte';
  import PflegerouterLogo from '$lib/components/PflegerouterLogo.svelte';
  let { children }: { children: Snippet } = $props();
</script>
<svelte:head><title>Pflegerouter</title><meta name="theme-color" content="#12345a" /></svelte:head>
<header class="header"><PflegerouterLogo /><nav aria-label="Hauptnavigation"><a href="/bereich">Ansichten</a><a href="/vertretungen">Vertretungen</a></nav></header>
<main>{@render children()}</main>
<style>
  :global(body){margin:0;background:#f4f7fb;color:#16324c;font-family:system-ui,-apple-system,'Segoe UI',sans-serif}
  .header{display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:1rem clamp(1rem,4vw,3rem);background:#12345a;color:white}
  nav{display:flex;gap:1.25rem}nav a{color:white;text-decoration:none}nav a:hover{text-decoration:underline}
  main{max-width:1200px;margin:0 auto;padding:2rem 1rem}
</style>
