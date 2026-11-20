<script lang="ts">
  let { children } = $props();
</script>
<svelte:head><meta name="viewport" content="width=device-width, initial-scale=1" /></svelte:head>
<div class="shell">
  <header class="topbar"><a href="/mein-bereich" class="brand">✳ Pflegerouter </a><span>Mein Bereich</span></header>
  <main>{@render children()}</main>
</div>
<style>
  :global(body){margin:0;background:#f6f8fc;font-family:Arial,Helvetica,sans-serif;color:#172b4d}
  :global(*){box-sizing:border-box}
  .shell{min-height:100vh}.topbar{height:76px;background:white;border-bottom:1px solid #e9eef6;display:flex;justify-content:space-between;align-items:center;padding:0 max(22px,calc((100vw - 1050px)/2));gap:16px}.brand{font-size:23px;font-weight:800;color:#1649a0;text-decoration:none;letter-spacing:-.6px}.topbar span{font-size:13px;color:#526580;font-weight:700}
</style>
