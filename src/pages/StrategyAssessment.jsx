import { useMemo, useState } from "react";
import {
  createEmptyStrategyAssessment,
  generatePreliminaryStrategySummary,
  submitStrategyAssessment,
} from "../utils/strategyAssessment";

const YES_NO = ["Yes", "No", "Unsure"];
const CONTACT_OPTIONS = ["Email", "Phone", "Text message", "WeChat"];

const FIELD_LABELS = {
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
};

const PROPERTY_TYPES = ["House", "Townhouse", "Condo", "Duplex", "Suite", "Acreage", "Other"];
const OWNER_GOALS = [
  "Maximize monthly rent",
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

export default function StrategyAssessment() {
  const [form, setForm] = useState(() => createEmptyStrategyAssessment());
  const [photoNames, setPhotoNames] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(null);

  const preliminary = useMemo(() => generatePreliminaryStrategySummary(form), [form]);

  const update = (field) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
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
          <h1 className="pub-hero__title">Assessment submitted successfully</h1>
          <p className="pub-hero__sub">AI Property Strategy Assessment</p>
          <p className="pub-hero__desc">Mabel will review your intake before making a final recommendation.</p>
        </section>

        <section className="section">
          <div className="container strategy-container">
            <div className="card strategy-success">
              <p className="strategy-success__label">Assessment ID</p>
              <h2>{submitted.assessmentId}</h2>
              <p>Thank you. Your property strategy intake has been submitted successfully.</p>
              <p><strong>Next step selected by owner:</strong> {submitted.nextStep || "Not selected"}</p>
              <p>Mabel will review before final recommendation.</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="pub-page strategy-page">
      <section className="pub-hero">
        <h1 className="pub-hero__title">AI Property Strategy Assessment</h1>
        <p className="pub-hero__sub">AI 房产出租策略初评</p>
        <p className="pub-hero__desc">Tell Mabel about the property, rental goal, suite potential, and Airbnb / STR interest.</p>
      </section>

      <section className="section">
        <div className="container strategy-container">
          {error && (
            <div className="notice notice--error">
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="strategy-form">
            <AssessmentSection title="Owner Info">
              <div className="form-row">
                <TextInput field="ownerName" form={form} update={update} required />
                <TextInput field="email" form={form} update={update} required type="email" />
              </div>
              <div className="form-row">
                <TextInput field="phone" form={form} update={update} required />
                <SelectInput field="preferredContact" form={form} update={update} options={CONTACT_OPTIONS} required />
              </div>
            </AssessmentSection>

            <AssessmentSection title="Property Info">
              <TextInput field="propertyAddress" form={form} update={update} required />
              <div className="form-row">
                <TextInput field="city" form={form} update={update} required />
                <TextInput field="communityArea" form={form} update={update} />
              </div>
              <div className="form-row">
                <SelectInput field="propertyType" form={form} update={update} options={PROPERTY_TYPES} required />
                <TextInput field="availableDate" form={form} update={update} type="date" />
              </div>
              <div className="form-row strategy-row-4">
                <TextInput field="bedrooms" form={form} update={update} type="number" min="0" />
                <TextInput field="bathrooms" form={form} update={update} type="number" min="0" step="0.5" />
                <TextInput field="garageSpaces" form={form} update={update} type="number" min="0" />
                <TextInput field="drivewayParking" form={form} update={update} type="number" min="0" />
              </div>
            </AssessmentSection>

            <AssessmentSection title="Rental Structure">
              <div className="strategy-toggle-grid">
                {["furnished", "existingSuite", "separateEntrance", "separateKitchen", "separateLaundry", "separateMeter", "utilitiesShared", "canAddKitchen"].map((field) => (
                  <SelectInput key={field} field={field} form={form} update={update} options={YES_NO} />
                ))}
              </div>
            </AssessmentSection>

            <AssessmentSection title="Key Rental Factors">
              <div className="strategy-toggle-grid">
                {["oceanView", "fencedBackyard", "privateYard", "petFriendly"].map((field) => (
                  <SelectInput key={field} field={field} form={form} update={update} options={YES_NO} />
                ))}
              </div>
              <TextArea field="knownIssues" form={form} update={update} rows={3} />
            </AssessmentSection>

            <AssessmentSection title="Owner Goal">
              <div className="form-row">
                <SelectInput field="ownerGoal" form={form} update={update} options={OWNER_GOALS} required />
                <TextInput field="targetRent" form={form} update={update} placeholder="e.g. $2,600/month" />
              </div>
              <TextInput field="timelineUrgency" form={form} update={update} placeholder="e.g. ASAP, 30 days, after renovation" />
            </AssessmentSection>

            <AssessmentSection title="Airbnb / STR Interest">
              <div className="notice notice--warm strategy-inline-notice">
                <p>Current BC and municipal STR rules must be verified before making a final decision.</p>
              </div>
              <div className="strategy-toggle-grid">
                {["airbnbInterest", "principalResidence", "ownerLivesOnSite", "thirdPartyOperatorInterest"].map((field) => (
                  <SelectInput key={field} field={field} form={form} update={update} options={YES_NO} />
                ))}
              </div>
              <TextInput field="strMunicipality" form={form} update={update} placeholder="e.g. Nanaimo, Victoria, Vancouver" />
            </AssessmentSection>

            <AssessmentSection title="Photo Upload">
              <div className="form-group">
                <label>Property Photos</label>
                <input className="form-control" type="file" accept="image/*" multiple onChange={handlePhotoChange} />
                <p className="strategy-help">V1 saves the selected photo file names with the assessment. Drive upload can be connected after the backend folder pattern is confirmed.</p>
              </div>
              {photoNames.length > 0 && (
                <ul className="strategy-file-list">
                  {photoNames.map((name) => <li key={name}>{name}</li>)}
                </ul>
              )}
            </AssessmentSection>

            <AssessmentSection title="AI Preliminary Assessment">
              <AssessmentPreview assessment={preliminary} />
            </AssessmentSection>

            <AssessmentSection title="Next Step">
              <SelectInput field="nextStep" form={form} update={update} options={NEXT_STEPS} required />
              <label className="strategy-check">
                <input type="checkbox" checked={form.consentToContact} onChange={update("consentToContact")} required />
                <span>{FIELD_LABELS.consentToContact}: I agree that Mabel may contact me about this assessment.</span>
              </label>
              <label className="strategy-check">
                <input type="checkbox" checked={form.privacyConsent} onChange={update("privacyConsent")} required />
                <span>{FIELD_LABELS.privacyConsent}: I consent to submitting this property information for review.</span>
              </label>
            </AssessmentSection>

            <div className="strategy-submit">
              <button type="submit" className="btn btn--sage" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Assessment"}
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

function TextInput({ field, form, update, type = "text", required = false, ...rest }) {
  return (
    <div className="form-group">
      <label>{FIELD_LABELS[field]}{required ? " *" : ""}</label>
      <input className="form-control" type={type} value={form[field]} onChange={update(field)} required={required} {...rest} />
    </div>
  );
}

function SelectInput({ field, form, update, options, required = false }) {
  return (
    <div className="form-group">
      <label>{FIELD_LABELS[field]}{required ? " *" : ""}</label>
      <select className="form-control" value={form[field]} onChange={update(field)} required={required}>
        <option value="">Select</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}

function TextArea({ field, form, update, rows = 4 }) {
  return (
    <div className="form-group">
      <label>{FIELD_LABELS[field]}</label>
      <textarea className="form-control" rows={rows} value={form[field]} onChange={update(field)} />
    </div>
  );
}

function AssessmentPreview({ assessment }) {
  const rows = [
    ["Executive Summary", assessment.executiveSummary],
    ["Property Strengths", assessment.propertyStrengths],
    ["Rental Challenges", assessment.rentalChallenges],
    ["Suggested Rental Strategy", assessment.suggestedRentalStrategy],
    ["Estimated Rent Range", assessment.estimatedRentRange],
    ["Suite / Split Rental Potential", assessment.suiteSplitRentalPotential],
    ["Airbnb / STR Regulation Check", assessment.airbnbStrRegulationCheck],
    ["Marketing Suggestions", assessment.marketingSuggestions],
    ["Recommended Next Step", assessment.recommendedNextStep],
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
