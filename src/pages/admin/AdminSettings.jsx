import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { apiPost } from "../../utils/api";
import { getStudioRequestAuth, getTrialAccessHome, readTrialAccess, refreshAdminCode } from "../../utils/trialAccess";
import { useLang } from "../../contexts/LangContext";
import { AL } from "../../utils/adminLabels";

export default function AdminSettings() {
  const trialSession = readTrialAccess();
  if (trialSession) return <Navigate to={getTrialAccessHome(trialSession.approvedModule)} replace />;
  return <AdminSettingsInner />;
}

function AdminSettingsInner() {
  const lang = useLang();
  const L = AL[lang] ?? AL.en;
  const [settings, setSettings]     = useState(null);
  const [loadErr, setLoadErr]        = useState("");
  const [newCode, setNewCode]        = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [currentCode, setCurrentCode] = useState("");
  const [saving, setSaving]          = useState(false);
  const [message, setMessage]        = useState(null); // { type: "success"|"error", text }

  useEffect(() => {
    apiPost({ action: "getAdminSettings", ...getStudioRequestAuth("rental") })
      .then((data) => setSettings(data))
      .catch((e) => setLoadErr(e.message));
  }, []);

  const validate = () => {
    if (!currentCode.trim()) return "Enter your current admin code to confirm.";
    if (newCode.length < 10)  return "New code must be at least 10 characters.";
    if (newCode !== confirmCode) return "New code and confirm code do not match.";
    return null;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage(null);
    const err = validate();
    if (err) { setMessage({ type: "error", text: err }); return; }
    setSaving(true);
    try {
      const res = await apiPost({
        action: "updateAdminAccessCode",
        adminAccessCode: currentCode.trim(), // auth: current code the user types
        newCode: newCode.trim(),
        confirmCode: confirmCode.trim(),
      });
      refreshAdminCode(newCode.trim()); // keep sessionStorage in sync
      setSettings((prev) => ({ ...prev, updatedAt: res.updatedAt }));
      setMessage({ type: "success", text: "Admin access code updated. Old code no longer works." });
      setNewCode(""); setConfirmCode(""); setCurrentCode("");
    } catch (e) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-settings">
      <h1 className="admin-settings__title">{L.adminSettingsTitle}</h1>

      <section className="admin-settings__card">
        <h2 className="admin-settings__section-title">
          {L.adminAccessCode}
        </h2>

        <div className="admin-settings__current">
          <span className="admin-settings__label">Current code:</span>
          <span className="admin-settings__masked">
            {settings ? settings.codeMasked : loadErr ? "—" : "Loading…"}
          </span>
          {settings?.updatedAt && (
            <span className="admin-settings__meta">
              Last updated {new Date(settings.updatedAt).toLocaleString()}
            </span>
          )}
          {loadErr && (
            <span className="admin-settings__error-inline">⚠ {loadErr}</span>
          )}
        </div>

        <form onSubmit={handleSave} className="admin-settings__form">
          <div className="admin-settings__field">
            <label>New Admin Access Code</label>
            <input
              type="password"
              value={newCode}
              onChange={(e) => { setNewCode(e.target.value); setMessage(null); }}
              placeholder="Min 10 characters — letters, numbers, symbols"
              autoComplete="new-password"
              disabled={saving}
            />
            <small>At least 10 characters. Mix letters, numbers, and symbols for best security.</small>
          </div>

          <div className="admin-settings__field">
            <label>Confirm New Code</label>
            <input
              type="password"
              value={confirmCode}
              onChange={(e) => { setConfirmCode(e.target.value); setMessage(null); }}
              placeholder="Re-enter new code"
              autoComplete="new-password"
              disabled={saving}
            />
          </div>

          <div className="admin-settings__field admin-settings__field--auth">
            <label>{lang === "zh" ? "当前管理员密码（确认身份）" : "Current Admin Code (confirm identity)"}</label>
            <input
              type="password"
              value={currentCode}
              onChange={(e) => { setCurrentCode(e.target.value); setMessage(null); }}
              placeholder="Your current admin access code"
              autoComplete="current-password"
              disabled={saving}
            />
          </div>

          {message && (
            <p className={`admin-settings__message admin-settings__message--${message.type}`}>
              {message.type === "success" ? "✓ " : "✗ "}{message.text}
            </p>
          )}

          <button type="submit" className="admin-settings__btn" disabled={saving}>
            {saving ? (lang === "zh" ? "保存中…" : "Saving…") : (lang === "zh" ? "保存新密码" : "Save New Code")}
          </button>
        </form>

        <div className="admin-settings__rules">
          <strong>Security rules:</strong>
          <ul>
            <li>New code must be at least 10 characters.</li>
            <li>Mix uppercase, lowercase, numbers, and symbols.</li>
            <li>After saving, the old code stops working immediately.</li>
            <li>You will remain logged in with the new code.</li>
            <li>Trial user access codes cannot be used as admin codes.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
