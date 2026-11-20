import type { TicketDraft } from './core';

type Message = { role: 'user' | 'assistant'; content: string };

// Demonstrationsdaten: nicht als reale Patientenangaben ausgeben.
const EXAMPLES: TicketDraft[] = [
  { title: 'Unterstützung beim Wocheneinkauf', category: 'SHOPPING', description: 'DEMO / SIMULIERT: Die betreute Person benötigt Unterstützung beim Einkauf von Lebensmitteln und Getränken. Ein genauer Termin und die Einkaufsliste sind noch abzustimmen.' },
  { title: 'Begleitung zum Arzttermin gewünscht', category: 'TRANSPORT', description: 'DEMO / SIMULIERT: Die betreute Person wünscht Begleitung und eine Fahrmöglichkeit zu einem Arzttermin. Datum, Uhrzeit und Zieladresse sind noch zu klären.' },
  { title: 'Hilfe beim Wechseln der Bettwäsche', category: 'HOUSEHOLD', description: 'DEMO / SIMULIERT: Die betreute Person benötigt Unterstützung beim Wechseln der Bettwäsche. Ein passender Besuchstermin ist noch zu vereinbaren.' },
  { title: 'Gesellschaft und gemeinsamer Spaziergang', category: 'COMPANIONSHIP', description: 'DEMO / SIMULIERT: Die betreute Person wünscht Gesellschaft und, sofern möglich, einen gemeinsamen Spaziergang. Zeitpunkt und Umfang sind noch abzustimmen.' },
  { title: 'Unterstützung mit dem Smartphone', category: 'DIGITAL_HELP', description: 'DEMO / SIMULIERT: Die betreute Person benötigt Hilfe bei der Bedienung des Smartphones. Das konkrete Gerät und die Aufgabe sind noch zu klären.' }
];

function classify(input: string): TicketDraft {
  const text = input.toLowerCase();
  const category: TicketDraft['category'] = /einkauf|lebensmittel|supermarkt|apotheke/.test(text) ? 'SHOPPING'
    : /fahrt|fahren|taxi|arzttermin|begleit|abholen/.test(text) ? 'TRANSPORT'
    : /putz|sauber|fenster|bettwäsche|wäsche|haushalt|aufräum/.test(text) ? 'HOUSEHOLD'
    : /einsam|besuch|gesellschaft|spaziergang|reden|unterhalten/.test(text) ? 'COMPANIONSHIP'
    : /handy|smartphone|computer|internet|tablet|drucker/.test(text) ? 'DIGITAL_HELP'
    : 'OTHER';
  const titles: Record<TicketDraft['category'], string> = {
    SHOPPING: 'Unterstützung beim Einkaufen gewünscht', TRANSPORT: 'Fahrt oder Begleitung benötigt',
    HOUSEHOLD: 'Unterstützung im Haushalt benötigt', COMPANIONSHIP: 'Besuch oder Gesellschaft gewünscht',
    DIGITAL_HELP: 'Hilfe mit digitalen Geräten benötigt', OTHER: 'Persönliches Anliegen – Rückmeldung erbeten'
  };
  const cleaned = input.trim().replace(/\s+/g, ' ').slice(0, 1200);
  return {
    title: titles[category], category,
    description: `DEMO / SIMULIERTE KI-AUSWERTUNG. Originalanliegen der betreuten Person: „${cleaned}“. Weitere Details und ein möglicher Termin müssen vom Betreuungsteam geklärt werden.`
  };
}

export function mockResponse(messages: Message[]) {
  const userMessages = messages.filter(m => m.role === 'user').map(m => m.content.trim());
  const text = userMessages.join(' ').trim();
  const demoRequested = /^(demo|beispiel|testticket|muster)$/i.test(userMessages.at(-1) ?? '');
  const draft = demoRequested
    ? EXAMPLES[(userMessages.length - 1) % EXAMPLES.length]
    : text ? classify(text) : EXAMPLES[0];
  return {
    reply: 'Der KI-Dienst ist gerade nicht verfügbar. Ich habe einen gekennzeichneten Demo-Entwurf vorbereitet. Bitte prüfen Sie die Angaben. Soll ich etwas ändern?',
    ready: true, emergency: false, demo: true, draft
  };
}
