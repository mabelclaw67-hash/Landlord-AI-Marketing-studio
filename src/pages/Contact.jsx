import { useState } from "react";
import { t } from "../translations";
import Footer from "../components/Footer";
import { saveContact } from "../utils/storage";
import { isApiConnected } from "../utils/api";

const SERVICE_OPTIONS = [
  "Rental Listing Studio / 出租房源推广",
  "Home Sale Studio / 出售房源推广",
  "Both / 两者都需要",
];

export default function Contact({ lang }) {
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
                <h4>Request Access</h4>
                <p>{t(lang, "contact.betaNotice")}</p>
                <p style={{ marginTop: 6 }}>
                  You can request Rental Listing Studio, Home Sale Studio, or both.
                </p>
              </div>

              <div className="card" style={{ marginBottom: 16, borderColor: "#e5dfd6" }}>
                <h3 style={{ fontWeight: 700, marginBottom: 12, color: "#3e5b4b" }}>What we prepare for you:</h3>
                <ul style={{ paddingLeft: 16, fontSize: "0.88rem", lineHeight: 2 }}>
                  <li>🏘️ Rental listing promotion workflow</li>
                  <li>🏡 Home sale marketing workflow</li>
                  <li>📝 Bilingual marketing copy</li>
                  <li>📲 Share kit and QR code</li>
                  <li>🎬 Short video and media support</li>
                </ul>
              </div>

              <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", lineHeight: 1.7 }}>
                <p>Serving landlords in Nanaimo, Victoria, Greater Vancouver, and across BC.</p>
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
                    Submit another
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
                      <label>WeChat ID</label>
                      <input
                        className="form-control"
                        value={form.wechat}
                        onChange={set("wechat")}
                        placeholder="e.g. mabel_wechat"
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
                    <label>Interested Module</label>
                    <select className="form-control" value={form.service} onChange={set("service")}>
                      <option value="">— Select —</option>
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
                  <button type="submit" className="btn btn--sage btn--full" disabled={submitting}>
                    {submitting ? "Sending…" : t(lang, "contact.submit")}
                  </button>
                  <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 10, textAlign: "center" }}>
                    {isApiConnected()
                      ? "Your request will be saved to our system."
                      : "Prototype mode: form is not transmitted."}
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
