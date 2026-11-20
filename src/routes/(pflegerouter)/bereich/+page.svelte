<script lang="ts">
  import type { PageData, ActionData } from './$types';
  let { data }: { data: PageData } = $props();</script>
<h1>Wie möchten Sie Pflegerouter nutzen?</h1>
<p>Sie können jederzeit zwischen Ihren freigeschalteten Ansichten wechseln.</p>
<div class="grid">
  <a href="/bereich/self"><span>👤</span><h2>Für mich selbst</h2><p>Meine Anfragen, meine Termine und Sprachunterstützung.</p><small>{data.selfCount} verknüpfte Personenprofile</small></a>
  <a href="/bereich/other"><span>🤝</span><h2>Für eine andere Person</h2><p>Betreuung mit Zustimmung oder nach geprüfter Vertretung.</p><small>{data.otherCount} freigegebene Personen</small></a>
  {#if data.organizationView === 'volunteer'}<a href="/bereich/volunteer"><span>💚</span><h2>Ehrenamtliche Einrichtung</h2><p>Hilfsanfragen und Einsätze koordinieren.</p><small>{data.organization}</small></a>{/if}
  {#if data.organizationView === 'business'}<a href="/bereich/business"><span>🏢</span><h2>Unternehmen</h2><p>Professionelle Einsatz- und Betreuungsübersicht.</p><small>{data.organization}</small></a>{/if}
</div>
<style>
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1rem;margin-top:2rem}
  a{display:block;background:white;border:1px solid #dce6ef;border-radius:18px;padding:1.5rem;text-decoration:none;color:inherit;box-shadow:0 6px 22px #12345a0b}
  a:hover{border-color:#2e7cb9}span{font-size:2rem}h2{margin:.5rem 0}p{line-height:1.55}small{color:#536a7c}
</style>
