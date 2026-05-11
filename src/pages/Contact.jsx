import { useState } from "react";
import { t } from "../translations";
import Footer from "../components/Footer";
import { saveContact } from "../utils/storage";
import { isApiConnected } from "../utils/api";

const SERVICE_OPTIONS = [
  "Bilingual Rental Ad / 中英文广告",
  "Facebook / Craigslist Post / 平台发帖",
  "Listing Cover Text / 封面文案",
  "Short Video Script / 短视频脚本",
  "Full Package / 全套服务",
];

export default function Contact({ lang }) {
  const [form,      setForm]      = useState({ name: "", email: "", phone: "", city: "", service: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting,setSubmitting]= useState(false);
  const [submitErr, setSubmitErr] = useState(null);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitErr(null);
    try {
      await saveContact({
        name:    form.name,
        email:   form.email,
        phone:   form.phone,
        city:    form.city,
        service: form.service,
        message: form.message,
      });
      setSubmitted(true);
    } catch (err) {
      setSubmitErr(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-wrapper">
      <section className="hero" style={{ padding: "80px 20px 60px" }}>
        <h1 className="hero__title">{t(lang, "contact.title")}</h1>
        <p className="hero__subtitle">{t(lang, "contact.chTitle")}</p>
      </section>

      <section className="section">
        <div className="container">
          <div className="contact-layout">
            {/* Left: Info */}
            <div>
              <div className="notice notice--info" style={{ marginBottom: 24 }}>
                <h4>🔒 Private Beta / 内部测试</h4>
                <p>{t(lang, "contact.betaNotice")}</p>
                <p style={{ marginTop: 6, opacity: 0.8 }}>{t(lang, "contact.betaNoticeCh")}</p>
              </div>

              <div className="card" style={{ marginBottom: 16 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 12 }}>What we prepare for you:</h3>
                <ul style={{ paddingLeft: 16, fontSize: "0.88rem", lineHeight: 2 }}>
                  <li>📝 Bilingual rental ad copy (EN + CN)</li>
                  <li>💬 Facebook & Craigslist posts</li>
                  <li>📲 WeChat post content</li>
                  <li>🖼️ Listing cover text for social images</li>
                  <li>🎬 Short video narration script</li>
                </ul>
                <div style={{ borderTop: "1px solid var(--color-border)", marginTop: 12, paddingTop: 10 }}>
                  <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
                    为您准备：中英文广告 · 平台发帖 · 微信文案 · 封面标题 · 视频脚本
                  </p>
                </div>
              </div>

              <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", lineHeight: 1.7 }}>
                <p>📍 Serving landlords in Nanaimo, Victoria, Greater Vancouver, and across BC.</p>
                <p style={{ marginTop: 4 }}>服务范围：纳奈莫、维多利亚、大温哥华及 BC 全省。</p>
              </div>
            </div>

            {/* Right: Form */}
            <div className="card">
              {submitted ? (
                <div className="text-center" style={{ padding: "40px 0" }}>
                  <div style={{ fontSize: "3rem", marginBottom: 16 }}>✅</div>
                  <h3 style={{ fontWeight: 700, marginBottom: 8 }}>{t(lang, "contact.successMsg")}</h3>
                  <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
                    {t(lang, "contact.successMsgCh")}
                  </p>
                  <button
                    className="btn btn--ghost mt-16"
                    style={{ marginTop: 20 }}
                    onClick={() => { setSubmitted(false); setForm({ name: "", email: "", phone: "", city: "", service: "", message: "" }); }}
                  >
                    Submit another / 再次提交
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{t(lang, "contact.name")}</label>
                      <input
                        className="form-control"
                        required
                        value={form.name}
                        onChange={set("name")}
                        placeholder={t(lang, "contact.placeholder.name")}
                      />
                    </div>
                    <div className="form-group">
                      <label>{t(lang, "contact.email")}</label>
                      <input
                        className="form-control"
                        type="email"
                        required
                        value={form.email}
                        onChange={set("email")}
                        placeholder={t(lang, "contact.placeholder.email")}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{t(lang, "contact.phone")}</label>
                      <input
                        className="form-control"
                        value={form.phone}
                        onChange={set("phone")}
                        placeholder={t(lang, "contact.placeholder.phone")}
                      />
                    </div>
                    <div className="form-group">
                      <label>{t(lang, "contact.city")}</label>
                      <input
                        className="form-control"
                        value={form.city}
                        onChange={set("city")}
                        placeholder={t(lang, "contact.placeholder.city")}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>{t(lang, "contact.serviceInterest")}</label>
                    <select className="form-control" value={form.service} onChange={set("service")}>
                      <option value="">— Select / 请选择 —</option>
                      {SERVICE_OPTIONS.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>{t(lang, "contact.message")}</label>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={form.message}
                      onChange={set("message")}
                      placeholder={t(lang, "contact.placeholder.message")}
                    />
                  </div>
                  {submitErr && (
                    <div className="notice notice--error" style={{ marginBottom: 12 }}>
                      <p>Submission failed: {submitErr}</p>
                    </div>
                  )}
                  <button type="submit" className="btn btn--primary btn--full" disabled={submitting}>
                    {submitting ? "Sending…" : t(lang, "contact.submit")}
                  </button>
                  <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 10, textAlign: "center" }}>
                    {isApiConnected()
                      ? "Your request will be saved to our Google Sheet. / 您的申请将保存至我们的 Google 表格。"
                      : "Prototype mode: form is not transmitted. / 原型模式：表单数据不会传输。"}
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
