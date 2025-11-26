# eMarks Explorer Chrome Extension

This repository contains the source for the eMarks Explorer Chrome extension, which extracts and analyzes your University of Toronto eMarks data. Follow the steps below to load the unpacked extension in Chrome for local use or development.

## Requirements
- Google Chrome or a Chromium-based browser that supports Manifest V3.
- Access to this project folder on your machine.

## Install (Load Unpacked in Developer Mode)
1) Open Chrome and go to `chrome://extensions`.
2) Toggle on **Developer mode** (top right of the Extensions page).
3) Click **Load unpacked**.
4) In the folder picker, select the project directory (`/Users/sansthie/Desktop/eMarksExplorer`) and confirm.
5) The extension will appear in your extensions list. Pin it if you want quick access to the popup.

## Usage
- Sign in to eMarks and open your marks page (`https://emarks.utoronto.ca/emarks/pages/marks/marks.xhtml`).
- Click the eMarks Explorer icon in the toolbar to open the popup.
- Use the popup controls to extract and review your marks; the content script runs on the marks page to gather the data.
- If you make changes and reload the extension, refresh the marks page before trying again.

## Updating During Development
- After making code changes, return to `chrome://extensions` and click the **Reload** icon on the eMarks Explorer card to apply updates.
- Use the background page/service worker logs (click **Service worker** under the extension entry) and the popup devtools to debug as needed.

## Files of Interest
- `manifest.json` — Extension metadata and permissions.
- `service_worker.js` — Background service worker.
- `script.js` — Content script injected into the eMarks page.
- `popup.html`, `popup.js`, `popup.css` — UI shown when clicking the extension icon.

## Privacy
- The extension does not collect or transmit your credentials.
- All extracted records are stored locally in your browser’s extension storage.
- No data is uploaded to any server; everything stays on your machine.
