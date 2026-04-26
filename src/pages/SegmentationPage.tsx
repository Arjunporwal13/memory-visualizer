import { useState } from "react";
import { buildSegmentTable, SegmentTableEntry } from "@/lib/memorySimulator";

const SEGMENT_COLORS: Record<SegmentTableEntry["type"], string> = {
  code:  "bg-blue-500",
  data:  "bg-green-500",
  stack: "bg-purple-500",
  heap:  "bg-orange-500",
};
const SEGMENT_BORDER: Record<SegmentTableEntry["type"], string> = {
  code:  "border-blue-400",
  data:  "border-green-400",
  stack: "border-purple-400",
  heap:  "border-orange-400",
};
const SEGMENT_LIGHT: Record<SegmentTableEntry["type"], string> = {
  code:  "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  data:  "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300",
  stack: "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300",
  heap:  "bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300",
};

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span className="tooltip-wrap cursor-help">
      {children}
      <span className="tooltip-box">{text}</span>
    </span>
  );
}

interface LogicalTranslation {
  segment: number;
  offset: number;
  physicalAddress: number | null;
  base: number | null;
  limit: number | null;
  error: string | null;
  segName: string;
}

export default function SegmentationPage() {
  const [memorySize, setMemorySize] = useState(1024);
  const [segmentCount, setSegmentCount] = useState(4);
  const [segments, setSegments] = useState<SegmentTableEntry[]>(() => buildSegmentTable(1024, 4));
  const [segNum, setSegNum] = useState(0);
  const [offset, setOffset] = useState(100);
  const [translation, setTranslation] = useState<LogicalTranslation | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [howOpen, setHowOpen] = useState(false);

  function regenerate() {
    setSegments(buildSegmentTable(memorySize, segmentCount));
    setTranslation(null);
  }

  function translate() {
    const seg = segments.find(s => s.segmentNumber === segNum);
    if (!seg) {
      setTranslation({ segment: segNum, offset, physicalAddress: null, base: null, limit: null, error: "Segment not found.", segName: "" });
      return;
    }
    if (offset > seg.limit) {
      setShakeKey(k => k + 1);
      setTranslation({ segment: segNum, offset, physicalAddress: null, base: seg.base, limit: seg.limit, error: `Offset ${offset} exceeds segment limit of ${seg.limit}. Segmentation fault!`, segName: seg.name });
      return;
    }
    setTranslation({ segment: segNum, offset, physicalAddress: seg.base + offset, base: seg.base, limit: seg.limit, error: null, segName: seg.name });
  }

  function updateSegment(idx: number, field: keyof SegmentTableEntry, value: string | number) {
    setSegments(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
    setTranslation(null);
  }

  const totalUsed = segments.reduce((acc, s) => acc + s.limit + 1, 0);
  const utilization = ((totalUsed / memorySize) * 100).toFixed(1);
  const selectedSeg = segments.find(s => s.segmentNumber === segNum);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Memory Segmentation</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Divide memory into variable-length segments. Translate logical (segment, offset) addresses to physical addresses with base/limit registers.
        </p>
      </div>

      {/* How it works */}
      <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setHowOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-purple-700 dark:text-purple-300"
        >
          <span>How does segmentation work?</span>
          <span className="text-lg leading-none">{howOpen ? "−" : "+"}</span>
        </button>
        {howOpen && (
          <div className="px-4 pb-4 text-sm text-purple-700 dark:text-purple-300 space-y-2 border-t border-purple-200 dark:border-purple-800 pt-3">
            <p><strong>Segmentation</strong> divides a program's memory into logical units called <em>segments</em> (code, data, heap, stack). Each segment has a variable size.</p>
            <ul className="list-disc ml-5 space-y-1">
              <li><strong>Base register</strong> — the physical start address of this segment in RAM.</li>
              <li><strong>Limit register</strong> — the maximum allowed offset within the segment. Prevents overflow.</li>
              <li><strong>Logical address</strong> = (Segment number, Offset). The CPU sends this to the segment table.</li>
              <li><strong>Physical address</strong> = Base + Offset — if Offset ≤ Limit. Otherwise: <em>Segmentation Fault!</em></li>
            </ul>
            <p>Unlike paging, segments have <em>meaningful names</em> (code, stack) and <em>variable size</em>.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Config */}
        <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-foreground">Memory Configuration</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Memory Size (bytes)
                <Tooltip text="Total size of physical memory to simulate.">
                  <span className="ml-1 text-muted-foreground">ⓘ</span>
                </Tooltip>
              </label>
              <input type="number" min={256} max={8192} step={256} value={memorySize}
                onChange={e => setMemorySize(parseInt(e.target.value) || 1024)}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Segments</label>
              <input type="number" min={1} max={8} value={segmentCount}
                onChange={e => setSegmentCount(Math.max(1, Math.min(8, parseInt(e.target.value) || 4)))}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <button onClick={regenerate}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity">
            Generate Segment Table
          </button>
        </div>

        {/* Address translation */}
        <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-foreground">Address Translation</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Segment #
                <Tooltip text="Which segment to access (0 to N-1).">
                  <span className="ml-1 text-muted-foreground">ⓘ</span>
                </Tooltip>
              </label>
              <input type="number" min={0} max={segments.length - 1} value={segNum}
                onChange={e => setSegNum(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Offset
                <Tooltip text="Byte offset within the segment. Must be ≤ segment limit.">
                  <span className="ml-1 text-muted-foreground">ⓘ</span>
                </Tooltip>
              </label>
              <input type="number" min={0} value={offset}
                onChange={e => setOffset(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          {selectedSeg && (
            <p className="text-xs text-muted-foreground">
              Segment {segNum} ({selectedSeg.name}) — Base: <strong>{selectedSeg.base}</strong>, Limit: <strong>{selectedSeg.limit}</strong>
            </p>
          )}
          <button onClick={translate}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity">
            Translate Address
          </button>

          {/* Result with animation */}
          {translation && (
            <div key={shakeKey} className={`rounded-xl p-4 text-sm border transition-all ${
              translation.error
                ? "bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-700 animate-shake"
                : "bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-700 animate-slide-in"
            }`}>
              {translation.error ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-bold text-red-700 dark:text-red-300">
                    <span className="text-xl">🚨</span> Segmentation Fault!
                  </div>
                  <p className="text-red-600 dark:text-red-400">{translation.error}</p>
                  <p className="text-xs text-red-500 dark:text-red-400/70">The OS would terminate the process with SIGSEGV.</p>
                </div>
              ) : (
                <div className="space-y-2 text-green-800 dark:text-green-200">
                  <div className="font-bold flex items-center gap-2"><span>✅</span> Translation Successful</div>
                  <div className="font-mono text-xs space-y-1 bg-green-100/60 dark:bg-green-900/30 rounded-lg p-2">
                    <div>Logical:  <strong>({translation.segment}, {translation.offset})</strong></div>
                    <div>Base[{translation.segment}] = <strong>{translation.base}</strong></div>
                    <div>Physical = Base + Offset = <strong>{translation.base} + {translation.offset} = {translation.physicalAddress}</strong></div>
                    <div>Hex: <strong>0x{translation.physicalAddress!.toString(16).toUpperCase().padStart(4, "0")}</strong></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Address flow diagram */}
      {translation && (
        <div className="bg-card border border-card-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4">Address Translation Flow</h3>
          <div className="flex flex-wrap items-center gap-2 text-sm overflow-x-auto pb-2">
            {/* Logical address */}
            <div className="flex flex-col items-center">
              <div className="text-xs text-muted-foreground mb-1">Logical Address</div>
              <div className="flex gap-1">
                <div className="px-3 py-2 bg-blue-100 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-700 rounded-lg text-center">
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Seg #</div>
                  <div className="font-mono font-bold text-blue-800 dark:text-blue-200">{translation.segment}</div>
                </div>
                <div className="px-3 py-2 bg-orange-100 dark:bg-orange-950/40 border border-orange-300 dark:border-orange-700 rounded-lg text-center">
                  <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">Offset</div>
                  <div className="font-mono font-bold text-orange-800 dark:text-orange-200">{translation.offset}</div>
                </div>
              </div>
            </div>

            <div className="text-2xl text-muted-foreground font-light">→</div>

            {/* Segment table lookup */}
            <div className="flex flex-col items-center">
              <div className="text-xs text-muted-foreground mb-1">Segment Table Lookup</div>
              <div className="px-3 py-2 bg-purple-100 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-700 rounded-lg text-center">
                <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">Base Register</div>
                <div className="font-mono font-bold text-purple-800 dark:text-purple-200">{translation.base}</div>
                <div className="text-xs text-purple-500 dark:text-purple-400 mt-0.5">Limit: {translation.limit}</div>
              </div>
            </div>

            <div className="text-2xl text-muted-foreground font-light">+</div>

            {/* Offset */}
            <div className="flex flex-col items-center">
              <div className="text-xs text-muted-foreground mb-1">Offset</div>
              <div className="px-3 py-2 bg-orange-100 dark:bg-orange-950/40 border border-orange-300 dark:border-orange-700 rounded-lg text-center">
                <div className="font-mono font-bold text-orange-800 dark:text-orange-200">{translation.offset}</div>
              </div>
            </div>

            <div className="text-2xl text-muted-foreground font-light">=</div>

            {/* Physical address */}
            <div className="flex flex-col items-center">
              <div className="text-xs text-muted-foreground mb-1">Physical Address</div>
              {translation.error ? (
                <div className="px-4 py-2 bg-red-100 dark:bg-red-950/40 border-2 border-red-400 rounded-lg text-center">
                  <div className="font-mono font-bold text-red-700 dark:text-red-300">FAULT!</div>
                  <div className="text-xs text-red-500">offset &gt; limit</div>
                </div>
              ) : (
                <div className="px-4 py-2 bg-green-100 dark:bg-green-950/40 border-2 border-green-400 rounded-lg text-center">
                  <div className="font-mono font-bold text-green-800 dark:text-green-200 text-lg">{translation.physicalAddress}</div>
                  <div className="text-xs text-green-600 dark:text-green-400">0x{translation.physicalAddress!.toString(16).toUpperCase().padStart(4,"0")}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Segment table editor */}
        <div className="bg-card border border-card-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4">Segment Table (editable)</h3>
          <div className="space-y-2">
            {segments.map((seg, idx) => (
              <div key={seg.segmentNumber}
                className={`border-2 rounded-xl p-3 space-y-2 transition-all ${
                  translation && translation.segment === seg.segmentNumber ? SEGMENT_BORDER[seg.type] : "border-border"
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${SEGMENT_COLORS[seg.type]}`} />
                    <span className="font-mono text-sm font-bold text-foreground">S{seg.segmentNumber}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEGMENT_LIGHT[seg.type]}`}>{seg.type}</span>
                  </div>
                  <input type="text" value={seg.name} onChange={e => updateSegment(idx, "name", e.target.value)}
                    className="text-sm font-medium bg-transparent border-b border-border focus:outline-none focus:border-primary text-right w-24" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <Tooltip text="Physical start address of this segment">
                      <span className="text-muted-foreground cursor-help">Base ⓘ</span>
                    </Tooltip>
                    <input type="number" min={0} value={seg.base} onChange={e => updateSegment(idx, "base", parseInt(e.target.value) || 0)}
                      className="ml-1 w-20 px-1.5 py-0.5 bg-background border border-input rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Tooltip text="Max offset allowed. Access beyond this causes a segfault.">
                      <span className="text-muted-foreground cursor-help">Limit ⓘ</span>
                    </Tooltip>
                    <input type="number" min={1} value={seg.limit} onChange={e => updateSegment(idx, "limit", parseInt(e.target.value) || 1)}
                      className="ml-1 w-20 px-1.5 py-0.5 bg-background border border-input rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Memory map */}
        <div className="bg-card border border-card-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-1">Physical Memory Map</h3>
          <p className="text-xs text-muted-foreground mb-3">Usage: {totalUsed} / {memorySize} bytes ({utilization}%)</p>
          <div className="w-full bg-muted rounded-xl overflow-hidden relative" style={{ height: 300 }}>
            {segments.map(seg => {
              const topPct   = ((seg.base / memorySize) * 100).toFixed(2);
              const heightPct = (((seg.limit + 1) / memorySize) * 100).toFixed(2);
              const isActive = translation && translation.segment === seg.segmentNumber;
              return (
                <div key={seg.segmentNumber}
                  className={`absolute left-0 right-0 ${SEGMENT_COLORS[seg.type]} flex items-center justify-center text-white text-xs font-semibold border-b border-white/20 transition-all ${isActive ? "brightness-110 ring-2 ring-white/50 ring-inset" : "opacity-85"}`}
                  style={{ top: `${topPct}%`, height: `${heightPct}%`, minHeight: 18 }}>
                  <span className="truncate px-2">{seg.name} (Base:{seg.base})</span>
                </div>
              );
            })}
            {totalUsed < memorySize && (
              <div className="absolute left-0 right-0 bg-muted/80 flex items-center justify-center text-muted-foreground text-xs"
                style={{ top: `${((totalUsed / memorySize) * 100).toFixed(2)}%`, height: `${(((memorySize - totalUsed) / memorySize) * 100).toFixed(2)}%` }}>
                Free Space
              </div>
            )}
          </div>
          {/* If translation succeeded, show where the physical address lands */}
          {translation && !translation.error && (
            <div className="mt-2 text-xs text-green-700 dark:text-green-400 font-mono">
              Physical address <strong>{translation.physicalAddress}</strong> lands in segment "{translation.segName}" (S{translation.segment})
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {(["code","data","heap","stack"] as const).map(type => (
              <div key={type} className="flex items-center gap-1 text-xs">
                <div className={`w-3 h-3 rounded-sm ${SEGMENT_COLORS[type]}`} />
                <span className="text-muted-foreground capitalize">{type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
