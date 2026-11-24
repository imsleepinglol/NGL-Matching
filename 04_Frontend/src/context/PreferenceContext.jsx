
import { createContext, useContext, useState } from "react";

import {
  createInitialPreferenceModel,
  upsertPreferenceRecord,
  createPreference,
  categoryMapping,
} from "../services/preferenceEngine";

const PreferenceContext = createContext(null);

const initialFilters = {
  location_mode: "none",
  location: null,
  min_age: null,
  max_age: null,
};

export function PreferenceProvider({ children }) {
  const [model, setModel] = useState(createInitialPreferenceModel);

  const [questionsAnswered, setQuestionsAnswered] = useState(0);

  const [recommendationsUnlocked, setRecommendationsUnlocked] =
    useState(false);

  const [discoveryStage, setDiscoveryStage] = useState(
    "getting_to_know_you"
  );

  const [recommendationFilters, setRecommendationFilters] =
    useState(initialFilters);

  // --------------------------------------------------
  // 1. PROFILE PREFERENCE SYNCHRONISATION
  // --------------------------------------------------

  const updateProfilePreference = (current, record) => {
    if (record.preferenceType !== "personal_interest") {
      return current.preferences;
    }

    const mainCategory = categoryMapping[record.category];

    if (!mainCategory || !current.preferences[mainCategory]) {
      return current.preferences;
    }

    const currentOptions = current.preferences[mainCategory];
    const value = record.value;

    if (!value) {
      return current.preferences;
    }

    const shouldSelect =
      record.state === "preferred" ||
      record.state === "acceptable";

    const nextOptions = shouldSelect
      ? currentOptions.some(
          (item) =>
            item.toLowerCase() === value.toLowerCase()
        )
        ? currentOptions
        : [...currentOptions, value]
      : currentOptions.filter(
          (item) =>
            item.toLowerCase() !== value.toLowerCase()
        );

    return {
      ...current.preferences,
      [mainCategory]: nextOptions,
    };
  };

  // --------------------------------------------------
  // 2. MANUAL PREFERENCE MANAGEMENT
  // --------------------------------------------------

  const togglePreference = (category, option) => {
    setModel((current) => {
      if (!current.preferences[category]) {
        return current;
      }

      const selected = current.preferences[category];
      const isSelected = selected.includes(option);

      return {
        ...current,
        preferences: {
          ...current.preferences,
          [category]: isSelected
            ? selected.filter((item) => item !== option)
            : [...selected, option],
        },
        changeHistory: [
          ...current.changeHistory,
          {
            type: isSelected ? "removed" : "added",
            category,
            value: option,
            timestamp: new Date().toISOString(),
          },
        ],
        lastUpdated: new Date().toISOString(),
      };
    });
  };

  const updateCategory = (category, selectedOptions) => {
    setModel((current) => {
      if (!current.preferences[category]) {
        return current;
      }

      return {
        ...current,
        preferences: {
          ...current.preferences,
          [category]: [...new Set(selectedOptions)],
        },
        lastUpdated: new Date().toISOString(),
      };
    });
  };

  const updateDetailedPreference = (record) => {
    setModel((current) => ({
      ...current,
      preferenceDetails: upsertPreferenceRecord(
        current.preferenceDetails,
        record
      ),
      preferences: {
        ...current.preferences,
        ...updateProfilePreference(current, record),
      },
      changeHistory: [
        ...current.changeHistory,
        {
          type: "detailed_preference_updated",
          category: record.category,
          topic: record.topic,
          value: record.value,
          preferenceType: record.preferenceType,
          timestamp: new Date().toISOString(),
        },
      ],
      lastUpdated: new Date().toISOString(),
    }));
  };

  // --------------------------------------------------
  // 3. AI PREFERENCE INTERPRETATION
  // --------------------------------------------------

  const applyPreferenceInterpretation = (interpretation) => {
    if (!interpretation?.understood) return;

    const record = createPreference({
      category: interpretation.category,
      topic: interpretation.topic,
      value: interpretation.value,
      preferenceType:
        interpretation.preferenceType || "personal_interest",
      state: interpretation.state,
      importance: interpretation.importance,
      context: interpretation.originalMessage,
      confidence: 0.75,
      source: "conversation",
    });

    updateDetailedPreference(record);
  };

  // --------------------------------------------------
  // 4. CONVERSATION HISTORY
  // --------------------------------------------------

  const addConversationMessage = (message) => {
    setModel((current) => ({
      ...current,
      conversationHistory: [
        ...current.conversationHistory,
        {
          ...message,
          timestamp: new Date().toISOString(),
        },
      ],
      lastUpdated: new Date().toISOString(),
    }));
  };

  // --------------------------------------------------
  // 5. DISCOVERY TRACKING
  // --------------------------------------------------

  const recordDiscoveryAnswer = (answered) => {
    if (!answered || recommendationsUnlocked) {
      return;
    }

    setQuestionsAnswered((current) => {
      const nextCount = current + 1;

      if (nextCount >= 3) {
        setRecommendationsUnlocked(true);
        setDiscoveryStage("recommendations");
      }

      return nextCount;
    });
  };

  const skipDiscoveryQuestion = () => {
    // Skipping does not increase the answer count.
    // The assistant can continue with another question.
  };

  // --------------------------------------------------
  // 6. RECOMMENDATION FILTERS
  // --------------------------------------------------

  const updateRecommendationFilters = (filters) => {
    setRecommendationFilters((current) => ({
      ...current,
      ...filters,
    }));
  };

  const clearRecommendationFilters = () => {
    setRecommendationFilters(initialFilters);
  };

  // --------------------------------------------------
  // 7. APPLY GEMINI RESPONSE
  // --------------------------------------------------

  const applyAssistantResult = (result) => {
    if (!result) return;

    // Apply extracted preferences.
    (result.preference_updates || []).forEach((update) => {
      const record = createPreference({
        category: update.category,
        topic: update.category,
        value: update.value,
        preferenceType: update.preference_type,
        state: update.stance,
        importance: update.importance,
        context: update.evidence,
        confidence: update.confidence,
        source: "conversation",
      });

      updateDetailedPreference(record);
    });

    // Apply location and age filters.
    if (result.recommendation_filters) {
      updateRecommendationFilters(
        result.recommendation_filters
      );
    }

    // Only count meaningful answers confirmed by Gemini.
    if (!recommendationsUnlocked) {
      if (result.discovery_answered) {
        recordDiscoveryAnswer(true);
      }

      if (result.skip_detected) {
        skipDiscoveryQuestion();
      }
    }
  };

  // --------------------------------------------------
  // 8. DISCOVERY PROGRESS
  // --------------------------------------------------

  const updateDiscoveryProgress = (category, status) => {
    setModel((current) => ({
      ...current,
      discoveryProgress: {
        ...current.discoveryProgress,
        [category]: status,
      },
      lastUpdated: new Date().toISOString(),
    }));
  };

  // --------------------------------------------------
  // 9. CONTEXT PROVIDER
  // --------------------------------------------------

  return (
    <PreferenceContext.Provider
      value={{
        user: model.user,
        model,

        preferences: model.preferences,
        preferenceDetails: model.preferenceDetails,
        discoveryProgress: model.discoveryProgress,
        conversationHistory: model.conversationHistory,
        changeHistory: model.changeHistory,

        questionsAnswered,
        recommendationsUnlocked,
        discoveryStage,

        recommendationFilters,

        togglePreference,
        updateCategory,
        updateDetailedPreference,

        applyPreferenceInterpretation,
        applyAssistantResult,

        addConversationMessage,
        updateDiscoveryProgress,

        recordDiscoveryAnswer,
        skipDiscoveryQuestion,

        updateRecommendationFilters,
        clearRecommendationFilters,
      }}
    >
      {children}
    </PreferenceContext.Provider>
  );
}

// --------------------------------------------------
// 10. CUSTOM HOOK
// --------------------------------------------------

export function usePreferences() {
  const context = useContext(PreferenceContext);

  if (!context) {
    throw new Error(
      "usePreferences must be used inside PreferenceProvider"
    );
  }

  return context;
}
