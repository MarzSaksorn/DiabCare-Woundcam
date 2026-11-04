import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ReplicaLogin() {
  const { language } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isThai = language === "th";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const { getSupabaseClient } = await import("@/lib/supabase");
      const supabase = await getSupabaseClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInError) throw signInError;
      window.location.assign("/");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : isThai
            ? "เข้าสู่ระบบไม่สำเร็จ โปรดลองอีกครั้ง"
            : "Sign-in failed. Please try again."
      );
    } finally {
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

        <form
          className="login-form-panel"
          onSubmit={event => void handleSubmit(event)}
          aria-describedby="login-help"
        >
          <div className="login-security-icon" aria-hidden="true">
            <ShieldCheck />
          </div>
          <h2 className="login-panel-title">
            {isThai ? "เข้าสู่ระบบ" : "Sign in"}
          </h2>
          <p className="login-panel-copy">
            {isThai
              ? "ใช้บัญชี Supabase ที่ได้รับอนุญาตเพื่อเข้าใช้งาน DiabCare WoundCam"
              : "Use your authorized Supabase account to access DiabCare WoundCam."}
          </p>

          <label className="login-field-label" htmlFor="supabase-email">
            {isThai ? "อีเมล" : "Email"}
          </label>
          <div className="login-field">
            <span className="login-input-icon" aria-hidden="true">
              <Mail />
            </span>
            <input
              id="supabase-email"
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="name@example.com"
              autoComplete="email"
              required
            />
          </div>

          <label className="login-field-label" htmlFor="supabase-password">
            {isThai ? "รหัสผ่าน" : "Password"}
          </label>
          <div className="login-field">
            <span className="login-input-icon" aria-hidden="true">
              <LockKeyhole />
            </span>
            <input
              id="supabase-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder={isThai ? "รหัสผ่านของคุณ" : "Your password"}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="login-input-action"
              onClick={() => setShowPassword(value => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff aria-hidden="true" />
              ) : (
                <Eye aria-hidden="true" />
              )}
            </button>
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? (
              <LoaderCircle
                className="login-button-icon is-spinning"
                aria-hidden="true"
              />
            ) : (
              <ShieldCheck className="login-button-icon" aria-hidden="true" />
            )}
            <span>
              {pending
                ? isThai
                  ? "กำลังตรวจสอบ…"
                  : "Checking…"
                : isThai
                  ? "เข้าสู่ระบบอย่างปลอดภัย"
                  : "Sign in securely"}
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
          <p id="login-help" className="login-provider-note">
            {isThai
              ? "บัญชีและรหัสผ่านจัดการโดย Supabase Auth แอปนี้จะไม่แสดงหรือจัดเก็บรหัสผ่านของคุณ"
              : "Supabase Auth manages your account. This app does not expose or store your password."}
          </p>
          <div className="login-footer">
            {isThai
              ? "สำหรับบุคลากรที่ได้รับอนุญาตเท่านั้น"
              : "Authorized care-team access only"}
          </div>
        </form>
      </section>
    </main>
  );
}
