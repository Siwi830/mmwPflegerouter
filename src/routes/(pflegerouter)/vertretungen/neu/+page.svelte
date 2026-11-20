<script lang="ts">
  import type { PageData, ActionData } from './$types';
  let { form }: { form: ActionData } = $props();</script>
<h1>Vertretung beantragen</h1><p>Die betreute Person muss bereits im Pflegerouter erfasst sein. Für eine Zustimmung benötigt sie ein eigenes Benutzerkonto.</p>
<form method="POST">
  <label>Personen-ID <input name="recipientId" required placeholder="UUID der betreuten Person" /></label>
  <label>Grundlage <select name="type"><option value="CONSENT">Zustimmung</option><option value="POWER_OF_ATTORNEY">Vollmacht</option><option value="LEGAL_REPRESENTATION">Gesetzliche Vertretung</option></select></label>
  <fieldset><legend>Beantragter Umfang</legend>
    <label><input type="checkbox" name="canView" checked /> Personendaten ansehen</label>
    <label><input type="checkbox" name="canManageRequests" /> Hilfsanfragen verwalten</label>
    <label><input type="checkbox" name="canManageAppointments" /> Termine verwalten</label>
    <label><input type="checkbox" name="canEditProfile" /> Stammdaten bearbeiten</label>
  </fieldset>
  <button>Prüfung anfordern</button>
  {#if form?.message}<p role="alert">{form.message}</p>{/if}
</form>
<p>Vollmachten und gesetzliche Vertretungen werden erst nach einer gesonderten Prüfung freigeschaltet. Dokumenten-Upload ist noch nicht implementiert.</p>
<style>form{display:grid;gap:1rem;max-width:560px;background:white;padding:1.5rem;border-radius:12px}label{display:grid;gap:.4rem}fieldset label{display:block;margin:.5rem 0}input,select{padding:.65rem}button{background:#174c7b;color:white;border:0;border-radius:8px;padding:.8rem;cursor:pointer}</style>
