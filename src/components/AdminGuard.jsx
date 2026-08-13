import { useState } from "react";
import { useLocation } from "react-router-dom";
import { canAccessModule, readTrialAccess, storeAdminSession, clearAdminSession, isAdminSessionActive } from "../utils/trialAccess";
import { apiPost } from "../utils/api";
import { useLang } from "../contexts/LangContext";

// Which module's credentials the pages under this path will actually send.
// Everything under /admin/home-sale talks to the sale module; the rest of the
// admin workspace calls getStudioRequestAuth("rental"). The /admin index is a
// dispatch page, so either module may view it.
function adminModuleForPath(pathname) {
  if (pathname.startsWith("/admin/home-sale")) return "sale";
  if (pathname === "/admin" || pathname === "/admin/") return "any";
  return "rental";
}

export default function AdminGuard({ children }) {
  const lang = useLang();
  const location = useLocation();
  const trialSession = readTrialAccess();
  const [unlocked, setUnlocked] = useState(() => isAdminSessionActive());
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (unlocked) return children;
  // Trial users enter the admin workspace with data isolation enforced by the
  // backend, but only for the module their session actually grants. A leftover
  // or wrong-module trial record used to suppress this login form entirely:
  // getStudioRequestAuth() then emitted no credentials at all, so the workspace
  // rendered as if signed in while every authenticated call failed with
  // "Access denied. Please sign in with an approved trial access code."
  // Listing pages hid it — getListings/getListingById are no-auth actions — so
  // it only surfaced on Collage Cover and uploads. Falling through to the admin
  // unlock keeps a real admin one code away from a working session.
  const trialModule = adminModuleForPath(location.pathname);
  const trialGrantsThisArea = trialSession && (
    trialModule === "any"
      ? (canAccessModule(trialSession, "rental") || canAccessModule(trialSession, "sale"))
      : canAccessModule(trialSession, trialModule)
  );
  if (trialGrantsThisArea) return children;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = input.trim();
    if (!code) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiPost({ action: "validateAdminAccessCode", code });
      if (res?.valid) {
        storeAdminSession(code);
        setUnlocked(true);
      } else {
        setError(lang === "zh" ? "访问密码不正确。" : "Invalid access code.");
        setInput("");
      }
    } catch {
      setError("Could not reach server. Check connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-guard">
      <div className="admin-guard__card">
        <div className="admin-guard__brand">
          <div className="admin-guard__mark">V</div>
          <div>
            <strong>VanIsland Property</strong>
            <span>AI Studio · Admin</span>
          </div>
        </div>

        <h1 className="admin-guard__title">Admin Access</h1>
        <p className="admin-guard__sub">管理后台访问</p>

        <form onSubmit={handleSubmit} className="admin-guard__form">
          <label className="admin-guard__label">
            Admin Access Code
            <span>管理员访问密码</span>
          </label>
          <input
            className={`admin-guard__input${error ? " admin-guard__input--error" : ""}`}
            type="password"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(""); }}
            placeholder="••••••••••"
            autoComplete="off"
            autoFocus
            disabled={loading}
          />
          {error && (
            <p className="admin-guard__error">{error}</p>
          )}
          <button type="submit" className="admin-guard__btn" disabled={loading}>
            {loading
              ? (lang === "zh" ? "验证中…" : "Verifying…")
              : (lang === "zh" ? "进入管理后台" : "Enter Admin Studio")}
          </button>
        </form>

        <p className="admin-guard__note">
          Public pages are open without a code — only Admin Studio is protected.
        </p>
      </div>
    </div>
  );
}

/** Call this from anywhere inside admin to lock and return to the access screen. */
export function lockAdmin() {
  clearAdminSession();
  window.location.reload();
}
