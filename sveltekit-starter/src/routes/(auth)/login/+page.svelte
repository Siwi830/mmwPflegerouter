<script lang="ts">let {form} = $props();</script>
<svelte:head><title>Anmelden</title></svelte:head>
<main class="mx-auto mt-20 max-w-md card space-y-5"><h1 class="text-2xl font-bold">Anmelden</h1>
<form method="POST" class="space-y-4"><label class="block">E-Mail<input name="email" type="email" autocomplete="email" required /></label><label class="block">Passwort<input name="password" type="password" autocomplete="current-password" required /></label><button>Anmelden</button></form>
{#if form?.message}<p role="alert" class="text-red-700">{form.message}</p>{/if}
<p>Noch kein Konto? <a href="/register">Registrieren</a></p></main>
