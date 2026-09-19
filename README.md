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

## Preview on GitHub Pages

1. Create a new repo and push this folder as its root.
2. Repo → **Settings → Pages → Source: Deploy from a branch**, branch `main`, folder `/ (root)`.
3. The site appears at `https://<user>.github.io/<repo>/`.

All links are relative, so the site works at any sub-path (project pages) or on a custom domain with no changes.
`.nojekyll` is included so Pages serves the files as-is.

## Before launch

- **Photos** — `img/*.jpg` are low-resolution stand-ins from the old site (~250×180 px; hero 1140×419).
  Replace with the client's originals (≥1600 px wide), same filenames, and add `srcset` if desired.
- **Contact form** — on GitHub Pages there is no backend. The form currently shows the success state client-side only.
  To make it send, put a Formspree / Basin / Getform endpoint in `data-endpoint=""` on the `<form>` in `contact.html`;
  `main.js` will POST the fields (`naam`, `email`, `telefoon`, `interesse`, `vraag`) and show the success panel on 2xx.
  Add spam protection (honeypot / captcha) at that provider.
- **Brand accent** — the orange `#ff7518` is the new accent; the old PNG logo used red. Confirm the hex with the client.
- **Canonical URL** — `url` in the JSON-LD (`LocalBusiness`) points to `https://alexxinterieur.nl`; update if the domain changes.

## Notes on the implementation

- Colours, type, spacing and copy follow the prototype (`Alex Keukens.dc.html`) verbatim. Where the handoff README and
  the prototype disagreed (step 1 title, number of FAQ items, closing CTA text), the prototype was followed.
- The gallery loops by cloning the 6 cards twice and normalising `scrollLeft`; native swipe / trackpad scrolling works.
- The lightbox has `aria-modal`, Esc / arrow keys, a focus trap and restores focus on close.
- Under 800 px the nav collapses into a drawer (the prototype had no mobile menu — remove the `.nav-toggle` rules to go back to wrapping links).
- The sticky appointment bar's height is measured and written to `--bar-h` so it never covers content on small screens.
