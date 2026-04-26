import { Link } from "wouter";

const features = [
  {
    title: "Paging & Page Replacement",
    description: "Simulate FIFO and LRU algorithms. Watch frames fill up step-by-step and count page faults and hits.",
    icon: "📄",
    href: "/paging",
    color: "from-blue-500 to-blue-600",
    badge: "FIFO / LRU",
    badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  },
  {
    title: "Memory Segmentation",
    description: "Divide memory into logical segments (code, data, heap, stack). Translate logical to physical addresses with base/limit registers.",
    icon: "🗂️",
    href: "/segmentation",
    color: "from-purple-500 to-purple-600",
    badge: "Base & Limit",
    badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
  },
  {
    title: "Virtual Memory",
    description: "See how the MMU maps virtual pages to physical frames. Test address translation and detect page faults in real time.",
    icon: "🔗",
    href: "/virtual-memory",
    color: "from-teal-500 to-teal-600",
    badge: "MMU Simulation",
    badgeColor: "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
  },
];

const concepts = [
  {
    term: "Page Fault",
    definition: "Occurs when a process accesses a page not currently loaded in physical memory. The OS must fetch it from disk.",
    color: "border-l-red-500",
  },
  {
    term: "Page Frame",
    definition: "A fixed-size block of physical memory. Virtual pages are loaded into frames by the OS.",
    color: "border-l-blue-500",
  },
  {
    term: "Page Table",
    definition: "A data structure maintained by the OS mapping virtual page numbers to physical frame numbers.",
    color: "border-l-green-500",
  },
  {
    term: "Segmentation",
    definition: "Divides memory into variable-size logical segments, each described by a base address and limit.",
    color: "border-l-purple-500",
  },
  {
    term: "FIFO",
    definition: "First-In First-Out: when a new page must be loaded, the oldest page in memory is evicted.",
    color: "border-l-orange-500",
  },
  {
    term: "LRU",
    definition: "Least Recently Used: the page that has not been accessed for the longest time is replaced.",
    color: "border-l-teal-500",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="text-center py-6">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
          OS Project — Memory Management
        </div>
        <h1 className="text-3xl font-bold text-foreground">Dynamic Memory Management Visualizer</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
          An interactive simulator for core operating system memory management techniques.
          Explore paging, segmentation, and virtual memory with user-defined inputs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {features.map((f) => (
          <Link key={f.href} href={f.href}>
            <div className="group bg-card border border-card-border rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer">
              <div className={`h-2 w-full bg-gradient-to-r ${f.color}`} />
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <span className="text-3xl">{f.icon}</span>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${f.badgeColor}`}>{f.badge}</span>
                </div>
                <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                <div className="flex items-center gap-1 text-xs text-primary font-medium pt-1">
                  Open Simulator
                  <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-card border border-card-border rounded-xl p-6">
        <h2 className="text-lg font-bold text-foreground mb-4">Key Concepts</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {concepts.map((c) => (
            <div key={c.term} className={`border-l-4 ${c.color} bg-muted/40 rounded-r-lg pl-4 pr-3 py-3`}>
              <div className="text-sm font-semibold text-foreground">{c.term}</div>
              <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{c.definition}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-950/20 dark:to-teal-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
        <h3 className="font-semibold text-foreground mb-2">How to Use This Tool</h3>
        <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground">
          <li>Choose a memory management technique from the sidebar or cards above.</li>
          <li>Enter your own inputs: reference strings, frame counts, memory sizes, and addresses.</li>
          <li>Run the simulation and watch the step-by-step visualization update in real time.</li>
          <li>Use the slider to replay each step and understand how frames change on each access.</li>
        </ol>
      </div>
    </div>
  );
}
