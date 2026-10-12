import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/useMobile";
import { useLanguage } from "@/contexts/LanguageContext";
import { Bell, Camera, FileText, Languages, LayoutDashboard, LogOut, Settings, UserRound, Users } from "lucide-react";
import { type ReactNode } from "react";
import { useLocation } from "wouter";
import ReplicaLogin from "./ReplicaLogin";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

type DashboardLayoutProps = { children: ReactNode; demoMode?: boolean };
type NavItem = { path: string; label: string; icon: typeof LayoutDashboard };

const navItems: NavItem[] = [
  { path: "/", label: "overview", icon: LayoutDashboard },
  { path: "/patients", label: "patients", icon: Users },
  { path: "/camera", label: "camera", icon: Camera },
  { path: "/reports", label: "reports", icon: FileText },
  { path: "/settings", label: "settings", icon: Settings },
];

function isActivePath(path: string, location: string) {
  if (path === "/") return location === "/";
  if (path === "/camera") return location === "/camera" || location === "/assessments";
  return location === path || location.startsWith(`${path}/`);
}

export default function DashboardLayout({ children, demoMode = false }: DashboardLayoutProps) {
  const { loading, user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  if (loading && !demoMode) return <DashboardLayoutSkeleton />;
  if (!user && !demoMode) return <ReplicaLogin />;

  const displayUser = user ?? { name: "Local Clinician", email: "local@diabcare.local" };
  const dateLabel = new Intl.DateTimeFormat(language === "th" ? "th-TH" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="app-shell" lang={language === "th" ? "th" : "en"}>
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
                <button type="button" className="profile-action" aria-label={displayUser.name ?? "Profile"}>
                  <UserRound aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem disabled className="flex-col items-start gap-1">
                  <span className="font-semibold">{displayUser.name}</span>
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
      <ReplicaBottomNavigation />
    </div>
  );
}

function ReplicaBottomNavigation() {
  const [location, setLocation] = useLocation();
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  return (
    <nav className={`bottom-nav ${isMobile ? "is-mobile" : ""}`} aria-label="Primary navigation">
      {navItems.map(({ path, label, icon: Icon }) => {
        const active = isActivePath(path, location);
        const center = path === "/camera";
        return (
          <button
            key={path}
            type="button"
            className={`bottom-nav-item ${center ? "is-camera" : ""} ${active ? "is-active" : ""}`}
            onClick={() => setLocation(path)}
            aria-current={active ? "page" : undefined}
          >
            <span className="bottom-nav-icon"><Icon aria-hidden="true" /></span>
            <span>{t(label)}</span>
          </button>
        );
      })}
    </nav>
  );
}
