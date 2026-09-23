import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { Activity, FileText, Languages, LayoutDashboard, LogOut, PanelLeft, Settings, Users } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const menuItems = [
  { icon: LayoutDashboard, label: "overview", path: "/" },
  { icon: Users, label: "patients", path: "/patients" },
  { icon: Activity, label: "assessments", path: "/assessments" },
  { icon: FileText, label: "reports", path: "/reports" },
  { icon: Settings, label: "settings", path: "/settings" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 258;
const MIN_WIDTH = 200;
const MAX_WIDTH = 420;

type DashboardLayoutProps = { children: React.ReactNode; demoMode?: boolean };

export default function DashboardLayout({ children, demoMode = false }: DashboardLayoutProps) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => { localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString()); }, [sidebarWidth]);
  if (loading && !demoMode) return <DashboardLayoutSkeleton />;
  if (!user && !demoMode) return <div className="flex min-h-screen items-center justify-center"><div className="flex w-full max-w-md flex-col items-center gap-8 p-8"><div className="flex flex-col items-center gap-6"><h1 className="text-center text-2xl font-semibold tracking-tight">Sign in to continue</h1><p className="max-w-sm text-center text-sm text-muted-foreground">Access to this dashboard requires authentication. Continue to launch the login flow.</p></div><Button onClick={() => startLogin()} size="lg" className="w-full shadow-lg transition-all hover:shadow-xl">Sign in</Button></div></div>;

  return <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}><DashboardLayoutContent demoMode={demoMode} setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent></SidebarProvider>;
}

type DashboardLayoutContentProps = { children: React.ReactNode; setSidebarWidth: (width: number) => void; demoMode: boolean };

function DashboardLayoutContent({ children, setSidebarWidth, demoMode }: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();
  const displayUser = user ?? { name: "Dr. Morgan Lee", email: "demo@riverside.health" };
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => { if (isCollapsed) setIsResizing(false); }, [isCollapsed]);
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => { if (!isResizing) return; const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0; const newWidth = e.clientX - sidebarLeft; if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth); };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) { document.addEventListener("mousemove", handleMouseMove); document.addEventListener("mouseup", handleMouseUp); document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none"; }
    return () => { document.removeEventListener("mousemove", handleMouseMove); document.removeEventListener("mouseup", handleMouseUp); document.body.style.cursor = ""; document.body.style.userSelect = ""; };
  }, [isResizing, setSidebarWidth]);

  return <><div className="relative" ref={sidebarRef}><Sidebar collapsible="icon" className="border-r-0" disableTransition={isResizing}><SidebarHeader className="h-[88px] justify-center"><div className="flex w-full items-center gap-3 px-2"><button onClick={toggleSidebar} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eef3f0] text-[#4f7463] transition-colors hover:bg-[#dfeae3] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Toggle navigation"><PanelLeft className="h-4 w-4" /></button>{!isCollapsed && <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#6d9681]" /><span className="font-display text-lg tracking-[-0.04em] text-[#132238]">DiabCare</span><button onClick={() => setLanguage(language === "en" ? "th" : "en")} className="ml-auto inline-flex h-7 items-center gap-1 rounded-lg bg-[#f1f4f2] px-2 text-[10px] font-bold text-[#4f7463] transition-colors hover:bg-[#e7efeb]" aria-label={`${t("language")}: ${language === "en" ? t("thai") : t("english")}`}><Languages className="h-3.5 w-3.5" />{language === "en" ? "ไทย" : "EN"}</button></div><p className="mt-0.5 pl-[18px] text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{t("woundcam")}</p></div>}</div></SidebarHeader><SidebarContent className="gap-0"><div className="px-4 pb-3 pt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 group-data-[collapsible=icon]:hidden">{t("careWorkspace")}</div><SidebarMenu className="px-2"><div className="space-y-1">{menuItems.map(item => { const isActive = location === item.path; return <SidebarMenuItem key={item.path}><SidebarMenuButton isActive={isActive} onClick={() => setLocation(item.path)} tooltip={t(item.label)} className="h-11 rounded-xl font-medium transition-all"><item.icon className={`h-4 w-4 ${isActive ? "text-[#4f7463]" : "text-slate-400"}`} /><span>{t(item.label)}</span></SidebarMenuButton></SidebarMenuItem>; })}</div></SidebarMenu></SidebarContent><SidebarFooter className="p-3"><DropdownMenu><DropdownMenuTrigger asChild><button className="group flex w-full items-center gap-3 rounded-xl px-1.5 py-2 text-left transition-colors hover:bg-[#f4f7f5] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Avatar className="h-9 w-9 shrink-0 border border-[#dbe7df]"><AvatarFallback className="bg-[#e7efeb] text-xs font-bold text-[#4f7463]">{displayUser.name?.charAt(0).toUpperCase()}</AvatarFallback></Avatar><div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-sm font-semibold leading-none text-[#25354a]">{displayUser.name}</p><p className="mt-1.5 truncate text-[11px] text-slate-400">{displayUser.email}</p></div></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-52"><DropdownMenuItem onClick={() => setLanguage(language === "en" ? "th" : "en")} className="cursor-pointer"><Languages className="mr-2 h-4 w-4" /><span>{t("language")}: {language === "en" ? t("thai") : t("english")}</span></DropdownMenuItem>{!demoMode && <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4" /><span>{t("signOut")}</span></DropdownMenuItem>}{demoMode && <DropdownMenuItem disabled>Demo preview mode</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu></SidebarFooter></Sidebar><div className={`absolute right-0 top-0 h-full w-1 cursor-col-resize transition-colors hover:bg-[#6d9681]/20 ${isCollapsed ? "hidden" : ""}`} onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }} style={{ zIndex: 50 }} /></div><SidebarInset>{isMobile && <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-100 bg-[#fbfcfb]/95 px-2 backdrop-blur"><div className="flex items-center gap-2"><SidebarTrigger className="h-9 w-9 rounded-lg bg-white" /><span className="text-sm font-semibold text-[#25354a]">{activeMenuItem ? t(activeMenuItem.label) : t("overview")}</span></div><button onClick={() => setLanguage(language === "en" ? "th" : "en")} className="inline-flex h-8 items-center gap-1 rounded-lg bg-white px-2 text-[10px] font-bold text-[#4f7463]" aria-label={t("language")}><Languages className="h-3.5 w-3.5" />{language === "en" ? "ไทย" : "EN"}</button></div>}<main className="min-h-screen flex-1 bg-[#f6f7f4] p-4 sm:p-5 lg:p-6">{children}</main></SidebarInset></>;
}
