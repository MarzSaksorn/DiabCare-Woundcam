import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardLayout from "./DashboardLayout";

const testState = vi.hoisted(() => {
  type AuthState = {
    loading: boolean;
    user: { name: string; email: string } | null;
  };
  let authState: AuthState = {
    loading: false,
    user: { name: "Clinician", email: "clinician@example.test" },
  };

  return {
    route: "/",
    getAuthState: () => authState,
    setAuthState: (next: AuthState) => {
      authState = next;
    },
  };
});

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ ...testState.getAuthState(), logout: () => undefined }),
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    language: "en",
    setLanguage: () => undefined,
    t: (key: string) => key,
  }),
}));

vi.mock("wouter", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
  useLocation: () => [testState.route, () => undefined],
}));

vi.mock("@/components/ui/dropdown-menu", () => {
  const PassThrough = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  const MenuItem = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  return {
    DropdownMenu: PassThrough,
    DropdownMenuContent: PassThrough,
    DropdownMenuItem: MenuItem,
    DropdownMenuTrigger: PassThrough,
  };
});

vi.mock("@/components/ReplicaLogin", () => ({
  default: () => <div data-testid="replica-login" />,
}));

function renderShell(bottomDock?: React.ReactNode) {
  return renderToStaticMarkup(
    <DashboardLayout bottomDock={bottomDock}>
      <div>Workspace content</div>
    </DashboardLayout>
  );
}

beforeEach(() => {
  vi.stubGlobal("React", React);
  testState.route = "/";
  testState.setAuthState({
    loading: false,
    user: { name: "Clinician", email: "clinician@example.test" },
  });
});

describe("DashboardLayout clinical workspace appearance scope", () => {
  it("scopes the appearance class to the dashboard and diagnostic routes", () => {
    for (const route of ["/", "/camera", "/assessments"]) {
      testState.route = route;
      expect(renderShell()).toContain("is-clinical-workspace");
    }

    testState.route = "/patients";
    expect(renderShell()).not.toContain("is-clinical-workspace");
  });

  it("preserves navigation destinations, active-route state, language, and collapse affordance", () => {
    testState.route = "/assessments";
    const markup = renderShell();

    expect(markup).toContain('href="/"');
    expect(markup).toContain('href="/patients"');
    expect(markup).toContain('href="/camera"');
    expect(markup).toContain('href="/reports"');
    expect(markup).toContain('href="/settings"');
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain('aria-label="language"');
    expect(markup).toContain('aria-label="Collapse sidebar"');
  });

  it("keeps authentication gating and the mobile confirmation dock", () => {
    testState.setAuthState({ loading: false, user: null });
    expect(renderShell()).toContain("replica-login");
    expect(renderShell()).not.toContain("app-shell");

    testState.setAuthState({
      loading: false,
      user: { name: "Clinician", email: "clinician@example.test" },
    });
    const markup = renderShell(<button type="button">Confirm case</button>);
    expect(markup).toContain("has-bottom-confirmation");
    expect(markup).toContain("Confirm case");
    expect(markup).toContain("bottom-nav-dock");
  });
});
