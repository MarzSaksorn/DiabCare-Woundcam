import { useAuth } from "@/_core/hooks/useAuth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";
import { Bell, Camera, ChevronsLeft, FileText, Languages, LayoutDashboard, LogOut, Settings, UserRound, Users } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import ReplicaLogin from "./ReplicaLogin";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

type DashboardLayoutProps = { children: ReactNode; demoMode?: boolean; bottomDock?: ReactNode };
type NavItem = { path: string; label: string; icon: typeof LayoutDashboard; badge?: string };

const navItems: NavItem[] = [
  { path: "/", label: "overview", icon: LayoutDashboard },
  { path: "/patients", label: "patients", icon: Users },
  { path: "/camera", label: "camera", icon: Camera, badge: "HD" },
  { path: "/reports", label: "reports", icon: FileText },
  { path: "/settings", label: "settings", icon: Settings },
];

function isActivePath(path: string, location: string) {
  if (path === "/") return location === "/";
  if (path === "/camera") return location === "/camera" || location === "/assessments";
  return location === path || location.startsWith(`${path}/`);
}

export default function DashboardLayout({ children, demoMode = false, bottomDock }: DashboardLayoutProps) {
  const { loading, user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [location] = useLocation();

  if (loading && !demoMode) return <DashboardLayoutSkeleton />;
  if (!user && !demoMode) return <ReplicaLogin />;

  const displayUser = user ?? { name: "Local Clinician", email: "local@diabcare.local" };
  const displayName = displayUser.name || (language === "th" ? "ผู้ใช้งาน" : "Clinician");
  const dateLabel = new Intl.DateTimeFormat(language === "th" ? "th-TH" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className={`app-shell ${bottomDock ? "has-bottom-confirmation" : ""}`} lang={language === "th" ? "th" : "en"}>
      <ReplicaSidebarNavigation
        language={language}
        location={location}
        t={t}
        displayName={displayName}
        email={displayUser.email ?? ""}
        canLogout={!demoMode}
        onLogout={() => void logout()}
      />
      <div className="app-workspace">
        <header className="app-header">
          <div className="app-header-inner">
            <div className="app-header-brand">
              <img src="/assets/diabcare-logo.jpg" alt="DiabCare WoundCam" />
              <div>
                <p className="app-header-title">DiabCare Dashboard</p>
                <p className="app-header-date">{dateLabel}</p>
              </div>
            </div>
            <div className="app-header-actions">
              <button type="button" className="language-toggle" onClick={() => setLanguage(language === "th" ? "en" : "th")} aria-label={t("language")}>
                <span className={language === "th" ? "is-active" : ""}>TH</span>
                <span className={language === "en" ? "is-active" : ""}>EN</span>
              </button>
              <button type="button" className="icon-action" aria-label={language === "th" ? "การแจ้งเตือน" : "Notifications"}>
                <Bell aria-hidden="true" />
                <span className="notification-dot" aria-hidden="true" />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="profile-action" aria-label={displayName}>
                    <UserRound aria-hidden="true" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem disabled className="flex-col items-start gap-1">
                    <span className="font-semibold">{displayName}</span>
                    <span className="text-xs text-slate-400">{displayUser.email}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage(language === "th" ? "en" : "th")} className="cursor-pointer">
                    <Languages className="mr-2 h-4 w-4" /> {t("language")}
                  </DropdownMenuItem>
                  {!demoMode && <DropdownMenuItem onClick={() => void logout()} className="cursor-pointer text-rose-600 focus:text-rose-600"><LogOut className="mr-2 h-4 w-4" /> {t("signOut")}</DropdownMenuItem>}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        <main className="mobile-content">{children}</main>
        <ReplicaBottomNavigation language={language} location={location} t={t} confirmation={bottomDock} />
      </div>
    </div>
  );
}

function ReplicaSidebarNavigation({ language, location, t, displayName, email, canLogout, onLogout }: {
  language: "en" | "th";
  location: string;
  t: (key: string) => string;
  displayName: string;
  email: string;
  canLogout: boolean;
  onLogout: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const collapseLabel = collapsed
    ? language === "th"
      ? "ขยายแถบเมนู"
      : "Expand sidebar"
    : language === "th"
      ? "ยุบแถบเมนู"
      : "Collapse sidebar";

  return (
    <aside className={`landscape-sidebar ${collapsed ? "is-collapsed" : ""}`} aria-label={language === "th" ? "เมนูหลัก" : "Main navigation"}>
      <div>
        <div className="landscape-sidebar-brand">
          <div className="landscape-sidebar-brand-main">
            <span className="landscape-sidebar-brand-mark">
              <img src="/assets/diabcare-mark.jpg" alt="DiabCare Logo" />
            </span>
            <div className="landscape-sidebar-brand-copy"><strong>DiabCare</strong><span>WoundCam</span></div>
          </div>
          <button
            type="button"
            className="landscape-sidebar-collapse"
            onClick={() => setCollapsed(value => !value)}
            aria-expanded={!collapsed}
            aria-label={collapseLabel}
            title={collapseLabel}
          >
            <ChevronsLeft aria-hidden="true" />
          </button>
        </div>
        <nav className="landscape-sidebar-nav" aria-label={language === "th" ? "เมนูหลัก" : "Main navigation"}>
          {navItems.map(({ path, label, icon: Icon, badge }) => {
            const active = isActivePath(path, location);
            return (
              <Link key={path} href={path} className={`landscape-sidebar-nav-item ${active ? "is-active" : ""}`} aria-current={active ? "page" : undefined}>
                <Icon aria-hidden="true" />
                <span className="landscape-sidebar-nav-label">{t(label)}</span>
                {badge && <span className="landscape-sidebar-nav-badge">{badge}</span>}
                {active && <span className="landscape-sidebar-nav-dot" aria-hidden="true" />}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="landscape-sidebar-profile">
        <div className="landscape-sidebar-profile-main">
          <span className="landscape-sidebar-avatar">{userInitials(displayName)}<span aria-hidden="true" /></span>
          <div><strong>{displayName}</strong><small>{email}</small></div>
        </div>
        {canLogout && (
          <button type="button" className="landscape-sidebar-logout" onClick={onLogout} aria-label={language === "th" ? "ออกจากระบบ" : "Sign out"} title={language === "th" ? "ออกจากระบบ" : "Sign out"}>
            <LogOut aria-hidden="true" />
          </button>
        )}
      </div>
    </aside>
  );
}

function ReplicaBottomNavigation({ language, location, t, confirmation }: { language: "en" | "th"; location: string; t: (key: string) => string; confirmation?: ReactNode }) {
  return (
    <div className="bottom-nav-dock">
      {confirmation}
      <nav className="bottom-nav" aria-label={language === "th" ? "แถบนำทางหลัก" : "Primary navigation"}>
        {navItems.map(({ path, label, icon: Icon, badge }) => {
          const active = isActivePath(path, location);
          const center = path === "/camera";
          return (
            <Link key={path} href={path} className={`bottom-nav-item ${center ? "is-camera" : ""} ${active ? "is-active" : ""}`} aria-current={active ? "page" : undefined}>
              {!center && active && <span className="bottom-nav-active-indicator" aria-hidden="true" />}
              {center ? (
                <span className="bottom-nav-camera-wrap">
                  <span className="bottom-nav-icon"><Icon aria-hidden="true" /></span>
                  {badge && <span className="bottom-nav-badge">{badge}</span>}
                </span>
              ) : (
                <span className="bottom-nav-icon"><Icon aria-hidden="true" /></span>
              )}
              <span>{t(label)}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function userInitials(name: string) {
  const trimmed = name.trim();
  return trimmed ? trimmed.slice(0, 2) : "?";
}
