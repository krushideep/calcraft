import React from 'react';

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative max-w-3xl w-[95%] max-h-[90vh] bg-white rounded-xl shadow-2xl p-6 overflow-auto">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold">How to use CalCraft</h2>
          <button className="text-slate-500 hover:text-slate-800" onClick={onClose} aria-label="Close help">✕</button>
        </div>

        <div className="mt-4 space-y-4 text-sm text-slate-700">

          <section>
            <strong>1 — Choose year</strong>
            <div>Select the year you want to generate a calendar for using the year control.</div>
          </section>

          <section>
            <strong>2 — Edit months</strong>
            <div>
              For each month you can:
              <ul className="list-disc ml-5 mt-2">
                <li>Add or change the month image.</li>
                <li>Enter a quote or note for that month.</li>
                <li>Toggle which blocks appear and reorder blocks in the layout controls.</li>
              </ul>
            </div>
          </section>

          <section>
            <strong>3 — Configure layout & style</strong>
            <div>Adjust fonts, sizes, alignments, primary color, and grid options from the settings panel to match your design.</div>
          </section>

          <section>
            <strong>4 — Make it fit</strong>
            <div>
              If a month spills onto a second page, try:
              <ul className="list-disc ml-5 mt-2">
                <li>Switching to a larger page size (A5 → A4) or using custom dimensions.</li>
                <li>Reducing Header, Image, or Quote heights.</li>
                <li>Using smaller font sizes for grid and events or hiding events for export.</li>
              </ul>
            </div>
          </section>

          <section>
            <strong>5 — Export</strong>
            <div>
              - Click <span className="font-bold">Export PDF</span> to generate a multi-page PDF (each month as one page).
              <br />- Click <span className="font-bold">Export PNG</span> to download each month as a separate image.
            </div>
          </section>

          <section>
            <strong>Troubleshooting</strong>
            <div>
              - Wait 1–2s after opening the app to let web fonts load before exporting.
              <br />- If images fail to appear in the export, use images with permissive CORS or host them locally.
            </div>
          </section>
        </div>

        <div className="mt-6 text-right">
          <button onClick={onClose} className="px-4 py-2 bg-slate-900 text-white rounded-lg font-bold">Got it</button>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
