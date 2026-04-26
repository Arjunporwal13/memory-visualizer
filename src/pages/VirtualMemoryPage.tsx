import { useState } from "react";
import { translateAddress, buildPageTable, runFIFO, parseReferenceString } from "@/lib/memorySimulator";

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span className="tooltip-wrap cursor-help">
      {children}
      <span className="tooltip-box">{text}</span>
    </span>
  );
}

export default function VirtualMemoryPage() {
  const [pageSize, setPageSize] = useState(256);
  const [physicalFrames, setPhysicalFrames] = useState(4);
  const [refString, setRefString] = useState("0 1 2 3 0 1 4 0 1 2 3 4");
  const [virtualAddr, setVirtualAddr] = useState(300);
  const [howOpen, setHowOpen] = useState(false);
  const [result, setResult] = useState<{
    pageNumber: number; offset: number; frameNumber: number | null;
    physicalAddress: number | null; pageFault: boolean;
  } | null>(null);

  const refs = parseReferenceString(refString);
  const steps = refs.length > 0 ? runFIFO(refs, physicalFrames) : [];
  const maxPage = refs.length > 0 ? Math.max(...refs) : 0;
  const pageTable = steps.length > 0 ? buildPageTable(steps, maxPage + 1) : [];

  function translate() {
    const r = translateAddress(virtualAddr, pageSize, pageTable);
    setResult(r);
  }

  const pageNum = Math.floor(virtualAddr / pageSize);
  const pageOffset = virtualAddr % pageSize;
  const totalPhysicalMemory = physicalFrames * pageSize;
  const pagesInMem = pageTable.filter(p => p.valid).length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Virtual Memory</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Simulate how the MMU translates virtual addresses to physical addresses through the page table.
        </p>
      </div>

      {/* How it works */}
      <div className="bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 rounded-xl overflow-hidden">
        <button onClick={() => setHowOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-teal-700 dark:text-teal-300">
          <span>How does virtual memory work?</span>
          <span className="text-lg leading-none">{howOpen ? "−" : "+"}</span>
        </button>
        {howOpen && (
          <div className="px-4 pb-4 text-sm text-teal-700 dark:text-teal-300 space-y-2 border-t border-teal-200 dark:border-teal-800 pt-3">
            <p><strong>Virtual Memory</strong> lets each process think it has its own large, contiguous address space — even though physical RAM is limited and shared.</p>
            <ul className="list-disc ml-5 space-y-1">
              <li><strong>Virtual Address</strong> — what the CPU (program) generates. Split into: <em>Page Number</em> + <em>Offset</em>.</li>
              <li><strong>Page Table</strong> — maps virtual page numbers → physical frame numbers. Maintained by the OS.</li>
              <li><strong>MMU</strong> (Memory Management Unit) — hardware that does the translation automatically on every memory access.</li>
              <li><strong>Page Fault</strong> — if the page table says a page is not in RAM, the OS loads it from disk (swap space).</li>
              <li><strong>Physical Address</strong> = Frame Number × Page Size + Offset</li>
            </ul>
            <p>Formula: <code className="bg-teal-100 dark:bg-teal-900/40 px-1 rounded">VA → [Page #, Offset] → lookup page table → [Frame #, Offset] → Physical Address</code></p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Config */}
        <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-foreground">Memory Layout</h3>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Page Size
              <Tooltip text="Size of each page/frame in bytes. Larger pages = fewer page table entries but more internal fragmentation.">
                <span className="ml-1 text-muted-foreground">ⓘ</span>
              </Tooltip>
            </label>
            <select value={pageSize} onChange={e => { setPageSize(parseInt(e.target.value)); setResult(null); }}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value={64}>64 B</option>
              <option value={128}>128 B</option>
              <option value={256}>256 B</option>
              <option value={512}>512 B</option>
              <option value={1024}>1024 B</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Physical Frames
              <Tooltip text="Number of physical RAM frames. Fewer frames = more page faults.">
                <span className="ml-1 text-muted-foreground">ⓘ</span>
              </Tooltip>
            </label>
            <input type="number" min={2} max={8} value={physicalFrames}
              onChange={e => { setPhysicalFrames(Math.max(2, Math.min(8, parseInt(e.target.value) || 4))); setResult(null); }}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Reference String</label>
            <input type="text" value={refString} onChange={e => { setRefString(e.target.value); setResult(null); }}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
            <p className="text-xs text-muted-foreground mt-1">Pages to preload using FIFO</p>
          </div>
          <div className="text-xs text-muted-foreground space-y-1 border-t border-border pt-3">
            <div>Virtual pages: <strong className="text-foreground">{maxPage + 1}</strong></div>
            <div>Physical RAM: <strong className="text-foreground">{totalPhysicalMemory} bytes</strong></div>
            <div>Pages loaded: <strong className="text-foreground">{pagesInMem} / {physicalFrames}</strong></div>
          </div>
        </div>

        {/* Translation */}
        <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-foreground">
            <Tooltip text="The MMU (Memory Management Unit) translates this virtual address to a physical one.">
              Address Translation ⓘ
            </Tooltip>
          </h3>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Virtual Address</label>
            <input type="number" min={0} value={virtualAddr}
              onChange={e => { setVirtualAddr(parseInt(e.target.value) || 0); setResult(null); }}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          {/* Live breakdown */}
          <div className="flex gap-2 text-xs">
            <div className="flex-1 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-2 text-center">
              <div className="text-blue-500 font-medium mb-0.5">Page #</div>
              <div className="font-mono font-bold text-blue-800 dark:text-blue-200 text-base">{pageNum}</div>
            </div>
            <div className="flex-1 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-2 text-center">
              <div className="text-orange-500 font-medium mb-0.5">Offset</div>
              <div className="font-mono font-bold text-orange-800 dark:text-orange-200 text-base">{pageOffset}</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            VA {virtualAddr} ÷ {pageSize} = Page {pageNum}, remainder {pageOffset}
          </p>

          <button onClick={translate}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity">
            Translate via MMU
          </button>

          {result && (
            <div className={`rounded-xl p-3 text-sm border animate-slide-in ${
              result.pageFault
                ? "bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-700"
                : "bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-700"
            }`}>
              {result.pageFault ? (
                <div className="space-y-1">
                  <div className="font-bold text-red-700 dark:text-red-300 flex items-center gap-1">❌ Page Fault!</div>
                  <p className="text-xs text-red-600 dark:text-red-400">Page {result.pageNumber} is not in physical memory. The OS must fetch it from disk (swap).</p>
                </div>
              ) : (
                <div className="space-y-1 font-mono text-xs text-green-800 dark:text-green-200">
                  <div className="font-bold text-sm font-sans">✅ Translation OK</div>
                  <div>Frame: <strong>F{result.frameNumber}</strong></div>
                  <div>Physical = {result.frameNumber} × {pageSize} + {result.offset} = <strong>{result.physicalAddress}</strong></div>
                  <div>Hex: <strong>0x{result.physicalAddress!.toString(16).toUpperCase().padStart(4,"0")}</strong></div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Page table */}
        <div className="bg-card border border-card-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-3">
            <Tooltip text="Maps virtual page numbers to physical frame numbers. Valid bit = 1 means page is in RAM.">
              Page Table ⓘ
            </Tooltip>
          </h3>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {pageTable.length === 0 ? (
              <p className="text-sm text-muted-foreground">Enter a reference string to build the page table.</p>
            ) : pageTable.map(entry => {
              const isTarget = result && result.pageNumber === entry.pageNumber;
              return (
                <div key={entry.pageNumber}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-mono transition-all ${
                    isTarget ? "ring-2 ring-primary bg-primary/10" :
                    entry.valid ? "bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800"
                              : "bg-muted/50 border border-border"
                  }`}>
                  <span className="font-semibold text-foreground">P{entry.pageNumber}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className={entry.valid ? "text-green-700 dark:text-green-400" : "text-muted-foreground"}>
                    {entry.valid ? `F${entry.frameNumber}` : "—"}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded ${entry.valid ? "bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-300" : "bg-muted text-muted-foreground"}`}>
                    {entry.valid ? "V=1" : "V=0"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Full translation flow diagram */}
      {result && (
        <div className="bg-card border border-card-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4">MMU Translation Flow</h3>
          <div className="flex flex-wrap items-center gap-3 overflow-x-auto pb-2">

            {/* Virtual Address */}
            <div className="flex flex-col items-center min-w-fit">
              <div className="text-xs text-muted-foreground mb-1 font-medium">Virtual Address</div>
              <div className="flex border-2 border-blue-400 rounded-xl overflow-hidden">
                <div className="px-3 py-2 bg-blue-100 dark:bg-blue-950/50 text-center">
                  <div className="text-xs text-blue-500 font-medium">Page #</div>
                  <div className="font-mono font-bold text-blue-800 dark:text-blue-200 text-lg">{result.pageNumber}</div>
                </div>
                <div className="px-3 py-2 bg-orange-100 dark:bg-orange-950/50 text-center border-l-2 border-orange-300">
                  <div className="text-xs text-orange-500 font-medium">Offset</div>
                  <div className="font-mono font-bold text-orange-800 dark:text-orange-200 text-lg">{result.offset}</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center text-muted-foreground">
              <div className="text-xs mb-1 text-transparent">·</div>
              <div className="text-2xl">→</div>
              <div className="text-xs text-muted-foreground">lookup</div>
            </div>

            {/* Page Table */}
            <div className="flex flex-col items-center min-w-fit">
              <div className="text-xs text-muted-foreground mb-1 font-medium">Page Table</div>
              <div className="border-2 border-purple-400 rounded-xl px-4 py-2 bg-purple-50 dark:bg-purple-950/30 text-center">
                <div className="text-xs text-purple-500 font-medium">P{result.pageNumber}</div>
                <div className="font-mono font-bold text-purple-800 dark:text-purple-200 text-lg">
                  {result.frameNumber !== null ? `F${result.frameNumber}` : "FAULT"}
                </div>
                <div className="text-xs text-purple-500">{result.pageFault ? "Valid=0" : "Valid=1"}</div>
              </div>
            </div>

            {!result.pageFault && (
              <>
                <div className="flex flex-col items-center text-muted-foreground">
                  <div className="text-xs mb-1 text-transparent">·</div>
                  <div className="text-2xl">→</div>
                  <div className="text-xs text-muted-foreground">combine</div>
                </div>

                {/* Physical Address */}
                <div className="flex flex-col items-center min-w-fit">
                  <div className="text-xs text-muted-foreground mb-1 font-medium">Physical Address</div>
                  <div className="flex border-2 border-green-400 rounded-xl overflow-hidden">
                    <div className="px-3 py-2 bg-green-100 dark:bg-green-950/50 text-center">
                      <div className="text-xs text-green-500 font-medium">Frame #</div>
                      <div className="font-mono font-bold text-green-800 dark:text-green-200 text-lg">{result.frameNumber}</div>
                    </div>
                    <div className="px-3 py-2 bg-orange-100 dark:bg-orange-950/50 text-center border-l-2 border-orange-300">
                      <div className="text-xs text-orange-500 font-medium">Offset</div>
                      <div className="font-mono font-bold text-orange-800 dark:text-orange-200 text-lg">{result.offset}</div>
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-green-600 dark:text-green-400 font-mono font-semibold">
                    = {result.physicalAddress}
                  </div>
                </div>
              </>
            )}

            {result.pageFault && (
              <>
                <div className="flex flex-col items-center text-muted-foreground">
                  <div className="text-xs mb-1 text-transparent">·</div>
                  <div className="text-2xl">→</div>
                </div>
                <div className="flex flex-col items-center min-w-fit">
                  <div className="text-xs text-muted-foreground mb-1 font-medium">Trap to OS</div>
                  <div className="border-2 border-red-400 rounded-xl px-4 py-2 bg-red-50 dark:bg-red-950/30 text-center">
                    <div className="text-2xl">💾</div>
                    <div className="text-xs text-red-600 dark:text-red-400 font-semibold">Load from disk</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Virtual address space */}
        <div className="bg-card border border-card-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-3">Virtual Address Space</h3>
          <div className="space-y-1">
            {pageTable.map(entry => {
              const isTarget = result && result.pageNumber === entry.pageNumber;
              return (
                <div key={entry.pageNumber}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-all ${
                    isTarget ? "bg-primary/10 border border-primary ring-1 ring-primary" : "border border-transparent hover:bg-muted/30"
                  }`}>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${entry.valid ? "bg-green-500" : "bg-red-400"}`} />
                  <span className="font-mono text-foreground w-14">Page {entry.pageNumber}</span>
                  <span className="text-muted-foreground w-28 tabular-nums">
                    {entry.pageNumber * pageSize}–{entry.pageNumber * pageSize + pageSize - 1}
                  </span>
                  <span className="font-mono text-xs flex-1">
                    {entry.valid
                      ? <span className="text-green-600 dark:text-green-400">→ Frame {entry.frameNumber}</span>
                      : <span className="text-red-500">not in RAM</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Physical frames */}
        <div className="bg-card border border-card-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-3">Physical Memory Frames</h3>
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: physicalFrames }, (_, frameNum) => {
              const page = pageTable.find(p => p.frameNumber === frameNum && p.valid);
              const isTarget = result && result.frameNumber === frameNum;
              return (
                <div key={frameNum}
                  className={`rounded-xl border p-3 text-center transition-all ${
                    isTarget ? "border-primary bg-primary/10 ring-2 ring-primary scale-105 shadow-md"
                    : page ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/20"
                    : "border-border bg-muted/30"
                  }`}>
                  <div className="text-xs text-muted-foreground mb-1 font-medium">
                    <Tooltip text={`Physical frame ${frameNum}. Holds one page of virtual memory.`}>Frame {frameNum} ⓘ</Tooltip>
                  </div>
                  <div className="font-mono text-sm font-bold text-foreground">
                    {page ? `Page ${page.pageNumber}` : <span className="text-muted-foreground text-xs italic">Empty</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                    {frameNum * pageSize}–{frameNum * pageSize + pageSize - 1}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
