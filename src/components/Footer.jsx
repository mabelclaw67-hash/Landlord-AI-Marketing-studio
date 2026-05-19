export default function Footer({ tenant = false }) {
  if (tenant) {
    return (
      <footer className="footer">
        <p>
          &copy; {new Date().getFullYear()} <strong>Vanisland Property Management</strong>
        </p>
        <p style={{ marginTop: 6 }}>
          Vancouver Island, BC &nbsp;|&nbsp; 📧{" "}
          <a href="mailto:mabelclaw67@gmail.com" style={{ color: "rgba(255,255,255,0.8)" }}>
            mabelclaw67@gmail.com
          </a>
          {" "}&nbsp;|&nbsp; 📞{" "}
          <a href="tel:6725148866" style={{ color: "rgba(255,255,255,0.8)" }}>
            672-514-8866
          </a>
        </p>
      </footer>
    );
  }

  return (
    <footer className="footer">
      <p>
        &copy; {new Date().getFullYear()} <strong>Vanisland Property Management</strong> — AI Marketing Studio v0.1 Prototype
      </p>
      <p style={{ marginTop: 6 }}>
        All AI-generated content must be reviewed before publishing.
      </p>
    </footer>
  );
}
