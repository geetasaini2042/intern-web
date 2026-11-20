import { useEffect, useState } from "react";
import {
  Award,
  FileBadge,
  FileCheck,
  FileDown,
  RefreshCw,
  Search,
  ShieldCheck,
  CircleCheck,
  CircleX,
  Clock,
  Wallet,
  GraduationCap,
  AlertCircle,
  Loader2,
  X
} from "lucide-react";
import { apiGet, apiDownload } from "./lib/api";

const normalize = value =>
  String(value || "").toLowerCase().replaceAll("_", " ").trim();

const isPaid = internship => {
  const status = normalize(
    internship.payment_status || internship.payment?.status
  );

  return (
    internship.payment_complete === true ||
    internship.fully_paid === true ||
    internship.payment_paid === true ||
    internship.is_paid === true ||
    status === "paid" ||
    status === "completed" ||
    status === "success" ||
    status === "successful"
  );
};

const isCompleted = internship => {
  const status = normalize(
    internship.completion_status ||
    internship.status ||
    internship.internship_status
  );

  return (
    internship.completed === true ||
    internship.is_completed === true ||
    internship.completion_complete === true ||
    status === "completed" ||
    status === "complete" ||
    status === "successfully completed"
  );
};

const isEligible = internship => {
  return (
    isPaid(internship) &&
    isCompleted(internship) &&
    (
      internship.certificate_eligible === true ||
      internship.eligible_for_certificate === true ||
      internship.eligible === true
    )
  );
};

const formatDate = value => {
  if (!value) return "Not available";

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
};

const getPaymentLabel = internship => {
  if (isPaid(internship)) return "Fully Paid";

  const status = normalize(
    internship.payment_status || internship.payment?.status
  );

  if (status.includes("partial")) return "Partially Paid";
  if (status.includes("refund")) return "Refunded";
  if (status.includes("pending")) return "Payment Pending";

  return "Payment Incomplete";
};

const getCompletionLabel = internship => {
  if (isCompleted(internship)) return "Completed";

  const status = normalize(
    internship.completion_status ||
    internship.status ||
    internship.internship_status
  );

  if (status === "in progress" || status === "ongoing") {
    return "In Progress";
  }

  return "Not Completed";
};

const getHours = internship => {
  const completed =
    internship.completed_hours ??
    internship.hours_completed ??
    internship.total_hours_completed ??
    internship.logged_hours ??
    0;

  const required =
    internship.required_hours ??
    internship.total_required_hours ??
    internship.duration_hours ??
    internship.hours ??
    internship.total_hours ??
    0;

  return { completed: Number(completed) || 0, required: Number(required) || 0 };
};

const getInternshipName = internship =>
  internship.internship_name ||
  internship.program_name ||
  internship.title ||
  internship.name ||
  internship.internship ||
  "Internship Program";

const getInternshipId = internship =>
  internship.internship_id ||
  internship.id ||
  internship._id ||
  internship.program_id;

export default function Certificates() {
  const [internships, setInternships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState(null);
  const [selected, setSelected] = useState(null);

  const loadData = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const data = await apiGet("/intern/certificates");

      const list =
        data?.internships ||
        data?.certificates ||
        data?.programs ||
        data?.items ||
        data?.data ||
        [];

      setInternships(Array.isArray(list) ? list : []);
    } catch (e) {
      setInternships([]);
      setError(e.message || "Unable to load internship eligibility.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const eligibleCount = internships.filter(isEligible).length;
  const completedCount = internships.filter(isCompleted).length;
  const paidCount = internships.filter(isPaid).length;

  const filtered = internships.filter(internship =>
    getInternshipName(internship)
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const downloadCertificate = async internship => {
    const id = getInternshipId(internship);

    if (!id || !isEligible(internship)) return;

    setDownloading(id);
    setError("");

    try {
      await apiDownload(
        `/intern/certificates/${encodeURIComponent(id)}/download`,
        `Internship-Certificate-${id}.pdf`
      );
    } catch (e) {
      setError(e.message || "Certificate download failed.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-10 text-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        <div className="flex flex-col gap-4 pt-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <GraduationCap size={16} />
              Internship
              <span>/</span>
              Certificates
            </div>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              My Certificates
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Verify your internship eligibility and download certificates.
            </p>
          </div>

          <button
            onClick={() => loadData(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Refresh Status
          </button>
        </div>

        {error && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Verification Error</p>
              <p className="mt-1">{error}</p>
            </div>
            <button onClick={() => setError("")}>
              <X size={16} />
            </button>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Total Internships"
            value={internships.length}
            icon={GraduationCap}
            color="blue"
          />

          <StatCard
            label="Payment Complete"
            value={paidCount}
            icon={Wallet}
            color="green"
          />

          <StatCard
            label="Completed"
            value={completedCount}
            icon={FileCheck}
            color="purple"
          />

          <StatCard
            label="Certificates Available"
            value={eligibleCount}
            icon={Award}
            color="amber"
          />
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 shrink-0 text-blue-600" size={20} />

              <div>
                <h3 className="text-sm font-semibold text-blue-900">
                  Certificate Eligibility
                </h3>

                <p className="mt-1 text-sm leading-5 text-blue-800">
                  Certificates are available only after payment verification
                  and successful completion of the assigned internship.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search internship programs..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <span className="text-xs text-slate-500">
              {filtered.length} internship{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          <h2 className="mt-5 font-semibold text-slate-900">
            Your Internship Programs
          </h2>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={27} className="animate-spin text-blue-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <FileBadge size={25} />
              </div>

              <h3 className="mt-4 font-semibold text-slate-800">
                No internship records found
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {internships.length
                  ? "No internships match your search."
                  : "Your internship registrations will appear here."}
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {filtered.map((internship, index) => (
                <CertificateCard
                  key={getInternshipId(internship) || index}
                  internship={internship}
                  downloading={downloading === getInternshipId(internship)}
                  onDownload={() => downloadCertificate(internship)}
                  onDetails={() => setSelected(internship)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {selected && (
        <EligibilityModal
          internship={selected}
          onClose={() => setSelected(null)}
          onDownload={() => {
            const current = selected;
            setSelected(null);
            downloadCertificate(current);
          }}
          downloading={downloading === getInternshipId(selected)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600"
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
        </div>

        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors[color]}`}>
          <Icon size={19} />
        </div>
      </div>
    </div>
  );
}

function CertificateCard({ internship, downloading, onDownload, onDetails }) {
  const paid = isPaid(internship);
  const completed = isCompleted(internship);
  const eligible = isEligible(internship);
  const hours = getHours(internship);

  const progress = hours.required > 0
    ? Math.min(100, Math.round(hours.completed / hours.required * 100))
    : null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Award size={23} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">
              {getInternshipName(internship)}
            </h3>

            {eligible ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                <CircleCheck size={13} />
                Eligible
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                <Clock size={13} />
                Pending
              </span>
            )}
          </div>

          <p className="mt-1 text-sm text-slate-500">
            {internship.domain || internship.internship_type || internship.program_type || "Internship Program"}
          </p>

          {internship.start_date && (
            <p className="mt-2 text-xs text-slate-500">
              {formatDate(internship.start_date)}
              {internship.end_date ? ` — ${formatDate(internship.end_date)}` : ""}
            </p>
          )}

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <CheckItem
              label="Payment"
              value={getPaymentLabel(internship)}
              passed={paid}
            />

            <CheckItem
              label="Completion"
              value={getCompletionLabel(internship)}
              passed={completed}
            />

            <CheckItem
              label="Certificate"
              value={eligible ? "Available" : "Not Available"}
              passed={eligible}
            />
          </div>

          {hours.required > 0 && (
            <div className="mt-4 rounded-xl bg-slate-50 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Internship Hours</span>
                <span className="font-semibold text-slate-700">
                  {hours.completed} / {hours.required} hours
                </span>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {!eligible && (
            <p className="mt-3 text-xs leading-5 text-slate-500">
              {(!paid && !completed)
                ? "Complete your payment and internship requirements to unlock your certificate."
                : !paid
                  ? "Complete your payment to unlock your certificate."
                  : !completed
                    ? "Complete your internship requirements to unlock your certificate."
                    : "Certificate eligibility is awaiting backend verification."}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
        <button
          onClick={onDetails}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          View Details
        </button>

        <button
          onClick={onDownload}
          disabled={!eligible || downloading}
          className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            eligible
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "cursor-not-allowed bg-slate-100 text-slate-400"
          }`}
        >
          {downloading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Preparing...
            </>
          ) : (
            <>
              <FileDown size={16} />
              Download Certificate
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function CheckItem({ label, value, passed }) {
  return (
    <div className={`rounded-xl border p-3 ${
      passed
        ? "border-green-100 bg-green-50"
        : "border-amber-100 bg-amber-50"
    }`}>
      <div className="flex items-center gap-1.5">
        {passed
          ? <CircleCheck size={14} className="text-green-600" />
          : <CircleX size={14} className="text-amber-600" />}

        <span className="text-[11px] text-slate-500">{label}</span>
      </div>

      <p className={`mt-1 text-xs font-semibold ${
        passed ? "text-green-700" : "text-amber-700"
      }`}>
        {value}
      </p>
    </div>
  );
}

function EligibilityModal({ internship, onClose, onDownload, downloading }) {
  const paid = isPaid(internship);
  const completed = isCompleted(internship);
  const eligible = isEligible(internship);
  const hours = getHours(internship);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-sm sm:p-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FileBadge size={22} />
            </div>

            <h2 className="mt-3 text-lg font-bold text-slate-900">
              Certificate Verification
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {getInternshipName(internship)}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 p-5">
          <VerificationRow
            title="Payment Verification"
            description={getPaymentLabel(internship)}
            passed={paid}
          />

          <VerificationRow
            title="Internship Completion"
            description={getCompletionLabel(internship)}
            passed={completed}
          />

          {hours.required > 0 && (
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-700">Hours Completed</p>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {hours.completed} / {hours.required} hours
              </p>
            </div>
          )}

          <VerificationRow
            title="Certificate Eligibility"
            description={eligible ? "Verified and eligible" : "Requirements not fulfilled"}
            passed={eligible}
          />

          {internship.certificate_number && (
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Certificate Number</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {internship.certificate_number}
              </p>
            </div>
          )}

          {internship.completion_date && (
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Completion Date</p>
              <p className="mt-1 text-sm font-medium text-slate-800">
                {formatDate(internship.completion_date)}
              </p>
            </div>
          )}

          <button
            onClick={onDownload}
            disabled={!eligible || downloading}
            className={`mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${
              eligible
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            {downloading ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <FileDown size={17} />
            )}

            {downloading ? "Preparing Certificate..." : "Download Certificate"}
          </button>
        </div>
      </div>
    </div>
  );
}

function VerificationRow({ title, description, passed }) {
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 ${
      passed
        ? "border-green-200 bg-green-50"
        : "border-amber-200 bg-amber-50"
    }`}>
      {passed
        ? <CircleCheck size={19} className="mt-0.5 shrink-0 text-green-600" />
        : <Clock size={19} className="mt-0.5 shrink-0 text-amber-600" />}

      <div>
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <p className={`mt-1 text-xs ${
          passed ? "text-green-700" : "text-amber-700"
        }`}>
          {description}
        </p>
      </div>
    </div>
  );
}
