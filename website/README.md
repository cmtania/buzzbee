# BuzzBee marketing/docs site

Static HTML/CSS, no build step — drop this folder's contents into the root of your future
`buzzbee-docs` repo and enable GitHub Pages (Settings → Pages → Deploy from branch → `/root`).

## Pages

- `index.html` — landing page
- `support.html` — FAQ + contact
- `privacy.html` — Privacy Policy
- `terms.html` — Terms of Service
- `styles.css` — shared stylesheet (colors match the app's real theme)
- `assets/bee-logo.svg` — the real BuzzBee logo mark

## Preview locally

Any static file server works, e.g.:

```
npx serve website
```

## Before you publish — things marked with a red highlight in the pages

- **Support email** — replace `[INSERT SUPPORT EMAIL]` in `privacy.html`, `terms.html`, and the
  `mailto:` link in `support.html`.
- **Effective dates** — replace `[INSERT DATE]` in `privacy.html` and `terms.html`.
- **Governing law** — replace `[INSERT YOUR COUNTRY/STATE]` in `terms.html` (or remove that
  clause if you'd rather not specify one yet).
- **Download links** — every "Download on the App Store" button currently points to `href="#"`
  as a placeholder. Swap in your real App Store link once BuzzBee is live.

Everything else (copy, FAQ answers, privacy practices described) reflects the app's actual
current behavior — see `../legal/privacy-policy.md` and `../legal/terms-of-service.md` for the
original plain-text drafts this HTML was built from.
