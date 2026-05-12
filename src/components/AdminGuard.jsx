import { useState } from "react";

const CODE = import.meta.env.VITE_ADMIN_ACCESS_CODE || "";
const SESSION_KEY = "adminUnlocked";

export default function AdminGuard({ children }) {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === "1"
  );
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  if (unlocked) return children;

  // Code not configured — show setup notice instead of a non-functional form
  if (!CODE) {
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
          <div className="admin-guard__unconfigured">
            <p>⚠️ Admin access code not configured.</p>
            <p>Set <code>VITE_ADMIN_ACCESS_CODE</code> in your <code>.env.local</code> file and restart the dev server.</p>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input === CODE) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setUnlocked(true);
    } else {
      setError(true);
      setInput("");
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
            6-digit Access Code
            <span>6位访问密码</span>
          </label>
          <input
            className={`admin-guard__input${error ? " admin-guard__input--error" : ""}`}
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(false); }}
            placeholder="• • • • • •"
            autoComplete="off"
            autoFocus
          />
          {error && (
            <p className="admin-guard__error">
              Invalid access code. / 访问密码不正确。
            </p>
          )}
          <button type="submit" className="admin-guard__btn">
            Enter Admin Studio
            <span>进入管理后台</span>
          </button>
        </form>

        <p className="admin-guard__note">
          Public pages are open without a code — only Admin Studio is protected.
        </p>
      </div>
    </div>
  );
}

/** Call this from anywhere inside admin to lock and return to access screen. */
export function lockAdmin() {
  sessionStorage.removeItem(SESSION_KEY);
  window.location.reload();
}
