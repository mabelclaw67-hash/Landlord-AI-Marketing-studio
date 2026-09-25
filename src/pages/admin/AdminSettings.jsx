import { useState, useEffect } from "react";
import { adminAuthRequest, logoutAllAdminSessions, markAdminSessionEnded } from "../../utils/adminSession";
import { useLang } from "../../contexts/LangContext";
import { AL } from "../../utils/adminLabels";

export default function AdminSettings() {
  return <AdminSettingsInner />;
}

const onlyDigits = (value) => value.replace(/\D/g, "").slice(0, 6);

function AdminSettingsInner() {
  const lang = useLang();
  const zh = lang === "zh";
  const L = AL[lang] ?? AL.en;
  const [status, setStatus] = useState(null);
  const [loadErr, setLoadErr] = useState("");

  useEffect(() => {
    adminAuthRequest("status")
      .then(setStatus)
      .catch((e) => setLoadErr(e.message));
  }, []);

  return (
    <div className="admin-settings">
      <h1 className="admin-settings__title">{L.adminSettingsTitle}</h1>

      <section className="admin-settings__card">
        <h2 className="admin-settings__section-title">{zh ? "两步验证" : "Two-step sign-in"}</h2>
        <div className="admin-settings__current">
          {status ? (
            <>
              <span className="admin-settings__label">
                {status.mfaEnrolled ? (zh ? "✓ 已启用（密码 + 验证器）" : "✓ On (password + authenticator)") : (zh ? "未启用" : "Not set up")}
              </span>
              <span className="admin-settings__meta">
                {zh ? `剩余恢复码：${status.recoveryCodesRemaining} 个` : `Recovery codes left: ${status.recoveryCodesRemaining}`}
                {" · "}
                {zh ? `已登录设备：${status.activeSessions}` : `Signed-in sessions: ${status.activeSessions}`}
              </span>
              <span className="admin-settings__meta">
                {zh ? "本次登录最晚到期：" : "This session ends by: "}
                {new Date(status.sessionExpiresAt).toLocaleString()}
                {zh ? "（闲置 30 分钟自动锁定）" : " (locks after 30 min idle)"}
              </span>
              {status.passwordUpdatedAt && (
                <span className="admin-settings__meta">
                  {zh ? "密码更新于 " : "Password last changed "}{new Date(status.passwordUpdatedAt).toLocaleString()}
                </span>
              )}
            </>
          ) : loadErr ? (
            <span className="admin-settings__error-inline">⚠ {loadErr}</span>
          ) : (
            <span className="admin-settings__meta">Loading…</span>
          )}
        </div>
      </section>

      <ChangePasswordCard zh={zh} />
      <RecoveryCodesCard zh={zh} onRegenerated={(n) => setStatus((s) => (s ? { ...s, recoveryCodesRemaining: n } : s))} />
      <SignOutEverywhereCard zh={zh} />
    </div>
  );
}

function Message({ message }) {
  if (!message) return null;
  return (
    <p className={`admin-settings__message admin-settings__message--${message.type}`}>
      {message.type === "success" ? "✓ " : "✗ "}{message.text}
    </p>
  );
}

function ChangePasswordCard({ zh }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage(null);
    if (newPassword.length < 12) { setMessage({ type: "error", text: zh ? "新密码至少 12 个字符。" : "New password must be at least 12 characters." }); return; }
    if (newPassword !== confirmPassword) { setMessage({ type: "error", text: zh ? "两次输入的新密码不一致。" : "New password and confirmation do not match." }); return; }
    setSaving(true);
    try {
      await adminAuthRequest("changePassword", { currentPassword, newPassword, confirmPassword, totp });
      // Changing the password signs out every device, including this one.
      markAdminSessionEnded();
    } catch (ex) {
      setMessage({ type: "error", text: ex.message });
      setTotp("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="admin-settings__card">
      <h2 className="admin-settings__section-title">{zh ? "修改管理员密码" : "Change admin password"}</h2>
      <form onSubmit={handleSave} className="admin-settings__form">
        <div className="admin-settings__field">
          <label>{zh ? "新密码" : "New password"}</label>
          <input type="password" value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setMessage(null); }}
            placeholder={zh ? "至少 12 个字符" : "At least 12 characters"} autoComplete="new-password" disabled={saving} />
        </div>
        <div className="admin-settings__field">
          <label>{zh ? "确认新密码" : "Confirm new password"}</label>
          <input type="password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setMessage(null); }}
            autoComplete="new-password" disabled={saving} />
        </div>
        <div className="admin-settings__field admin-settings__field--auth">
          <label>{zh ? "当前密码（确认身份）" : "Current password (confirm identity)"}</label>
          <input type="password" value={currentPassword} onChange={(e) => { setCurrentPassword(e.target.value); setMessage(null); }}
            autoComplete="current-password" disabled={saving} />
        </div>
        <div className="admin-settings__field admin-settings__field--auth">
          <label>{zh ? "验证器 6 位码" : "6-digit authenticator code"}</label>
          <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={totp}
            onChange={(e) => { setTotp(onlyDigits(e.target.value)); setMessage(null); }} disabled={saving} />
        </div>
        <Message message={message} />
        <button type="submit" className="admin-settings__btn" disabled={saving || totp.length !== 6 || !currentPassword}>
          {saving ? (zh ? "保存中…" : "Saving…") : (zh ? "保存新密码" : "Save new password")}
        </button>
      </form>
      <div className="admin-settings__rules">
        <ul>
          <li>{zh ? "保存后所有设备（包括本机）都会退出，需要用新密码重新登录。" : "Saving signs out every device, including this one. Sign in again with the new password."}</li>
          <li>{zh ? "密码只以加盐哈希形式保存在服务器端，任何表格中都不会出现明文。" : "The password is stored only as a salted hash on the server — never in any spreadsheet."}</li>
        </ul>
      </div>
    </section>
  );
}

function RecoveryCodesCard({ zh, onRegenerated }) {
  const [totp, setTotp] = useState("");
  const [codes, setCodes] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const regenerate = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const data = await adminAuthRequest("regenerateRecovery", { totp });
      setCodes(data.recoveryCodes || []);
      onRegenerated((data.recoveryCodes || []).length);
    } catch (ex) {
      setMessage({ type: "error", text: ex.message });
    } finally {
      setTotp("");
      setBusy(false);
    }
  };

  return (
    <section className="admin-settings__card">
      <h2 className="admin-settings__section-title">{zh ? "恢复码" : "Recovery codes"}</h2>
      <p className="admin-settings__meta">
        {zh ? "重新生成后，旧恢复码全部作废。新码只显示一次。" : "Generating new codes voids all old ones. New codes are shown once."}
      </p>
      {codes.length > 0 ? (
        <ol className="admin-guard__codes">
          {codes.map((code) => <li key={code}><code>{code}</code></li>)}
        </ol>
      ) : (
        <form onSubmit={regenerate} className="admin-settings__form">
          <div className="admin-settings__field admin-settings__field--auth">
            <label>{zh ? "验证器 6 位码" : "6-digit authenticator code"}</label>
            <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={totp}
              onChange={(e) => setTotp(onlyDigits(e.target.value))} disabled={busy} />
          </div>
          <Message message={message} />
          <button type="submit" className="admin-settings__btn" disabled={busy || totp.length !== 6}>
            {busy ? "…" : (zh ? "生成新的恢复码" : "Generate new recovery codes")}
          </button>
        </form>
      )}
    </section>
  );
}

function SignOutEverywhereCard({ zh }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const signOutAll = async () => {
    const ok = window.confirm(zh
      ? "确定退出所有设备吗？包括本机在内的所有管理员会话会立即失效。"
      : "Sign out on every device? All admin sessions, including this one, end immediately.");
    if (!ok) return;
    setBusy(true);
    try {
      await logoutAllAdminSessions();
    } catch (ex) {
      setMessage({ type: "error", text: ex.message });
      setBusy(false);
    }
  };

  return (
    <section className="admin-settings__card">
      <h2 className="admin-settings__section-title">{zh ? "退出所有设备" : "Sign out everywhere"}</h2>
      <p className="admin-settings__meta">
        {zh ? "如果怀疑密码或设备泄露，立即让所有已登录的会话失效。" : "If you suspect a password or device is compromised, end every signed-in session now."}
      </p>
      <Message message={message} />
      <button type="button" className="admin-settings__btn admin-settings__btn--danger" onClick={signOutAll} disabled={busy}>
        {busy ? "…" : (zh ? "退出所有设备" : "Sign out all devices")}
      </button>
    </section>
  );
}
