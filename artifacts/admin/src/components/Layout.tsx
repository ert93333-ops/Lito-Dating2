import { Link, useRoute, useLocation } from "wouter";

const NAV_ITEMS = [
  { path: "/", label: "개요", icon: "⬛", exact: true },
  { path: "/reports", label: "신고 큐", icon: "🚩", badge: true },
  { path: "/users", label: "사용자 조회", icon: "👤" },
  { path: "/verification", label: "인증 큐", icon: "🪪", badge: true },
  { path: "/risk-flags", label: "위험 플래그", icon: "⚠️" },
  { path: "/appeals", label: "이의 신청", icon: "⚖️" },
];

function NavItem({ path, label, icon, badge, exact }: {
  path: string; label: string; icon: string; badge?: boolean; exact?: boolean;
}) {
  const [isActive] = useRoute(exact ? path : path + (path === "/" ? "" : "*"));
  return (
    <Link href={path}>
      <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
        isActive
          ? "bg-white/10 text-white"
          : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
      }`}>
        <span className="text-base">{icon}</span>
        <span className="text-sm font-medium flex-1">{label}</span>
        {badge && (
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
            isActive ? "bg-rose-500 text-white" : "bg-rose-500/80 text-white"
          }`}>!</span>
        )}
      </div>
    </Link>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const PAGE_TITLES: Record<string, string> = {
    "/": "개요",
    "/reports": "신고 큐",
    "/users": "사용자 조회",
    "/verification": "인증 큐",
    "/risk-flags": "위험 플래그",
    "/appeals": "이의 신청",
  };

  const baseTitle = Object.keys(PAGE_TITLES)
    .sort((a, b) => b.length - a.length)
    .find(k => location.startsWith(k)) || "/";
  const pageTitle = PAGE_TITLES[baseTitle] || "관리자";

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 flex flex-col flex-shrink-0">
        {/* Brand */}
        <div className="px-4 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500 flex items-center justify-center text-white font-bold text-sm">L</div>
            <div>
              <div className="text-white font-bold text-sm leading-none">Lito Admin</div>
              <div className="text-slate-500 text-xs mt-0.5">Trust & Safety</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <NavItem key={item.path} {...item} />
          ))}
        </nav>

        {/* Moderator badge */}
        <div className="px-4 py-4 border-t border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">M</div>
            <div className="flex-1 min-w-0">
              <div className="text-slate-300 text-xs font-medium truncate">mod_01</div>
              <div className="text-slate-500 text-xs">선임 모더레이터</div>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 flex-shrink-0">
          <h1 className="text-slate-800 font-semibold text-base">{pageTitle}</h1>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-xs text-slate-400">{new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}</div>
            <span className="text-xs font-medium px-2 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100">MVP 데이터</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
