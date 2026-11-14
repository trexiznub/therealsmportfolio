# Redesign notes (v8: off-white, heavy black type, chrome 3D logo)

## Logo
`logo/` holds the UJ mark: a monoline U and J inside a ring, with a green dot riding the ring.
- `ujwal-logo.svg` / `ujwal-logo-white.svg`      vector, for anything
- `ujwal-logo-1024.png` / `-white-1024.png`      transparent PNGs
- `ujwal-logo-profile-800.png` / `-dark-800.png` square with padding, for LinkedIn / GitHub avatars
- `ujwal-logo-chrome-3d.png`                     the chrome 3D render used in the hero
The site draws the 3D version live from the same geometry (`logo()` in `js/scene.js`).

## Contact form database
Messages go to the Google Sheet "Portfolio messages" through the Apps Script in
`backend/contact-form.gs` (already pasted into a script project on your Google account).
The form starts working once the script's Web app URL is pasted into `data-endpoint`
on the `<form id="contactForm">` in `index.html`.

## Files
- `index.html`    all content
- `css/style.css` sections 1–8 shared base, section 9 the v8 look; colours are the `:root` variables (`--acc` = green)
- `js/main.js`    loading screen, welcome, reveals, counters, nav, contact form
- `js/scene.js`   3D: logo emblem, project models, contact globe (drag to rotate)
