/**
 * Portfolio contact form → Google Sheet
 *
 * Paste this whole file into the Apps Script editor of your Google Sheet
 * (Extensions → Apps Script), then deploy it as a Web app.
 * Full steps: README.md → "Contact form database".
 *
 * Each message becomes one row: Time | Name | Email | Message | Page
 */

const SHEET_NAME = 'Messages';
const NOTIFY_BY_EMAIL = true;       // email you a copy of every new message (set false to turn off)
const LIMITS = { name: 100, email: 200, message: 5000 };

function doPost(e) {
  try {
    const p = (e && e.parameter) || {};

    // Bots fill in the hidden "website" field; people never see it. Pretend it worked.
    if (p.website) return json({ ok: true });

    const name = clean(p.name, LIMITS.name);
    const email = clean(p.email, LIMITS.email);
    const message = clean(p.message, LIMITS.message);
    const page = clean(p.page, 300);

    if (!name || !email || !message) return json({ ok: false, error: 'Please fill in every field.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: 'That email address looks wrong.' });

    // One write at a time, so two messages sent at once never overwrite each other
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = getSheet();
      sheet.appendRow([new Date(), safe(name), safe(email), safe(message), safe(page)]);
    } finally {
      lock.releaseLock();
    }

    if (NOTIFY_BY_EMAIL) {
      try {
        MailApp.sendEmail({
          to: Session.getEffectiveUser().getEmail(),   // the Google account that owns the Sheet
          replyTo: email,                               // hit Reply to answer the sender directly
          subject: 'New portfolio message from ' + name,
          body: 'Name: ' + name + '\nEmail: ' + email + '\n\n' + message + '\n\n— sent from ' + (page || 'your portfolio'),
        });
      } catch (mailErr) {
        // The row is already saved; a failed email shouldn't fail the whole submission.
        console.error('Notification email failed: ' + mailErr);
      }
    }

    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: 'Something went wrong. Please try again or email me directly.' });
  }
}

// Opening the Web app URL in a browser shows this, which is a handy "is it live?" check.
function doGet() {
  return json({ ok: true, status: 'Contact form endpoint is running.' });
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Time', 'Name', 'Email', 'Message', 'Page']);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(4, 420);
  }
  return sheet;
}

function clean(value, max) {
  return String(value || '').trim().slice(0, max);
}

// Stop text like "=HYPERLINK(...)" from being run as a spreadsheet formula
function safe(value) {
  return /^[=+\-@]/.test(value) ? "'" + value : value;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
