import { useState } from "react";
import { storeAdminSession, clearAdminSession, isAdminSessionActive } from "../utils/trialAccess";
import { apiPost } from "../utils/api";
import { useLang } from "../contexts/LangContext";

export default function AdminGuard({ children }) {
  const lang = useLang();
  const [unlocked, setUnlocked] = useState(() => isAdminSessionActive());
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (unlocked) return children;

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
    } catch (error) {
      setError(error?.httpStatus != null
        ? (error.message || "Server rejected the request.")
        : "Could not reach server. Check connection and try again.");
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
