
import { useMemo } from "react";

import PreferenceAssistant from "../components/PreferenceAssistant";
import { usePreferences } from "../context/PreferenceContext";

import syntheticProfiles from "../data/syntheticProfiles";
import { rankProfiles } from "../services/matchingEngine";

function Matches() {
  const {
    preferenceDetails,
    recommendationsUnlocked,
    recommendationFilters,
    clearRecommendationFilters,
  } = usePreferences();

  // Generate recommendations using preferences AND active filters.
  const recommendations = useMemo(() => {
    return rankProfiles(
      preferenceDetails,
      syntheticProfiles,
      recommendationFilters
    );
  }, [
    preferenceDetails,
    recommendationFilters,
  ]);

  const activeLocation =
    recommendationFilters.location_mode === "city"
      ? recommendationFilters.location
      : null;

  const hasAgeFilter =
    recommendationFilters.min_age !== null ||
    recommendationFilters.max_age !== null;

  const hasActiveFilters =
    Boolean(activeLocation) || hasAgeFilter;

  const hasPreferences = preferenceDetails.length > 0;

  return (
    <div className="page matches-page">

      <div className="page-heading">
        <div>
          <h1>Discover Matches</h1>
          <p>
            Discover people who connect with your interests,
            personality and lifestyle.
          </p>
        </div>
      </div>

      <div className="matches-layout">

        {/* LEFT: Recommended profiles */}
        <section className="matches-results">

          <div className="matches-section-heading">
            <div>
              <h2>Your Recommendations</h2>
              <p>
                Profiles ranked using your discovered preferences.
              </p>
            </div>
          </div>

          {!recommendationsUnlocked ? (

            <div className="content-card empty-state matches-empty-state">
              <div className="empty-icon">💙</div>

              <h2>Let's discover your preferences</h2>

              <p>
                Tell your AI assistant about your interests,
                personality and the kind of person you're looking for.
                Your recommendations will appear here.
              </p>

              <div className="recommendation-status">
                <span className="status-dot"></span>
                Waiting for preference discovery
              </div>
            </div>

          ) : (
            <>

              {/* ACTIVE FILTERS */}
              {hasActiveFilters && (
                <div className="active-filters">
                  <div>
                    <strong>Active filters</strong>

                    <div className="active-filter-list">

                      {activeLocation && (
                        <span className="filter-chip">
                          📍 {activeLocation}
                        </span>
                      )}

                      {hasAgeFilter && (
                        <span className="filter-chip">
                          Age:{" "}
                          {recommendationFilters.min_age ?? 18}
                          {" – "}
                          {recommendationFilters.max_age ?? 100}
                        </span>
                      )}

                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={clearRecommendationFilters}
                  >
                    Clear filters
                  </button>
                </div>
              )}

              {recommendations.length === 0 ? (

                <div className="content-card empty-state">
                  <div className="empty-icon">🔍</div>

                  <h2>No matching profiles found</h2>

                  <p>
                    No profiles currently match your selected filters.
                    Try another location or age range.
                  </p>

                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearRecommendationFilters}
                    >
                      Clear filters
                    </button>
                  )}
                </div>

              ) : (

                <>
                  <div className="recommendation-status">
                    <span className="status-dot"></span>
                    {recommendations.length} profiles evaluated
                  </div>

                  <div className="recommendation-list">

                    {recommendations.map((profile) => (

                      <article
                        className="content-card recommendation-card"
                        key={profile.profileId}
                      >

                        <div className="recommendation-top">

                          <div className="profile-avatar">
                            {profile.name.charAt(0)}
                          </div>

                          <div className="recommendation-identity">
                            <h3>
                              {profile.name}, {profile.age}
                            </h3>

                            <p>📍 {profile.location}</p>
                          </div>

                          <div className="compatibility-score">
                            <strong>
                              {profile.compatibility}%
                            </strong>

                            <span>Compatibility</span>
                          </div>

                        </div>

                        <p className="recommendation-bio">
                          {profile.bio}
                        </p>

                        <div className="recommendation-reasons">
                          <h4>Why this match?</h4>

                          {profile.reasons.length > 0 ? (

                            profile.reasons
                              .slice(0, 3)
                              .map((reason, index) => (
                                <p key={index}>
                                  <span>✓</span>{" "}
                                  {reason.explanation}
                                </p>
                              ))

                          ) : (

                            <p>
                              More preference information is needed
                              to explain this match.
                            </p>

                          )}

                        </div>

                        {profile.concerns.length > 0 && (

                          <div className="recommendation-concerns">
                            <h4>Things to explore</h4>

                            {profile.concerns
                              .slice(0, 2)
                              .map((concern, index) => (
                                <p key={index}>
                                  • {concern.explanation}
                                </p>
                              ))}

                          </div>

                        )}

                        <div className="recommendation-footer">

                          <span>
                            {profile.comparisons} preference comparisons
                          </span>

                          <span>
                            {profile.coverage}% comparison coverage
                          </span>

                        </div>

                      </article>

                    ))}

                  </div>
                </>

              )}

            </>
          )}

        </section>

        {/* RIGHT: AI Preference Assistant */}
        <aside className="matches-assistant">
          <PreferenceAssistant />
        </aside>

      </div>
    </div>
  );
}

export default Matches;
