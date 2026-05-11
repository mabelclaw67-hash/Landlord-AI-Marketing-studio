export default function Footer() {
  return (
    <footer className="footer">
      <p>
        &copy; {new Date().getFullYear()} <strong>Vanisland Property Management</strong> — AI Marketing Studio v0.1 Prototype
      </p>
      <p style={{ marginTop: 6 }}>
        All AI-generated content must be reviewed before publishing. &nbsp;|&nbsp; 所有 AI 生成内容发布前必须人工审核。
      </p>
    </footer>
  );
}
