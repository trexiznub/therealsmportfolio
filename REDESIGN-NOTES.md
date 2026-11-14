# Redesign notes (v7: black / white, glass, centred hero)

Earlier versions: `_backup-before-redesign/` (original), `_backup-graphite-version/`,
`_backup-v6-lime/`. Your README's "Contact form database" steps still apply.

## Home photo
`images/photo without bg.png` had a white background, so it was cut out and saved as
`images/hero-520 / hero-1040` (.avif + .webp). To use a different photo later, export a
transparent PNG and replace those four files (keep the names).

## Loading screen + welcome
First visit: "Hello → Namaste → Welcome" with a 0–100% counter that follows real loading
(fonts + home photo), then the screen wipes up and the hero animates in.
Repeat visits in the same browser session get a short version. It never waits longer than 6s.
Timings are at the top of section 2 in `js/main.js` (`minTime`).

## Files
- `index.html`    all content
- `css/style.css` colours, spacing, fonts are the variables at the top (`:root`)
- `js/main.js`    loader, welcome, reveals, counters, nav, contact form
- `js/scene.js`   3D models (drag to rotate on project cards and the contact globe)
