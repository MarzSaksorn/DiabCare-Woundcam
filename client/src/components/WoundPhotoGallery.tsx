import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { ImagePlus, ExternalLink, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDate } from "@/lib/locale";

type Photo = { id: number; storageUrl: string; fileName: string; mimeType: string; fileSizeBytes: number; caption: string | null; capturedOn: string | null; capturedAt: Date | null; createdAt: Date };
type WoundOption = { id: number; woundLabel: string; location: string; assessedOn: string };

export function WoundPhotoGallery({ photos, t }: { photos: Photo[]; t: (key: string) => string }) {
  if (!photos.length) return <div className="record-empty-state"><div className="record-empty-icon"><ImagePlus className="h-5 w-5" /></div><h3>{t("noWoundPhotos")}</h3><p>{t("noWoundPhotosDetail")}</p></div>;
  const { language } = useLanguage();
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{photos.map((photo) => <figure key={photo.id} className="overflow-hidden rounded-2xl border border-slate-100 bg-white"><a href={photo.storageUrl} target="_blank" rel="noreferrer" className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2b79c2]" aria-label={`${t("openPhoto")}: ${photo.fileName}`}><img src={photo.storageUrl} alt={photo.caption || `${t("woundPhoto")} ${photo.fileName}`} className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-[1.02]" loading="lazy" /><span className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#4f7463]"><ExternalLink className="h-3.5 w-3.5" />{t("openPhoto")}</span></a><figcaption className="border-t border-slate-100 px-3 py-3"><strong className="block truncate text-sm text-[#25354a]">{photo.caption || photo.fileName}</strong><span className="mt-1 block text-xs text-slate-400">{photo.capturedAt ? formatDate(photo.capturedAt, language, { dateStyle: "medium", timeStyle: "short" }) : photo.capturedOn || t("dateNotRecorded")} · {(photo.fileSizeBytes / 1024 / 1024).toFixed(1)} MB</span></figcaption></figure>)}</div>;
}

export function WoundPhotoUpload({ patientId, patientCode, wounds, onUploaded, disabled = false }: { patientId: number; patientCode: string; wounds: WoundOption[]; onUploaded: () => void; disabled?: boolean }) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [capturedAt, setCapturedAt] = useState(() => { const date = new Date(); date.setSeconds(0, 0); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); });
  const [woundAssessmentId, setWoundAssessmentId] = useState("");
  const upload = trpc.diabetes.uploadWoundPhoto.useMutation({ onSuccess: () => { setFile(null); setCaption(""); if (inputRef.current) inputRef.current.value = ""; onUploaded(); toast.success(t("photoUploaded")); }, onError: (error) => toast.error(error.message) });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) { toast.error(t("photoRequired")); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { toast.error(t("photoTypeError")); return; }
    if (file.size > 12 * 1024 * 1024) { toast.error(t("photoSizeError")); return; }
    const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Unable to read photo")); reader.readAsDataURL(file); });
    upload.mutate({ patientId, woundAssessmentId: woundAssessmentId ? Number(woundAssessmentId) : null, fileName: file.name, mimeType: file.type as "image/jpeg" | "image/png" | "image/webp", capturedAt: new Date(capturedAt).toISOString(), caption: caption.trim() || null, imageData: dataUrl });
  }

  return <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-dashed border-[#bfd8c8] bg-[#f7faf8] p-4 sm:grid-cols-2"><div className="sm:col-span-2 rounded-xl bg-white px-3 py-2 text-sm text-[#25354a]"><strong>{t("photoAssignedTo")}</strong> {patientCode}<span className="ml-2 text-xs text-slate-400">{t("patientId")}: {patientId}</span></div><label className="grid gap-1.5 text-sm font-semibold text-slate-600 sm:col-span-2">{t("woundPhoto")}<Input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => setFile(event.target.files?.[0] ?? null)} disabled={disabled || upload.isPending} className="h-auto bg-white py-2" /><span className="text-xs font-normal text-slate-400">{t("photoUploadHint")}</span></label><label className="grid gap-1.5 text-sm font-semibold text-slate-600 sm:col-span-2">{t("photoDateTime")}<Input type="datetime-local" value={capturedAt} onChange={(event) => setCapturedAt(event.target.value)} disabled={disabled || upload.isPending} /></label><label className="grid gap-1.5 text-sm font-semibold text-slate-600 sm:col-span-2">{t("woundAssessmentLink")}<select value={woundAssessmentId} onChange={(event) => setWoundAssessmentId(event.target.value)} disabled={disabled || upload.isPending} className="field-control h-10 w-full bg-white"><option value="">{t("notLinked")}</option>{wounds.map((wound) => <option key={wound.id} value={wound.id}>{wound.woundLabel} · {wound.location} · {wound.assessedOn}</option>)}</select></label><label className="grid gap-1.5 text-sm font-semibold text-slate-600 sm:col-span-2">{t("photoCaption")}<Input value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={500} placeholder={t("photoCaptionPlaceholder")} disabled={disabled || upload.isPending} /></label><div className="sm:col-span-2"><Button type="submit" disabled={disabled || upload.isPending || !file} className="rounded-xl bg-[#132238] text-white"><Upload className="mr-2 h-4 w-4" />{upload.isPending ? t("uploadingPhoto") : t("uploadPhoto")}</Button></div></form>;
}
