import { isApiConnected } from "../utils/api";
import { t } from "../translations";

export default function PrototypeBanner({ lang }) {
  if (isApiConnected()) {
    return (
      <div className="prototype-banner" style={{ background: "#F0FDF4", borderColor: "#22c55e" }}>
        <div className="prototype-banner__icon">✅</div>
        <div className="prototype-banner__body">
          <p><strong>Google Sheet integration active.</strong> Data is saved to the connected spreadsheet and Drive folder.</p>
          <p>Google Sheet 已连接。数据将保存至 Google 表格，图片上传至 Drive。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="prototype-banner">
      <div className="prototype-banner__icon">⚠️</div>
      <div className="prototype-banner__body">
        <p><strong>{t(lang, "admin.prototypeBanner")}</strong></p>
        <p>{t(lang, "admin.prototypeBannerCh")}</p>
      </div>
    </div>
  );
}
