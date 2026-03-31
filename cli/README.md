<p align="center">
  <img src="https://raw.githubusercontent.com/Chafficui/keel/main/brand/icon.png" alt="Keel" width="100" />
</p>

<h1 align="center">Keel</h1>

<p align="center">
  <strong>The full-stack framework built for AI.</strong><br/>
  Auth, database, email, mobile — ready in one command.
</p>

<p align="center">
  <a href="https://keel.codai.app">Website</a> · <a href="https://keel.codai.app">Docs</a> · <a href="https://github.com/Chafficui/keel">GitHub</a>
</p>

---

## Quick Start

```bash
npx @codaijs/keel create my-app
```

Follow the interactive wizard to configure your project — database, auth, email, and optional sails.

### Zero-Config (no Docker needed)

```bash
npx @codaijs/keel create my-app --yes --db=pglite
cd my-app
keel dev
```

### With Options

```bash
npx @codaijs/keel create my-app --yes                          # All defaults
npx @codaijs/keel create my-app --yes --db=docker              # Docker PostgreSQL
npx @codaijs/keel create my-app --yes --db=url --db-url=...    # Custom DB URL
npx @codaijs/keel create my-app --yes --sails=stripe,google-oauth
```

## What You Get

| Layer | Stack |
|-------|-------|
| **Frontend** | Vite + React 19 + TypeScript + TailwindCSS v4 |
| **Backend** | Express 5 + TypeScript (ESM) |
| **Auth** | BetterAuth — email/password, sessions, verification |
| **Email** | Resend + React Email templates |
| **Database** | PostgreSQL + Drizzle ORM (migrations) |
| **Mobile** | Capacitor 8 — iOS + Android |
| **AI** | CLAUDE.md, .cursor/rules, copilot-instructions — built in |

## CLI Commands

### Development

```bash
keel dev                          # Start dev servers + database
keel start                        # Production build + start
keel doctor                       # Health check your project
keel env                          # Show env var status
```

### Code Generators

```bash
keel generate route <name>        # Scaffold Express route
keel generate page <name>         # Scaffold React page
keel generate email <name>        # Scaffold email template
```

### Sails (Extensions)

```bash
keel sail add <name>              # Install a sail
keel sail remove <name>           # Remove a sail
keel list                         # List all available sails
keel info <name>                  # Show sail details
```

### Database

```bash
keel db:reset                     # Drop + re-migrate
keel db:studio                    # Open Drizzle Studio
keel db:seed                      # Run seed file
```

## Available Sails

| Sail | What it adds |
|------|-------------|
| **google-oauth** | Google sign-in + OAuth config |
| **stripe** | Subscriptions, checkout, webhooks, portal |
| **gdpr** | Consent, data export, account deletion, privacy policy |
| **r2-storage** | Cloudflare R2 file uploads |
| **push-notifications** | Firebase Cloud Messaging |
| **analytics** | PostHog tracking |
| **admin-dashboard** | User management + metrics |
| **i18n** | i18next localization |

## Requirements

- Node.js >= 22
- npm >= 10

## Links

- [Documentation](https://keel.codai.app)
- [GitHub](https://github.com/Chafficui/keel)
- [Report Issues](https://github.com/Chafficui/keel/issues)

## License

MIT
