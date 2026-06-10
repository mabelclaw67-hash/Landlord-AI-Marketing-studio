import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { uploadSupportingDocument, validateUploadToken } from "../utils/storage";

const CATEGORIES = [
  "Government Photo ID",
  "Income Proof / Pay Stubs",
  "Employment Letter",
  "NOA / T4",
  "Credit Report",
  "Bank Statements / Proof of Funds",
  "Landlord Reference",
  "Tenant Insurance",
  "Other Documents",
];

function fmt(value) {
  if (!value) return "";
  try { return new Date(value).toLocaleString("en-CA"); } catch { return value; }
}

export default function SupportDocuments() {
  const { listingId, recordId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const hasMissingParams = !listingId || !recordId || !token;
  const [loading, setLoading] = useState(!hasMissingParams);
  const [error, setError] = useState("");
  const [details, setDetails] = useState(null);
  const [selected, setSelected] = useState({});
  const [busyCategory, setBusyCategory] = useState("");
  const [message, setMessage] = useState("");

  const invalidMessage = "This upload link is invalid or expired.";
  const expiredMessage = "This link has expired. Please contact property management.";

  useEffect(() => {
    if (hasMissingParams) return;
    validateUploadToken(listingId, recordId, token)
      .then(setDetails)
      .catch((e) => setError(String(e?.message || "").includes(expiredMessage) ? expiredMessage : invalidMessage))
      .finally(() => setLoading(false));
  }, [hasMissingParams, listingId, recordId, token]);

  const uploadedCount = useMemo(() => {
    const count = Number(details?.uploadedFileCount || 0);
    return Number.isFinite(count) ? count : 0;
  }, [details]);

  async function handleUpload(category) {
    const files = Array.from(selected[category] || []);
    if (files.length === 0) {
      setMessage("Please choose at least one file first.");
      return;
    }
    setBusyCategory(category);
    setMessage("");
    try {
      let latest = null;
      for (const file of files) {
        latest = await uploadSupportingDocument(listingId, recordId, token, category, file);
      }
      setDetails((prev) => ({
        ...prev,
        documentUploadStatus: latest?.documentUploadStatus || "Uploaded",
        uploadedFileCount: latest?.uploadedFileCount ?? prev?.uploadedFileCount,
        lastUploadAt: latest?.lastUploadAt || prev?.lastUploadAt,
      }));
      setSelected((prev) => ({ ...prev, [category]: [] }));
      setMessage("Upload complete. Thank you.");
    } catch (e) {
      const text = e.message || "Upload failed. Please try again.";
      setMessage(text.includes(expiredMessage) ? expiredMessage : text);
    } finally {
      setBusyCategory("");
    }
  }

  if (loading) {
    return (
      <main style={{ maxWidth: 760, margin: "56px auto", padding: "0 20px" }}>
        <div className="card" style={{ padding: 32, textAlign: "center" }}>Loading...</div>
      </main>
    );
  }

  if (hasMissingParams || error || !details?.valid) {
    return (
      <main style={{ maxWidth: 760, margin: "56px auto", padding: "0 20px" }}>
        <div className="card" style={{ padding: 32, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: 10 }}>{invalidMessage}</h1>
        </div>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 860, margin: "32px auto 80px", padding: "0 20px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontWeight: 800, fontSize: "1.55rem", marginBottom: 8 }}>
          Supporting Document Upload
        </h1>
        <p style={{ color: "var(--color-text-muted)", lineHeight: 1.7 }}>
          Please upload the documents that apply to your situation. Multiple files can be uploaded under each category.
        </p>
      </div>

      <section className="card mb-24">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16 }}>
          <div>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>Property</p>
            <p style={{ fontWeight: 700 }}>{details.propertyAddress || listingId}</p>
          </div>
          <div>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>Applicant</p>
            <p style={{ fontWeight: 700 }}>{details.applicantName || "Applicant"}</p>
          </div>
          <div>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>Application ID</p>
            <p style={{ fontFamily: "monospace", fontWeight: 700 }}>{recordId}</p>
          </div>
          <div>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>Uploaded Files</p>
            <p style={{ fontWeight: 700 }}>{uploadedCount}</p>
          </div>
        </div>
        {details.lastUploadAt && (
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.82rem", marginTop: 12 }}>
            Last upload: {fmt(details.lastUploadAt)}
          </p>
        )}
      </section>

      <section className="card mb-24">
        <h2 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: 10 }}>Document checklist</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
          {CATEGORIES.map((category) => (
            <label key={category} style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--color-text-muted)", fontSize: "0.88rem" }}>
              <input type="checkbox" readOnly />
              <span>{category}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: 16 }}>Upload files</h2>
        <div style={{ display: "grid", gap: 14 }}>
          {CATEGORIES.map((category) => (
            <div
              key={category}
              className="support-upload-row"
              style={{
                gap: 12,
                alignItems: "center",
                padding: "12px 0",
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              <label style={{ fontWeight: 700, fontSize: "0.88rem" }}>{category}</label>
              <input
                type="file"
                multiple
                onChange={(e) => setSelected((prev) => ({ ...prev, [category]: e.target.files }))}
              />
              <button
                type="button"
                className="btn btn--sm"
                disabled={busyCategory === category}
                onClick={() => handleUpload(category)}
              >
                {busyCategory === category ? "Uploading..." : "Upload"}
              </button>
            </div>
          ))}
        </div>
        {message && (
          <p style={{ marginTop: 16, color: message.includes("complete") ? "#2e7d4f" : "var(--color-text-muted)", fontWeight: 700 }}>
            {message}
          </p>
        )}
      </section>
    </main>
  );
}
