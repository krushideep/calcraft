# CalCraft — User Guide (How to use the app)

This user guide explains, step-by-step, how to create a custom printable calendar using the CalCraft web app.

## 1 — Overview

CalCraft builds one-month-per-page printable calendars. You assemble each month from blocks (Header, Image, Quote, Grid), customize fonts and colors, then export a multi-page PDF or individual PNGs.

## 2 — Basic workflow

1. Open the app in your browser (e.g., the local URL shown by the dev server or the deployed site).
2. Choose the year you want to create.
3. Edit each month's settings directly in the month editor: set an image, add a quote, or leave blank.
4. Toggle which blocks appear and change their order using the layout controls (Header, Image, Quote, Grid).
5. Adjust global styles: fonts, sizes, alignment, primary accent color, and whether to show grid lines or events.

## 3 — Configuring each page so it fits

To guarantee each month fits on a single PDF page:
- Pick the right page size first (A4 for more space, A5 for smaller pages, or custom dimensions).
- Reduce large block heights if content overflows: lower the Header, Image, or Quote height values.
- Use compact fonts/sizes for grid and event text when space is tight.
- For dense event months, reduce `eventSize` or disable `showEvents` for export.

Tip: use the app preview to visually confirm each month before exporting.

## 4 — Importing calendar events

- Click the calendar import control and upload an `.ics` file to import events.
- After import, enable the calendar source to show events on month pages.
- Use the event color and primary color options to make events readable.

## 5 — Images and CORS

- Add custom images per month. Images are loaded into the browser and used when rendering the page.
- For reliable exports, use images served with permissive CORS headers or place images on the same origin. The app sets `crossOrigin="anonymous"` on images to allow html2canvas to render them.

## 6 — Exporting

Export PDF (multi-page):
1. Configure year, page size, and preview all months.
2. Click **Export PDF**. The app will render each month to an image and add it as one page in the PDF.

Export PNGs (per-month images):
1. Click **Export PNG**. Each month will be rendered and downloaded as a separate PNG file.

Export tips:
- If a month spills to another page, reduce block heights or switch to a larger page size.
- Wait 1–2 seconds after loading the app to ensure web fonts finish loading before exporting.

## 7 — Troubleshooting

- Blank or plain pages in PDF:
  - Refresh and wait for fonts to load, then export again.
  - Try the production build flow (`npm run build && npm run preview`) to reproduce the deployed environment.
- Images appear missing or blocked:
  - Host images with CORS enabled or use local images.
- PDF pages still overflow:
  - Reduce font sizes, header/image/quote heights, or set `Page Size` to a larger option.

## 8 — Quick checklist before exporting

- [ ] Pick Page Size (A4/A5/custom)
- [ ] Verify fonts and sizes are legible
- [ ] Reduce large images or header heights if needed
- [ ] Preview every month
- [ ] Export PDF or PNG and inspect output

If you want, I can add in-app hints, a visual resize preview, or an "auto-fit" button that scales content to the chosen page size.

