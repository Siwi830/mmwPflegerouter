# Modular SvelteKit Starter

SvelteKit 2 + Svelte 5 + TypeScript + Tailwind CSS 4 + PostgreSQL + Drizzle + Sessions + RBAC.

## Voraussetzungen
Node.js 22+, npm und Docker mit Compose.

## Start

```bash
cp .env.example .env
npm install
docker compose up -d
npm run db:generate
npm run db:migrate
npm run dev
```

Öffne http://localhost:5173 und registriere dich. Neue Benutzer haben standardmäßig die Rolle `member`.

## Administrator anlegen (nur lokal)

```bash
docker compose exec db psql -U app -d app -c "UPDATE users SET role = 'admin' WHERE email = 'deine@email.de';"
```

Danach erneut anmelden oder die Seite aktualisieren (Rollen werden pro Request aus der DB geladen).

## Projektstruktur

- `src/routes`: SvelteKit-Seiten, Form Actions und geschützte Layouts
- `src/lib/features`: clientseitige Fachmodule und UI
- `src/lib/server/auth`: Session- und Passwortlogik
- `src/lib/server/modules`: serverseitige Services
- `src/lib/server/db`: Datenbankschema und DB-Client
- `tests`: Unit-Tests

## Befehle

```bash
npm run check
npm run test
npm run build
```

## Sicherheits- und Produktionshinweise

Dies ist ein **lokaler Entwicklungsstarter**, keine produktionsfertige Auth-Plattform. Vor öffentlichem Einsatz ergänzen: Rate-Limits für Login und Registrierung, E-Mail-Verifikation, Passwort-Reset, Account-Lockout/Abuse-Monitoring, Session-Rotation und Aufräumjobs, Audit-Logging, Monitoring, Backups und sichere Deployment-/Proxy-Konfiguration. Registrierung kann in einer echten B2B-App per Invite eingeschränkt werden. Ein Admin muss bewusst provisioniert werden. Berechtigungen müssen auf jeder Server-Operation geprüft werden. Cookies sind `httpOnly`, `sameSite=lax` und außerhalb von Dev `secure`; SvelteKit bietet Origin-Prüfungen für Form-POSTs. Verwende HTTPS in Produktion. PostgreSQL-Zugangsdaten aus `.env.example` sind nur für lokale Entwicklung gedacht.

## Deployment

Der Node-Adapter ist eingerichtet. Konfiguriere `DATABASE_URL`, sichere Cookies via HTTPS und führe Migrationen vor dem Start aus. Für produktiven Betrieb sind die obigen Maßnahmen zwingend zu prüfen.
