import { Input } from "@/components/ui/input";
import { useAuthenticatedMediaUrl } from "@/components/AuthenticatedWoundImage";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/locale";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileImage,
  Image as ImageIcon,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useMemo, useState } from "react";

type PhotoHistoryPhoto = {
  id: number;
  patientId: number;
  patientCode: string;
  displayName: string | null;
  registrationLocation: string | null;
  woundAssessmentId: number | null;
  storageUrl: string;
  fileName: string;
  caption: string | null;
  capturedOn: string | null;
  capturedAt: Date | string;
};

const PAGE_SIZE = 8;

export default function DiagnosticPhotoHistory() {
  const { t, language } = useLanguage();
  const [search, setSearch] = useState("");
  const [patientId, setPatientId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [activePhoto, setActivePhoto] = useState<{
    photo: PhotoHistoryPhoto;
    url: string;
  } | null>(null);
  const patients = trpc.diabetes.registeredPatients.useQuery({ limit: 100 });
  const history = trpc.diabetes.photoHistory.useQuery({
    query: search || undefined,
    patientId: patientId ? Number(patientId) : undefined,
    from: from || undefined,
    to: to || undefined,
    offset: (page - 1) * PAGE_SIZE,
    limit: PAGE_SIZE,
  });
  const photos = (history.data?.photos ?? []) as PhotoHistoryPhoto[];
  const total = history.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selectedPatient = patients.data?.find(
    patient => String(patient.id) === patientId
  );
  const filterLabel = selectedPatient
    ? selectedPatient.displayName || selectedPatient.patientCode
    : language === "th"
      ? "ผู้ป่วยทั้งหมด"
      : "All patients";
  const latestCapture = photos[0]?.capturedAt;
  const pageStart = Math.min(Math.max(1, page - 2), Math.max(1, pageCount - 4));
  const pageNumbers = useMemo(
    () =>
      Array.from(
        { length: Math.min(pageCount, 5) },
        (_, index) => pageStart + index
      ),
    [pageCount, pageStart]
  );

  useEffect(() => {
    setPage(1);
  }, [search, patientId, from, to]);

  useEffect(() => {
    setPage(currentPage => Math.min(currentPage, pageCount));
  }, [pageCount]);

  useEffect(() => {
    if (!activePhoto) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActivePhoto(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePhoto]);

  const resetFilters = () => {
    setSearch("");
    setPatientId("");
    setFrom("");
    setTo("");
    setPage(1);
  };

  return (
    <section
      className="camera-history-card camera-history-v9"
      aria-labelledby="capture-history-heading"
    >
      <div className="camera-history-command">
        <div className="camera-history-command-copy">
          <div className="camera-history-overline">
            <span>DiabCare WoundCam Hub</span>
            <span aria-hidden="true">•</span>
            <span>
              {language === "th"
                ? "คลังภาพถ่ายแผลจากกล้อง"
                : "Clinical camera photo archive"}
            </span>
          </div>
          <h2 id="capture-history-heading">{t("woundPhotoHistory")}</h2>
          <p>
            {language === "th"
              ? "รวมรูปถ่ายแผลที่บันทึกแล้ว พร้อมผู้ป่วยและเวลาที่ถ่ายเพื่อทบทวนทางคลินิก"
              : "Review saved wound photos with their assigned patient and capture time."}
          </p>
        </div>
        <button
          type="button"
          className="camera-history-refresh"
          onClick={() => void history.refetch()}
          disabled={history.isFetching}
        >
          <RefreshCw
            aria-hidden="true"
            className={history.isFetching ? "is-spinning" : undefined}
          />
          <span>{language === "th" ? "รีเฟรชประวัติ" : "Refresh history"}</span>
        </button>
      </div>

      <div className="camera-history-summary" aria-label="History summary">
        <div className="camera-history-summary-card">
          <span className="camera-history-summary-icon is-blue">
            <FileImage aria-hidden="true" />
          </span>
          <span>
            <small>
              {language === "th" ? "ภาพถ่ายในประวัติ" : "Photos in history"}
            </small>
            <strong>{total}</strong>
          </span>
        </div>
        <div className="camera-history-summary-card">
          <span className="camera-history-summary-icon is-cyan">
            <ImageIcon aria-hidden="true" />
          </span>
          <span>
            <small>
              {language === "th" ? "รายการในหน้านี้" : "On this page"}
            </small>
            <strong>{photos.length}</strong>
          </span>
        </div>
        <div className="camera-history-summary-card camera-history-summary-card-wide">
          <span className="camera-history-summary-icon is-slate">
            <CalendarDays aria-hidden="true" />
          </span>
          <span>
            <small>
              {language === "th" ? "บันทึกล่าสุดในผลลัพธ์" : "Latest result"}
            </small>
            <strong>
              {latestCapture
                ? formatDate(latestCapture, language, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "—"}
            </strong>
          </span>
        </div>
      </div>

      <div className="camera-history-filter-panel">
        <div className="camera-history-filter-heading">
          <div>
            <strong>
              {language === "th"
                ? "กรองประวัติรูปถ่าย"
                : "Filter photo history"}
            </strong>
            <span>{filterLabel}</span>
          </div>
          {(search || patientId || from || to) && (
            <button type="button" onClick={resetFilters}>
              {t("resetFilters")}
            </button>
          )}
        </div>
        <div className="camera-history-filters">
          <label className="camera-history-filter-search">
            <span className="sr-only">
              {language === "th"
                ? "ค้นหาประวัติรูปถ่าย"
                : "Search photo history"}
            </span>
            <Search aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder={
                language === "th"
                  ? "ค้นหาด้วยชื่อผู้ป่วย หรือเลข HN..."
                  : "Search by patient name or HN..."
              }
            />
          </label>
          <label className="camera-history-field">
            <span>{t("filterByPatient")}</span>
            <select
              value={patientId}
              onChange={event => setPatientId(event.target.value)}
              className="field-control"
            >
              <option value="">{t("allPatients")}</option>
              {(patients.data ?? []).map(patient => (
                <option key={patient.id} value={patient.id}>
                  {patient.patientCode} ·{" "}
                  {patient.displayName || t("registeredPatient")}
                </option>
              ))}
            </select>
          </label>
          <label className="camera-history-field">
            <span>{t("fromDate")}</span>
            <Input
              type="date"
              value={from}
              onChange={event => setFrom(event.target.value)}
            />
          </label>
          <label className="camera-history-field">
            <span>{t("toDate")}</span>
            <Input
              type="date"
              value={to}
              onChange={event => setTo(event.target.value)}
            />
          </label>
          <div className="camera-history-filter-status">
            <Search aria-hidden="true" />
            <span>
              {language === "th"
                ? `${total} รายการตามเงื่อนไขที่เลือก`
                : `${total} records match the selected filters`}
            </span>
          </div>
        </div>
      </div>

      <div className="camera-history-feed-heading">
        <div>
          <strong>
            {language === "th" ? "บันทึกภาพถ่ายล่าสุด" : "Latest wound photos"}
          </strong>
          <span>
            {language === "th"
              ? "แสดงข้อมูลจากรูปที่บันทึกจริงเท่านั้น"
              : "Showing source-backed photo records only"}
          </span>
        </div>
        {total > 0 && (
          <span className="camera-history-page-label">
            {language === "th"
              ? `หน้า ${page} จาก ${pageCount}`
              : `Page ${page} of ${pageCount}`}
          </span>
        )}
      </div>

      <div className="camera-history-body">
        {history.isLoading ? (
          <div className="camera-history-grid camera-history-grid-skeleton">
            {Array.from({ length: PAGE_SIZE }, (_, index) => (
              <div key={index} className="camera-history-skeleton-card">
                <div className="camera-history-skeleton-image" />
                <div className="camera-history-skeleton-copy" />
                <div className="camera-history-skeleton-copy is-short" />
              </div>
            ))}
          </div>
        ) : history.isError ? (
          <div
            className="record-empty-state camera-history-state is-error"
            role="alert"
          >
            <Search aria-hidden="true" />
            <h3>
              {language === "th"
                ? "โหลดประวัติรูปถ่ายไม่สำเร็จ"
                : "Photo history could not be loaded"}
            </h3>
            <p>
              {language === "th"
                ? "ลองรีเฟรชอีกครั้ง หรือติดต่อผู้ดูแลระบบท้องถิ่น"
                : "Refresh the history or contact the local administrator."}
            </p>
            <button type="button" onClick={() => void history.refetch()}>
              {language === "th" ? "ลองอีกครั้ง" : "Try again"}
            </button>
          </div>
        ) : photos.length === 0 ? (
          <div className="record-empty-state camera-history-state">
            <Search aria-hidden="true" />
            <h3>{t("noCaptureHistory")}</h3>
            <p>{t("noCaptureHistoryDetail")}</p>
            {(search || patientId || from || to) && (
              <button type="button" onClick={resetFilters}>
                {t("resetFilters")}
              </button>
            )}
          </div>
        ) : (
          <div className="camera-history-grid">
            {photos.map(photo => (
              <PhotoHistoryRecord
                key={photo.id}
                photo={photo}
                language={language}
                t={t}
                onOpen={(url, selectedPhoto) =>
                  setActivePhoto({ photo: selectedPhoto, url })
                }
              />
            ))}
          </div>
        )}
      </div>

      {total > 0 && (
        <div className="camera-history-pagination">
          <span>
            {language === "th"
              ? `แสดงภาพลำดับที่ ${(page - 1) * PAGE_SIZE + 1} - ${Math.min(page * PAGE_SIZE, total)} จากทั้งหมด ${total} รายการ`
              : `Showing ${(page - 1) * PAGE_SIZE + 1} - ${Math.min(page * PAGE_SIZE, total)} of ${total} photos`}
          </span>
          <div className="camera-history-pagination-actions">
            <button
              type="button"
              aria-label={language === "th" ? "หน้าก่อนหน้า" : "Previous page"}
              disabled={page <= 1}
              onClick={() =>
                setPage(currentPage => Math.max(1, currentPage - 1))
              }
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            {pageNumbers.map(pageNumber => (
              <button
                key={pageNumber}
                type="button"
                className={page === pageNumber ? "is-active" : undefined}
                aria-current={page === pageNumber ? "page" : undefined}
                onClick={() => setPage(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}
            <button
              type="button"
              aria-label={language === "th" ? "หน้าถัดไป" : "Next page"}
              disabled={page >= pageCount}
              onClick={() =>
                setPage(currentPage => Math.min(pageCount, currentPage + 1))
              }
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <p className="camera-history-disclaimer">
        {t("captureHistoryDecisionSupport")}
      </p>

      {activePhoto && (
        <div
          className="camera-history-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={t("openPhoto")}
          onMouseDown={event => {
            if (event.target === event.currentTarget) setActivePhoto(null);
          }}
        >
          <div className="camera-history-lightbox-card">
            <div className="camera-history-lightbox-header">
              <div>
                <strong>
                  {activePhoto.photo.patientCode} ·{" "}
                  {activePhoto.photo.displayName || t("registeredPatient")}
                </strong>
                <span>
                  {activePhoto.photo.capturedAt
                    ? formatDate(activePhoto.photo.capturedAt, language, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : activePhoto.photo.capturedOn || t("dateNotRecorded")}
                </span>
              </div>
              <button
                type="button"
                aria-label={language === "th" ? "ปิดรูปภาพ" : "Close photo"}
                onClick={() => setActivePhoto(null)}
              >
                <X aria-hidden="true" />
              </button>
            </div>
            <img
              src={activePhoto.url}
              alt={
                activePhoto.photo.caption ||
                `${t("woundPhoto")} ${activePhoto.photo.fileName}`
              }
            />
            {activePhoto.photo.caption && <p>{activePhoto.photo.caption}</p>}
          </div>
        </div>
      )}
    </section>
  );
}

function PhotoHistoryRecord({
  photo,
  language,
  t,
  onOpen,
}: {
  photo: PhotoHistoryPhoto;
  language: "th" | "en";
  t: (key: string) => string;
  onOpen: (url: string, photo: PhotoHistoryPhoto) => void;
}) {
  const { url, error } = useAuthenticatedMediaUrl(photo.storageUrl);
  const patientName = photo.displayName || t("registeredPatient");
  const initials = getInitials(patientName);
  const capturedLabel = photo.capturedAt
    ? formatDate(photo.capturedAt, language, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : photo.capturedOn || t("dateNotRecorded");

  return (
    <article className="camera-history-record">
      <div className="camera-history-record-image">
        {url ? (
          <button
            type="button"
            className="camera-history-image-button"
            onClick={() => onOpen(url, photo)}
            aria-label={`${t("openPhoto")}: ${patientName}`}
          >
            <img
              src={url}
              alt={photo.caption || `${t("woundPhoto")} ${photo.fileName}`}
              loading="lazy"
            />
            <span className="camera-history-image-view">
              <Eye aria-hidden="true" />
            </span>
          </button>
        ) : (
          <div className="camera-history-image-unavailable">
            <ImageIcon aria-hidden="true" />
            <span>{error ? "Image unavailable" : "Loading…"}</span>
          </div>
        )}
        <span className="camera-history-image-label">{t("woundPhoto")}</span>
        <span className="camera-history-image-file">{photo.fileName}</span>
      </div>
      <div className="camera-history-record-body">
        <div className="camera-history-record-patient">
          <span aria-hidden="true">{initials}</span>
          <div>
            <strong title={patientName}>{patientName}</strong>
            <small>
              HN: {photo.patientCode}
              {photo.registrationLocation
                ? ` · ${photo.registrationLocation}`
                : ""}
            </small>
          </div>
        </div>
        <div className="camera-history-record-meta">
          <span>
            <CalendarDays aria-hidden="true" />
            {capturedLabel}
          </span>
          <span className={photo.woundAssessmentId ? "is-linked" : undefined}>
            {photo.woundAssessmentId
              ? t("woundAssessmentLink")
              : t("notLinked")}
          </span>
        </div>
        {photo.caption && (
          <p className="camera-history-record-caption" title={photo.caption}>
            {photo.caption}
          </p>
        )}
        <button
          type="button"
          className="camera-history-record-action"
          disabled={!url}
          onClick={() => {
            if (url) onOpen(url, photo);
          }}
        >
          <Eye aria-hidden="true" />
          <span>{t("openPhoto")}</span>
        </button>
      </div>
    </article>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "—";
  return parts
    .slice(0, 2)
    .map(part => part.slice(0, 1))
    .join("")
    .toUpperCase();
}
