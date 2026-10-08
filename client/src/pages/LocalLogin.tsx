import {
  Award,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldAlert,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { useLocation } from "wouter";

type Role = "OFFICER" | "nurse" | "CAREGIVER";

type RoleOption = {
  id: Role;
  label: string;
  username: string;
  icon: typeof Stethoscope;
  tone: "officer" | "nurse" | "caregiver";
};

const LOCAL_SESSION_KEY = "diabcare-local-session";

const roleOptions: RoleOption[] = [
  {
    id: "OFFICER",
    label: "เจ้าหน้าที่",
    username: "officer",
    icon: Stethoscope,
    tone: "officer",
  },
  {
    id: "nurse",
    label: "พยาบาล",
    username: "rn",
    icon: Award,
    tone: "nurse",
  },
  {
    id: "CAREGIVER",
    label: "ผู้ดูแลผู้ป่วย",
    username: "caregiver",
    icon: ShieldAlert,
    tone: "caregiver",
  },
];

const getRoleOption = (role: Role) =>
  roleOptions.find(option => option.id === role) ?? roleOptions[0];

export default function LocalLogin() {
  const [, setLocation] = useLocation();
  const [role, setRole] = useState<Role>("OFFICER");
  const [username, setUsername] = useState("officer");
  const [password, setPassword] = useState("123456");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function selectRole(nextRole: Role) {
    const nextOption = getRoleOption(nextRole);
    setRole(nextRole);
    setUsername(nextOption.username);
    setPassword("123456");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน");
      return;
    }

    setIsSubmitting(true);
    await new Promise(resolve => window.setTimeout(resolve, 850));

    const selectedRole = getRoleOption(role);
    const isValid =
      username.trim().toLowerCase() === selectedRole.username &&
      password === "123456";

    if (!isValid) {
      setError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      setIsSubmitting(false);
      return;
    }

    window.localStorage.setItem(
      LOCAL_SESSION_KEY,
      JSON.stringify({
        username: selectedRole.username,
        role,
        signedInAt: new Date().toISOString(),
      })
    );
    setLocation("/workspace");
  }

  return (
    <main className="local-login-page" lang="th">
      <div className="local-login-card">
        <div className="local-login-brand">
          <div className="local-login-logo-frame">
            <img
              src="/assets/diabcare_logo.jpg"
              alt="DiabCare WoundCam logo"
              className="local-login-logo"
            />
          </div>
          <h1 className="local-login-wordmark">
            DiabCare <span>WoundCam</span>
          </h1>
        </div>

        <section className="local-login-panel" aria-labelledby="login-heading">
          <h2 id="login-heading" className="sr-only">
            เข้าสู่ระบบ DiabCare WoundCam
          </h2>

          <div
            className="local-role-selector"
            aria-label="เลือกประเภทผู้ใช้งาน"
          >
            {roleOptions.map(({ id, label, icon: Icon, tone }) => {
              const isActive = role === id;
              return (
                <button
                  key={id}
                  type="button"
                  className="local-role-button"
                  data-active={isActive}
                  data-tone={tone}
                  aria-pressed={isActive}
                  onClick={() => selectRole(id)}
                >
                  <Icon aria-hidden="true" className="local-role-icon" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          <form className="local-login-form" onSubmit={handleSubmit} noValidate>
            {error && (
              <p
                className="local-login-error"
                role="alert"
                aria-live="assertive"
              >
                {error}
              </p>
            )}

            <div className="local-field-group">
              <label className="local-field-label" htmlFor="local-username">
                ชื่อผู้ใช้งาน <span>(Username)</span>
              </label>
              <div className="local-input-field">
                <UserRound aria-hidden="true" className="local-input-icon" />
                <input
                  id="local-username"
                  name="username"
                  type="text"
                  value={username}
                  onChange={event => {
                    setUsername(event.target.value);
                    setError("");
                  }}
                  placeholder="ป้อนชื่อผู้ใช้งานทดสอบ (e.g., officer)"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                />
              </div>
            </div>

            <div className="local-field-group">
              <label className="local-field-label" htmlFor="local-password">
                รหัสผ่าน <span>(Password)</span>
              </label>
              <div className="local-input-field">
                <LockKeyhole aria-hidden="true" className="local-input-icon" />
                <input
                  id="local-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={event => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  placeholder="ป้อนรหัสผ่าน (e.g., 123456)"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="local-input-action"
                  aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  onClick={() => setShowPassword(visible => !visible)}
                >
                  {showPassword ? (
                    <EyeOff aria-hidden="true" />
                  ) : (
                    <Eye aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="local-login-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? "กำลังตรวจสอบข้อมูล..." : "เข้าสู่ระบบการทำงาน"}
            </button>
          </form>

          <footer className="local-login-footer">Power by MTN Inventor</footer>
        </section>
      </div>
    </main>
  );
}

export { LOCAL_SESSION_KEY };
