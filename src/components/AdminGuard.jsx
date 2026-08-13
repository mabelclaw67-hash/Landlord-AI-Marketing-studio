import { useState } from "react";
import { canAccessModule, readTrialAccess, storeAdminSession, clearAdminSession, isAdminSessionActive } from "../utils/trialAccess";
import { apiPost } from "../utils/api";
import { useLang } from "../contexts/LangContext";

export default function AdminGuard({ children }) {
  const lang = useLang();
  const trialSession = readTrialAccess();
  const [unlocked, setUnlocked] = useState(() => isAdminSessionActive());
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (unlocked) return children;
  // Trial users enter the admin workspace with data isolation enforced by the backend.
  // Only a session that still grants a module may skip the admin unlock: an
  // expired or wrong-module trial record makes getStudioRequestAuth() emit no
  // credentials at all, so the workspace would render as if signed in while
  // every authenticated call fails with "Access denied. Please sign in with an
  // approved trial access code." (Listing reads hide this — getListings /
  // getListingById are no-auth actions — so it only surfaces on Collage/upload.)
  if (trialSession && (canAccessModule(trialSession, "rental") || canAccessModule(trialSession, "sale"))) {
    return children;
  }

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
            <strong>Vanisland AI Studio</strong>
            <span>Admin Studio</span>
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
