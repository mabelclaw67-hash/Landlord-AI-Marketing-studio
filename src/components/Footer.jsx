export const COMPANY_FOOTER = {
  year: "2026",
  name: "Vanisland Property Management",
  location: "Vancouver Island, BC",
  email: "support@vanislandproperty.ca",
  phone: "672-514-8866",
  phoneHref: "6725148866",
};

export default function Footer() {
  return (
    <footer className="footer">
      <p>
        &copy; {COMPANY_FOOTER.year} <strong>{COMPANY_FOOTER.name}</strong>
      </p>
      <p className="footer__contact">
        <span>{COMPANY_FOOTER.location}</span>
        <a href={`mailto:${COMPANY_FOOTER.email}`}>{COMPANY_FOOTER.email}</a>
        <a href={`tel:${COMPANY_FOOTER.phoneHref}`}>{COMPANY_FOOTER.phone}</a>
      </p>
    </footer>
  );
}
