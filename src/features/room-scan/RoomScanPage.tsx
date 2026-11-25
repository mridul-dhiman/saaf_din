import React, { useState } from 'react';
import { useLanguage } from '../../i18n';
import { analyseRoom } from '../../services/gemini';
import { RoomFinding } from '../../lib/ai';

const SAMPLE_ROOM_IMAGE =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><rect width="800" height="500" fill="%23e2e8f0"/><rect x="100" y="80" width="220" height="320" fill="%23cbd5e1" stroke="%2394a3b8" stroke-width="4"/><line x1="210" y1="80" x2="210" y2="400" stroke="%2394a3b8" stroke-width="3"/><rect x="420" y="240" width="300" height="160" rx="16" fill="%2394a3b8"/><rect x="460" y="270" width="220" height="110" rx="10" fill="%2364748b"/><rect x="340" y="310" width="55" height="90" rx="8" fill="%230f766e"/><circle x="367" y="335" r="10" fill="%2314b8a6"/><text x="400" y="460" font-family="sans-serif" font-size="16" fill="%2364748b" text-anchor="middle">Sample Living Room: Balcony sliding door, sofa obstruction, and corner air purifier</text></svg>';

const DEFAULT_FINDINGS: RoomFinding[] = [
  {
    id: 'fix_1',
    number: 1,
    title: 'Seal the gap under the sliding balcony door',
    issue: 'Outdoor particulate smog infiltrates freely through the unsealed bottom perimeter track.',
    fix: 'Install a flexible self-adhesive silicone draft sweep along the bottom edge.',
    category: 'leak',
    impact: 'high',
    cost: 'low',
    point: { x: 0.26, y: 0.76 },
    completed: false,
  },
  {
    id: 'fix_2',
    number: 2,
    title: 'Relocate air purifier away from the sofa obstruction',
    issue: 'Purifier intake is partially blocked by furniture, creating a localized dead-zone in room circulation.',
    fix: 'Move unit at least one meter into open space with unobstructed intake.',
    category: 'airflow',
    impact: 'medium',
    cost: 'free',
    point: { x: 0.46, y: 0.70 },
    completed: false,
  },
  {
    id: 'fix_3',
    number: 3,
    title: 'Seal AC sleeve / pipe wall conduit entry',
    issue: 'Gaps around split AC conduit permit continuous particulate leakage into room.',
    fix: 'Pack perimeter gap with removable sealing putty or expanding foam strip.',
    category: 'leak',
    impact: 'medium',
    cost: 'low',
    point: { x: 0.72, y: 0.32 },
    completed: false,
  },
];

export const RoomScanPage: React.FC = () => {
  const { t } = useLanguage();
  const [stage, setStage] = useState<'upload' | 'analysing' | 'results' | 'error'>('upload');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [findings, setFindings] = useState<RoomFinding[]>([]);
  const [isSampleResult, setIsSampleResult] = useState<boolean>(false);
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const [lastUploadedBase64, setLastUploadedBase64] = useState<string | null>(null);

  // Resize client-side to max 1024px before sending
  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1024;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const resizedBase64 = canvas.toDataURL('image/jpeg', 0.85);
        setImagePreview(resizedBase64);
        setLastUploadedBase64(resizedBase64);
        setIsSampleResult(false);
        runAudit(resizedBase64);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleUseSample = () => {
    setImagePreview(SAMPLE_ROOM_IMAGE);
    setIsSampleResult(true);
    setFindings(DEFAULT_FINDINGS);
    setStage('results');
  };

  const runAudit = async (base64Img: string) => {
    setStage('analysing');

    const result = await analyseRoom(base64Img);
    if (result && result.length > 0) {
      setFindings(result);
      setStage('results');
    } else {
      setStage('error');
    }
  };

  const toggleFix = (id: string) => {
    setFindings(
      findings.map((f) => (f.id === id ? { ...f, completed: !f.completed } : f))
    );
  };

  return (
    <div className="flex flex-col gap-space-lg w-full pb-16">
      {/* Header Card */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md lg:p-space-lg shadow-sm border border-surface-container flex flex-col gap-space-sm">
        <div className="flex items-center gap-space-sm">
          <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">document_scanner</span>
          </div>
          <div className="flex flex-col">
            <h1 className="font-headline-md text-headline-sm lg:text-headline-md text-on-surface font-bold">
              {t.roomScan.title}
            </h1>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {t.roomScan.subtitle}
            </span>
          </div>
        </div>
      </div>

      {/* STAGE 1: UPLOAD STATE */}
      {stage === 'upload' && (
        <div className="bg-surface-container-lowest rounded-2xl p-space-lg lg:p-space-xl shadow-sm border border-surface-container flex flex-col items-center justify-center text-center gap-space-md min-h-[400px]">
          <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[36px]">photo_camera</span>
          </div>

          <div className="flex flex-col gap-1 max-w-md">
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              {t.roomScan.captureOrUpload}
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Upload a wide photo of your living room, balcony door, or air purifier setup to check for draft leakage points and air cleaner flow paths.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
            <label className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-bold hover:bg-primary-container transition-colors cursor-pointer shadow-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">upload</span>
              <span>{t.roomScan.uploadImage}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />
            </label>

            <button
              type="button"
              onClick={handleUseSample}
              className="px-4 py-2.5 rounded-xl border border-surface-container bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-secondary">image</span>
              <span>{t.roomScan.sampleDemoScan}</span>
            </button>
          </div>

          <span className="text-[11px] text-outline mt-3">
            Images are resized in-browser (max 1024px) and never stored in Firestore.
          </span>
        </div>
      )}

      {/* STAGE 2: ANALYSING STATE */}
      {stage === 'analysing' && (
        <div className="bg-surface-container-lowest rounded-2xl p-space-xl shadow-sm border border-surface-container flex flex-col items-center justify-center text-center gap-space-md min-h-[420px]">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
            <span className="material-symbols-outlined text-[28px] text-primary">radar</span>
          </div>

          <div className="flex flex-col gap-1">
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              Analyzing Room Layout…
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
              Inspecting door perimeters, window tracks, and air cleaner positions for draft infiltration points.
            </p>
          </div>
        </div>
      )}

      {/* ERROR STATE WITH RETRY */}
      {stage === 'error' && (
        <div className="bg-surface-container-lowest rounded-2xl p-space-xl shadow-sm border border-error/30 flex flex-col items-center justify-center text-center gap-space-md min-h-[400px]">
          <div className="w-16 h-16 rounded-2xl bg-error-container text-error flex items-center justify-center">
            <span className="material-symbols-outlined text-[36px]">error_outline</span>
          </div>

          <div className="flex flex-col gap-1 max-w-md">
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              Room Analysis Inconclusive
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Could not clearly identify sealing or airflow features in this image. Please ensure the room is well-lit and shows doors, windows, or purifier placement.
            </p>
          </div>

          <div className="flex items-center gap-3 mt-2">
            {lastUploadedBase64 && (
              <button
                type="button"
                onClick={() => runAudit(lastUploadedBase64)}
                className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-bold hover:bg-primary-container transition-colors cursor-pointer shadow-sm flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                <span>Retry Analysis</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setStage('upload')}
              className="px-4 py-2.5 rounded-xl border border-surface-container bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md font-semibold transition-colors cursor-pointer"
            >
              Upload Different Photo
            </button>
          </div>
        </div>
      )}

      {/* STAGE 3: RESULTS STATE */}
      {stage === 'results' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
          {/* Left Column (7 cols): Photo with 1:1 Numbered Hotspots */}
          <div className="lg:col-span-7 flex flex-col gap-2">
            <div className="bg-surface-container-lowest rounded-2xl p-3 shadow-sm border border-surface-container relative overflow-hidden group">
              <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center">
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Scanned Room"
                    className="w-full h-full object-cover select-none"
                  />
                )}

                {/* Hotspot Markers (1 to 1 matching the list) */}
                {findings.map((finding) => {
                  const isHighlighted = activeHighlightId === finding.id;
                  return (
                    <div
                      key={finding.id}
                      style={{
                        top: `${finding.point.y * 100}%`,
                        left: `${finding.point.x * 100}%`,
                      }}
                      onClick={() => setActiveHighlightId(finding.id)}
                      onMouseEnter={() => setActiveHighlightId(finding.id)}
                      onMouseLeave={() => setActiveHighlightId(null)}
                      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group/marker"
                    >
                      <span className="absolute -inset-2 rounded-full bg-error/30 animate-ping"></span>
                      <div
                        className={`relative flex items-center justify-center w-8 h-8 rounded-full font-bold text-label-md shadow-lg ring-4 ring-white/70 transition-transform ${
                          isHighlighted ? 'scale-125 bg-primary text-on-primary' : 'bg-error text-white'
                        }`}
                      >
                        {finding.number}
                      </div>

                      {/* Tooltip on hover */}
                      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 hidden group-hover/marker:flex flex-col bg-surface-container-lowest/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-xl whitespace-nowrap z-30 pointer-events-none border border-surface-container">
                        <span className="font-label-sm text-[10px] text-error uppercase font-bold">
                          {finding.category}
                        </span>
                        <span className="font-body-sm text-[12px] font-semibold text-on-surface">
                          {finding.title}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reset/Scan another photo */}
              <div className="flex items-center justify-between pt-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-on-surface-variant font-medium">
                    {findings.length} visual leak points identified
                  </span>
                  {isSampleResult && (
                    <span className="px-2 py-0.5 rounded-md bg-secondary/10 text-secondary text-[11px] font-bold">
                      Example result
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setStage('upload')}
                  className="font-label-sm text-label-sm text-secondary hover:underline font-bold cursor-pointer"
                >
                  Scan Another Room
                </button>
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Prioritized Fixes matching markers 1:1 */}
          <div className="lg:col-span-5 flex flex-col gap-space-sm">
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="font-headline-sm text-[17px] text-on-surface font-bold">
                Prioritized Fixes ({findings.length})
              </span>
              <span className="font-label-sm text-[11px] text-on-surface-variant uppercase font-semibold">
                Actionable Sealing
              </span>
            </div>

            {findings.map((f) => {
              const isHighlighted = activeHighlightId === f.id;
              return (
                <div
                  key={f.id}
                  onMouseEnter={() => setActiveHighlightId(f.id)}
                  onMouseLeave={() => setActiveHighlightId(null)}
                  className={`bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border transition-all flex flex-col gap-2 relative ${
                    isHighlighted
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-surface-container'
                  }`}
                >
                  {/* Top: Marker Number + Title + Checkbox */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-label-sm shrink-0">
                        {f.number}
                      </div>
                      <h3 className="font-headline-sm text-[15px] text-on-surface font-bold leading-tight">
                        {f.title}
                      </h3>
                    </div>

                    <input
                      type="checkbox"
                      checked={f.completed}
                      onChange={() => toggleFix(f.id)}
                      className="w-5 h-5 rounded text-primary accent-primary cursor-pointer shrink-0 mt-0.5"
                    />
                  </div>

                  {/* Issue & Solution */}
                  <div className="flex flex-col gap-1 text-[13px] text-on-surface-variant pl-9">
                    <p>
                      <strong className="text-on-surface">Issue:</strong> {f.issue}
                    </p>
                    <p>
                      <strong className="text-secondary">Fix:</strong> {f.fix}
                    </p>
                  </div>

                  {/* Impact & Cost Pills (No false precision µg) */}
                  <div className="flex items-center gap-2 pl-9 pt-1">
                    <span
                      className={`font-label-sm text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        f.impact === 'high'
                          ? 'bg-error-container text-on-error-container'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {f.impact} impact
                    </span>
                    <span className="font-label-sm text-[10px] px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface font-semibold capitalize">
                      {f.cost} cost
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
