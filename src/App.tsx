import { Switch, Route, Router as WouterRouter, Link, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import DashboardPage from "@/pages/DashboardPage";
import PagingPage from "@/pages/PagingPage";
import SegmentationPage from "@/pages/SegmentationPage";
import VirtualMemoryPage from "@/pages/VirtualMemoryPage";

const queryClient = new QueryClient();

const NAV_LINKS = [
  { href: "/", label: "Home", icon: "⊞" },
  { href: "/paging", label: "Paging", icon: "📄" },
  { href: "/segmentation", label: "Segmentation", icon: "🗂️" },
  { href: "/virtual-memory", label: "Virtual Memory", icon: "🔗" },
];

function MoonIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}
function SunIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="5" />
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function useDarkMode(): [boolean, () => void] {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("theme") === "dark" ||
      (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  return [dark, () => setDark(d => !d)];
}

function Sidebar({ open, onClose, dark, onToggleDark }: {
  open: boolean; onClose: () => void; dark: boolean; onToggleDark: () => void;
}) {
  const [location] = useLocation();

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={onClose} />
      )}
      <aside className={`fixed md:sticky top-0 left-0 z-30 flex flex-col w-64 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform duration-200 ${
        open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}>
        <div className="px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                M
              </div>
              <div>
                <div className="text-sm font-bold text-sidebar-foreground leading-tight">MemSim</div>
                <div className="text-xs text-sidebar-foreground/50">OS Memory Visualizer</div>
              </div>
            </div>
            <button
              onClick={onToggleDark}
              title={dark ? "Switch to light mode" : "Switch to dark mode"}
              className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground/60 hover:text-sidebar-foreground"
            >
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <p className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider px-2 mb-2">
            Simulators
          </p>
          {NAV_LINKS.map((link) => {
            const active = link.href === "/"
              ? location === "/" || location === ""
              : location.startsWith(link.href);
            return (
              <Link key={link.href} href={link.href} onClick={onClose}>
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                }`}>
                  <span className="text-base">{link.icon}</span>
                  <span>{link.label}</span>
                  {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-sidebar-border">
          <div className="text-xs text-sidebar-foreground/40 text-center">
            Dynamic Memory Management
            <br />
            OS Project
          </div>
        </div>
      </aside>
    </>
  );
}

function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, toggleDark] = useDarkMode();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} dark={dark} onToggleDark={toggleDark} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <svg className="w-5 h-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-semibold text-foreground text-sm flex-1">MemSim</span>
          <button
            onClick={toggleDark}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-foreground/70"
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
            <Switch>
              <Route path="/" component={DashboardPage} />
              <Route path="/paging" component={PagingPage} />
              <Route path="/segmentation" component={SegmentationPage} />
              <Route path="/virtual-memory" component={VirtualMemoryPage} />
            </Switch>
          </div>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppShell />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
