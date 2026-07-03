import { useMemo, useState } from "react";
import {
  createEmptyStrategyAssessment,
  generatePreliminaryStrategySummary,
  getStrategyFollowUpQuestions,
  submitStrategyAssessment,
} from "../utils/strategyAssessment";
import { normalizeLang } from "../utils/lang";

const YES_NO = ["Yes", "No", "Unsure"];
const FOLLOW_UP_YES_NO = ["Yes", "No", "Not sure"];
const CONTACT_OPTIONS = ["Email", "Phone", "Text message", "WeChat"];

const FIELD_LABELS = {
  en: {
    ownerName: "Owner Name",
    email: "Email",
    phone: "Phone",
    preferredContact: "Preferred Contact",
    propertyAddress: "Property Address",
    city: "City",
    communityArea: "Community / Area",
    propertyType: "Property Type",
    bedrooms: "Bedrooms",
    bathrooms: "Bathrooms",
    garageSpaces: "Garage Spaces",
    drivewayParking: "Driveway Parking",
    furnished: "Furnished",
    oceanView: "Ocean View",
    fencedBackyard: "Fenced Backyard",
    privateYard: "Private Yard",
    petFriendly: "Pet Friendly",
    existingSuite: "Existing Suite",
    separateEntrance: "Separate Entrance",
    separateKitchen: "Separate Kitchen",
    separateLaundry: "Separate Laundry",
    separateMeter: "Separate Meter",
    utilitiesShared: "Utilities Shared",
    canAddKitchen: "Can Add Kitchen",
    ownerGoal: "Owner Goal",
    targetRent: "Target Rent",
    availableDate: "Available Date",
    airbnbInterest: "Airbnb Interest",
    principalResidence: "Principal Residence",
    ownerLivesOnSite: "Owner Lives On Site",
    strMunicipality: "STR Municipality",
    thirdPartyOperatorInterest: "Third-party Operator Interest",
    knownIssues: "Known Issues",
    timelineUrgency: "Timeline Urgency",
    nextStep: "Next Step",
    consentToContact: "Consent to Contact",
    privacyConsent: "Privacy Consent",
  },
  zh: {
    ownerName: "业主姓名",
    email: "邮箱",
    phone: "电话",
    preferredContact: "偏好联系方式",
    propertyAddress: "物业地址",
    city: "城市",
    communityArea: "社区 / 区域",
    propertyType: "物业类型",
    bedrooms: "卧室数",
    bathrooms: "卫生间数",
    garageSpaces: "车库车位",
    drivewayParking: "车道停车位",
    furnished: "是否带家具",
    oceanView: "是否有海景",
    fencedBackyard: "后院是否有围栏",
    privateYard: "是否有私人院子",
    petFriendly: "是否接受宠物",
    existingSuite: "是否已有套房",
    separateEntrance: "是否独立入口",
    separateKitchen: "是否独立厨房",
    separateLaundry: "是否独立洗衣",
    separateMeter: "是否独立电表",
    utilitiesShared: "水电等是否共用",
    canAddKitchen: "是否可加厨房",
    ownerGoal: "业主目标",
    targetRent: "目标租金",
    availableDate: "可出租日期",
    airbnbInterest: "是否考虑 Airbnb / 短租",
    principalResidence: "是否主要住所",
    ownerLivesOnSite: "业主是否住在现场",
    strMunicipality: "短租所在城市",
    thirdPartyOperatorInterest: "是否考虑第三方运营",
    knownIssues: "已知问题",
    timelineUrgency: "时间紧急程度",
    nextStep: "下一步",
    consentToContact: "同意联系",
    privacyConsent: "隐私同意",
  },
};

const COPY = {
  en: {
    title: "AI Property Strategy Assessment",
    subtitle: "AI 房产出租策略初评",
    desc: "Tell Mabel about the property, rental goal, suite potential, and Airbnb / STR interest.",
    successTitle: "Assessment submitted successfully",
    successDesc: "Mabel will review your intake before making a final recommendation.",
    successThanks: "Thank you. Your property strategy intake has been submitted successfully.",
    assessmentId: "Assessment ID",
    nextStepSelected: "Next step selected by owner:",
    notSelected: "Not selected",
    mabelReview: "Mabel will review before final recommendation.",
    sections: {
      ownerInfo: "Owner Info",
      propertyInfo: "Property Info",
      rentalStructure: "Rental Structure",
      keyFactors: "Key Rental Factors",
      airbnb: "Airbnb / STR Interest",
      ownerGoal: "Owner Goal",
      photoUpload: "Photo Upload",
      aiAssessment: "AI Preliminary Assessment",
      nextStep: "Next Step",
    },
    strNotice: "Current BC and municipal STR rules must be verified before making a final decision.",
    photoLabel: "Property Photos",
    photoHelp: "V1 saves the selected photo file names with the assessment. Drive upload can be connected after the backend folder pattern is confirmed.",
    submit: "Submit Assessment",
    submitting: "Submitting...",
    select: "Select",
    shortAnswer: "Short answer",
    followTitle: "Mabel-style Follow-up Questions",
    followEmpty: "Follow-up questions will appear after rental goal, suite, yard, pet, ocean view, or Airbnb / STR details are selected.",
    questionSingular: "question",
    questionPlural: "questions",
    consentText: "I agree that Mabel may contact me about this assessment.",
    privacyText: "I consent to submitting this property information for review.",
    report: {
      executiveSummary: "Executive Summary",
      propertyStrengths: "Property Strengths",
      rentalChallenges: "Rental Challenges",
      suggestedRentalStrategy: "Suggested Rental Strategy",
      estimatedRentRange: "Estimated Rent Range",
      suiteSplitRentalPotential: "Suite / Split Rental Potential",
      airbnbStrRegulationCheck: "Airbnb / STR Regulation Check",
      marketingSuggestions: "Marketing Suggestions",
      ownerGoalAlignment: "Owner Goal Alignment",
      recommendedNextStep: "Recommended Next Step",
    },
  },
  zh: {
    title: "AI 房产出租策略初评",
    subtitle: "AI Property Strategy Assessment",
    desc: "填写物业信息、出租目标、套房潜力，以及 Airbnb / 短租意向，供 Mabel 做初步判断。",
    successTitle: "初评已成功提交",
    successDesc: "Mabel 会先审核您提交的信息，再给出最终建议。",
    successThanks: "谢谢，您的房产出租策略初评表已成功提交。",
    assessmentId: "初评编号",
    nextStepSelected: "业主选择的下一步：",
    notSelected: "未选择",
    mabelReview: "Mabel 会在最终建议前进行人工审核。",
    sections: {
      ownerInfo: "业主信息",
      propertyInfo: "物业信息",
      rentalStructure: "出租结构",
      keyFactors: "关键出租因素",
      airbnb: "Airbnb / 短租意向",
      ownerGoal: "业主目标",
      photoUpload: "照片上传",
      aiAssessment: "AI 初步评估",
      nextStep: "下一步",
    },
    strNotice: "当前 BC 省及市政短租规则必须在做最终决定前再次核实。",
    photoLabel: "物业照片",
    photoHelp: "V1 先保存所选照片文件名。确认后端 Drive 文件夹规则后，可再接入真实上传。",
    submit: "提交初评",
    submitting: "正在提交...",
    select: "请选择",
    shortAnswer: "简短回答",
    followTitle: "Mabel 风格动态追问",
    followEmpty: "选择出租目标、套房、院子、宠物、海景或 Airbnb / 短租信息后，这里会自动显示追问。",
    questionSingular: "个问题",
    questionPlural: "个问题",
    consentText: "我同意 Mabel 就本次初评联系我。",
    privacyText: "我同意提交这些物业信息供审核使用。",
    report: {
      executiveSummary: "核心摘要",
      propertyStrengths: "物业优势",
      rentalChallenges: "出租挑战",
      suggestedRentalStrategy: "建议出租策略",
      estimatedRentRange: "预估租金范围",
      suiteSplitRentalPotential: "套房 / 分租潜力",
      airbnbStrRegulationCheck: "Airbnb / 短租规则提醒",
      marketingSuggestions: "营销建议",
      ownerGoalAlignment: "业主目标匹配度",
      recommendedNextStep: "建议下一步",
    },
  },
};

const PROPERTY_TYPES = ["House", "Townhouse", "Condo", "Duplex", "Suite", "Acreage", "Other"];
const OWNER_GOALS = [
  "Maximize rent",
  "Rent ASAP",
  "Find stable long-term tenant",
  "Compare long-term vs short-term rental",
  "Rent part of the property",
  "Prepare property before listing",
  "Unsure - need Mabel's advice",
];
const NEXT_STEPS = [
  "Book Mabel's strategy review",
  "Request full rental market assessment",
  "Prepare listing marketing package",
  "Discuss property management",
  "Not ready yet - keep my intake on file",
];

const OPTION_LABELS_ZH = {
  Yes: "是",
  No: "否",
  Unsure: "不确定",
  "Not sure": "不确定",
  Email: "邮箱",
  Phone: "电话",
  "Text message": "短信",
  WeChat: "微信",
  House: "独立屋",
  Townhouse: "联排",
  Condo: "公寓",
  Duplex: "双拼",
  Suite: "套房",
  Acreage: "大地物业",
  Other: "其他",
  "Maximize rent": "尽量提高租金",
  "Rent ASAP": "尽快出租",
  "Find stable long-term tenant": "寻找稳定长期租客",
  "Compare long-term vs short-term rental": "比较长租和短租",
  "Rent part of the property": "出租部分物业",
  "Prepare property before listing": "出租前先整理物业",
  "Unsure - need Mabel's advice": "不确定，需要 Mabel 建议",
  "Book Mabel's strategy review": "预约 Mabel 策略审核",
  "Request full rental market assessment": "申请完整租赁市场评估",
  "Prepare listing marketing package": "准备房源营销套件",
  "Discuss property management": "咨询物业管理",
  "Not ready yet - keep my intake on file": "暂未准备好，先保留资料",
  "Rooms only": "只出租房间",
  "Whole home": "整套出租",
  "Operate myself": "自己运营",
  "Third-party operator": "第三方运营",
  Separated: "已分开",
  Shared: "共用",
};

const FOLLOW_UP_LABELS_ZH = {
  "Airbnb / STR": "Airbnb / 短租",
  "Existing Suite": "现有套房",
  "Suite Conversion": "套房改造",
  Backyard: "后院",
  "Pet Friendly": "宠物友好",
  "Owner Goal": "业主目标",
  "Ocean View": "海景",
};

const FOLLOW_UP_QUESTIONS_ZH = {
  strPrincipalResidence: "这是您的主要住所吗？",
  strLiveOnSite: "短租期间您会住在现场吗？",
  strMunicipalityDetail: "物业属于哪个城市 / 市政区域？",
  strRoomsOrWholeHome: "您计划只出租房间，还是整套出租？",
  strOperatorPlan: "您计划自己运营，还是使用第三方运营？",
  suiteSeparateEntrance: "套房是否有独立入口？",
  suiteOwnKitchen: "套房是否有自己的厨房？",
  suiteSeparateLaundry: "套房是否有独立洗衣？",
  suiteSeparateHydro: "是否有独立电表？",
  suiteUtilitiesSeparated: "水电等费用目前是分开还是共用？",
  conversionBasement: "是否有地下室或低层空间可改造？",
  conversionSeparateEntrance: "是否已有或可能增加独立入口？",
  conversionAddKitchen: "您是否考虑增加厨房？",
  conversionSplitUnits: "您是否考虑把房子分成两个出租单元？",
  backyardAddFence: "您是否考虑增加后院围栏？",
  backyardPrivateArea: "租客是否有私人户外区域？",
  backyardShared: "院子是否与另一个单元共用？",
  petYardFullyFenced: "院子是否完全有围栏？",
  petDamageConcerns: "是否担心地板或损坏问题？",
  petRestrictions: "您是否希望设置宠物限制？",
  goalWaitForTenant: "您是否愿意多等一段时间，找到更合适的租客？",
  goalMakeImprovements: "出租前您是否愿意做一些改善？",
  goalConsiderSplitRental: "如果合法且实际可行，您是否考虑分租？",
  goalBelowStretchRent: "您是否愿意把租金定得略低于最高预期，以便更快出租？",
  goalFlexiblePets: "您对宠物是否可以灵活一些？",
  goalQuickOpenHouse: "您是否愿意尽快安排开放看房？",
  viewLivingRoom: "客厅能看到海景吗？",
  viewBedroomsDeck: "卧室或露台能看到海景吗？",
  viewMainMarketing: "是否应该把海景作为主要营销亮点？",
};

export default function StrategyAssessment({ lang }) {
  const safeLang = normalizeLang(lang);
  const copy = COPY[safeLang] || COPY.en;
  const labels = FIELD_LABELS[safeLang] || FIELD_LABELS.en;
  const [form, setForm] = useState(() => createEmptyStrategyAssessment());
  const [photoNames, setPhotoNames] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(null);

  const preliminary = useMemo(() => generatePreliminaryStrategySummary(form), [form]);
  const followUpQuestions = useMemo(() => getStrategyFollowUpQuestions(form), [form]);

  const update = (field) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateFollowUp = (questionId) => (event) => {
    const value = event.target.value;
    setForm((current) => ({
      ...current,
      followUpAnswers: {
        ...(current.followUpAnswers || {}),
        [questionId]: value,
      },
    }));
  };

  const handlePhotoChange = (event) => {
    const names = Array.from(event.target.files || []).map((file) => file.name);
    setPhotoNames(names);
    setForm((current) => ({ ...current, photoFileNames: names.join(", ") }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const result = await submitStrategyAssessment({
        ...form,
        photoFileNames: photoNames.join(", "),
        preliminaryAssessment: preliminary,
      });
      setSubmitted({
        assessmentId: result.assessmentId,
        nextStep: form.nextStep,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="pub-page strategy-page">
        <section className="pub-hero">
          <h1 className="pub-hero__title">{copy.successTitle}</h1>
          <p className="pub-hero__sub">{copy.title}</p>
          <p className="pub-hero__desc">{copy.successDesc}</p>
        </section>

        <section className="section">
          <div className="container strategy-container">
            <div className="card strategy-success">
              <p className="strategy-success__label">{copy.assessmentId}</p>
              <h2>{submitted.assessmentId}</h2>
              <p>{copy.successThanks}</p>
              <p><strong>{copy.nextStepSelected}</strong> {submitted.nextStep || copy.notSelected}</p>
              <p>{copy.mabelReview}</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="pub-page strategy-page">
      <section className="pub-hero">
        <h1 className="pub-hero__title">{copy.title}</h1>
        <p className="pub-hero__sub">{copy.subtitle}</p>
        <p className="pub-hero__desc">{copy.desc}</p>
      </section>

      <section className="section">
        <div className="container strategy-container">
          {error && (
            <div className="notice notice--error">
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="strategy-form">
            <AssessmentSection title={copy.sections.ownerInfo}>
              <div className="form-row">
                <TextInput field="ownerName" form={form} update={update} labels={labels} required />
                <TextInput field="email" form={form} update={update} labels={labels} required type="email" />
              </div>
              <div className="form-row">
                <TextInput field="phone" form={form} update={update} labels={labels} required />
                <SelectInput field="preferredContact" form={form} update={update} labels={labels} copy={copy} options={CONTACT_OPTIONS} required />
              </div>
            </AssessmentSection>

            <AssessmentSection title={copy.sections.propertyInfo}>
              <TextInput field="propertyAddress" form={form} update={update} labels={labels} required />
              <div className="form-row">
                <TextInput field="city" form={form} update={update} labels={labels} required />
                <TextInput field="communityArea" form={form} update={update} labels={labels} />
              </div>
              <div className="form-row">
                <SelectInput field="propertyType" form={form} update={update} labels={labels} copy={copy} options={PROPERTY_TYPES} required />
                <TextInput field="availableDate" form={form} update={update} labels={labels} type="date" />
              </div>
              <div className="form-row strategy-row-4">
                <TextInput field="bedrooms" form={form} update={update} labels={labels} type="number" min="0" />
                <TextInput field="bathrooms" form={form} update={update} labels={labels} type="number" min="0" step="0.5" />
                <TextInput field="garageSpaces" form={form} update={update} labels={labels} type="number" min="0" />
                <TextInput field="drivewayParking" form={form} update={update} labels={labels} type="number" min="0" />
              </div>
            </AssessmentSection>

            <AssessmentSection title={copy.sections.rentalStructure}>
              <div className="strategy-toggle-grid">
                {["furnished", "existingSuite", "separateEntrance", "separateKitchen", "separateLaundry", "separateMeter", "utilitiesShared", "canAddKitchen"].map((field) => (
                  <SelectInput key={field} field={field} form={form} update={update} labels={labels} copy={copy} options={YES_NO} />
                ))}
              </div>
            </AssessmentSection>

            <AssessmentSection title={copy.sections.keyFactors}>
              <div className="strategy-toggle-grid">
                {["oceanView", "fencedBackyard", "privateYard", "petFriendly"].map((field) => (
                  <SelectInput key={field} field={field} form={form} update={update} labels={labels} copy={copy} options={YES_NO} />
                ))}
              </div>
              <TextArea field="knownIssues" form={form} update={update} labels={labels} rows={3} />
            </AssessmentSection>

            <AssessmentSection title={copy.sections.airbnb}>
              <div className="notice notice--warm strategy-inline-notice">
                <p>{copy.strNotice}</p>
              </div>
              <div className="strategy-toggle-grid">
                {["airbnbInterest", "principalResidence", "ownerLivesOnSite", "thirdPartyOperatorInterest"].map((field) => (
                  <SelectInput key={field} field={field} form={form} update={update} labels={labels} copy={copy} options={YES_NO} />
                ))}
              </div>
              <TextInput field="strMunicipality" form={form} update={update} labels={labels} placeholder="e.g. Nanaimo, Victoria, Vancouver" />
            </AssessmentSection>

            <AssessmentSection title={copy.sections.ownerGoal}>
              <div className="form-row">
                <SelectInput field="ownerGoal" form={form} update={update} labels={labels} copy={copy} options={OWNER_GOALS} required />
                <TextInput field="targetRent" form={form} update={update} labels={labels} placeholder="e.g. $2,600/month" />
              </div>
              <TextInput field="timelineUrgency" form={form} update={update} labels={labels} placeholder="e.g. ASAP, 30 days, after renovation" />
            </AssessmentSection>

            <FollowUpQuestions
              questions={followUpQuestions}
              answers={form.followUpAnswers || {}}
              update={updateFollowUp}
              copy={copy}
              lang={safeLang}
            />

            <AssessmentSection title={copy.sections.photoUpload}>
              <div className="form-group">
                <label>{copy.photoLabel}</label>
                <input className="form-control" type="file" accept="image/*" multiple onChange={handlePhotoChange} />
                <p className="strategy-help">{copy.photoHelp}</p>
              </div>
              {photoNames.length > 0 && (
                <ul className="strategy-file-list">
                  {photoNames.map((name) => <li key={name}>{name}</li>)}
                </ul>
              )}
            </AssessmentSection>

            <AssessmentSection title={copy.sections.aiAssessment}>
              <AssessmentPreview assessment={preliminary} copy={copy} />
            </AssessmentSection>

            <AssessmentSection title={copy.sections.nextStep}>
              <SelectInput field="nextStep" form={form} update={update} labels={labels} copy={copy} options={NEXT_STEPS} required />
              <label className="strategy-check">
                <input type="checkbox" checked={form.consentToContact} onChange={update("consentToContact")} required />
                <span>{labels.consentToContact}: {copy.consentText}</span>
              </label>
              <label className="strategy-check">
                <input type="checkbox" checked={form.privacyConsent} onChange={update("privacyConsent")} required />
                <span>{labels.privacyConsent}: {copy.privacyText}</span>
              </label>
            </AssessmentSection>

            <div className="strategy-submit">
              <button type="submit" className="btn btn--sage" disabled={submitting}>
                {submitting ? copy.submitting : copy.submit}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

function AssessmentSection({ title, children }) {
  return (
    <section className="card strategy-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function displayOption(option, lang) {
  return lang === "zh" ? (OPTION_LABELS_ZH[option] || option) : option;
}

function FollowUpQuestions({ questions, answers, update, copy, lang }) {
  if (!questions.length) {
    return (
      <section className="card strategy-section strategy-follow-up">
        <h2>{copy.followTitle}</h2>
        <p className="strategy-help">{copy.followEmpty}</p>
      </section>
    );
  }

  const groups = questions.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  return (
    <details className="card strategy-section strategy-follow-up" open>
      <summary>
        <span>{copy.followTitle}</span>
        <small>{questions.length} {questions.length === 1 ? copy.questionSingular : copy.questionPlural}</small>
      </summary>
      <div className="strategy-follow-up__body">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group} className="strategy-follow-up__group">
            <h3>{lang === "zh" ? (FOLLOW_UP_LABELS_ZH[group] || group) : group}</h3>
            <div className="strategy-follow-up__grid">
              {items.map((item) => (
                <FollowUpField key={item.id} item={item} value={answers[item.id] || ""} update={update(item.id)} copy={copy} lang={lang} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

function FollowUpField({ item, value, update, copy, lang }) {
  const question = lang === "zh" ? (FOLLOW_UP_QUESTIONS_ZH[item.id] || item.question) : item.question;
  return (
    <div className="form-group strategy-follow-up__field">
      <label>{question}</label>
      {item.type === "text" ? (
        <input className="form-control" value={value} onChange={update} placeholder={copy.shortAnswer} />
      ) : (
        <select className="form-control" value={value} onChange={update}>
          <option value="">{copy.select}</option>
          {(item.options || FOLLOW_UP_YES_NO).map((option) => (
            <option key={option} value={option}>{displayOption(option, lang)}</option>
          ))}
        </select>
      )}
    </div>
  );
}

function TextInput({ field, form, update, labels, type = "text", required = false, ...rest }) {
  return (
    <div className="form-group">
      <label>{labels[field]}{required ? " *" : ""}</label>
      <input className="form-control" type={type} value={form[field]} onChange={update(field)} required={required} {...rest} />
    </div>
  );
}

function SelectInput({ field, form, update, labels, copy, options, required = false }) {
  return (
    <div className="form-group">
      <label>{labels[field]}{required ? " *" : ""}</label>
      <select className="form-control" value={form[field]} onChange={update(field)} required={required}>
        <option value="">{copy.select}</option>
        {options.map((option) => <option key={option} value={option}>{displayOption(option, copy === COPY.zh ? "zh" : "en")}</option>)}
      </select>
    </div>
  );
}

function TextArea({ field, form, update, labels, rows = 4 }) {
  return (
    <div className="form-group">
      <label>{labels[field]}</label>
      <textarea className="form-control" rows={rows} value={form[field]} onChange={update(field)} />
    </div>
  );
}

function AssessmentPreview({ assessment, copy }) {
  const rows = [
    [copy.report.executiveSummary, assessment.executiveSummary],
    [copy.report.propertyStrengths, assessment.propertyStrengths],
    [copy.report.rentalChallenges, assessment.rentalChallenges],
    [copy.report.suggestedRentalStrategy, assessment.suggestedRentalStrategy],
    [copy.report.estimatedRentRange, assessment.estimatedRentRange],
    [copy.report.suiteSplitRentalPotential, assessment.suiteSplitRentalPotential],
    [copy.report.airbnbStrRegulationCheck, assessment.airbnbStrRegulationCheck],
    [copy.report.marketingSuggestions, assessment.marketingSuggestions],
    [copy.report.ownerGoalAlignment, assessment.ownerGoalAlignment],
    [copy.report.recommendedNextStep, assessment.recommendedNextStep],
  ];

  return (
    <div className="strategy-assessment-preview">
      {rows.map(([title, value]) => (
        <div key={title} className="strategy-report-block">
          <h3>{title}</h3>
          {Array.isArray(value) ? (
            <ul>{value.map((item) => <li key={item}>{item}</li>)}</ul>
          ) : (
            <p>{value}</p>
          )}
        </div>
      ))}
      <div className="notice notice--info strategy-inline-notice">
        <p>{assessment.disclaimer}</p>
      </div>
    </div>
  );
}
