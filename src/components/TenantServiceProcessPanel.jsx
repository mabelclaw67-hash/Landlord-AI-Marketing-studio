import { Link } from "react-router-dom";
import { useLang } from "../contexts/LangContext";

const TENANT_SERVICE_TEXT = {
  en: {
    eyebrow: "Tenant Services",
    cardTitle: "Report a Maintenance Issue",
    cardBody: "Verified tenants can submit maintenance and property service requests online.",
    action: "Start Service Request",
    processTitle: "Tenant Service Request Process",
    beforeTitle: "Before You Submit",
    prepareLabel: "Prepare:",
    prepare: [
      "exact issue location",
      "clear description",
      "when the issue started",
      "urgency level",
      "1–5 photos",
      "access permission",
      "preferred access time",
    ],
    emergency: "For fire, active flooding, gas smell, immediate electrical danger, or life-safety emergencies, call 911 or the appropriate emergency service first. Do not wait for this form to be reviewed.",
    steps: [
      ["Verify Your Tenancy", "Enter the email and phone last 4 digits associated with your tenancy."],
      ["Prepare Information", "Provide the issue category, exact location, description, first noticed time, and urgency."],
      ["Upload Photos", "Upload up to 5 clear photos showing the overall area and close-up details."],
      ["Access Instructions", "Confirm whether entry is permitted and provide preferred access times."],
      ["Submit Request", "The system creates a unique Tenant Service Request ID."],
      ["Receive Confirmation", "The tenant receives an automatic email receipt."],
      ["Management Review", "Property management receives an immediate notification and reviews the request."],
      ["Repair Follow-up", "Management contacts the tenant and arranges a contractor when necessary."],
    ],
  },
  zh: {
    eyebrow: "租客服务",
    cardTitle: "提交报修申请",
    cardBody: "已验证的租客可在线提交维修和物业服务申请。",
    action: "开始提交申请",
    processTitle: "租客服务申请流程",
    beforeTitle: "提交前准备",
    prepareLabel: "请准备：",
    prepare: [
      "问题的准确位置",
      "清楚的问题描述",
      "问题开始时间",
      "紧急程度",
      "1–5 张照片",
      "进入许可",
      "方便进入的时间",
    ],
    emergency: "如遇火灾、正在发生的水浸、燃气气味、即时电气危险或危及生命安全的紧急情况，请先拨打 911 或联系相应紧急服务。不要等待本申请被审核。",
    steps: [
      ["验证租赁身份", "输入租赁记录中的电子邮箱和电话号码后四位。"],
      ["准备资料", "提供问题类别、准确位置、描述、首次发现时间和紧急程度。"],
      ["上传照片", "最多上传 5 张清晰照片，展示整体区域和局部细节。"],
      ["进入说明", "确认是否允许进入，并提供方便进入的时间。"],
      ["提交申请", "系统会生成唯一的租客服务申请编号。"],
      ["接收确认", "租客会自动收到电子邮件回执。"],
      ["物业审核", "物业管理方会立即收到通知并审核申请。"],
      ["维修跟进", "物业管理方会联系租客，并在需要时安排承包商。"],
    ],
  },
};

// Standalone Tenant Service Request Process card — shares the unified
// .application-process-card styling so it can sit next to the Rental
// Application Process card in the portal's process section.
export function TenantServiceProcessCard() {
  const lang = useLang();
  const text = TENANT_SERVICE_TEXT[lang === "zh" ? "zh" : "en"];

  return (
    <div className="application-process-card tenant-service-process" aria-label={text.processTitle}>
      <div className="application-process-card__header">
        <h2 className="application-process-card__title">{text.processTitle}</h2>
      </div>
      <ol className="application-process-steps">
        {text.steps.map(([title, description], index) => (
          <li key={title} className="application-process-step tenant-service-process__step">
            <span className="application-process-step__index">{index + 1}</span>
            <span className="tenant-service-process__copy">
              <strong>{title}</strong>
              <span>{description}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function TenantServiceProcessPanel() {
  const lang = useLang();
  const text = TENANT_SERVICE_TEXT[lang === "zh" ? "zh" : "en"];

  return (
    <section className="tenant-service-module" aria-labelledby="tenant-service-title">
      <div className="tenant-service-card">
        <p className="tenant-service-card__eyebrow">{text.eyebrow}</p>
        <h2 id="tenant-service-title">{text.cardTitle}</h2>
        <p>{text.cardBody}</p>
        <Link className="tenant-service-card__action" to="/tenant-service-request">
          {text.action}
        </Link>
        <div className="tenant-service-before">
          <h3>{text.beforeTitle}</h3>
          <p>{text.prepareLabel}</p>
          <ul>
            {text.prepare.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <p className="tenant-service-emergency" role="note">{text.emergency}</p>
      </div>

      <TenantServiceProcessCard />
    </section>
  );
}
