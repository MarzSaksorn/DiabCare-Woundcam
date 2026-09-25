import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CheckCircle2, Save, ShieldAlert } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

const initialForm = {
  patientCode: "",
  displayName: "",
  phone: "",
  dateOfBirth: "",
  age: "",
  registrationLocation: "",
  identifyBy: "Local patient code",
  sex: "FEMALE" as "FEMALE" | "MALE",
  diabetesContext: "none" as "none" | "type1" | "type2" | "gdm",
  clinicalNotes: "",
};
type FormErrors = Partial<Record<"patientCode" | "registrationLocation" | "age" | "dateOfBirth", string>>;

export default function PatientRegistration() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [savedCode, setSavedCode] = useState<string | null>(null);
  const registerPatient = trpc.diabetes.registerPatient.useMutation({
    onSuccess: (patient) => {
      setSavedCode(patient.patientCode);
      toast.success(t("patientRegistered"));
    },
    onError: (error) => toast.error(error.message || t("registrationFailed")),
  });

  function update(field: keyof typeof initialForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    if (field in errors) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FormErrors = {};
    if (form.patientCode.trim().length < 2) nextErrors.patientCode = t("patientCodeValidation");
    if (form.registrationLocation.trim().length < 2) nextErrors.registrationLocation = t("locationValidation");
    const age = form.age.trim() ? Number(form.age) : undefined;
    if (age !== undefined && (!Number.isInteger(age) || age < 0 || age > 150)) {
      nextErrors.age = t("ageValidation");
    }
    if (!form.age.trim() && !form.dateOfBirth) {
      nextErrors.age = t("ageOrDobRequired");
      nextErrors.dateOfBirth = t("ageOrDobRequired");
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast.error(t("registrationCheckFields"));
      return;
    }
    registerPatient.mutate({
      patientCode: form.patientCode,
      displayName: form.displayName || undefined,
      phone: form.phone || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      age,
      registrationLocation: form.registrationLocation,
      identifyBy: form.identifyBy,
      sex: form.sex,
      type1: form.diabetesContext === "type1" ? 1 : 0,
      type2: form.diabetesContext === "type2" ? 1 : 0,
      gdm: form.diabetesContext === "gdm" ? 1 : 0,
      clinicalNotes: form.clinicalNotes || undefined,
    });
  }

  if (savedCode) return <DashboardLayout><main className="mx-auto flex w-full max-w-3xl flex-col items-center px-5 py-12 text-center lg:py-20"><div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#e7f1eb] text-[#4f7463]"><CheckCircle2 className="h-8 w-8" /></div><p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-[#6d9681]">{t("patientRegistered")}</p><h1 className="mt-3 font-display text-4xl tracking-[-0.04em] text-[#132238]">{savedCode}</h1><p className="mt-3 max-w-md text-sm leading-6 text-slate-500">{t("registrationSavedDetail")}</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Button onClick={() => { setForm(initialForm); setErrors({}); setSavedCode(null); }} className="rounded-xl bg-[#132238] text-white hover:bg-[#203552]">{t("registerAnother")}</Button><Button onClick={() => setLocation("/patients")} variant="outline" className="rounded-xl border-slate-200">{t("backToPatients")}</Button></div></main></DashboardLayout>;

  return <DashboardLayout><main className="mx-auto w-full max-w-4xl px-5 py-5 lg:px-8 lg:py-10"><Link href="/patients" className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-[#4f7463] hover:text-[#132238]"><ArrowLeft className="h-4 w-4" /> {t("backToPatients")}</Link><div className="mb-8"><p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#6d9681]">{t("careWorkspace")}</p><h1 className="font-display text-4xl tracking-[-0.04em] text-[#132238] sm:text-5xl">{t("registerPatient")}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">{t("registrationDescription")}</p></div><form onSubmit={submit} className="panel-card overflow-hidden"><div className="grid gap-6 p-5 sm:p-7"><section><h2 className="font-display text-2xl tracking-[-0.03em] text-[#132238]">{t("patientIdentity")}</h2><p className="mt-1 text-sm text-slate-400">{t("patientIdentityDetail")}</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label={t("patientCode")} required error={errors.patientCode}><Input required minLength={2} value={form.patientCode} onChange={(event) => update("patientCode", event.target.value)} placeholder={t("patientCodePlaceholder")} aria-invalid={Boolean(errors.patientCode)} className="field-control h-11" /></Field><Field label={t("displayName")}><Input value={form.displayName} onChange={(event) => update("displayName", event.target.value)} placeholder={t("displayNamePlaceholder")} className="field-control h-11" /></Field><Field label={t("phone")}><Input type="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder={t("phonePlaceholder")} className="field-control h-11" /></Field><Field label={t("registrationLocation")} required error={errors.registrationLocation}><Input required minLength={2} value={form.registrationLocation} onChange={(event) => update("registrationLocation", event.target.value)} placeholder={t("locationPlaceholder")} aria-invalid={Boolean(errors.registrationLocation)} className="field-control h-11" /></Field></div></section><section className="border-t border-slate-100 pt-6"><h2 className="font-display text-2xl tracking-[-0.03em] text-[#132238]">{t("clinicalContext")}</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label={t("sex")} required><select required value={form.sex} onChange={(event) => update("sex", event.target.value)} className="field-control h-11 w-full"><option value="FEMALE">{t("female")}</option><option value="MALE">{t("male")}</option></select></Field><Field label={t("diabetesContext")}><select value={form.diabetesContext} onChange={(event) => update("diabetesContext", event.target.value)} className="field-control h-11 w-full"><option value="none">{t("notSpecified")}</option><option value="type1">{t("type1")}</option><option value="type2">{t("type2")}</option><option value="gdm">{t("gdm")}</option></select></Field><Field label={t("age")} hint={t("ageOrDobHint")} error={errors.age}><Input type="number" min="0" max="150" value={form.age} onChange={(event) => update("age", event.target.value)} placeholder="e.g. 64" aria-invalid={Boolean(errors.age)} className="field-control h-11" /></Field><Field label={t("dateOfBirth")} hint={t("ageOrDobHint")} error={errors.dateOfBirth}><Input type="date" value={form.dateOfBirth} onChange={(event) => update("dateOfBirth", event.target.value)} aria-invalid={Boolean(errors.dateOfBirth)} className="field-control h-11" /></Field></div></section><section className="border-t border-slate-100 pt-6"><h2 className="font-display text-2xl tracking-[-0.03em] text-[#132238]">{t("clinicalNotes")}</h2><textarea value={form.clinicalNotes} onChange={(event) => update("clinicalNotes", event.target.value)} placeholder={t("clinicalNotesPlaceholder")} className="field-control mt-5 min-h-32 w-full resize-y" maxLength={4000} /></section><div className="flex items-start gap-3 rounded-xl bg-[#fff7e7] p-4 text-xs leading-5 text-[#8a6b29]"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /><p>{t("registrationPrivacyNote")}</p></div></div><div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-[#fbfcfb] px-5 py-4 sm:flex-row sm:justify-end sm:px-7"><Button type="button" onClick={() => setLocation("/patients")} variant="ghost" className="rounded-xl text-slate-500">{t("cancel")}</Button><Button type="submit" disabled={registerPatient.isPending} className="rounded-xl bg-[#132238] px-5 text-white hover:bg-[#203552]"><Save className="mr-2 h-4 w-4" />{registerPatient.isPending ? t("saving") : t("savePatient")}</Button></div></form></main></DashboardLayout>;
}

function Field({ label, required, hint, error, children }: { label: string; required?: boolean; hint?: string; error?: string; children: ReactNode }) { return <label className="grid gap-1.5 text-sm font-semibold text-slate-600"><span>{label}{required && <span className="ml-1 text-[#c86b52]" aria-hidden="true">*</span>}</span>{children}{error ? <span className="text-xs font-normal text-[#c86b52]" role="alert">{error}</span> : hint && <span className="text-xs font-normal text-slate-400">{hint}</span>}</label>; }
