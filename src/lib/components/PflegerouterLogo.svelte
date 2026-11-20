<script lang="ts">
  let { compact = false }: { compact?: boolean } = $props();
</script>
<a class="brand" href="/bereich" aria-label="Pflegerouter – Startseite">
  <svg width="36" height="36" viewBox="0 0 40 40" role="img" aria-label="Pflegerouter-Logo">
    <path d="M20 34 5.8 19.8C-1.8 11.4 9 1.6 19.9 11.8 31 1.6 41.7 11.4 34.2 19.8Z" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round"/>
    <path d="m13 22 5-5 4 4 6-7" fill="none" stroke="#56c6b5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
  {#if !compact}<strong>Pflegerouter</strong>{/if}
</a>
<style>
  .brand{display:inline-flex;align-items:center;gap:.65rem;color:inherit;text-decoration:none;font-size:1.35rem;letter-spacing:-.025em}
  svg{flex:none}
</style>
