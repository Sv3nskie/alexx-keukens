# Alexx Keukens — website

Static brochure site for **Alexx Keukens** (Nijmegen): 4 pages, plain HTML / CSS / JS, no build step.
Built from the "Puls" design handoff (dark graphite ground, pumpkin-orange accent, light inset bands).

```
index.html      Home
keukens.html    Keukens
kasten.html     Kasten
contact.html    Contact + aanvraagformulier
css/styles.css  tokens, components, layout
js/main.js      nav drawer, infinite gallery, lightbox, contact form
img/            photos (placeholders!), favicon
```

## Deploy to mijndomein (Plesk)

Live host: **alexxkeukens.nl** · doc root `httpdocs` · PHP 8.5 · server `213.249.67.30`.

```bash
FTP_HOST=213.249.67.30 FTP_USER=<ftp-account> FTP_PASS=<password> python deploy.py --backup
```

`deploy.py` uploads over FTPS (encrypted) and skips the repo-only files
(`README.md`, `deploy.py`, `htaccess-alexxinterieur.txt`, `.nojekyll`). `--dry-run`
lists what it would send; `--backup` pulls the current remote files down first.

**Old domain.** `alexxinterieur.nl` 301s to the new site. If it is added in Plesk as an
*alias* of alexxkeukens.nl, section 1 of `.htaccess` already handles it. If it gets its
own document root, upload `htaccess-alexxinterieur.txt` there as `.htaccess` instead.
The old site was DotNetNuke, so the map covers `Keukens.aspx`, `Kasten.aspx`,
`Maatwerk.aspx`, `Contact.aspx`, `Klantenservice.aspx` and sends everything else home.

**Contact form.** `contact.php` mails to `MAIL_TO` at the top of that file. `MAIL_FROM`
must be a real mailbox on the sending domain or SPF/DMARC will reject the mail.

## Preview on GitHub Pages

1. Create a new repo and push this folder as its root.
2. Repo → **Settings → Pages → Source: Deploy from a branch**, branch `main`, folder `/ (root)`.
3. The site appears at `https://<user>.github.io/<repo>/`.

All links are relative, so the site works at any sub-path (project pages) or on a custom domain with no changes.
`.nojekyll` is included so Pages serves the files as-is.

## Before launch

- **Photos** — the client's own photographs (Google Drive, Sept 2026), resized to 1600 px wide
  (hero 2000 px) at quality 82. Thirteen selected out of 165; the originals are 4000 px if larger
  versions or a different selection are ever needed.
- **Contact form** — on GitHub Pages there is no backend. The form currently shows the success state client-side only.
  To make it send, put a Formspree / Basin / Getform endpoint in `data-endpoint=""` on the `<form>` in `contact.html`;
  `main.js` will POST the fields (`naam`, `email`, `telefoon`, `interesse`, `vraag`) and show the success panel on 2xx.
  Add spam protection (honeypot / captcha) at that provider.
- **Brand accent** — the orange `#ff7518` is the new accent; the old PNG logo used red. Confirm the hex with the client.
- **Canonical URL** — `url` in the JSON-LD (`LocalBusiness`) points to `https://alexxinterieur.nl`; update if the domain changes.

## Notes on the implementation

- Colours, type, spacing and copy follow the prototype (`Alex Keukens.dc.html`) verbatim. Where the handoff README and
  the prototype disagreed (step 1 title, number of FAQ items, closing CTA text), the prototype was followed.
- **The `mix-blend-mode: lighten` treatment on photos was dropped.** It was designed for the washed-out placeholder
  stand-ins; on the client's real photography it turns every black (hobs, ovens, dark fronts) olive-green.
  The `.lighten` class is still defined in `styles.css` — re-add it to the `<img>` tags to restore the original look.
- Copy reflects the client's "Teks aanpassingen" (Sept 2026): Alexx no longer does complete renovations.
  Tiling and plastering are not mentioned anywhere — not even to say they are no longer offered; the site
  states positively what Alexx does: distribute water/gas/electricity, drill the 160 mm extraction duct,
  and finish the wall in the worktop material, ceramic or composite.
- The gallery loops by cloning the 6 cards twice and normalising `scrollLeft`; native swipe / trackpad scrolling works.
- The lightbox has `aria-modal`, Esc / arrow keys, a focus trap and restores focus on close.
- Under 800 px the nav collapses into a drawer (the prototype had no mobile menu — remove the `.nav-toggle` rules to go back to wrapping links).
- The sticky appointment bar's height is measured and written to `--bar-h` so it never covers content on small screens.
