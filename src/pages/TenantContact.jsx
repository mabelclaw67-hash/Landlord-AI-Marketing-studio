import { Link } from "react-router-dom";
import Footer from "../components/Footer";

const RENTAL_FORM_URL = import.meta.env.VITE_RENTAL_FORM_URL || "";
const FORM_READY = RENTAL_FORM_URL && !RENTAL_FORM_URL.startsWith("PASTE");

export default function TenantContact() {
  return (
    <div className="page-wrapper" style={{ paddingBottom: 80 }}>

      {/* Hero */}
      <section style={{
        background: "linear-gradient(135deg, #1e4468 0%, #2C5F8A 100%)",
        color: "#fff", padding: "64px 20px 48px", textAlign: "center",
      }}>
        <h1 style={{ fontSize: "clamp(1.5rem, 5vw, 2rem)", fontWeight: 800, marginBottom: 10 }}>
          Rental Inquiries
        </h1>
        <p style={{ fontSize: "0.9rem", opacity: 0.7 }}>
          For rental inquiries, please apply online or send us an email.
        </p>
      </section>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 20px" }}>

        {/* Apply online — primary action */}
        {FORM_READY && (
          <div style={{
            background: "#fff", border: "2px solid var(--color-primary)",
            borderRadius: 12, padding: "28px 24px", marginBottom: 20,
          }}>
            <h2 style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--color-primary)", marginBottom: 8 }}>
              Apply Online
            </h2>
            <p style={{ fontSize: "0.9rem", color: "var(--color-text-muted)", marginBottom: 20, lineHeight: 1.7 }}>
              Use our online application form to apply for a rental. It takes about 5 minutes.
            </p>
            <a
              href={RENTAL_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block", textAlign: "center", width: "100%",
                background: "var(--color-accent)", color: "#fff",
                padding: "18px 24px", borderRadius: 9, fontWeight: 800,
                fontSize: "1.1rem", textDecoration: "none",
                boxShadow: "0 3px 10px rgba(224,123,57,0.35)",
              }}
            >
              Apply Now →
            </a>
          </div>
        )}

        {/* Browse listings */}
        <div style={{
          background: "#fff", border: "1px solid var(--color-border)",
          borderRadius: 12, padding: "24px", marginBottom: 20,
        }}>
          <h2 style={{ fontWeight: 700, fontSize: "1rem", color: "var(--color-text)", marginBottom: 8 }}>
            Browse Available Rentals
          </h2>
          <p style={{ fontSize: "0.88rem", color: "var(--color-text-muted)", marginBottom: 16, lineHeight: 1.7 }}>
            View all current listings before you apply.
          </p>
          <Link
            to="/examples"
            style={{
              display: "block", textAlign: "center",
              border: "1.5px solid var(--color-primary)", color: "var(--color-primary)",
              padding: "14px 24px", borderRadius: 8, fontWeight: 700,
              fontSize: "0.95rem", textDecoration: "none",
            }}
          >
            View Rental Listings →
          </Link>
        </div>

        {/* Contact info */}
        <div style={{
          background: "#f8fafc", border: "1px solid var(--color-border)",
          borderRadius: 12, padding: "24px",
        }}>
          <h2 style={{ fontWeight: 700, fontSize: "1rem", color: "var(--color-text)", marginBottom: 8 }}>
            Contact Us
          </h2>
          <p style={{ fontSize: "0.88rem", color: "var(--color-text-muted)", lineHeight: 1.75 }}>
            For rental inquiries, please email us or submit an application online.
            We respond within 1–2 business days.
          </p>
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            <a
              href="mailto:mabelclaw67@gmail.com"
              style={{ color: "var(--color-primary)", fontWeight: 700, fontSize: "0.95rem" }}
            >
              📧 mabelclaw67@gmail.com
            </a>
            <a
              href="tel:6725148866"
              style={{ color: "var(--color-primary)", fontWeight: 700, fontSize: "0.95rem" }}
            >
              📞 672-514-8866
            </a>
          </div>
        </div>

      </div>

      <Footer tenant />
    </div>
  );
}
