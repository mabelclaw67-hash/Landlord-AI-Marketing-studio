import { useEffect, useRef, useState } from "react";
import "./TenantServiceRequest.css";

const categories = ["Appliance Issue", "Plumbing", "Electrical", "Heating / Cooling", "Water Leak", "Building Maintenance", "Damage / Accident Report", "Safety Concern", "General Request"];
const emergency = "For fire, active flooding, gas smell, immediate electrical danger, or life-safety emergencies, call 911 or the appropriate emergency service first. Do not wait for this form to be reviewed.";
const zh = {
  title: "租客报修与服务申请", verify: "验证租客身份", email: "电子邮箱", phone: "电话号码后四位", verifyButton: "验证", verifying: "正在验证…", generic: "我们无法验证你的资料，请联系物业经理。",
  property: "请确认租赁物业", confirm: "是的，这是我租住的物业", details: "申请详情", category: "类别", location: "问题的准确位置", description: "问题描述", first: "首次发现日期和时间", urgency: "紧急程度", ongoing: "问题是否仍在持续？", access: "是否允许工作人员进入？", times: "方便进入的时间", photos: "照片（最多 5 张）", submit: "提交申请", sending: "正在提交…", received: "申请已收到", followup: "物业管理人员会审核并与你联系。", retry: "重试", routine: "一般", soon: "尽快", urgent: "紧急", yes: "是", no: "否", permission: ["允许进入", "进入前请联系我", "不允许进入"], emergency,
};
const en = { title: "Tenant Service Request", verify: "Verify tenant identity", email: "Email", phone: "Phone Last 4", verifyButton: "Verify", verifying: "Verifying…", generic: "We could not verify your information. Please contact your property manager.", property: "Confirm your rental property", confirm: "Yes, this is my rental property", details: "Request details", category: "Category", location: "Exact issue location", description: "Description", first: "First noticed date/time", urgency: "Urgency", ongoing: "Is the issue ongoing?", access: "Permission to enter", times: "Preferred access times", photos: "Photos (maximum 5)", submit: "Submit request", sending: "Submitting…", received: "Request received", followup: "Management will review your request and follow up.", retry: "Retry", routine: "Routine", soon: "Soon", urgent: "Urgent", yes: "Yes", no: "No", permission: ["Permission granted", "Contact me before entering", "No permission to enter"], emergency };

async function post(path, body) {
  const response = await fetch(`/.netlify/functions/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.error || "Request failed.");
  return data;
}

function compressPhoto(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, 2000 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      const finish = (quality) => canvas.toBlob((blob) => {
        if (!blob) return reject(new Error("Photo compression failed."));
        if (blob.size > 1_000_000 && quality > 0.45) return finish(quality - 0.12);
        URL.revokeObjectURL(url); resolve(blob);
      }, "image/jpeg", quality);
      finish(0.86);
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Unsupported photo.")); };
    image.src = url;
  });
}

function blobBase64(blob) {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1]); reader.onerror = reject; reader.readAsDataURL(blob); });
}

export default function TenantServiceRequest({ lang = "en" }) {
  const t = lang === "zh" ? zh : en;
  const widgetRef = useRef(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [step, setStep] = useState("verify");
  const [session, setSession] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [photos, setPhotos] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
    if (!siteKey) return;
    window.tsrTurnstileReady = () => {
      if (window.turnstile && widgetRef.current && !widgetRef.current.dataset.rendered) {
        widgetRef.current.dataset.rendered = "true";
        window.turnstile.render(widgetRef.current, { sitekey: siteKey, callback: setTurnstileToken, "expired-callback": () => setTurnstileToken("") });
      }
    };
    let script = document.querySelector('script[data-tsr-turnstile]');
    if (!script) { script = document.createElement("script"); script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=tsrTurnstileReady&render=explicit"; script.async = true; script.defer = true; script.dataset.tsrTurnstile = "true"; document.head.appendChild(script); }
    else window.tsrTurnstileReady();
  }, []);

  const verify = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try { const data = await post("tenant-verify", { email: form.get("email"), phoneLast4: form.get("phoneLast4"), turnstileToken }); setSession(data); setStep("confirm"); }
    catch { setError(t.generic); } finally { setBusy(false); }
  };

  const uploadOne = async (photo, index, requestId) => {
    setUploads((old) => { const next = [...old]; next[index] = "uploading"; return next; });
    try { const blob = await compressPhoto(photo); await post("tenant-request-photo", { sessionToken: session.sessionToken, requestId, photoIndex: index + 1, mimeType: "image/jpeg", base64: await blobBase64(blob) }); setUploads((old) => { const next = [...old]; next[index] = "done"; return next; }); }
    catch { setUploads((old) => { const next = [...old]; next[index] = "failed"; return next; }); }
  };

  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    const body = Object.fromEntries(new FormData(event.currentTarget));
    try { const data = await post("tenant-service-request", { ...body, sessionToken: session.sessionToken }); setReceipt(data); setStep("success"); for (let i = 0; i < photos.length; i += 1) await uploadOne(photos[i], i, data.requestId); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return <main className="tsr-page"><section className="tsr-card">
    <h1>{t.title}</h1><div className="tsr-emergency" role="alert">{t.emergency}</div>
    {error && <p className="tsr-error">{error}</p>}
    {step === "verify" && <form onSubmit={verify}><h2>{t.verify}</h2><label>{t.email}<input name="email" type="email" autoComplete="email" required /></label><label>{t.phone}<input name="phoneLast4" inputMode="numeric" pattern="[0-9]{4}" maxLength="4" required /></label><div ref={widgetRef} className="tsr-turnstile" /><button className="tsr-primary-action" type="submit" disabled={busy || !turnstileToken} aria-label={busy ? t.verifying : t.verifyButton}><span>{busy ? t.verifying : t.verifyButton}</span></button></form>}
    {step === "confirm" && <div><h2>{t.property}</h2><p className="tsr-property">{session.propertyLabel}</p><label className="tsr-check"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /> {t.confirm}</label><button disabled={!confirmed} onClick={() => setStep("form")}>{t.details}</button></div>}
    {step === "form" && <form onSubmit={submit}><h2>{t.details}</h2><label>{t.category}<select name="category" required><option value="" />{categories.map((x) => <option key={x}>{x}</option>)}</select></label><label>{t.location}<input name="issueLocation" maxLength="160" required /></label><label>{t.description}<textarea name="description" minLength="10" maxLength="3000" required /></label><label>{t.first}<input name="firstNoticedAt" type="datetime-local" required /></label><label>{t.urgency}<select name="urgency" required><option value="Routine">{t.routine}</option><option value="Soon">{t.soon}</option><option value="Urgent">{t.urgent}</option></select></label><label>{t.ongoing}<select name="ongoing" required><option value="Yes">{t.yes}</option><option value="No">{t.no}</option></select></label><label>{t.access}<select name="accessPermission" required>{t.permission.map((x) => <option key={x}>{x}</option>)}</select></label><label>{t.times}<textarea name="preferredAccessTimes" maxLength="500" required /></label><label>{t.photos}<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => { const chosen = [...e.target.files].slice(0, 5); setPhotos(chosen); setUploads(chosen.map(() => "pending")); }} /></label><button disabled={busy}>{busy ? t.sending : t.submit}</button></form>}
    {step === "success" && <div><h2>{t.received}</h2><p className="tsr-id">{receipt.requestId}</p><p>{new Date(receipt.submittedAt).toLocaleString()}</p><p>{receipt.category}</p><p>{t.followup}</p>{photos.map((photo, i) => <div className="tsr-upload" key={`${photo.name}-${i}`}><span>{photo.name}: {uploads[i]}</span>{uploads[i] === "failed" && <button onClick={() => uploadOne(photo, i, receipt.requestId)}>{t.retry}</button>}</div>)}<div className="tsr-emergency">{t.emergency}</div></div>}
  </section></main>;
}
