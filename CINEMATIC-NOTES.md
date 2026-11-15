# Cinematic version — notes

Static site, no build step. Open `index.html` with Live Server. Works on GitHub Pages as-is.

## Motion architecture
- GSAP 3.15.1 + ScrollTrigger + SplitText, from GreenSock's official repository, in `js/vendor/`
  (served from this repo, no CDN). GSAP is free to use under GreenSock's standard licence.
- `js/main.js` — all motion. `gsap.matchMedia()` holds three sets: desktop (≥1101px),
  tablet/phone (≤1100px, with phone-only tweaks ≤800px) and reduced motion. Each set reverts
  itself when the viewport or preference changes (the vanilla equivalent of `@gsap/react`'s
  `useGSAP`, which only applies to React projects).
- Native scrolling; no smooth-scroll library, no scroll hijacking.
- Hidden start states are set only by GSAP, so the page is fully readable without JavaScript.
- `js/scene.js` — the hand-written 3D models (halo ring in the hero, project models, globe).

## Scene by scene
| Section | Motion |
|---|---|
| Loader | Hello → Namaste → Welcome, real loading %, wipes up into the intro |
| Hero | Name rises letter by letter; halo + portrait arrive; drifting contour lines; parallax with cursor; everything separates as you scroll away |
| Manifesto | Pinned; the sentence lights up word by word (unpinned on phones) |
| About | Portrait opens like an aperture; image settles inside; counters |
| Work | Pinned horizontal showcase on desktop; stacked cards on tablet/phone; drag the 3D models |
| Experience | Rail fills as you read; milestones light up |
| Skills | Six numbered rows; each draws its top bar on scroll, then tags land (decorative bar, not a proficiency score) |
| Education / Certifications | Rows slide in |
| Leadership | Each card draws its top rule |
| UJ Moto A | Pinned; a card opens to full screen around the dusk ride clip; the UJ MOTO title then settles at the top above the copy and link |
| UJ Moto B | Pinned; scrolling scrubs through the jump (phones: plain loop) |
| UJ Moto C | Photo and sunset clip drift at different speeds |
| Footer | Name rises from the floor |

## Video
`media/` holds web versions made from your clips (audio removed):
- `moto-ride.mp4` (+ `-640` for phones) — dusk lakeside POV ride (seconds 12–24 of the dji_mimo clip), loops in UJ Moto A
- `moto-jump.mp4` (+ `-720`) — seconds 5–10 of the field clip, short keyframe interval so scrubbing is smooth
- `moto-lineup.mp4` — sunset line-up, loops in UJ Moto C
Videos load only when you scroll near them, play only while visible, and phones get smaller files.
To swap a clip, keep the same file names (or edit `data-src` on the `<video>`).

## Still to connect
Contact form: paste the Google Apps Script Web app URL into `data-endpoint` on `<form id="contactForm">`.
