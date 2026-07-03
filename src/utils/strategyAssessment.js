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
    followUpAnswers: {},
    preliminaryAssessment: null,
    ...overrides,
  };
}

export function getStrategyFollowUpQuestions(form) {
  const questions = [];
  const add = (group, id, question, type = "choice", options = ["Yes", "No", "Not sure"]) => {
    questions.push({ group, id, question, type, options });
  };

  if (form.airbnbInterest === "Yes") {
    add("Airbnb / STR", "strPrincipalResidence", "Is this your principal residence?");
    add("Airbnb / STR", "strLiveOnSite", "Will you live on site during short-term rentals?");
    add("Airbnb / STR", "strMunicipalityDetail", "Which municipality is the property in?", "text");
    add("Airbnb / STR", "strRoomsOrWholeHome", "Are you planning to rent rooms only or the whole home?", "choice", ["Rooms only", "Whole home", "Not sure"]);
    add("Airbnb / STR", "strOperatorPlan", "Are you planning to operate it yourself or use a third-party operator?", "choice", ["Operate myself", "Third-party operator", "Not sure"]);
  }

  if (form.existingSuite === "Yes") {
    add("Existing Suite", "suiteSeparateEntrance", "Does the suite have a separate entrance?");
    add("Existing Suite", "suiteOwnKitchen", "Does the suite have its own kitchen?");
    add("Existing Suite", "suiteSeparateLaundry", "Does the suite have separate laundry?");
    add("Existing Suite", "suiteSeparateHydro", "Does it have a separate hydro meter?");
    add("Existing Suite", "suiteUtilitiesSeparated", "Are utilities currently separated or shared?", "choice", ["Separated", "Shared", "Not sure"]);
  }

  if (form.existingSuite === "No") {
    add("Suite Conversion", "conversionBasement", "Is there a basement or lower level that could be converted?");
    add("Suite Conversion", "conversionSeparateEntrance", "Is there a separate entrance or possible separate entrance?");
    add("Suite Conversion", "conversionAddKitchen", "Would you consider adding a kitchen?");
    add("Suite Conversion", "conversionSplitUnits", "Would you consider splitting the home into two rental units?");
  }

  if (form.fencedBackyard === "No") {
    add("Backyard", "backyardAddFence", "Would you consider adding a fenced backyard?");
    add("Backyard", "backyardPrivateArea", "Is there a private outdoor area for tenants?");
    add("Backyard", "backyardShared", "Is the yard shared with another unit?");
  }

  if (form.petFriendly === "Yes") {
    add("Pet Friendly", "petYardFullyFenced", "Is the yard fully fenced?");
    add("Pet Friendly", "petDamageConcerns", "Are there flooring or damage concerns?");
    add("Pet Friendly", "petRestrictions", "Do you want pet restrictions?");
  }

  if (form.ownerGoal === "Maximize rent" || form.ownerGoal === "Maximize monthly rent") {
    add("Owner Goal", "goalWaitForTenant", "Are you willing to wait longer for the right tenant?");
    add("Owner Goal", "goalMakeImprovements", "Are you willing to make improvements before listing?");
    add("Owner Goal", "goalConsiderSplitRental", "Would you consider split rental if legally and practically suitable?");
  }

  if (form.ownerGoal === "Rent ASAP") {
    add("Owner Goal", "goalBelowStretchRent", "Are you willing to price slightly below stretch market rent?");
    add("Owner Goal", "goalFlexiblePets", "Are you flexible on pets?");
    add("Owner Goal", "goalQuickOpenHouse", "Are you willing to hold an open house quickly?");
  }

  if (form.oceanView === "Yes") {
    add("Ocean View", "viewLivingRoom", "Is the ocean view visible from the living room?");
    add("Ocean View", "viewBedroomsDeck", "Is it visible from bedrooms or deck?");
    add("Ocean View", "viewMainMarketing", "Should ocean view be used as the main marketing feature?");
  }

  return questions;
}

export function formatStrategyFollowUpAnswers(form) {
  const answers = form.followUpAnswers || {};
  const lines = getStrategyFollowUpQuestions(form)
    .map((item) => {
      const answer = String(answers[item.id] || "").trim();
      if (!answer) return "";
      return `- ${item.question} ${answer}`;
    })
    .filter(Boolean);

  return lines.length ? ["AI Follow-up Answers:", ...lines].join("\n") : "";
}

export function buildKnownIssuesWithFollowUps(form) {
  const knownIssues = String(form.knownIssues || "").trim();
  const followUps = formatStrategyFollowUpAnswers(form);
  return [knownIssues, followUps].filter(Boolean).join("\n\n");
}

export function generatePreliminaryStrategySummary(form) {
  const strengths = [];
  const challenges = [];
  const followUps = form.followUpAnswers || {};

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
  if (followUps.petDamageConcerns === "Yes") challenges.push("Pet-friendly positioning should account for flooring or damage concerns.");
  if (followUps.backyardShared === "Yes") challenges.push("Shared yard use should be explained clearly for tenant expectations.");

  const rentText = form.targetRent
    ? `Owner target rent is ${form.targetRent}. A final rent range should be confirmed after Mabel reviews comparable listings, condition, location, and included utilities.`
    : "Estimated rent range requires Mabel's review of comparable listings, condition, location, and included utilities.";

  const splitPotential = buildSuiteSplitPotential(form, followUps);

  return {
    executiveSummary: `${form.propertyType || "This property"} in ${form.city || "the local market"} should be reviewed for ${form.ownerGoal || "the owner's rental goal"}. This V2 assessment is preliminary and includes the submitted intake plus Mabel-style follow-up answers where provided.`,
    propertyStrengths: strengths.length ? strengths : ["Property strengths need photo and layout review before final positioning."],
    rentalChallenges: challenges.length ? challenges : ["No major V1 challenges were flagged from the submitted answers. Mabel should still review condition, compliance, and market fit."],
    suggestedRentalStrategy: buildSuggestedStrategy(form),
    estimatedRentRange: rentText,
    suiteSplitRentalPotential: splitPotential,
    airbnbStrRegulationCheck: "Current BC and municipal STR rules must be verified before making a final decision.",
    marketingSuggestions: buildMarketingSuggestions(form, followUps),
    ownerGoalAlignment: buildOwnerGoalAlignment(form, followUps),
    recommendedNextStep: form.nextStep || "Book Mabel's review before making a final rental strategy decision.",
    disclaimer: STRATEGY_ASSESSMENT_DISCLAIMER,
  };
}

function buildSuggestedStrategy(form) {
  if (form.airbnbInterest === "Yes") {
    return "Compare long-term rental, mid-term rental, and STR options only after confirming provincial and municipal STR eligibility.";
  }
  if (form.ownerGoal === "Rent ASAP") {
    return "Prioritize fast readiness, clear pricing, quick showing availability, and simple tenant screening workflow.";
  }
  if (form.existingSuite === "Yes" || form.separateEntrance === "Yes") {
    return "Review whole-home versus suite/split rental options, with attention to privacy, utility sharing, and tenant profile.";
  }
  if (form.furnished === "Yes") {
    return "Consider furnished mid-term or relocation tenant positioning if local demand and pricing support it.";
  }
  return "Start with a long-term rental strategy review, then adjust positioning after Mabel reviews photos, condition, and comparable rents.";
}

function buildSuiteSplitPotential(form, followUps) {
  if (form.existingSuite === "Yes") {
    const suiteReadySignals = [
      followUps.suiteSeparateEntrance,
      followUps.suiteOwnKitchen,
      followUps.suiteSeparateLaundry,
      followUps.suiteSeparateHydro,
    ].filter((value) => value === "Yes").length;
    if (suiteReadySignals >= 3) {
      return "Suite / split rental feasibility appears stronger because several separate-suite features were confirmed. Mabel should still review layout, legality, safety, insurance, and utility setup.";
    }
    return "Existing suite may support split rental, but missing or uncertain separate entrance, kitchen, laundry, meter, or utility details need Mabel's review.";
  }

  if (form.existingSuite === "No") {
    if (followUps.conversionBasement === "Yes" || followUps.conversionSeparateEntrance === "Yes" || followUps.conversionAddKitchen === "Yes") {
      return "There may be future suite conversion potential. Feasibility depends on layout, budget, municipal requirements, safety, parking, and whether the owner wants a two-unit strategy.";
    }
    return "Split rental feasibility appears limited unless the owner is willing and able to create a suitable secondary suite setup.";
  }

  if (form.separateEntrance === "Yes" || form.canAddKitchen === "Yes") {
    return "There may be split-rental potential, but layout, kitchen feasibility, laundry, utilities, and compliance need review.";
  }

  return "Suite / split rental feasibility is unclear from the current answers and should be reviewed with property photos and layout.";
}

function buildMarketingSuggestions(form, followUps) {
  const items = [
    "Use clear exterior, kitchen, living area, bedroom, bathroom, parking, and yard photos.",
    "Disclose utilities, parking, pets, furnished status, and known issues clearly.",
  ];
  if (form.oceanView === "Yes") items.push("Lead with view photos if they are accurate and current.");
  if (form.petFriendly === "Yes") items.push("Highlight pet-friendly terms with clear limits and deposit guidance.");
  if (form.privateYard === "Yes" || form.fencedBackyard === "Yes") items.push("Show outdoor space and maintenance expectations.");
  if (form.fencedBackyard === "No" && followUps.backyardPrivateArea === "Yes") items.push("Position the outdoor area carefully without overstating fenced-yard privacy.");
  if (form.petFriendly === "Yes" && followUps.petYardFullyFenced !== "Yes") items.push("Pet-friendly marketing should be cautious if the yard is not fully fenced.");
  if (form.oceanView === "Yes" && followUps.viewMainMarketing === "Yes") items.push("Use ocean view as a lead feature in headline and first photo sequence.");
  return items;
}

function buildOwnerGoalAlignment(form, followUps) {
  if (form.ownerGoal === "Maximize rent" || form.ownerGoal === "Maximize monthly rent") {
    return [
      followUps.goalWaitForTenant === "Yes" ? "Owner can prioritize stronger tenant fit over speed." : "If owner is not willing to wait, rent target may need to stay realistic.",
      followUps.goalMakeImprovements === "Yes" ? "Pre-listing improvements may support stronger rent and photos." : "Without improvements, pricing should reflect current condition.",
      followUps.goalConsiderSplitRental === "Yes" ? "Split-rental option can be reviewed if legally and practically suitable." : "Whole-home strategy may be simpler if split rental is not preferred.",
    ];
  }

  if (form.ownerGoal === "Rent ASAP") {
    return [
      followUps.goalBelowStretchRent === "Yes" ? "Pricing slightly below stretch rent may support faster tenant placement." : "A stretch rent target may slow down placement.",
      followUps.goalFlexiblePets === "Yes" ? "Pet flexibility may increase applicant pool." : "Pet limits may reduce speed but can protect property condition.",
      followUps.goalQuickOpenHouse === "Yes" ? "Quick showing or open house can support faster leasing." : "Limited showing availability may slow the rental timeline.",
    ];
  }

  return "Owner goal alignment should be confirmed after Mabel reviews market demand, condition, pricing, and timeline.";
}

export async function submitStrategyAssessment(form) {
  const assessmentId = form.assessmentId || createAssessmentId();
  const preliminaryAssessment = form.preliminaryAssessment || generatePreliminaryStrategySummary(form);
  const payload = {
    ...form,
    assessmentId,
    status: "New",
    knownIssues: buildKnownIssuesWithFollowUps(form),
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
