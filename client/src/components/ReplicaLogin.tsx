import { Eye, EyeOff, LockKeyhole, Shield, Stethoscope, UserRound } from "lucide-react";
import { FormEvent, useState } from "react";
import { startLogin } from "@/const";
import { useLanguage } from "@/contexts/LanguageContext";

type CareRole = "OFFICER" | "NURSE" | "CAREGIVER";

const roleCopy: Record<CareRole, { th: string; en: string; icon: typeof Stethoscope }> = {
  OFFICER: { th: "เจ้าหน้าที่", en: "Officer", icon: Stethoscope },
  NURSE: { th: "พยาบาล", en: "Nurse", icon: UserRound },
  CAREGIVER: { th: "ผู้ดูแลผู้ป่วย", en: "Caregiver", icon: Shield },
};

export default function ReplicaLogin() {
  const { language } = useLanguage();
  const [role, setRole] = useState<CareRole>("OFFICER");
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // The existing application uses the Manus OAuth/session provider. The
    // replica fields are intentionally visual only until a real credential
    // provider is approved; no password is read or stored by this client.
    startLogin();
  }

  return (
    <div className="login-page" lang={language === "th" ? "th" : "en"}>
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo-tile">
            <img src="/assets/diabcare-logo.jpg" alt="DiabCare WoundCam" />
          </div>
          <h1>
            DiabCare <span>WoundCam</span>
          </h1>
        </div>

        <form className="login-form-panel" onSubmit={handleSubmit} aria-describedby="login-provider-note">
          <div className="role-selector" aria-label={language === "th" ? "เลือกบทบาทการดูแล" : "Choose care role"}>
            {(Object.keys(roleCopy) as CareRole[]).map((item) => {
              const copy = roleCopy[item];
              const Icon = copy.icon;
              const active = role === item;
              return (
                <button
                  key={item}
                  type="button"
                  className={`role-option ${active ? "is-active" : ""}`}
                  aria-pressed={active}
                  onClick={() => setRole(item)}
                >
                  <Icon aria-hidden="true" />
                  <span>{language === "th" ? copy.th : copy.en}</span>
                </button>
              );
            })}
          </div>

          <label className="login-field-label" htmlFor="replica-username">
            ชื่อผู้ใช้งาน <span>(Username)</span>
          </label>
          <div className="login-field">
            <span className="login-input-icon" aria-hidden="true"><UserRound /></span>
            <input id="replica-username" readOnly placeholder="ป้อนชื่อผู้ใช้งานทดสอบ (e.g., officer)" autoComplete="username" />
          </div>

          <label className="login-field-label" htmlFor="replica-password">
            รหัสผ่าน <span>(Password)</span>
          </label>
          <div className="login-field">
            <span className="login-input-icon" aria-hidden="true"><LockKeyhole /></span>
            <input id="replica-password" readOnly type={showPassword ? "text" : "password"} placeholder="ป้อนรหัสผ่าน (e.g., 123456)" autoComplete="current-password" />
            <button type="button" className="login-input-action" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </button>
          </div>

          <button type="submit" className="login-button">เข้าสู่ระบบการทำงาน</button>
          <p id="login-provider-note" className="login-provider-note">
            {language === "th" ? "ระบบจะเปิดการยืนยันตัวตนขององค์กร ไม่จัดเก็บรหัสผ่านในแอปนี้" : "Sign-in continues through the organization identity provider. This app never stores a password."}
          </p>
          <div className="login-footer">POWER BY MTN INVENTOR</div>
        </form>
      </div>
    </div>
  );
}
