export interface PageFrame {
  frameNumber: number;
  pageNumber: number | null;
  lastUsed: number;
  loadedAt: number;
}

export interface PageTableEntry {
  pageNumber: number;
  frameNumber: number | null;
  valid: boolean;
  dirty: boolean;
  referenced: boolean;
}

export interface ReplacementStep {
  reference: number;
  frames: (number | null)[];
  pageFault: boolean;
  replaced: number | null;
  hit: boolean;
}

export interface SegmentTableEntry {
  segmentNumber: number;
  base: number;
  limit: number;
  name: string;
  type: "code" | "data" | "stack" | "heap";
}

export interface AddressTranslation {
  virtualAddress: number;
  pageNumber: number;
  offset: number;
  frameNumber: number | null;
  physicalAddress: number | null;
  pageFault: boolean;
}

export function runFIFO(referenceString: number[], frameCount: number): ReplacementStep[] {
  const frames: (number | null)[] = Array(frameCount).fill(null);
  const steps: ReplacementStep[] = [];
  let pointer = 0;
  let time = 0;

  for (const page of referenceString) {
    const hit = frames.includes(page);
    let replaced: number | null = null;
    let pageFault = false;

    if (!hit) {
      pageFault = true;
      replaced = frames[pointer];
      frames[pointer] = page;
      pointer = (pointer + 1) % frameCount;
    }

    steps.push({
      reference: page,
      frames: [...frames],
      pageFault,
      replaced,
      hit,
    });
    time++;
  }

  return steps;
}

export function runLRU(referenceString: number[], frameCount: number): ReplacementStep[] {
  const frames: (number | null)[] = Array(frameCount).fill(null);
  const lastUsed: Map<number, number> = new Map();
  const steps: ReplacementStep[] = [];
  let time = 0;

  for (const page of referenceString) {
    const hit = frames.includes(page);
    let replaced: number | null = null;
    let pageFault = false;

    if (hit) {
      lastUsed.set(page, time);
    } else {
      pageFault = true;
      const emptySlot = frames.indexOf(null);
      if (emptySlot !== -1) {
        frames[emptySlot] = page;
      } else {
        let lruPage = -1;
        let lruTime = Infinity;
        for (const f of frames) {
          if (f !== null) {
            const t = lastUsed.get(f) ?? -1;
            if (t < lruTime) {
              lruTime = t;
              lruPage = f;
            }
          }
        }
        replaced = lruPage;
        const idx = frames.indexOf(lruPage);
        frames[idx] = page;
        lastUsed.delete(lruPage);
      }
      lastUsed.set(page, time);
    }

    steps.push({
      reference: page,
      frames: [...frames],
      pageFault,
      replaced,
      hit,
    });
    time++;
  }

  return steps;
}

export function buildPageTable(steps: ReplacementStep[], totalPages: number): PageTableEntry[] {
  const lastStep = steps[steps.length - 1];
  if (!lastStep) return [];
  const entries: PageTableEntry[] = [];
  for (let i = 0; i < totalPages; i++) {
    const frameIdx = lastStep.frames.indexOf(i);
    entries.push({
      pageNumber: i,
      frameNumber: frameIdx !== -1 ? frameIdx : null,
      valid: frameIdx !== -1,
      dirty: false,
      referenced: lastStep.reference === i,
    });
  }
  return entries;
}

export function translateAddress(
  virtualAddress: number,
  pageSize: number,
  pageTable: PageTableEntry[]
): AddressTranslation {
  const pageNumber = Math.floor(virtualAddress / pageSize);
  const offset = virtualAddress % pageSize;
  const entry = pageTable.find((e) => e.pageNumber === pageNumber);
  
  if (!entry || !entry.valid || entry.frameNumber === null) {
    return {
      virtualAddress,
      pageNumber,
      offset,
      frameNumber: null,
      physicalAddress: null,
      pageFault: true,
    };
  }

  return {
    virtualAddress,
    pageNumber,
    offset,
    frameNumber: entry.frameNumber,
    physicalAddress: entry.frameNumber * pageSize + offset,
    pageFault: false,
  };
}

export function buildSegmentTable(
  memorySize: number,
  segmentCount: number
): SegmentTableEntry[] {
  const types: SegmentTableEntry["type"][] = ["code", "data", "heap", "stack"];
  const names = ["Code", "Data", "Heap", "Stack"];
  const entries: SegmentTableEntry[] = [];
  const segSize = Math.floor(memorySize / segmentCount);

  for (let i = 0; i < segmentCount; i++) {
    const type = types[i % types.length];
    entries.push({
      segmentNumber: i,
      base: i * segSize,
      limit: segSize - 1,
      name: names[i % names.length] + (i >= types.length ? ` ${Math.floor(i / types.length) + 1}` : ""),
      type,
    });
  }
  return entries;
}

export function parseReferenceString(input: string): number[] {
  return input
    .split(/[\s,]+/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n >= 0);
}
