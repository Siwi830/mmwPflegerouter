<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
</script>
<svelte:head><title>Meine Hilfsanfragen | Pflegerouter</title></svelte:head>
<h1>Meine Hilfsanfragen</h1>
<p>Neue Hilfsanfragen kannst du im Bereich Hilfsanfragen erstellen.</p>
{#each data.projects as project (project.id)}
  <article class="card"><h2>{project.title}</h2><p>{project.description ?? ''}</p><small>{project.status}</small></article>
{:else}
  <p>Du hast noch keine Hilfsanfragen erstellt.</p>
{/each}
