# HIGH-STAR

HIGH STAR CO. administration and agent portals, with Windows desktop applications built with React, TypeScript, Electron and Supabase.

- [Administration portal](https://v.high-star.iq)
- [Agent portal](https://agents.high-star.iq)
- [Latest Windows installers](https://github.com/m9a7x-byte/HIGH-STAR-CO/releases/latest)
- [3.6.10 audit and verification](docs/releases/3.6.10-audit.md)

## Development

Use Node.js 24, then run:

```sh
npm ci
npm run dev
npm test
npm run typecheck
npm run test:e2e
```

The browser tests use isolated services and do not send production mail, notifications or financial transactions. Install the browser once with `npx playwright install chromium`.

## Builds

```sh
npm run build:admin
npm run build:agent
npm run build:electron:admin -- --publish never
npm run build:electron:agent -- --publish never
```

Each web build writes `dist`; each desktop build uses its matching administration or agent configuration. Increment the package version before a release and verify updater checksums before publishing. Keep credentials, database backups and private deployment receipts outside published assets.
