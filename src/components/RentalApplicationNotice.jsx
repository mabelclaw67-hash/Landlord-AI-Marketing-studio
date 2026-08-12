import {
  RENTAL_APPLICATION_PROCESS_NOTICE,
  RENTAL_APPLICATION_PROCESS_URL,
} from "../utils/rentalApplicationNotice";

export default function RentalApplicationNotice({ compact = false, style }) {
  return (
    <p
      style={{
        margin: 0,
        padding: compact ? "10px 12px" : "12px 14px",
        border: "1px solid #d8e4db",
        borderRadius: 8,
        background: "#f7fbf8",
        color: "#43584c",
        fontSize: compact ? "0.78rem" : "0.84rem",
        lineHeight: 1.6,
        ...style,
      }}
    >
      <a
        href={RENTAL_APPLICATION_PROCESS_URL}
        style={{ color: "inherit", fontWeight: 600, textDecoration: "underline" }}
      >
        {RENTAL_APPLICATION_PROCESS_NOTICE}
      </a>
    </p>
  );
}
