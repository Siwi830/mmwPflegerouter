<script lang="ts">let {data,form} = $props();</script>
<svelte:head><title>Projekte</title></svelte:head>
<h1 class="text-3xl font-bold mb-6">Meine Projekte</h1>
<div class="card mb-6"><h2 class="text-xl font-semibold mb-4">Neues Projekt</h2><form method="POST" action="?/create" class="space-y-3"><input name="name" placeholder="Projektname" required minlength="2" /><input name="description" placeholder="Beschreibung" /><button>Projekt erstellen</button></form>{#if form?.message}<p role="alert">{form.message}</p>{/if}{#if form?.success}<p>Projekt erstellt.</p>{/if}</div>
<div class="space-y-3">{#each data.projects as project (project.id)}<article class="card"><h2 class="font-semibold">{project.name}</h2><p>{project.description}</p></article>{:else}<p>Du hast noch keine Projekte.</p>{/each}</div>
