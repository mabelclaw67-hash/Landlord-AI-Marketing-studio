import { useState } from "react";
import { t } from "../translations";
import { saveContact } from "../utils/storage";
import { isApiConnected } from "../utils/api";
import { normalizeLang } from "../utils/lang";

const CONTACT_COPY = {
  en: {
    requestTitle: "Request Access",
    requestDesc: "You can request Rental Listing Studio, Home Sale Studio, or both.",
    prepareTitle: "What we prepare for you:",
    prepareItems: [
      "🏘️ Rental listing promotion workflow",
      "🏡 Home sale marketing workflow",
      "📝 Bilingual marketing copy",
      "📲 Share kit and QR code",
      "🎬 Short video and media support",
    ],
    serving: "Serving landlords in Nanaimo, Victoria, Greater Vancouver, and across BC.",
    submitAnother: "Submit another",
    wechat: "WeChat ID",
    wechatPlaceholder: "e.g. mabel_wechat",
    interestedModule: "Interested Module",
    select: "-- Select --",
    services: [
      { value: "Rental Listing Studio / 出租房源推广", label: "Rental Listing Studio / 出租房源推广" },
      { value: "Home Sale Studio / 出售房源推广", label: "Home Sale Studio / 出售房源推广" },
      { value: "Both / 两者都需要", label: "Both / 两者都需要" },
    ],
    submitFailed: "Submission failed",
    sending: "Sending...",
    saved: "Your request will be saved to our system.",
    prototype: "Prototype mode: form is not transmitted.",
  },
  zh: {
    requestTitle: "申请使用",
    requestDesc: "您可以申请出租房源工作台、出售房源工作台，或两个模块都申请。",
    prepareTitle: "我们会为您准备：",
    prepareItems: [
      "🏘️ 出租房源推广流程",
      "🏡 出售房源营销流程",
      "📝 中英文营销文案",
      "📲 分享素材包和二维码",
      "🎬 短视频和媒体支持",
    ],
    serving: "服务范围包括 Nanaimo、Victoria、Greater Vancouver 以及 BC 各地区房东。",
    submitAnother: "再提交一份",
    wechat: "微信 ID",
    wechatPlaceholder: "例如：mabel_wechat",
    interestedModule: "感兴趣的模块",
    select: "-- 请选择 --",
    services: [
      { value: "Rental Listing Studio / 出租房源推广", label: "出租房源工作台 / Rental Listing Studio" },
      { value: "Home Sale Studio / 出售房源推广", label: "出售房源工作台 / Home Sale Studio" },
      { value: "Both / 两者都需要", label: "两个都需要 / Both" },
    ],
    submitFailed: "提交失败",
    sending: "正在发送...",
    saved: "您的申请会保存到我们的系统。",
    prototype: "原型模式：表单不会发送到线上系统。",
  },
};

export default function Contact({ lang }) {
  const copy = CONTACT_COPY[normalizeLang(lang)] || CONTACT_COPY.en;
  const [form,      setForm]      = useState({ name: "", email: "", phone: "", wechat: "", city: "", service: "", message: "" });
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
        wechat:  form.wechat,
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
    <div className="pub-page">
      <section className="pub-hero">
        <h1 className="pub-hero__title">{t(lang, "contact.title")}</h1>
      </section>

      <section className="section">
        <div className="container">
          <div className="contact-layout">
            {/* Left: Info */}
            <div>
              <div className="notice notice--sage" style={{ marginBottom: 24 }}>
                <h4>{copy.requestTitle}</h4>
                <p>{t(lang, "contact.betaNotice")}</p>
                <p style={{ marginTop: 6 }}>
                  {copy.requestDesc}
                </p>
              </div>

              <div className="card" style={{ marginBottom: 16, borderColor: "#e5dfd6" }}>
                <h3 style={{ fontWeight: 700, marginBottom: 12, color: "#3e5b4b" }}>{copy.prepareTitle}</h3>
                <ul style={{ paddingLeft: 16, fontSize: "0.88rem", lineHeight: 2 }}>
                  {copy.prepareItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", lineHeight: 1.7 }}>
                <p>{copy.serving}</p>
              </div>
            </div>

            {/* Right: Form */}
            <div className="card">
              {submitted ? (
                <div className="text-center" style={{ padding: "40px 0" }}>
                  <div style={{ fontSize: "3rem", marginBottom: 16 }}>✅</div>
                  <h3 style={{ fontWeight: 700, marginBottom: 8 }}>{t(lang, "contact.successMsg")}</h3>
                  <button
                    className="btn btn--ghost mt-16"
                    style={{ marginTop: 20 }}
                    onClick={() => { setSubmitted(false); setForm({ name: "", email: "", phone: "", wechat: "", city: "", service: "", message: "" }); }}
                  >
                    {copy.submitAnother}
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
                      <label>{copy.wechat}</label>
                      <input
                        className="form-control"
                        value={form.wechat}
                        onChange={set("wechat")}
                        placeholder={copy.wechatPlaceholder}
                      />
                    </div>
                  </div>
                  <div className="form-row">
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
                    <label>{copy.interestedModule}</label>
                    <select className="form-control" value={form.service} onChange={set("service")}>
                      <option value="">{copy.select}</option>
                      {copy.services.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
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
                      <p>{copy.submitFailed}: {submitErr}</p>
                    </div>
                  )}
                  <button type="submit" className="btn btn--sage btn--full" disabled={submitting}>
                    {submitting ? copy.sending : t(lang, "contact.submit")}
                  </button>
                  <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 10, textAlign: "center" }}>
                    {isApiConnected()
                      ? copy.saved
                      : copy.prototype}
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
