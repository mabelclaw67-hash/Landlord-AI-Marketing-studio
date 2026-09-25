import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  adminAuthRequest, bootAdminSession, loginAdmin, logoutAdmin, useAdminSessionStatus,
} from "../utils/adminSession";
import { useLang } from "../contexts/LangContext";

// Admin Studio sign-in: password + 6-digit authenticator code (or a one-time
// recovery code). The session lives in an HttpOnly cookie held by the Netlify
// gateway; nothing about it is stored in browser storage.
export default function AdminGuard({ children }) {
  const status = useAdminSessionStatus();
  const [view, setView] = useState("login");

  useEffect(() => { bootAdminSession(); }, []);

  if (status === "active") return children;

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
        {status === "unknown" ? (
          <p className="admin-guard__sub">Checking session… · 正在检查登录状态…</p>
        ) : view === "setup" ? (
          <MfaSetup onDone={() => setView("login")} />
        ) : (
          <LoginForm onSetup={() => setView("setup")} />
        )}
      </div>
    </div>
  );
}

function LoginForm({ onSetup }) {
  const lang = useLang();
  const zh = lang === "zh";
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [error, setError] = useState("");
  const [needsSetup, setNeedsSetup] = useState(false);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || (useRecovery ? !recoveryCode.trim() : !/^\d{6}$/.test(totp))) {
      setError(zh ? "请输入密码和 6 位验证码。" : "Enter your password and the 6-digit code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await loginAdmin(useRecovery
        ? { password, recoveryCode: recoveryCode.trim() }
        : { password, totp });
      if (data?.usedRecoveryCode) {
        setNotice(zh
          ? `已使用一个恢复码，剩余 ${data.recoveryCodesRemaining} 个。`
          : `Recovery code used — ${data.recoveryCodesRemaining} left.`);
      }
    } catch (ex) {
      setNeedsSetup(ex?.code === "MFA_NOT_ENROLLED");
      setError(ex?.message || (zh ? "无法连接服务器。" : "Could not reach server."));
      setTotp("");
      setRecoveryCode("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="admin-guard__title">Admin Access</h1>
      <p className="admin-guard__sub">管理后台访问 · 两步验证</p>

      <form onSubmit={handleSubmit} className="admin-guard__form">
        <label className="admin-guard__label" htmlFor="admin-password">
          Password
          <span>管理员密码</span>
        </label>
        <input
          id="admin-password"
          className="admin-guard__input admin-guard__input--text"
          type="password"
          name="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(""); }}
          autoComplete="current-password"
          autoFocus
          disabled={loading}
        />

        {useRecovery ? (
          <>
            <label className="admin-guard__label admin-guard__label--spaced" htmlFor="admin-recovery">
              Recovery code
              <span>一次性恢复码（XXXX-XXXX-XXXX）</span>
            </label>
            <input
              id="admin-recovery"
              className="admin-guard__input admin-guard__input--text"
              type="text"
              value={recoveryCode}
              onChange={(e) => { setRecoveryCode(e.target.value.toUpperCase()); setError(""); }}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              disabled={loading}
            />
          </>
        ) : (
          <>
            <label className="admin-guard__label admin-guard__label--spaced" htmlFor="admin-totp">
              Verification code
              <span>验证器 App 中的 6 位动态码</span>
            </label>
            <input
              id="admin-totp"
              className={`admin-guard__input${error ? " admin-guard__input--error" : ""}`}
              type="text"
              name="one-time-code"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={totp}
              onChange={(e) => { setTotp(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
              autoComplete="one-time-code"
              placeholder="000000"
              disabled={loading}
            />
          </>
        )}

        {error && <p className="admin-guard__error" role="alert">{error}</p>}
        {notice && <p className="admin-guard__notice">{notice}</p>}

        <button type="submit" className="admin-guard__btn" disabled={loading}>
          {loading ? (zh ? "验证中…" : "Verifying…") : (zh ? "进入管理后台" : "Enter Admin Studio")}
        </button>
      </form>

      <div className="admin-guard__links">
        <button type="button" className="admin-guard__link" onClick={() => { setUseRecovery(!useRecovery); setError(""); }}>
          {useRecovery
            ? (zh ? "改用验证码" : "Use authenticator code instead")
            : (zh ? "手机不在身边？使用恢复码" : "Lost your phone? Use a recovery code")}
        </button>
        {needsSetup && (
          <button type="button" className="admin-guard__link" onClick={onSetup}>
            {zh ? "首次设置两步验证" : "First-time two-step setup"}
          </button>
        )}
      </div>

      <p className="admin-guard__note">
        Public pages are open without a code — only Admin Studio is protected.
        Sessions end after 30 minutes idle or 8 hours.
      </p>
    </>
  );
}

function MfaSetup({ onDone }) {
  const lang = useLang();
  const zh = lang === "zh";
  const [step, setStep] = useState("credentials");
  const [password, setPassword] = useState("");
  const [enrollmentToken, setEnrollmentToken] = useState("");
  const [pairing, setPairing] = useState(null);
  const [totp, setTotp] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async (fn) => {
    setLoading(true);
    setError("");
    try { await fn(); } catch (ex) { setError(ex?.message || "Request failed."); } finally { setLoading(false); }
  };

  const begin = (e) => {
    e.preventDefault();
    run(async () => {
      setPairing(await adminAuthRequest("enrollBegin", { password, enrollmentToken: enrollmentToken.trim() }));
      setStep("pair");
    });
  };

  const confirm = (e) => {
    e.preventDefault();
    run(async () => {
      const data = await adminAuthRequest("enrollConfirm", { password, enrollmentToken: enrollmentToken.trim(), totp });
      setRecoveryCodes(data.recoveryCodes || []);
      setPassword("");
      setEnrollmentToken("");
      setPairing(null);
      setStep("recovery");
    });
  };

  const downloadCodes = () => {
    const text = `VanIsland Admin Studio — recovery codes\nGenerated ${new Date().toISOString()}\nEach code works once.\n\n${recoveryCodes.join("\n")}\n`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "vanisland-admin-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (step === "recovery") {
    return (
      <>
        <h1 className="admin-guard__title">{zh ? "保存恢复码" : "Save recovery codes"}</h1>
        <p className="admin-guard__sub">
          {zh
            ? "手机丢失时，每个恢复码可代替验证码使用一次。只显示这一次，请存入密码管理器或打印保存。"
            : "If you lose your phone, each code replaces the 6-digit code once. Shown only now — store them in your password manager or print them."}
        </p>
        <ol className="admin-guard__codes">
          {recoveryCodes.map((code) => <li key={code}><code>{code}</code></li>)}
        </ol>
        <button type="button" className="admin-guard__btn admin-guard__btn--secondary" onClick={downloadCodes}>
          {zh ? "下载 .txt" : "Download .txt"}
        </button>
        <label className="admin-guard__check">
          <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
          {zh ? "我已安全保存这些恢复码" : "I have stored these codes safely"}
        </label>
        <button type="button" className="admin-guard__btn" disabled={!saved} onClick={() => { setRecoveryCodes([]); onDone(); }}>
          {zh ? "完成，去登录" : "Done — sign in"}
        </button>
      </>
    );
  }

  if (step === "pair" && pairing) {
    return (
      <>
        <h1 className="admin-guard__title">{zh ? "绑定验证器" : "Pair your authenticator"}</h1>
        <p className="admin-guard__sub">
          {zh
            ? "用 iPhone 相机扫描二维码（会存入「密码」App），或用 Google Authenticator / 1Password 扫描。"
            : "Scan with the iPhone Camera (saves to the Passwords app), Google Authenticator, or 1Password."}
        </p>
        <div className="admin-guard__qr">
          <QRCodeSVG value={pairing.otpauthUri} size={188} fgColor="#213128" bgColor="#ffffff" />
        </div>
        <a className="admin-guard__link admin-guard__link--block" href={pairing.otpauthUri}>
          {zh ? "在这台 iPhone 上直接添加" : "On this iPhone? Tap to add"}
        </a>
        <p className="admin-guard__secret">
          {zh ? "手动输入密钥：" : "Setup key:"} <code>{pairing.secret.match(/.{1,4}/g).join(" ")}</code>
        </p>
        <form onSubmit={confirm} className="admin-guard__form">
          <label className="admin-guard__label" htmlFor="admin-enroll-totp">
            Enter the 6-digit code
            <span>输入验证器显示的 6 位码以确认</span>
          </label>
          <input
            id="admin-enroll-totp"
            className="admin-guard__input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={totp}
            onChange={(e) => { setTotp(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
            autoComplete="one-time-code"
            placeholder="000000"
            disabled={loading}
          />
          {error && <p className="admin-guard__error" role="alert">{error}</p>}
          <button type="submit" className="admin-guard__btn" disabled={loading || totp.length !== 6}>
            {loading ? (zh ? "验证中…" : "Verifying…") : (zh ? "确认绑定" : "Confirm")}
          </button>
        </form>
      </>
    );
  }

  return (
    <>
      <h1 className="admin-guard__title">{zh ? "首次设置两步验证" : "Set up two-step sign-in"}</h1>
      <p className="admin-guard__sub">
        {zh
          ? "需要管理员密码，以及你在 Apps Script 中设置并启用（setupAdminMfa_3_ArmEnrollmentToken）的 15 分钟一次性设置码。"
          : "You need the admin password and the 15-minute setup token you armed in Apps Script (setupAdminMfa_3_ArmEnrollmentToken)."}
      </p>
      <form onSubmit={begin} className="admin-guard__form">
        <label className="admin-guard__label" htmlFor="admin-enroll-password">
          Password
          <span>管理员密码</span>
        </label>
        <input
          id="admin-enroll-password"
          className="admin-guard__input admin-guard__input--text"
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(""); }}
          autoComplete="current-password"
          disabled={loading}
        />
        <label className="admin-guard__label admin-guard__label--spaced" htmlFor="admin-enroll-token">
          Setup token
          <span>一次性设置码</span>
        </label>
        <input
          id="admin-enroll-token"
          className="admin-guard__input admin-guard__input--text"
          type="text"
          value={enrollmentToken}
          onChange={(e) => { setEnrollmentToken(e.target.value); setError(""); }}
          autoComplete="off"
          spellCheck={false}
          disabled={loading}
        />
        {error && <p className="admin-guard__error" role="alert">{error}</p>}
        <button type="submit" className="admin-guard__btn" disabled={loading || !password || !enrollmentToken.trim()}>
          {loading ? (zh ? "处理中…" : "Working…") : (zh ? "下一步" : "Continue")}
        </button>
      </form>
      <div className="admin-guard__links">
        <button type="button" className="admin-guard__link" onClick={onDone}>
          {zh ? "返回登录" : "Back to sign in"}
        </button>
      </div>
    </>
  );
}

/** Sign out on the server; AdminGuard re-renders to the sign-in screen. */
export function lockAdmin() {
  return logoutAdmin();
}
