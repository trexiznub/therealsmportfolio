# Ujwal Raj K. P — Portfolio

Single-page dark portfolio. No build step, no dependencies.

## Run it
Open the folder in VS Code → right-click `index.html` → **Open with Live Server**.
(Double-clicking `index.html` also works.)

## Files
```
index.html        markup + all content (unchanged text)
css/style.css     all styling; tokens at the top (:root)
js/main.js        reveals, counters, cursor, hero portrait engine
images/
  ujwal.webp          original (1254px) – kept as the largest fallback
  ujwal-480/960.avif  fast, small versions the browser picks first
  ujwal-480/960.webp  fallback for browsers without AVIF
```

## Changing things
- **Colours / spacing / grid**: `:root` at the top of `css/style.css`
  (`--accent`, `--bg`, `--gap`, `--sec`, `--fig` portrait size, `--word` name size).
- **Content**: edit directly in `index.html`.
- **Swap the photo**: export a transparent PNG, then create 480px and 960px
  AVIF + WebP versions with the same file names (e.g. squoosh.app) and replace them.
  A 1KB blur placeholder is inlined in `index.html` (`.hero-lqip`, `background-image`);
  regenerate it from your new photo (28×28 px WebP, base64) for a perfect match.

## Photo loading (why it's fast now)
1. `<link rel="preload">` starts the download before CSS/JS.
2. AVIF/WebP at 480/960px (13–58 KB) instead of one 144 KB file.
3. Inline blur placeholder shows instantly; the sharp image reveals only after it is decoded.
4. `width`/`height` set, so nothing shifts.
5. Font CSS no longer blocks first paint.

## Placeholders still to fill
Resume link, LinkedIn URL, email, GitHub / Live Demo links, contact-form service.
