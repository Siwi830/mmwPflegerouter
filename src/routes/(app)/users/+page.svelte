<script lang="ts">let {data} = $props();</script>
<svelte:head><title>Benutzer</title></svelte:head>
<h1 class="text-3xl font-bold mb-6">Benutzerverwaltung</h1><div class="card overflow-x-auto"><table class="w-full text-left"><thead><tr><th>Name</th><th>E-Mail</th><th>Rolle</th></tr></thead><tbody>{#each data.users as user (user.id)}<tr class="border-t"><td class="py-3">{user.name}</td><td>{user.email}</td><td>{user.role}</td></tr>{/each}</tbody></table></div>
