
import { categoryMapping } from "./preferenceEngine";

// --------------------------------------------------
// 1. COMPATIBILITY CONFIGURATION
// --------------------------------------------------

const dimensionWeights = {
  interests: 25,
  personality: 25,
  values: 30,
  lifestyle: 20,
};

const importanceWeights = {
  high: 3,
  medium: 2,
  low: 1,
  unknown: 1,
};

// --------------------------------------------------
// 2. NORMALISATION
// --------------------------------------------------

function normalise(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/travelling|travelled|traveler|travellers|traveling|traveled/g, "travel")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function normaliseText(value = "") {
  return normalise(value).join(" ");
}

// Identify the actual preference area.
// This supports both user records and synthetic profile records.
function getPreferenceArea(preference) {
  const category = (
    categoryMapping[preference.category] || preference.category || ""
  ).toLowerCase();

  const topic = (preference.topic || "").toLowerCase();

  if (category === "interests") {
    const interestTopics = [
      "food",
      "travelling",
      "travel",
      "music",
      "fitness",
      "movies",
      "interests",
    ];

    if (interestTopics.includes(topic)) {
      return topic === "travel" ? "travelling" : topic;
    }

    return "interests";
  }

  return category;
}

function getDimension(preference) {
  const area = getPreferenceArea(preference);

  if (
    ["interests", "food", "travelling", "music", "fitness", "movies"]
      .includes(area)
  ) {
    return "interests";
  }

  if (area === "personality") {
    return "personality";
  }

  if (area === "values") {
    return "values";
  }

  if (["lifestyle", "communication"].includes(area)) {
    return "lifestyle";
  }

  return null;
}

// --------------------------------------------------
// 3. PREFERENCE SIMILARITY
// --------------------------------------------------

// Similarity is based on actual words and meaning.
// A shared topic alone no longer creates a 55% match.

function calculateSimilarity(first, second) {
  const firstValue = normaliseText(first.value);
  const secondValue = normaliseText(second.value);

  if (!firstValue || !secondValue) return 0;

  if (firstValue === secondValue) return 1;

  const firstWords = new Set(normalise(first.value));
  const secondWords = new Set(normalise(second.value));

  const commonWords = [...firstWords].filter((word) =>
    secondWords.has(word)
  );

  const union = new Set([...firstWords, ...secondWords]);

  const similarity =
    union.size > 0 ? commonWords.length / union.size : 0;

  // Small support for common equivalent expressions.
  const synonyms = [
    ["adventurous", "adventure"],
    ["travelling", "travel"],
    ["travelling", "traveling"],
    ["outgoing", "extroverted"],
    ["gym", "fitness"],
    ["workout", "fitness"],
    ["cooking", "food"],
    ["honesty", "honest"],
    ["family", "family oriented"],
    ["quiet", "introverted"],
  ];

  const hasEquivalent = synonyms.some(([a, b]) => {
    const firstText = normaliseText(first.value);
    const secondText = normaliseText(second.value);

    return (
      (firstText.includes(a) && secondText.includes(b)) ||
      (firstText.includes(b) && secondText.includes(a))
    );
  });

  return hasEquivalent ? Math.max(similarity, 0.65) : similarity;
}

// --------------------------------------------------
// 4. PREFERENCE COMPARISON
// --------------------------------------------------

function isActive(preference) {
  return !["neutral", "unknown"].includes(
    preference.state || "preferred"
  );
}

function isAvoided(preference) {
  return preference.state === "avoided";
}

function comparePreferences(source, target) {
  if (getPreferenceArea(source) !== getPreferenceArea(target)) {
    return null;
  }

  if (!isActive(source) || !isActive(target)) {
    return null;
  }

  const similarity = calculateSimilarity(source, target);

  const sourceAvoided = isAvoided(source);
  const targetAvoided = isAvoided(target);

  // A conflict exists when one person prefers something
  // the other person explicitly avoids.
  const conflict = sourceAvoided !== targetAvoided;

  const weight =
    importanceWeights[source.importance] || 1;

  let score;

  if (conflict) {
    score = -similarity;
  } else {
    score = similarity;
  }

  return {
    similarity,
    weight,
    score,
    conflict,
    sourceValue: source.value,
    targetValue: target.value,
  };
}

// --------------------------------------------------
// 5. COMPARE PREFERENCE GROUPS
// --------------------------------------------------

function evaluatePreferenceGroup(
  sourcePreferences,
  targetPreferences,
  directionLabel
) {
  let totalWeight = 0;
  let earnedScore = 0;
  let comparisons = 0;

  const reasons = [];
  const concerns = [];

  sourcePreferences.forEach((source) => {
    const comparable = targetPreferences.filter(
      (target) =>
        getPreferenceArea(source) === getPreferenceArea(target)
    );

    if (comparable.length === 0) return;

    const candidates = comparable
      .map((target) => ({
        target,
        comparison: comparePreferences(source, target),
      }))
      .filter((item) => item.comparison !== null);

    if (candidates.length === 0) return;

    // Choose the strongest actual comparison.
    const bestMatch = candidates.sort(
      (a, b) =>
        b.comparison.similarity - a.comparison.similarity
    )[0];

    const { target, comparison } = bestMatch;

    totalWeight += comparison.weight;
    earnedScore += comparison.score * comparison.weight;
    comparisons += 1;

    if (comparison.conflict && comparison.similarity >= 0.35) {
      concerns.push({
        type: "avoided",
        direction: directionLabel,
        userPreference: source.value,
        candidatePreference: target.value,
        explanation:
          `Potential conflict: you and ${target.value} have different preferences regarding ${source.value}.`,
      });
    } else if (comparison.similarity >= 0.35) {
      reasons.push({
        type: "match",
        direction: directionLabel,
        userPreference: source.value,
        candidatePreference: target.value,
        explanation:
          `You prefer ${source.value}, and this profile also indicates ${target.value}.`,
      });
    } else {
      concerns.push({
        type: "difference",
        direction: directionLabel,
        userPreference: source.value,
        candidatePreference: target.value,
        explanation:
          `Your preference for ${source.value} differs from this profile's ${target.value}.`,
      });
    }
  });

  return {
    totalWeight,
    earnedScore,
    comparisons,
    reasons,
    concerns,
  };
}

// --------------------------------------------------
// 6. PREFERENCE COLLECTION
// --------------------------------------------------

function getPersonalPreferences(preferences = []) {
  return preferences.filter(
    (preference) =>
      preference.preferenceType === "personal_interest" &&
      isActive(preference)
  );
}

function getPartnerExpectations(preferences = []) {
  return preferences.filter(
    (preference) =>
      preference.preferenceType === "partner_expectation" &&
      isActive(preference)
  );
}

// --------------------------------------------------
// 7. DIMENSION-BASED COMPATIBILITY
// --------------------------------------------------

function calculateDimensionScore(groups) {
  const totalWeight = groups.reduce(
    (sum, group) => sum + group.totalWeight,
    0
  );

  const earnedScore = groups.reduce(
    (sum, group) => sum + group.earnedScore,
    0
  );

  if (totalWeight === 0) return null;

  // Convert signed similarity to a 0-100 scale.
  return Math.round(
    Math.max(0, Math.min(100, ((earnedScore / totalWeight) + 1) * 50))
  );
}

function calculateCompatibility(
  userPreferences = [],
  candidateProfile
) {
  const candidatePreferences = candidateProfile.preferences || [];

  const userPersonal = getPersonalPreferences(userPreferences);
  const userExpectations = getPartnerExpectations(userPreferences);

  const candidatePersonal = getPersonalPreferences(candidatePreferences);
  const candidateExpectations = getPartnerExpectations(candidatePreferences);

  // Compare preferences in both directions.
  const groups = [
    evaluatePreferenceGroup(
      userPersonal,
      candidatePersonal,
      "shared_interests"
    ),
    evaluatePreferenceGroup(
      userExpectations,
      candidatePersonal,
      "user_expectations"
    ),
    evaluatePreferenceGroup(
      candidateExpectations,
      userPersonal,
      "candidate_expectations"
    ),
  ];

  const dimensionGroups = {
    interests: [],
    personality: [],
    values: [],
    lifestyle: [],
  };

  // Group comparisons by compatibility dimension.
  groups.forEach((group) => {
    [...group.reasons, ...group.concerns].forEach((item) => {
      const source =
        userPreferences.find(
          (preference) => preference.value === item.userPreference
        ) ||
        candidatePreferences.find(
          (preference) => preference.value === item.candidatePreference
        );

      if (!source) return;

      const dimension = getDimension(source);

      if (dimension && dimensionGroups[dimension]) {
        dimensionGroups[dimension].push(item);
      }
    });
  });

  const dimensionResults = {};

  Object.entries(dimensionWeights).forEach(([dimension, weight]) => {
    const dimensionItems = dimensionGroups[dimension];

    if (dimensionItems.length === 0) {
      dimensionResults[dimension] = null;
      return;
    }

    const relevantGroups = groups.map((group) => ({
      ...group,
      reasons: group.reasons.filter((item) =>
        dimensionItems.includes(item)
      ),
      concerns: group.concerns.filter((item) =>
        dimensionItems.includes(item)
      ),
    }));

    dimensionResults[dimension] = {
      weight,
      comparisons: dimensionItems.length,
    };
  });

  const allReasons = groups.flatMap((group) => group.reasons);
  const allConcerns = groups.flatMap((group) => group.concerns);

  // Calculate a provisional score from the available dimensions.
  let weightedTotal = 0;
  let availableWeight = 0;

  Object.entries(dimensionWeights).forEach(([dimension, weight]) => {
    const items = dimensionGroups[dimension];

    if (items.length === 0) return;

    const matching = items.filter((item) => item.type === "match").length;
    const conflicting = items.filter((item) => item.type === "avoided").length;
    const total = items.length;

    const dimensionScore = Math.max(
      0,
      ((matching - conflicting) / total + 1) * 50
    );

    weightedTotal += dimensionScore * weight;
    availableWeight += weight;
  });

  const compatibility =
    availableWeight > 0
      ? Math.round(weightedTotal / availableWeight)
      : null;

  const comparisons = groups.reduce(
    (sum, group) => sum + group.comparisons,
    0
  );

  const possibleComparisons =
    userPersonal.length +
    userExpectations.length +
    candidateExpectations.length;

  const coverage =
    possibleComparisons > 0
      ? Math.min(
          100,
          Math.round((comparisons / possibleComparisons) * 100)
        )
      : 0;

  return {
    profileId: candidateProfile.id,
    name: candidateProfile.name,
    age: candidateProfile.age,
    location: candidateProfile.location,
    bio: candidateProfile.bio,

    compatibility,
    comparisons,
    coverage,

    dimensionResults,
    reasons: allReasons,
    concerns: allConcerns,
  };
}

// --------------------------------------------------
// 8. LOCATION AND AGE FILTERS
// --------------------------------------------------

function applyRecommendationFilters(profiles, filters = {}) {
  return profiles.filter((profile) => {
    if (
      filters.location_mode === "city" &&
      filters.location
    ) {
      if (
        profile.location.toLowerCase().trim() !==
        filters.location.toLowerCase().trim()
      ) {
        return false;
      }
    }

    if (
      filters.min_age !== null &&
      filters.min_age !== undefined &&
      profile.age < filters.min_age
    ) {
      return false;
    }

    if (
      filters.max_age !== null &&
      filters.max_age !== undefined &&
      profile.age > filters.max_age
    ) {
      return false;
    }

    return true;
  });
}

// --------------------------------------------------
// 9. RANK PROFILES
// --------------------------------------------------

export function rankProfiles(
  userPreferences = [],
  profiles = [],
  filters = {}
) {
  const filteredProfiles = applyRecommendationFilters(
    profiles,
    filters
  );

  return filteredProfiles
    .map((profile) =>
      calculateCompatibility(userPreferences, profile)
    )
    .filter((profile) => profile.compatibility !== null)
    .sort(
      (a, b) => b.compatibility - a.compatibility
    );
}

export { calculateCompatibility };
