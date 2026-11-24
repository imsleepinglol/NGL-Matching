
export const demoUser = Object.freeze({
  id: "admin-001",
  name: "Admin 1",
  age: 25,
  location: "Birmingham",
  gender: "Not specified",
});

export const preferenceCategories = {
  personality: "Personality",
  interests: "Interests",
  values: "Values",
  lifestyle: "Lifestyle",
  communication: "Communication",
};

export const preferenceStates = [
  "preferred",
  "acceptable",
  "neutral",
  "avoided",
  "unknown",
];

export const importanceLevels = [
  "high",
  "medium",
  "low",
  "unknown",
];

// Maps Gemini's detailed categories to the main Profile categories.
export const categoryMapping = {
  travelling: "interests",
  music: "interests",
  food: "interests",
  fitness: "interests",
  movies: "interests",
  interests: "interests",
  personality: "personality",
  values: "values",
  lifestyle: "lifestyle",
  communication: "communication",
};

export function createInitialPreferenceModel() {
  return {
    user: demoUser,

    preferences: {
      personality: [],
      interests: [],
      values: [],
      lifestyle: [],
      communication: [],
    },

    preferenceDetails: [],

    discoveryProgress: {
      travelling: "not_started",
      music: "not_started",
      food: "not_started",
      fitness: "not_started",
      movies: "not_started",
      personality: "not_started",
      values: "not_started",
      lifestyle: "not_started",
      communication: "not_started",
    },

    conversationHistory: [],
    changeHistory: [],

    lastUpdated: new Date().toISOString(),
  };
}

export function createPreference({
  category,
  topic,
  value,
  preferenceType = "personal_interest",
  state = "unknown",
  importance = "unknown",
  context = "",
  confidence = 0.5,
  source = "conversation",
}) {
  return {
    id: crypto.randomUUID(),
    category,
    topic,
    value,
    preferenceType,
    state,
    importance,
    context,
    confidence,
    source,
    confirmed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function upsertPreferenceRecord(records, newRecord) {
  const existingIndex = records.findIndex(
    (record) =>
      record.category === newRecord.category &&
      record.topic === newRecord.topic &&
      record.preferenceType === newRecord.preferenceType &&
      record.value.toLowerCase() === newRecord.value.toLowerCase()
  );

  if (existingIndex === -1) {
    return [...records, newRecord];
  }

  return records.map((record, index) => {
    if (index !== existingIndex) return record;

    return {
      ...record,
      ...newRecord,
      id: record.id,
      createdAt: record.createdAt,
      updatedAt: new Date().toISOString(),
    };
  });
}

/*
  Legacy rule-based interpretation.
  The main conversational assistant now uses Gemini.
*/

const interpretationRules = [
  {
    category: "interests",
    topic: "travelling",
    keywords: ["travel", "travelling", "traveler", "holiday", "holidays"],
  },
  {
    category: "interests",
    topic: "music",
    keywords: ["music", "songs", "singing", "concert", "concerts"],
  },
  {
    category: "interests",
    topic: "food",
    keywords: ["food", "cooking", "cuisine", "restaurant", "restaurants"],
  },
  {
    category: "interests",
    topic: "fitness",
    keywords: ["fitness", "gym", "workout", "workouts", "sports"],
  },
  {
    category: "interests",
    topic: "movies",
    keywords: ["movies", "films", "cinema", "netflix"],
  },
  {
    category: "personality",
    topic: "personality",
    keywords: ["personality", "introverted", "extroverted", "adventurous", "ambitious"],
  },
  {
    category: "values",
    topic: "family",
    keywords: ["family"],
  },
  {
    category: "values",
    topic: "honesty",
    keywords: ["honesty", "honest", "truthful"],
  },
  {
    category: "values",
    topic: "loyalty",
    keywords: ["loyalty", "loyal"],
  },
  {
    category: "lifestyle",
    topic: "social lifestyle",
    keywords: ["social", "clubbing", "parties", "party"],
  },
];

export function interpretPreferenceMessage(message) {
  const text = message.toLowerCase();

  const matchedRule = interpretationRules.find((rule) =>
    rule.keywords.some((keyword) => {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`\\b${escaped}\\b`, "i").test(text);
    })
  );

  if (!matchedRule) {
    return {
      understood: false,
      reason: "No recognised preference category was found.",
    };
  }

  let state = "preferred";
  let importance = "unknown";

  const negative =
    /\b(don't like|do not like|dislike|hate|avoid|not interested in|can't stand)\b/i.test(text);

  const neutral =
    /\b(not important|doesn't matter|do not mind|don't mind|indifferent|no preference)\b/i.test(text);

  const acceptable =
    /\b(okay with|fine with|open to|don't mind|do not mind)\b/i.test(text);

  const highImportance =
    /\b(extremely important|very important|essential|must have|definitely)\b/i.test(text);

  if (neutral) {
    state = "neutral";
  } else if (negative) {
    state = "avoided";
  } else if (acceptable) {
    state = "acceptable";
  }

  if (highImportance) {
    importance = "high";
  }

  return {
    understood: true,
    category: matchedRule.category,
    topic: matchedRule.topic,
    value: matchedRule.topic,
    preferenceType: "personal_interest",
    state,
    importance,
    originalMessage: message,
  };
}
