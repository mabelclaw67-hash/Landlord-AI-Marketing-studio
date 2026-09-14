import { useCallback, useEffect, useState } from "react";
import { getPublicListings } from "../utils/storage";

// Shared load/timeout/error/retry state for public listing pages. /rentals
// and /apply both fetch the same public getListings data and must behave
// identically when the Apps Script backend is slow or unreachable — one
// hook keeps that behavior from drifting between the two pages.
//
// apiPost already enforces an 18s hard timeout (src/utils/api.js) and
// retries transient Apps Script redirect-delivery 404s on its own, so by
// the time a rejection reaches here it is a real failure worth showing the
// visitor, with a Retry button rather than an indefinite spinner.
export function usePublicRentalListings() {
  const [listings, setListings] = useState([]);
  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "error"
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  const retry = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    // `cancelled` is local to this effect run (not a ref) so a re-entrant
    // run — StrictMode's mount/cleanup/remount, or a Retry click firing
    // while a prior request is still in flight — can never have its stale
    // response mistaken for the current one; each run gets its own flag.
    let cancelled = false;
    setStatus("loading");
    setError("");

    getPublicListings()
      .then((rows) => {
        if (cancelled) return;
        setListings(rows || []);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || "Unable to load rental listings. Please try again.");
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  return {
    listings,
    loading: status === "loading",
    error: status === "error" ? error : "",
    retry,
  };
}
