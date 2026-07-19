# BUMP Detection Demo

Interactive demo for **[demo.bump-labs.com](https://demo.bump-labs.com)** — a short client-side simulation of the BUMP bradycardia detection pipeline.

Not a medical device. Synthetic ECG only. The full Docker stack lives at
[aarushkandukoori/bump-detection](https://github.com/aarushkandukoori/bump-detection).

## Local

```bash
npm install
npm run dev
```

## Deploy (`demo.bump-labs.com`)

This repo deploys to GitHub Pages. For the subdomain:

1. Push to `main` (Pages workflow runs automatically).
2. In the repo **Settings → Pages → Custom domain**, set `demo.bump-labs.com`.
3. At your DNS host (currently `registrar-servers.com` for bump-labs.com), add:

| Type  | Host | Value                     |
|-------|------|---------------------------|
| CNAME | demo | aarushkandukoori.github.io |

DNS can take a few minutes to an hour to propagate. Apex `bump-labs.com` stays on the marketing site repo unchanged.
