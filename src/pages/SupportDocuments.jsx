import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  getListing,
  uploadPublicSupportingDocument,
  uploadSupportingDocument,
  validateUploadToken,
} from "../utils/storage";
import { COMPANY_FOOTER } from "../components/Footer";
import { isRentalListingAcceptingApplications } from "../utils/listingPublicMeta";
import { usePublicUploadTurnstile } from "../components/PublicUploadTurnstile";

const CATEGORIES = [
  "Proof of income / employment",
  "Photo ID",
  "References",
  "Tenant insurance",
  "Other requested documents",
];

const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"];
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const CLOSED_MESSAGE = "This listing is no longer accepting applications or supporting documents.";
const SUCCESS_MESSAGE = "Thank you. Your supporting documents have been received.";

function PrivacySecurityNote() {
  return (
    <section className="notice notice--sage mb-24">
      <h4>Privacy and security note</h4>
      <p>
        Your documents will be submitted to VanIsland Property through our secure company workflow.
      </p>
      <p style={{ marginTop: 8 }}>
        You may choose either: upload documents online through this website, or email documents to our company email:{" "}
        <a href={`mailto:${COMPANY_FOOTER.email}`}>{COMPANY_FOOTER.email}</a>.
      </p>
      <p style={{ marginTop: 8 }}>
        Please do not send documents through personal email, text message, or social media.
      </p>
      <p style={{ marginTop: 8 }}>
        Uploaded documents are stored in the company's secure Google Workspace / Google Drive environment and are used only for rental application review.
      </p>
    </section>
  );
}

function fmt(value) {
  if (!value) return "";
  try { return new Date(value).toLocaleString("en-CA"); } catch { return value; }
}

function clean(value) {
  return String(value || "").trim();
}

function validateFile(file) {
  const lowerName = String(file?.name || "").toLowerCase();
  const hasAllowedExtension = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  const hasAllowedType = !file?.type || ALLOWED_TYPES.includes(file.type);
  if (!hasAllowedExtension || !hasAllowedType) {
    return "Please upload PDF, JPG, JPEG, PNG, DOC, or DOCX files only.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "Each file must be 10 MB or smaller.";
  }
  return "";
}

function titleForListing(listing, listingId) {
  if (!listing) return listingId || "";
  return [
    listing.bedrooms && `${listing.bedrooms} Bed`,
    listing.bathrooms && `${listing.bathrooms} Bath`,
    listing.address,
  ].filter(Boolean).join(" / ") || listing.address || listingId;
}

function TokenUploadPage({ listingId, recordId, token }) {
  const uploadTurnstile = usePublicUploadTurnstile();
  const hasMissingParams = !listingId || !recordId || !token;
  const [loading, setLoading] = useState(!hasMissingParams);
  const [error, setError] = useState("");
  const [details, setDetails] = useState(null);
  const [selected, setSelected] = useState({});
  const [busyCategory, setBusyCategory] = useState("");
  const [message, setMessage] = useState("");

  const invalidMessage = "This upload link is invalid or expired.";
  const expiredMessage = "This link has expired. Please contact VanIsland Property.";

  useEffect(() => {
    if (hasMissingParams) return;
    validateUploadToken(listingId, recordId, token)
      .then(setDetails)
      .catch((e) => setError(String(e?.message || "").includes(expiredMessage) ? expiredMessage : invalidMessage))
      .finally(() => setLoading(false));
  }, [expiredMessage, hasMissingParams, invalidMessage, listingId, recordId, token]);

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
    const invalid = files.map(validateFile).find(Boolean);
    if (invalid) {
      setMessage(invalid);
      return;
    }
    setBusyCategory(category);
    setMessage("");
    try {
      let latest = null;
      for (const file of files) {
        latest = await uploadSupportingDocument(listingId, recordId, token, category, file, await uploadTurnstile.consumeToken());
      }
      setDetails((prev) => ({
        ...prev,
        documentUploadStatus: latest?.documentUploadStatus || "Uploaded",
        uploadedFileCount: latest?.uploadedFileCount ?? prev?.uploadedFileCount,
        lastUploadAt: latest?.lastUploadAt || prev?.lastUploadAt,
      }));
      setSelected((prev) => ({ ...prev, [category]: [] }));
      setMessage(SUCCESS_MESSAGE);
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
          Submit Supporting Documents
        </h1>
        <p style={{ color: "var(--color-text-muted)", lineHeight: 1.7 }}>
          You may upload supporting documents here to help us review your rental application. Submitting documents early is optional, but it may help speed up the review process.
        </p>
      </div>

      <section className="card mb-24">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16 }}>
          <InfoBlock label="Property" value={details.propertyAddress || listingId} />
          <InfoBlock label="Applicant" value={details.applicantName || "Applicant"} />
          <InfoBlock label="Application ID" value={recordId} code />
          <InfoBlock label="Uploaded Files" value={uploadedCount} />
        </div>
        {details.lastUploadAt && (
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.82rem", marginTop: 12 }}>
            Last upload: {fmt(details.lastUploadAt)}
          </p>
        )}
      </section>

      <PrivacySecurityNote />

      <UploadPanel
        selected={selected}
        setSelected={setSelected}
        busyCategory={busyCategory}
        onUpload={handleUpload}
        message={message}
        turnstile={uploadTurnstile}
      />
    </main>
  );
}

function InfoBlock({ label, value, code = false }) {
  return (
    <div>
      <p style={{ color: "var(--color-text-muted)", fontSize: "0.78rem", fontWeight: 700, marginBottom: 4 }}>{label}</p>
      <p style={{ fontFamily: code ? "monospace" : undefined, fontWeight: 700 }}>{value || "—"}</p>
    </div>
  );
}

function UploadPanel({ selected, setSelected, busyCategory, onUpload, message, turnstile }) {
  return (
    <section className="card">
      <h2 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: 12 }}>Upload files</h2>
      <p style={{ color: "var(--color-text-muted)", fontSize: "0.84rem", lineHeight: 1.7, marginBottom: 16 }}>
        Accepted file types: PDF, JPG, JPEG, PNG, DOC, DOCX. Maximum 10 MB per file.
      </p>
      {turnstile && <div style={{ marginBottom: 16 }}>{turnstile.widget}<p style={{ color: "var(--color-text-muted)", fontSize: "0.84rem" }}>{turnstile.ready ? "Security check complete." : "Complete the security check before uploading."}</p></div>}
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
              accept={ALLOWED_EXTENSIONS.join(",")}
              onChange={(e) => setSelected((prev) => ({ ...prev, [category]: e.target.files }))}
            />
            <button
              type="button"
              className="btn btn--sm"
              disabled={busyCategory === category}
              onClick={() => onUpload(category)}
            >
              {busyCategory === category ? "Uploading..." : "Upload"}
            </button>
          </div>
        ))}
      </div>
      {message && (
        <p style={{ marginTop: 16, color: message.startsWith("Thank you") ? "#2e7d4f" : "var(--color-text-muted)", fontWeight: 700 }}>
          {message}
        </p>
      )}
    </section>
  );
}

export default function SupportDocuments() {
  const uploadTurnstile = usePublicUploadTurnstile();
  const { listingId: tokenListingId, recordId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const publicListingId = searchParams.get("listing") || "";
  const isTokenMode = Boolean(tokenListingId || recordId || token);
  const [listing, setListing] = useState(null);
  const [listingLoading, setListingLoading] = useState(!isTokenMode && !!publicListingId);
  const [listingError, setListingError] = useState("");
  const [form, setForm] = useState({ applicantName: "", email: "", phone: "", notes: "" });
  const [selected, setSelected] = useState({});
  const [busyCategory, setBusyCategory] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (isTokenMode || !publicListingId) return;
    let cancelled = false;
    setListingLoading(true);
    getListing(publicListingId)
      .then((row) => {
        if (!cancelled) setListing(row);
      })
      .catch((err) => {
        if (!cancelled) setListingError(err.message || "Unable to load listing.");
      })
      .finally(() => {
        if (!cancelled) setListingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isTokenMode, publicListingId]);

  if (isTokenMode) {
    return <TokenUploadPage listingId={tokenListingId} recordId={recordId} token={token} />;
  }

  const isListingOpen = listing && isRentalListingAcceptingApplications(listing);
  const propertyAddress = listing?.address || "";
  const listingTitle = titleForListing(listing, publicListingId);
  const emailSubject = `Supporting Documents - ${clean(form.applicantName) || "[Applicant Name]"} - ${propertyAddress || "[Property Address]"}`;
  const mailto = `mailto:${COMPANY_FOOTER.email}?subject=${encodeURIComponent(emailSubject)}`;

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handlePublicUpload(category) {
    const files = Array.from(selected[category] || []);
    if (!isListingOpen) {
      setMessage(CLOSED_MESSAGE);
      return;
    }
    if (!clean(form.applicantName) || !clean(form.email) || !clean(form.phone)) {
      setMessage("Please enter your full name, email, and phone number before uploading.");
      return;
    }
    if (files.length === 0) {
      setMessage("Please choose at least one file first.");
      return;
    }
    const invalid = files.map(validateFile).find(Boolean);
    if (invalid) {
      setMessage(invalid);
      return;
    }

    setBusyCategory(category);
    setMessage("");
    try {
      for (const file of files) {
        await uploadPublicSupportingDocument({
          listingId: publicListingId,
          applicantName: clean(form.applicantName),
          email: clean(form.email),
          phone: clean(form.phone),
          notes: clean(form.notes),
          category,
          file,
          turnstileToken: await uploadTurnstile.consumeToken(),
        });
      }
      setSelected((prev) => ({ ...prev, [category]: [] }));
      setMessage(SUCCESS_MESSAGE);
    } catch (err) {
      setMessage(err.message || "Upload failed. Please try again.");
    } finally {
      setBusyCategory("");
    }
  }

  return (
    <main style={{ maxWidth: 900, margin: "32px auto 80px", padding: "0 20px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontWeight: 800, fontSize: "1.55rem", marginBottom: 8 }}>
          Submit Supporting Documents
        </h1>
        <p style={{ color: "var(--color-text-muted)", lineHeight: 1.7 }}>
          You may upload supporting documents here to help us review your rental application. Submitting documents early is optional, but it may help speed up the review process.
        </p>
      </div>

      {!publicListingId && (
        <div className="notice notice--warm">
          <p>Please open this page from a current rental listing.</p>
          <Link to="/rentals" className="btn btn--ghost btn--sm" style={{ marginTop: 10 }}>View Rental Listings</Link>
        </div>
      )}

      {publicListingId && listingLoading && (
        <div className="card" style={{ padding: 32, textAlign: "center" }}>Loading listing...</div>
      )}

      {publicListingId && !listingLoading && (listingError || !isListingOpen) && (
        <div className="card" style={{ padding: 32, textAlign: "center" }}>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 800, marginBottom: 8 }}>Document Upload Not Available</h2>
          <p style={{ color: "var(--color-text-muted)", lineHeight: 1.7, marginBottom: 16 }}>
            {CLOSED_MESSAGE}
          </p>
          <Link to="/rentals" className="btn btn--primary">View Available Rentals</Link>
        </div>
      )}

      {publicListingId && !listingLoading && isListingOpen && (
        <>
          <section className="card mb-24">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16 }}>
              <InfoBlock label="Listing ID" value={publicListingId} code />
              <InfoBlock label="Property address" value={propertyAddress} />
              <InfoBlock label="Listing title" value={listingTitle} />
            </div>
          </section>

          <section className="card mb-24">
            <h2 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: 16 }}>Applicant information</h2>
            <div className="grid-2">
              <label className="form-group">
                <span>Full name *</span>
                <input className="form-control" value={form.applicantName} onChange={(e) => setField("applicantName", e.target.value)} />
              </label>
              <label className="form-group">
                <span>Email *</span>
                <input className="form-control" type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} />
              </label>
              <label className="form-group">
                <span>Phone number *</span>
                <input className="form-control" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
              </label>
              <label className="form-group">
                <span>Optional notes</span>
                <input className="form-control" value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
              </label>
            </div>
          </section>

          <section className="notice notice--sage mb-24">
            <h4>Prefer email?</h4>
            <p>
              You may also email your documents to{" "}
              <a href={mailto}>{COMPANY_FOOTER.email}</a>. Please include your full name and the property address in the email subject line.
            </p>
            <p style={{ marginTop: 8, fontWeight: 700 }}>
              Suggested subject: {emailSubject}
            </p>
          </section>

          <PrivacySecurityNote />

          <UploadPanel
            selected={selected}
            setSelected={setSelected}
            busyCategory={busyCategory}
            onUpload={handlePublicUpload}
            message={message}
            turnstile={uploadTurnstile}
          />
        </>
      )}
    </main>
  );
}
