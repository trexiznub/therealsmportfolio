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

## Contact form database (Google Sheets)
Every message sent through the contact form is saved as a row in a Google Sheet you own
(Time · Name · Email · Message · Page), and a copy is emailed to you. Hit **Reply** on that
email to answer the sender directly.

The backend is one file: `backend/contact-form.gs`. One-time setup (about 5 minutes):

1. Go to [sheets.new](https://sheets.new) and name the sheet, e.g. **Portfolio messages**.
2. In the sheet: **Extensions → Apps Script**. Delete what's in the editor, paste in all of
   `backend/contact-form.gs`, and click **Save**.
3. Click **Deploy → New deployment**. Click the gear icon next to "Select type" → **Web app**, then set:
   - *Execute as*: **Me**
   - *Who has access*: **Anyone** (this lets visitors *send* messages; only you can read the Sheet)
4. Click **Deploy**, then **Authorize access**. Google warns that the app isn't verified.
   That's expected for your own script: click **Advanced → Go to (project name)** and **Allow**.
5. Copy the **Web app URL** (it ends in `/exec`). To check it's working, open it in a browser.
   It should say `Contact form endpoint is running.`
6. In `index.html`, paste that URL into the form's `data-endpoint`:
   ```html
   <form class="reveal" id="contactForm" data-endpoint="https://script.google.com/macros/s/XXXX/exec" novalidate>
   ```
7. Send yourself a test message from the site. A **Messages** tab with a header row appears
   in the Sheet automatically.

Notes
- **Changed the script later?** Use **Deploy → Manage deployments → ✏️ Edit → Version: New version**.
  That keeps the same URL. "New deployment" gives you a new URL that you'd have to paste again.
- **Turn off the email copies**: set `NOTIFY_BY_EMAIL = false` at the top of the script and redeploy.
- **Spam**: a hidden "website" field catches most bots. Their submissions are quietly dropped.
- Until `data-endpoint` is filled in, the form tells visitors it isn't connected yet.

## Placeholders still to fill
GitHub / Live Demo links for RenewEdge AI and SPARK AI, contact-form Web app URL (see above).

## Resume
`resume/Ujwal-Raj-KP-Resume.pdf` is linked from the hero's **Download CV** button and the contact
section's **Download Resume** link. To update it, replace that file and keep the same name.
