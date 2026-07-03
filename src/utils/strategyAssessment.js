import { apiPost, isApiConnected } from "./api";

export const STRATEGY_ASSESSMENT_SPREADSHEET_ID = "1F3rPmEMsOoTFWYo3CPD76BS4RuRbSPTCB47g5YTHopE";

export const STRATEGY_ASSESSMENT_DISCLAIMER =
  "This is an AI preliminary assessment based on Mabel Chen's rental management framework. Final recommendation requires Mabel's professional review.";

export function createAssessmentId(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    "PSA",
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`,
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`,
  ].join("-");
}

export function createEmptyStrategyAssessment(overrides = {}) {
  return {
    assessmentId: "",
    status: "New",
    ownerName: "",
    email: "",
    phone: "",
    preferredContact: "",
    propertyAddress: "",
    city: "Nanaimo",
    communityArea: "",
    propertyType: "",
    bedrooms: "",
    bathrooms: "",
    garageSpaces: "",
    drivewayParking: "",
    furnished: "",
    oceanView: "",
    fencedBackyard: "",
    privateYard: "",
    petFriendly: "",
    existingSuite: "",
    separateEntrance: "",
    separateKitchen: "",
    separateLaundry: "",
    separateMeter: "",
    utilitiesShared: "",
    canAddKitchen: "",
    ownerGoal: "",
    targetRent: "",
    availableDate: "",
    airbnbInterest: "",
    principalResidence: "",
    ownerLivesOnSite: "",
    strMunicipality: "",
    thirdPartyOperatorInterest: "",
    knownIssues: "",
    timelineUrgency: "",
    nextStep: "",
    consentToContact: false,
    privacyConsent: false,
    photoFileNames: "",
    preliminaryAssessment: null,
    ...overrides,
  };
}

export function generatePreliminaryStrategySummary(form) {
  const strengths = [];
  const challenges = [];

  if (form.oceanView === "Yes") strengths.push("Ocean view may improve listing appeal and photography strength.");
  if (form.privateYard === "Yes" || form.fencedBackyard === "Yes") strengths.push("Private or fenced outdoor space can support family and pet-friendly positioning.");
  if (form.separateEntrance === "Yes") strengths.push("Separate entrance supports privacy and suite-style rental positioning.");
  if (form.separateKitchen === "Yes" && form.separateLaundry === "Yes") strengths.push("Separate kitchen and laundry may improve split-rental practicality.");
  if (form.garageSpaces || form.drivewayParking) strengths.push("On-site parking can be a meaningful rental advantage.");
  if (form.furnished === "Yes") strengths.push("Furnished setup may support mid-term rental or relocation tenant positioning.");

  if (form.utilitiesShared === "Yes") challenges.push("Shared utilities should be clearly disclosed and priced carefully.");
  if (form.knownIssues) challenges.push("Known issues should be reviewed before marketing or tenant placement.");
  if (form.existingSuite !== "Yes" && form.canAddKitchen !== "Yes") challenges.push("Suite or split-rental upside may be limited without an existing suite or kitchen potential.");
  if (form.airbnbInterest === "Yes") challenges.push("Short-term rental feasibility depends on current BC and municipal rules.");

  const rentText = form.targetRent
    ? `Owner target rent is ${form.targetRent}. A final rent range should be confirmed after Mabel reviews comparable listings, condition, location, and included utilities.`
    : "Estimated rent range requires Mabel's review of comparable listings, condition, location, and included utilities.";

  const splitPotential = form.existingSuite === "Yes"
    ? "Existing suite features may support a suite or split-rental strategy, subject to layout, safety, compliance, and market review."
    : form.separateEntrance === "Yes" || form.canAddKitchen === "Yes"
      ? "There may be split-rental potential, but layout, kitchen feasibility, laundry, utilities, and compliance need review."
      : "Split-rental potential appears limited based on the V1 intake answers.";

  return {
    executiveSummary: `${form.propertyType || "This property"} in ${form.city || "the local market"} should be reviewed for ${form.ownerGoal || "the owner's rental goal"}. This V1 assessment is preliminary and based only on the submitted intake details.`,
    propertyStrengths: strengths.length ? strengths : ["Property strengths need photo and layout review before final positioning."],
    rentalChallenges: challenges.length ? challenges : ["No major V1 challenges were flagged from the submitted answers. Mabel should still review condition, compliance, and market fit."],
    suggestedRentalStrategy: buildSuggestedStrategy(form),
    estimatedRentRange: rentText,
    suiteSplitRentalPotential: splitPotential,
    airbnbStrRegulationCheck: "Current BC and municipal STR rules must be verified before making a final decision.",
    marketingSuggestions: buildMarketingSuggestions(form),
    recommendedNextStep: form.nextStep || "Book Mabel's review before making a final rental strategy decision.",
    disclaimer: STRATEGY_ASSESSMENT_DISCLAIMER,
  };
}

function buildSuggestedStrategy(form) {
  if (form.airbnbInterest === "Yes") {
    return "Compare long-term rental, mid-term rental, and STR options only after confirming provincial and municipal STR eligibility.";
  }
  if (form.existingSuite === "Yes" || form.separateEntrance === "Yes") {
    return "Review whole-home versus suite/split rental options, with attention to privacy, utility sharing, and tenant profile.";
  }
  if (form.furnished === "Yes") {
    return "Consider furnished mid-term or relocation tenant positioning if local demand and pricing support it.";
  }
  return "Start with a long-term rental strategy review, then adjust positioning after Mabel reviews photos, condition, and comparable rents.";
}

function buildMarketingSuggestions(form) {
  const items = [
    "Use clear exterior, kitchen, living area, bedroom, bathroom, parking, and yard photos.",
    "Disclose utilities, parking, pets, furnished status, and known issues clearly.",
  ];
  if (form.oceanView === "Yes") items.push("Lead with view photos if they are accurate and current.");
  if (form.petFriendly === "Yes") items.push("Highlight pet-friendly terms with clear limits and deposit guidance.");
  if (form.privateYard === "Yes" || form.fencedBackyard === "Yes") items.push("Show outdoor space and maintenance expectations.");
  return items;
}

export async function submitStrategyAssessment(form) {
  const assessmentId = form.assessmentId || createAssessmentId();
  const preliminaryAssessment = form.preliminaryAssessment || generatePreliminaryStrategySummary(form);
  const payload = {
    ...form,
    assessmentId,
    status: "New",
    preliminaryAssessment,
    submittedAt: new Date().toISOString(),
  };

  if (!isApiConnected()) {
    throw new Error("VITE_STUDIO_EXEC_URL not configured");
  }

  const result = await apiPost({
    action: "savePropertyStrategyAssessment",
    data: payload,
  });

  return {
    assessmentId,
    preliminaryAssessment,
    ...(result || {}),
  };
}
