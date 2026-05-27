import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getListing } from "../utils/storage";
import { getHomeSaleListing, getPublicSaleVideoScripts } from "../utils/homeSaleSheet";

function extractDriveFileId(url) {
  const text = String(url || "");
  const fileMatch = text.match(/\/file\/d\/([^/?#]+)/);
  if (fileMatch) return fileMatch[1];
  const idMatch = text.match(/[?&]id=([^&]+)/);
  return idMatch ? idMatch[1] : "";
}

function buildVideoEmbedUrl(videoUrl) {
  const fileId = extractDriveFileId(videoUrl);
  if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`;
  return videoUrl || "";
}

function buildVideoDownloadUrl(videoUrl) {
  const fileId = extractDriveFileId(videoUrl);
  if (fileId) return `https://drive.google.com/uc?export=download&id=${fileId}`;
  return videoUrl || "";
}

export default function PublicVideoPage({ type = "rental" }) {
  const params = useParams();
  const listingId = params.listingId || params.id;
  const [listing, setListing] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (type === "homeSale") {
        const row = await getHomeSaleListing(listingId);
        const scripts = await getPublicSaleVideoScripts(listingId).catch(() => []);
        const fallback = Array.isArray(scripts) ? scripts.find((item) => item.outputMp4Url)?.outputMp4Url : "";
        setListing(row);
        setVideoUrl(row?.videoUrl || fallback || "");
        return;
      }

      const row = await getListing(listingId);
      setListing(row);
      setVideoUrl(row?.videoUrl || "");
    }

    load()
      .catch((err) => setError(err.message || "Unable to load video."))
      .finally(() => setLoading(false));
  }, [listingId, type]);

  const title = listing?.address || listingId || "Property Video";
  const embedUrl = buildVideoEmbedUrl(videoUrl);
  const downloadUrl = buildVideoDownloadUrl(videoUrl);
  const listingPath = type === "homeSale"
    ? `/home-sale-studio/listings/${listingId}`
    : `/listings/${listingId}`;

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 960 }}>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <div>
              <h1 style={{ fontSize: "1.45rem", color: "#213128", marginBottom: 6 }}>{title}</h1>
              <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", margin: 0 }}>
                Property video
              </p>
            </div>
            <Link to={listingPath} className="btn btn--ghost">
              Back to Listing
            </Link>
          </div>

          {loading && <p style={{ color: "var(--color-text-muted)" }}>Loading video...</p>}
          {!loading && error && (
            <div className="notice notice--error">
              <h4>Unable to Load Video</h4>
              <p>{error}</p>
            </div>
          )}
          {!loading && !error && !embedUrl && (
            <div className="notice notice--warm">
              <h4>Video Not Available</h4>
              <p>This listing does not have a published video yet.</p>
            </div>
          )}
          {!loading && !error && embedUrl && (
            <>
              <div style={{ width: "100%", aspectRatio: "16 / 9", background: "#000", borderRadius: 8, overflow: "hidden", marginBottom: 14 }}>
                <iframe
                  src={embedUrl}
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  title={`${title} video`}
                  style={{ width: "100%", height: "100%", border: "none", display: "block" }}
                />
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a href={downloadUrl || videoUrl} target="_blank" rel="noopener noreferrer" className="btn btn--primary">
                  Download MP4
                </a>
                <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">
                  Open Source Video
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
