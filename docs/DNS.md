# Point demo.bump-labs.com at this site

At your DNS host for `bump-labs.com` (Namecheap / registrar-servers.com):

| Type  | Host | Value                     | TTL  |
|-------|------|---------------------------|------|
| CNAME | demo | aarushkandukoori.github.io | Auto |

Then:
1. Restore `public/CNAME` containing `demo.bump-labs.com`
2. Push to `main`, or set Custom domain in repo Settings → Pages
3. Enable “Enforce HTTPS” after DNS verifies
