# Custom Domain Configuration Guide

> How the end-user custom domain flow works in this system.

---

## Overview

When an end-user wants to point their own domain (e.g. `mysite.com`) at their
Vercel deployment, the flow is:

```
User provides domain
       ↓
POST /domain/add   →  Vercel API adds domain to project
       ↓
API returns DNS records
       ↓
User adds records at their registrar (GoDaddy / Cloudflare / Namecheap …)
       ↓
DNS propagates  (5 min – 48 h)
       ↓
GET /domain/status  →  verified: true  ✅
```

---

## Endpoints

### 1. `POST /domain/add`

Ask the user for their domain, then call this endpoint.

**Request body (JSON)**

```json
{
  "github_url": "https://github.com/YourUser/YourRepo",
  "domain": "mysite.com"
}
```

**Response**

```json
{
  "domain": "mysite.com",
  "project": "yourrepo",
  "verified": false,
  "message": "Domain added. Please add the DNS records below at your registrar.",
  "dns_records": [
    {
      "type": "A",
      "host": "@",
      "value": "76.76.21.21",
      "ttl": 3600,
      "purpose": "routing"
    }
  ],
  "verification_records": [
    {
      "type": "TXT",
      "host": "_vercel",
      "value": "vc-domain-verify=xxxxxxxxxxxxxxxx",
      "ttl": 3600,
      "purpose": "verification"
    }
  ]
}
```

---

### 2. `GET /domain/status`

Poll this to check if DNS has propagated and the domain is live.

**Query params**

| Param        | Example                             |
|--------------|-------------------------------------|
| `github_url` | `https://github.com/YourUser/Repo`  |
| `domain`     | `mysite.com`                        |

**Example request**

```
GET /domain/status?github_url=YourUser/Repo&domain=mysite.com
```

**Response**

```json
{
  "domain": "mysite.com",
  "project": "yourrepo",
  "verified": true,
  "misconfigured": false,
  "cdn_enabled": true
}
```

---

## DNS Records Explained

The API returns two groups of records. Show **both** to the user.

### Routing record — routes traffic to Vercel

| Scenario          | Record type | Host  | Value                   |
|-------------------|-------------|-------|-------------------------|
| Apex / root domain (`mysite.com`)  | **A**     | `@`   | `76.76.21.21`           |
| Subdomain (`www.mysite.com`)       | **CNAME** | `www` | `cname.vercel-dns.com`  |

> **Tip for apex + www:** add *both* an A record for `@` and a CNAME for `www`,
> then Vercel will serve both.

### Verification record — proves you own the domain

| Record type | Host      | Value                              |
|-------------|-----------|------------------------------------|
| **TXT**     | `_vercel` | `vc-domain-verify=<unique-token>`  |

This is only needed the first time a domain is added. Once verified it stays verified.

---

## How to Add DNS Records — Common Registrars

### Cloudflare

1. Go to **DNS → Records → Add record**
2. Disable the orange proxy cloud (set to **DNS only**) for the A / CNAME record
3. Add the TXT record exactly as shown (no proxy needed for TXT)

### GoDaddy

1. **My Products → DNS → Manage DNS**
2. Add each record under **DNS Records**
3. Set TTL to **1 hour (3600)**

### Namecheap

1. **Domain List → Manage → Advanced DNS**
2. Add records under **Host Records**
3. Use `@` for the root and the subdomain label (e.g. `www`) for subdomains

### Google Domains / Squarespace DNS

1. **DNS → Manage custom records**
2. Add A / CNAME under **Custom resource records**
3. Add TXT record in the same section

---

## Propagation & Verification

- DNS changes can take **5 minutes to 48 hours** to propagate worldwide.
- Vercel checks automatically — no manual trigger needed.
- Poll `GET /domain/status` every 30–60 seconds from your frontend until
  `verified: true`.

**Frontend polling example (JavaScript)**

```javascript
async function pollDomainStatus(githubUrl, domain, onVerified) {
  const base = "https://your-api.vercel.app";
  const url  = `${base}/domain/status?github_url=${encodeURIComponent(githubUrl)}&domain=${encodeURIComponent(domain)}`;

  const timer = setInterval(async () => {
    const res  = await fetch(url);
    const data = await res.json();

    if (data.verified) {
      clearInterval(timer);
      onVerified(data);           // 🎉 domain is live
    } else if (data.misconfigured) {
      clearInterval(timer);
      console.error("DNS is misconfigured — check records.");
    }
  }, 30_000);  // poll every 30 s
}
```

---

## Common Errors

| Error | Likely cause | Fix |
|-------|--------------|-----|
| `"Domain already exists on another project"` | Domain is attached elsewhere on Vercel | Remove from the old project first |
| `verified: false` after 1 h | Wrong DNS record | Double-check host / value, remove Cloudflare proxy |
| `misconfigured: true` | A / CNAME pointing at wrong IP | Re-check routing record value |
| `"Failed to add domain"` | Invalid VERCEL_TOKEN or TEAM_ID | Verify `.env` values |

---

## Environment Variables Required

Add these to your `.env` (and to Vercel environment variables for production):

```env
VERCEL_TOKEN=your_vercel_api_token
GITHUB_TOKEN=your_github_pat
TEAM_ID=your_vercel_team_id        # leave blank for personal accounts
GITHUB_BRANCH=main
```

Get your Vercel token at: **vercel.com/account/tokens**
