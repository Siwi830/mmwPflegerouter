<script lang="ts">
  import { onDestroy } from 'svelte';
  type Message = { role: 'user' | 'assistant'; content: string };
  type Draft = { title: string; description: string; category: string };
  type SpeechAlternative = { transcript: string };
  type SpeechResultItem = ArrayLike<SpeechAlternative> & { isFinal: boolean };
  type SpeechEvent = { resultIndex: number; results: ArrayLike<SpeechResultItem> };
  type Recognizer = {
    lang: string; interimResults: boolean; continuous: boolean;
    onresult: ((event: SpeechEvent) => void) | null;
    onerror: ((event: { error: string }) => void) | null;
    onend: (() => void) | null;
    start: () => void; stop: () => void; abort: () => void;
  };
  type SpeechWindow = Window & {
    SpeechRecognition?: new () => Recognizer;
    webkitSpeechRecognition?: new () => Recognizer;
  };
  let messages = $state<Message[]>([]);
  let text = $state('');
  let busy = $state(false);
  let listening = $state(false);
  let voiceMode = $state(false);
  let voiceStatus = $state('Mikrofon noch nicht gestartet.');
  let errorMessage = $state('');
  let notice = $state('');
  let draft = $state<Draft | null>(null);
  let draftToken = $state<string | null>(null);
  let emergency = $state(false);
  let completed = $state(false);
  let recognition: Recognizer | null = null;
  let silenceTimer: ReturnType<typeof setTimeout> | null = null;
  let restartTimer: ReturnType<typeof setTimeout> | null = null;
  let sessionFinal = '';
  let sessionInterim = '';
  let voiceEnabled = false;
  let requestInFlight = false;
  const SILENCE_MS = 7000;
  const labels: Record<string, string> = { SHOPPING: 'Einkaufen', COMPANIONSHIP: 'Begleitung', TRANSPORT: 'Fahrdienst', HOUSEHOLD: 'Haushalt', DIGITAL_HELP: 'Digitale Hilfe', OTHER: 'Sonstiges / Gesundheit' };

  function clearSilence() {
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = null;
  }

  function stopVoice() {
    voiceEnabled = false;
    voiceMode = false;
    listening = false;
    clearSilence();
    if (restartTimer) clearTimeout(restartTimer);
    restartTimer = null;
    recognition?.abort();
    recognition = null;
    sessionFinal = '';
    sessionInterim = '';
    voiceStatus = 'Sprachsteuerung beendet.';
  }

  function scheduleSilence() {
    clearSilence();
    if (!voiceEnabled || busy || completed || emergency || draft) return;
    silenceTimer = setTimeout(() => {
      clearSilence();
      // Erst nach 7 Sekunden ohne neues Sprachergebnis an den Assistenten senden.
      const utterance = text.trim();
      if (!utterance || requestInFlight) return;
      recognition?.stop();
      void send();
    }, SILENCE_MS);
  }

  function handleSpeech(spoken: string) {
    const normalized = spoken.trim().toLocaleLowerCase('de-DE').replace(/[.!?]+$/, '');
    if (!normalized) return;
    if (/^(?:Pflegerouter[ ,]+)?(?:stopp|stop|mikrofon aus|aufhören)$/.test(normalized)) {
      stopVoice();
      return;
    }
    if (/^(?:Pflegerouter[ ,]+)?(?:nachricht senden|bitte antworten|antworten)$/.test(normalized)) {
      clearSilence();
      if (text.trim()) { recognition?.stop(); void send(); }
      return;
    }
    if (/^(?:Pflegerouter[ ,]+)?(?:neu anfangen|neues gespräch)$/.test(normalized)) {
      restart();
      voiceStatus = 'Neues Gespräch. Ich höre zu.';
      return;
    }
    // Sprachbefehle werden nicht als Teil des Hilfegesuchs übertragen.
    if (/^(?:hallo[ ,]+)?Pflegerouter$/.test(normalized)) {
      voiceStatus = 'Ich höre zu. Was benötigen Sie?';
      return;
    }
    text = [text.trim(), spoken.trim()].filter(Boolean).join(' ').slice(0, 2000);
    voiceStatus = 'Ich höre zu. Nach 7 Sekunden Pause antworte ich.';
    scheduleSilence();
  }

  function startRecognition() {
    if (!voiceEnabled || busy || completed || emergency || draft || recognition) return;
    const w = window as SpeechWindow;
    const SpeechRecognition = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      stopVoice();
      errorMessage = 'Ihr Browser unterstützt die Spracherkennung nicht. Bitte verwenden Sie die Texteingabe.';
      return;
    }
    const instance = new SpeechRecognition();
    recognition = instance;
    sessionFinal = '';
    sessionInterim = '';
    instance.lang = 'de-DE';
    instance.continuous = true;
    instance.interimResults = true;
    instance.onresult = (event) => {
      let finals = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const item = event.results[i];
        const value = item[0]?.transcript?.trim() ?? '';
        if (item.isFinal) finals += ` ${value}`;
        else interim += ` ${value}`;
      }
      sessionInterim = interim.trim();
      // Zwischenresultate setzen den 7-Sekunden-Timer zurück, damit keine
      // Äußerung mitten im Satz abgesendet wird.
      if (sessionInterim) scheduleSilence();
      if (finals.trim()) {
        sessionFinal = [sessionFinal, finals.trim()].filter(Boolean).join(' ');
        handleSpeech(finals.trim());
      }
    };
    instance.onerror = (event) => {
      if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(event.error)) {
        stopVoice();
        errorMessage = 'Mikrofonzugriff nicht möglich. Bitte erlauben Sie das Mikrofon oder schreiben Sie Ihr Anliegen.';
      } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
        voiceStatus = 'Spracherkennung unterbrochen. Ich versuche es erneut.';
      }
    };
    instance.onend = () => {
      if (recognition === instance) recognition = null;
      listening = false;
      if (voiceEnabled && !busy && !completed && !emergency && !draft) {
        restartTimer = setTimeout(() => { restartTimer = null; startRecognition(); }, 350);
      }
    };
    try {
      instance.start();
      listening = true;
      voiceStatus = 'Ich höre zu. Sprechen Sie jetzt.';
    } catch {
      recognition = null;
      stopVoice();
      errorMessage = 'Das Mikrofon konnte nicht gestartet werden.';
    }
  }

  function microphone() {
    if (voiceEnabled) { stopVoice(); return; }
    if (typeof window === 'undefined') return;
    errorMessage = '';
    voiceEnabled = true;
    voiceMode = true;
    startRecognition();
  }

  async function send() {
    const content = text.trim();
    if (!content || busy || completed || requestInFlight) return;
    clearSilence();
    requestInFlight = true;
    text = ''; errorMessage = ''; notice = ''; draft = null; draftToken = null;
    messages = [...messages, { role: 'user', content }];
    busy = true;
    try {
      const response = await fetch('/api/assistenz/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? 'Die Antwort konnte nicht geladen werden.');
      messages = [...messages, { role: 'assistant', content: result.reply }];
      emergency = Boolean(result.emergency);
      if (emergency) stopVoice();
      if (result.demo) notice = 'Demo-Modus: Der Ticketentwurf wurde ohne KI erstellt. Bitte Angaben sorgfältig prüfen.';
      if (result.ready && result.draft && result.draftToken) { draft = result.draft; draftToken = result.draftToken; recognition?.stop(); voiceStatus = 'Bitte prüfen Sie den Ticketentwurf und bestätigen Sie ihn.'; }
    } catch (cause) { errorMessage = cause instanceof Error ? cause.message : 'Ein Fehler ist aufgetreten.'; }
    finally { busy = false; requestInFlight = false; if (voiceEnabled && !draft && !emergency && !completed) startRecognition(); }
  }

  async function confirm() {
    if (!draftToken || busy || completed) return;
    busy = true; errorMessage = '';
    try {
      const response = await fetch('/api/assistenz/ticket', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ draftToken, confirmed: true }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? 'Die Anfrage konnte nicht gespeichert werden.');
      notice = result.message;
      completed = true; draft = null; draftToken = null; stopVoice();
    } catch (cause) { errorMessage = cause instanceof Error ? cause.message : 'Speichern fehlgeschlagen.'; }
    finally { busy = false; }
  }
  function restart() { clearSilence(); messages = []; text = ''; draft = null; draftToken = null; emergency = false; completed = false; notice = ''; errorMessage = ''; if (voiceEnabled) { recognition?.abort(); recognition = null; startRecognition(); } }
  onDestroy(() => stopVoice());
</script>

<section class="assistant" aria-label="Sprachassistent für Hilfsanfragen">
  <div class="heading"><div><span class="symbol">🎙</span></div><div><h2>Wie können wir Ihnen helfen?</h2><p>Sprechen Sie mit unserem Assistenten oder schreiben Sie Ihr Anliegen.</p></div></div>
  <p class="privacy">Hinweis: Ihre Texte werden zur Verarbeitung an den eingerichteten KI-Dienst übermittelt. Bitte nennen Sie nur Angaben, die für Ihr Anliegen nötig sind. Spracherkennung kann je nach Browser über dessen Anbieter erfolgen.</p>
  <div class="conversation" role="log" aria-live="polite" aria-relevant="additions text">
    <p class="bubble bot">Guten Tag! Wobei benötigen Sie heute Unterstützung?</p>
    {#each messages as message, i (i)}<p class:human={message.role === 'user'} class:bot={message.role === 'assistant'} class="bubble">{message.content}</p>{/each}
    {#if busy}<p class="busy">Bitte warten …</p>{/if}
  </div>
  {#if emergency}<p class="urgent" role="alert"><strong>Bei einem akuten Notfall: 112 anrufen.</strong> Ein Hilfsticket ersetzt keine Notfallhilfe.</p>{/if}
  {#if errorMessage}<p class="error" role="alert">{errorMessage}</p>{/if}
  {#if notice}<p class="success" role="status">{notice} <a href="/mein-bereich">Meine Hilfsanfragen ansehen</a></p>{/if}
  {#if draft && !completed && !emergency}
    <div class="draft"><h3>Ihre Hilfsanfrage – bitte prüfen</h3><p><strong>{draft.title}</strong></p><p>{draft.description}</p><p><small>Kategorie: {labels[draft.category] ?? draft.category}</small></p><div class="buttons"><button class="primary" disabled={busy} onclick={confirm}>Ja, Hilfsanfrage absenden</button><button class="secondary" disabled={busy} onclick={() => { draft = null; draftToken = null; }}>Ich möchte etwas korrigieren</button></div><small>Erst mit „Absenden“ wird die Anfrage gespeichert.</small></div>
  {/if}
  {#if !completed && !emergency}
    <p class="voice-status" role="status">{voiceStatus}</p>
    <p class="voice-help">Nach dem Einschalten können Sie sprechen. Nach <strong>7 Sekunden Sprechpause</strong> antwortet der Assistent automatisch. Sprachbefehle: „Pflegerouter, stopp“, „Nachricht senden“ oder „Neues Gespräch“.</p>
    <form onsubmit={(event) => { event.preventDefault(); void send(); }}>
      <label for="assistant-text">Ihre Nachricht</label>
      <textarea id="assistant-text" bind:value={text} maxlength="2000" rows="3" placeholder="Zum Beispiel: Ich brauche Hilfe beim Einkaufen …" disabled={busy}></textarea>
      <div class="buttons"><button type="button" class="secondary" onclick={microphone} disabled={busy} aria-pressed={listening}>{voiceMode ? '■ Sprachsteuerung beenden' : '🎤 Sprachsteuerung einschalten'}</button><button type="submit" class="primary" disabled={busy || !text.trim()}>Nachricht senden</button></div>
    </form>
  {/if}
  {#if completed || emergency}<button class="secondary" onclick={restart}>Neues Gespräch beginnen</button>{/if}
</section>

<style>
  .voice-status{font-weight:700;color:#174679}.voice-help{font-size:13px;color:#61748f;line-height:1.5}
  .assistant{background:white;border:1px solid #e5edf7;border-radius:17px;padding:25px;margin-bottom:20px;box-shadow:0 5px 20px #143c6e09;color:#172b4d}.heading{display:flex;gap:14px;align-items:center}.heading h2{margin:0 0 5px;font-size:21px}.heading p{margin:0;color:#657b97}.symbol{display:grid;place-items:center;background:#e7f0ff;border-radius:13px;width:50px;height:50px;font-size:26px}.privacy{font-size:12px;line-height:1.5;color:#61748f;background:#f5f8fc;padding:12px;border-radius:9px}.conversation{display:flex;flex-direction:column;align-items:flex-start;gap:10px;max-height:380px;overflow:auto;padding:15px 0}.bubble{max-width:90%;padding:13px 16px;border-radius:14px;margin:0;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere}.bot{background:#eef4fc;color:#1b416e}.human{background:#1655ad;color:white;align-self:flex-end}.busy{color:#61748f}label{display:block;font-weight:700;margin:10px 0}textarea{display:block;box-sizing:border-box;width:100%;font:inherit;font-size:17px;border:1px solid #cbd9ea;border-radius:10px;padding:13px;resize:vertical}.buttons{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0}button{border:0;border-radius:10px;padding:13px 17px;font:inherit;font-weight:700;cursor:pointer;min-height:48px}button:disabled{opacity:.6;cursor:wait}.primary{background:#1655ad;color:white}.secondary{background:#e8f0fa;color:#174679}.draft{border:2px solid #b9d5f6;border-radius:12px;padding:18px;margin:15px 0}.draft h3{margin-top:0}.draft p{white-space:pre-wrap;overflow-wrap:anywhere}.error,.urgent{background:#fff0ef;color:#872b2b;padding:13px;border-radius:10px}.success{background:#eaf8ef;color:#1a6235;padding:13px;border-radius:10px}@media(max-width:600px){.assistant{padding:17px}.buttons button{width:100%}}
</style>
