import { useState, useEffect, useRef, useCallback } from "react";
import { runFIFO, runLRU, parseReferenceString, buildPageTable, ReplacementStep, PageTableEntry } from "@/lib/memorySimulator";

const PAGE_COLORS = [
  "bg-blue-500","bg-green-500","bg-purple-500","bg-orange-500",
  "bg-pink-500","bg-teal-500","bg-red-500","bg-yellow-500",
  "bg-indigo-500","bg-cyan-500","bg-rose-500","bg-lime-500",
];

function pageColor(page: number | null) {
  if (page === null) return "bg-muted";
  return PAGE_COLORS[page % PAGE_COLORS.length];
}

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span className="tooltip-wrap cursor-help">
      {children}
      <span className="tooltip-box">{text}</span>
    </span>
  );
}

function whatHappened(step: ReplacementStep, algo: "FIFO" | "LRU", prevFrames: (number | null)[]): string {
  if (step.hit) {
    return `Page ${step.reference} was already in memory — no action needed. This is a page hit (no fault). ${algo === "LRU" ? "Its recency timer has been refreshed." : ""}`;
  }
  const empty = prevFrames.indexOf(null);
  if (empty !== -1) {
    return `Page ${step.reference} was not in memory. Frame ${empty} was empty, so Page ${step.reference} was loaded into it. Page fault count increases.`;
  }
  if (step.replaced !== null) {
    if (algo === "FIFO") {
      return `Page ${step.reference} was not in memory — PAGE FAULT. FIFO evicted Page ${step.replaced} (the oldest page loaded) to make room for Page ${step.reference}.`;
    } else {
      return `Page ${step.reference} was not in memory — PAGE FAULT. LRU evicted Page ${step.replaced} (least recently used) to load Page ${step.reference}.`;
    }
  }
  return `Page ${step.reference} caused a page fault.`;
}

interface SimState {
  steps: ReplacementStep[];
  pageTable: PageTableEntry[];
}

export default function PagingPage() {
  const [refString, setRefString] = useState("7 0 1 2 0 3 0 4 2 3 0 3 2");
  const [frameCount, setFrameCount] = useState(3);
  const [algorithm, setAlgorithm] = useState<"FIFO" | "LRU">("FIFO");
  const [sim, setSim] = useState<SimState>({ steps: [], pageTable: [] });
  const [compareMode, setCompareMode] = useState(false);
  const [compareSim, setCompareSim] = useState<SimState>({ steps: [], pageTable: [] });
  const [currentStep, setCurrentStep] = useState(-1);
  const [hasRun, setHasRun] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(800);
  const [flashKey, setFlashKey] = useState(0);
  const [howOpen, setHowOpen] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const maxPages = 12;

  function runSimulation() {
    const refs = parseReferenceString(refString);
    if (refs.length === 0) return;
    const maxPage = Math.max(...refs);
    if (maxPage >= maxPages) { alert(`Page numbers must be 0–${maxPages - 1}`); return; }

    const fifoResult = runFIFO(refs, frameCount);
    const lruResult  = runLRU(refs, frameCount);

    if (algorithm === "FIFO" || compareMode) {
      setSim({ steps: fifoResult, pageTable: buildPageTable(fifoResult, maxPage + 1) });
    } else {
      setSim({ steps: lruResult, pageTable: buildPageTable(lruResult, maxPage + 1) });
    }
    if (compareMode) {
      setCompareSim({ steps: lruResult, pageTable: buildPageTable(lruResult, maxPage + 1) });
    }

    setCurrentStep(0);
    setHasRun(true);
    setIsPlaying(false);
  }

  const stepForward = useCallback(() => {
    setCurrentStep((s) => {
      const next = s + 1;
      if (next >= sim.steps.length) { setIsPlaying(false); return s; }
      setFlashKey((k) => k + 1);
      return next;
    });
  }, [sim.steps.length]);

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(stepForward, speed);
    return () => clearInterval(id);
  }, [isPlaying, speed, stepForward]);

  useEffect(() => {
    if (!tableRef.current || currentStep < 0) return;
    const rows = tableRef.current.querySelectorAll("tr[data-idx]");
    const row = rows[currentStep] as HTMLElement | undefined;
    row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentStep]);

  const step = sim.steps[currentStep];
  const prevStep = sim.steps[currentStep - 1];
  const faults = sim.steps.slice(0, currentStep + 1).filter(s => s.pageFault).length;
  const hits   = sim.steps.slice(0, currentStep + 1).filter(s => s.hit).length;
  const totalFaults = sim.steps.filter(s => s.pageFault).length;
  const totalHits   = sim.steps.filter(s => s.hit).length;
  const hitRate = sim.steps.length > 0 ? ((totalHits / sim.steps.length) * 100).toFixed(1) : "0";

  const algoLabel = compareMode ? "FIFO" : algorithm;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Paging &amp; Page Replacement</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Simulate FIFO / LRU algorithms step-by-step. Watch frames fill, faults flash, and compare algorithms side by side.
          </p>
        </div>
      </div>

      {/* How it works collapsible */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setHowOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-blue-700 dark:text-blue-300"
        >
          <span>How does paging work?</span>
          <span className="text-lg leading-none">{howOpen ? "−" : "+"}</span>
        </button>
        {howOpen && (
          <div className="px-4 pb-4 text-sm text-blue-700 dark:text-blue-300 space-y-2 border-t border-blue-200 dark:border-blue-800 pt-3">
            <p><strong>Paging</strong> splits physical memory into fixed-size blocks called <em>frames</em>, and logical memory into matching-size <em>pages</em>. When a process references a page, the OS checks whether it is currently loaded into a frame.</p>
            <ul className="list-disc ml-5 space-y-1">
              <li><strong>Page Hit</strong> — the page is already in a frame. No disk access needed. Fast!</li>
              <li><strong>Page Fault</strong> — the page is NOT in any frame. The OS must evict another page (using a replacement algorithm) and load the new one. Slow!</li>
              <li><strong>FIFO</strong> — evicts the page that was loaded <em>first</em> (oldest in queue).</li>
              <li><strong>LRU</strong> — evicts the page that was <em>least recently used</em> (oldest access time).</li>
            </ul>
            <p>Goal: minimize page faults → better performance.</p>
          </div>
        )}
      </div>

      {/* Config row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-foreground">Configuration</h3>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Reference String
              <Tooltip text="The sequence of page numbers the process will access, in order.">
                <span className="ml-1 text-muted-foreground cursor-help">ⓘ</span>
              </Tooltip>
            </label>
            <input
              type="text"
              value={refString}
              onChange={(e) => setRefString(e.target.value)}
              placeholder="e.g. 7 0 1 2 0 3 0 4"
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1">Space or comma separated page numbers (0–{maxPages - 1})</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Frames
                <Tooltip text="Number of physical memory frames available. More frames = fewer faults.">
                  <span className="ml-1 text-muted-foreground cursor-help">ⓘ</span>
                </Tooltip>
              </label>
              <input
                type="number" min={1} max={6} value={frameCount}
                onChange={(e) => setFrameCount(Math.max(1, Math.min(6, parseInt(e.target.value) || 1)))}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Algorithm</label>
              <select
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value as "FIFO" | "LRU")}
                disabled={compareMode}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              >
                <option value="FIFO">FIFO</option>
                <option value="LRU">LRU</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={compareMode} onChange={e => setCompareMode(e.target.checked)}
              className="rounded accent-primary" />
            <span className="text-sm font-medium text-foreground">Compare FIFO vs LRU side-by-side</span>
          </label>
          <button
            onClick={runSimulation}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Run Simulation
          </button>
        </div>

        {hasRun && (
          <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-foreground">Playback Controls</h3>

            {/* Running counters */}
            <div className="grid grid-cols-3 gap-2">
              <div className={`rounded-lg p-3 text-center border ${step?.pageFault ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30" : "border-border bg-muted/40"}`}>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400 tabular-nums">{faults}</div>
                <div className="text-xs text-muted-foreground font-medium">Faults so far</div>
              </div>
              <div className={`rounded-lg p-3 text-center border ${step?.hit ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/30" : "border-border bg-muted/40"}`}>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400 tabular-nums">{hits}</div>
                <div className="text-xs text-muted-foreground font-medium">Hits so far</div>
              </div>
              <div className="rounded-lg p-3 text-center border border-border bg-muted/40">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">{hitRate}%</div>
                <div className="text-xs text-muted-foreground font-medium">Total hit rate</div>
              </div>
            </div>

            {/* Step slider */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-foreground">
                  Step {currentStep + 1} / {sim.steps.length}
                </label>
                {step && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${step.hit ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>
                    {step.hit ? "HIT" : "PAGE FAULT"}
                  </span>
                )}
              </div>
              <input
                type="range" min={0} max={sim.steps.length - 1} value={currentStep}
                onChange={(e) => { setCurrentStep(parseInt(e.target.value)); setIsPlaying(false); }}
                className="w-full accent-primary"
              />
            </div>

            {/* Play controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
                className="px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-muted transition-colors"
              >◀</button>
              <button
                onClick={() => setIsPlaying(p => !p)}
                className="flex-1 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                {isPlaying ? "⏸ Pause" : "▶ Play"}
              </button>
              <button
                onClick={() => setCurrentStep(s => Math.min(sim.steps.length - 1, s + 1))}
                className="px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-muted transition-colors"
              >▶</button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Speed:</span>
              <input
                type="range" min={200} max={2000} step={100} value={speed}
                onChange={e => setSpeed(parseInt(e.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="text-xs text-muted-foreground w-12 text-right">{speed}ms</span>
            </div>
          </div>
        )}
      </div>

      {/* "What just happened" explanation box */}
      {hasRun && step && (
        <div key={`explain-${currentStep}-${flashKey}`} className={`rounded-xl border p-4 text-sm transition-all animate-slide-in ${
          step.pageFault
            ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
            : "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200"
        }`}>
          <div className="font-semibold mb-1 flex items-center gap-2">
            <span>{step.pageFault ? "❌" : "✅"} What just happened?</span>
            <span className="font-mono text-xs opacity-70">Step {currentStep + 1}: access Page {step.reference}</span>
          </div>
          <p>{whatHappened(step, algoLabel as "FIFO" | "LRU", prevStep?.frames ?? Array(frameCount).fill(null))}</p>
        </div>
      )}

      {/* Frame visualisation (current state) */}
      {hasRun && step && (
        <div className="bg-card border border-card-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-3">
            Current Frame State — after accessing Page <span className="font-mono text-primary">{step.reference}</span>
          </h3>
          <div className="flex gap-3 flex-wrap">
            {step.frames.map((page, fi) => {
              const prev = prevStep?.frames[fi] ?? null;
              const changed = page !== prev;
              return (
                <div key={fi} className="flex flex-col items-center gap-1">
                  <div className="text-xs text-muted-foreground font-medium">
                    <Tooltip text={`Frame ${fi}: one slot of physical RAM`}>Frame {fi}</Tooltip>
                  </div>
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-white text-lg font-bold border-2 transition-all ${
                    page !== null ? pageColor(page) : "bg-muted text-muted-foreground border-border"
                  } ${changed && page !== null ? "animate-pop-in border-white/50 shadow-lg" : "border-transparent"}`}>
                    {page !== null ? page : "–"}
                  </div>
                  {algorithm === "LRU" && !compareMode && page !== null && (
                    <div className="text-xs text-muted-foreground">
                      last: step {sim.steps.slice(0, currentStep + 1).map((s, i) => s.reference === page ? i : -1).filter(i => i >= 0).pop()! + 1}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Compare mode: two tables side by side */}
      {hasRun && compareMode ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {([
            { label: "FIFO", data: sim },
            { label: "LRU",  data: compareSim },
          ] as { label: string; data: SimState }[]).map(({ label, data }) => {
            const tf = data.steps.filter(s => s.pageFault).length;
            const th = data.steps.filter(s => s.hit).length;
            return (
              <div key={label} className="bg-card border border-card-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground">{label}</h3>
                  <div className="flex gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 font-semibold">{tf} faults</span>
                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 font-semibold">{th} hits</span>
                  </div>
                </div>
                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0">
                      <tr>
                        <th className="py-1.5 px-2 bg-muted text-muted-foreground font-medium text-left">Ref</th>
                        {Array.from({ length: frameCount }, (_, i) => (
                          <th key={i} className="py-1.5 px-2 bg-muted text-muted-foreground font-medium text-center">F{i}</th>
                        ))}
                        <th className="py-1.5 px-2 bg-muted text-muted-foreground font-medium text-center">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.steps.map((s, idx) => (
                        <tr key={idx} className={`border-t border-border ${idx === currentStep ? "bg-accent/30" : ""} ${s.pageFault ? "animate-flash-fault" : "animate-flash-hit"}`}
                          onClick={() => setCurrentStep(idx)} style={{ cursor: "pointer" }}>
                          <td className="py-1.5 px-2">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold ${pageColor(s.reference)}`}>{s.reference}</span>
                          </td>
                          {s.frames.map((p, fi) => (
                            <td key={fi} className="py-1.5 px-2 text-center">
                              {p !== null
                                ? <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-white text-xs font-bold ${pageColor(p)}`}>{p}</span>
                                : <span className="text-muted-foreground">—</span>}
                            </td>
                          ))}
                          <td className="py-1.5 px-2 text-center">
                            {s.pageFault
                              ? <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">FAULT</span>
                              : <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">HIT</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      ) : hasRun && (
        <div className="bg-card border border-card-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Step-by-Step Frame Table</h3>
            <span className="text-xs text-muted-foreground">Click any row to jump to that step</span>
          </div>
          <div className="overflow-x-auto" ref={tableRef}>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-2 px-3 bg-muted rounded-tl-lg text-muted-foreground font-medium">Ref</th>
                  {Array.from({ length: frameCount }, (_, i) => (
                    <th key={i} className="py-2 px-3 bg-muted text-muted-foreground font-medium text-center">
                      <Tooltip text={`Physical frame slot ${i}`}>Frame {i}</Tooltip>
                    </th>
                  ))}
                  <th className="text-center py-2 px-3 bg-muted rounded-tr-lg text-muted-foreground font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {sim.steps.map((s, idx) => {
                  const isCurrent = idx === currentStep;
                  return (
                    <tr
                      key={idx}
                      data-idx={idx}
                      onClick={() => { setCurrentStep(idx); setIsPlaying(false); }}
                      className={`border-t border-border cursor-pointer transition-all ${
                        isCurrent
                          ? s.pageFault ? "animate-flash-fault" : "animate-flash-hit"
                          : "hover:bg-muted/40"
                      } ${isCurrent ? "ring-1 ring-inset ring-primary/40" : ""}`}
                    >
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-bold ${pageColor(s.reference)}`}>
                          {s.reference}
                        </span>
                      </td>
                      {s.frames.map((page, fi) => {
                        const prev = sim.steps[idx - 1]?.frames[fi] ?? null;
                        const changed = page !== prev && idx === currentStep;
                        return (
                          <td key={fi} className="py-2 px-3 text-center">
                            {page !== null ? (
                              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-white text-xs font-bold ${pageColor(page)} ${changed ? "animate-pop-in" : ""}`}>
                                {page}
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2 px-3 text-center">
                        {s.pageFault
                          ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400">FAULT</span>
                          : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400">HIT</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Final summary */}
      {hasRun && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Faults", value: totalFaults, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800" },
            { label: "Total Hits",   value: totalHits,   color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" },
            { label: "Hit Rate",     value: `${hitRate}%`, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800" },
            { label: "References",   value: sim.steps.length, color: "text-foreground", bg: "bg-muted/50 border-border" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`rounded-xl border p-3 text-center ${bg}`}>
              <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
