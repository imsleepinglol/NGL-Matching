
import { usePreferences } from "../context/PreferenceContext";

const DEMO_PROFILE = {
  name: "Admin 1",
  age: 25,
  location: "Birmingham",
  gender: "Not specified",
};

const preferenceOptions = {
  personality: [
    "Funny", "Kind", "Ambitious", "Introverted",
    "Extroverted", "Adventurous", "Calm", "Creative",
  ],
  interests: [
    "Music", "Travel", "Movies", "Reading",
    "Fitness", "Cooking", "Gaming", "Photography",
  ],
  values: [
    "Honesty", "Family", "Loyalty", "Independence",
    "Respect", "Personal growth", "Kindness",
  ],
  lifestyle: [
    "Active", "Relaxed", "Social", "Career-focused",
    "Nature lover", "Homebody", "Travel enthusiast",
  ],
  communication: [
    "Frequent conversations", "Deep conversations",
    "Humour and fun", "Texting", "Phone calls",
    "Giving personal space",
  ],
};

function Profile() {
  const { preferences, togglePreference } = usePreferences();

  const totalSelected = Object.values(preferences).reduce(
    (total, items) => total + items.length,
    0
  );

  return (
    <div className="page">
      <div className="page-heading">
        <h1>My Profile</h1>
        <p>Your profile and evolving preference model.</p>
      </div>

      <section className="content-card">
        <div className="profile-placeholder">
          <div className="profile-avatar">A</div>

          <div>
            <h2>{DEMO_PROFILE.name}</h2>
            <p>
              {DEMO_PROFILE.age} years old · {DEMO_PROFILE.location}
            </p>
            <p>{DEMO_PROFILE.gender}</p>
          </div>
        </div>

        <p className="muted" style={{ marginTop: 20 }}>
          Your personal profile is predefined for this prototype.
          You can focus on discovering and refining your preferences.
        </p>
      </section>

      <section className="content-card">
        <h2>My Preference Model</h2>

        <p className="muted">
          Your preferences evolve as you interact with the
          Preference Assistant.
        </p>

        <div className="preference-tags">
          <span>{totalSelected} preferences selected</span>
          <span>{Object.keys(preferenceOptions).length} categories</span>
        </div>

        {Object.entries(preferenceOptions).map(([category, options]) => (
          <div className="preference-category" key={category}>
            <h3>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </h3>

            <div className="preference-options">
              {options.map((option) => {
                const selected = preferences[category].includes(option);

                return (
                  <button
                    key={option}
                    className={
                      selected
                        ? "preference-option selected"
                        : "preference-option"
                    }
                    onClick={() => togglePreference(category, option)}
                  >
                    {selected ? "✓ " : "+ "}
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

export default Profile;
