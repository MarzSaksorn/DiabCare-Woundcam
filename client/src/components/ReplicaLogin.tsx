import {
  ArrowRight,
  LoaderCircle,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { useState } from "react";
import { startLogin } from "@/const";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ReplicaLogin() {
  const { language } = useLanguage();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isThai = language === "th";

  async function handleSignIn() {
    setPending(true);
    setError(null);
    try {
      await startLogin();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : isThai
            ? "เริ่มการเข้าสู่ระบบไม่สำเร็จ โปรดลองอีกครั้ง"
            : "Couldn't start sign-in. Please try again."
      );
      setPending(false);
    }
  }

  return (
    <main className="login-page" lang={isThai ? "th" : "en"}>
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand">
          <div className="login-logo-tile">
            <img src="/assets/diabcare-logo.jpg" alt="" />
          </div>
          <h1 id="login-title">
            DiabCare <span>WoundCam</span>
          </h1>
          <p className="login-intro">
            {isThai
              ? "พื้นที่ทำงานสำหรับทีมดูแลผู้ป่วยที่ได้รับอนุญาต"
              : "A secure workspace for authorized care teams."}
          </p>
        </div>

        <div className="login-form-panel">
          <div className="login-security-icon" aria-hidden="true">
            <ShieldCheck />
          </div>
          <h2 className="login-panel-title">
            {isThai ? "เข้าสู่ระบบอย่างปลอดภัย" : "Sign in securely"}
          </h2>
          <p className="login-panel-copy">
            {isThai
              ? "ใช้บัญชีองค์กรของคุณเพื่อเข้าใช้งาน DiabCare WoundCam"
              : "Continue with your organization account to access DiabCare WoundCam."}
          </p>

          <button
            type="button"
            className="login-button"
            onClick={() => void handleSignIn()}
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? (
              <LoaderCircle
                className="login-button-icon is-spinning"
                aria-hidden="true"
              />
            ) : (
              <Stethoscope className="login-button-icon" aria-hidden="true" />
            )}
            <span>
              {pending
                ? isThai
                  ? "กำลังเชื่อมต่อ…"
                  : "Connecting…"
                : isThai
                  ? "ดำเนินการต่อด้วยบัญชีองค์กร"
                  : "Continue with organization sign-in"}
            </span>
            {!pending && (
              <ArrowRight className="login-button-arrow" aria-hidden="true" />
            )}
          </button>

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}
          <p className="login-provider-note">
            {isThai
              ? "การยืนยันตัวตนดำเนินการโดยผู้ให้บริการขององค์กร แอปนี้จะไม่รับหรือจัดเก็บรหัสผ่าน"
              : "Your organization verifies your identity. DiabCare never asks for or stores your password."}
          </p>
          <div className="login-footer">
            {isThai
              ? "สำหรับบุคลากรที่ได้รับอนุญาตเท่านั้น"
              : "Authorized care-team access only"}
          </div>
        </div>
      </section>
    </main>
  );
}
