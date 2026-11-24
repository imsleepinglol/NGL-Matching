
import { useState, useEffect } from "react";
import { usePreferences } from "../context/PreferenceContext";

const API_URL = "http://127.0.0.1:8000";
const DISCOVERY_QUESTIONS = 3;

function PreferenceAssistant() {
  const {
    addConversationMessage,
    applyAssistantResult,
    questionsAnswered,
    recommendationsUnlocked,
    recommendationFilters,
    model,
  } = usePreferences();

  // Start with an empty conversation.
  // The backend will generate the opening message.
  const [messages, setMessages] = useState([]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [initialised, setInitialised] = useState(false);

  // Generate a personalised opening message.
  useEffect(() => {
    if (initialised) return;

    const startConversation = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${API_URL}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            current_preferences: model?.preferenceDetails || [],
            message: "START_CONVERSATION",
            history: [],
            questions_answered: questionsAnswered,
            discovery_question: recommendationsUnlocked
              ? null
              : "Understand the user's interests, personality, lifestyle and relationship preferences.",
            recommendations_unlocked: recommendationsUnlocked,
            current_filters: recommendationFilters,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail || "Could not start the conversation."
          );
        }

        applyAssistantResult(data);

        const openingMessage = {
          role: "assistant",
          text: data.reply,
        };

        setMessages([openingMessage]);

        addConversationMessage({
          role: "assistant",
          text: data.reply,
        });

        setInitialised(true);

      } catch (err) {
        console.error("NGL Matching startup error:", err);
        setError(
          err.message || "Unable to start the AI assistant."
        );
      } finally {
        setLoading(false);
      }
    };

    startConversation();
  }, []);

  const addMessage = (role, text) => {
    const newMessage = { role, text };

    setMessages((current) => [...current, newMessage]);

    addConversationMessage({
      role,
      text,
    });
  };

  const handleSend = async () => {
    const message = input.trim();

    if (!message || loading || !initialised) return;

    setInput("");
    setError("");

    const history = messages.map((item) => ({
      role: item.role,
      content: item.text,
    }));

    addMessage("user", message);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
  message,
  history,
  current_preferences: model?.preferenceDetails || [],
  questions_answered: questionsAnswered,
          discovery_question: recommendationsUnlocked
            ? null
            : "Understand the user's interests, personality, lifestyle and relationship preferences.",
          recommendations_unlocked: recommendationsUnlocked,
          current_filters: recommendationFilters,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "The AI assistant could not respond."
        );
      }

      applyAssistantResult(data);

      addMessage("assistant", data.reply);

    } catch (err) {
      console.error("NGL Matching chat error:", err);

      setError(
        err.message || "Unable to connect to the AI assistant."
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="assistant-panel">

      <div className="assistant-header">
        <div className="assistant-avatar">AI</div>

        <div>
          <h2>Preference Assistant</h2>
          <p>
            {recommendationsUnlocked
              ? "Your personal matching guide"
              : "Getting to know you"}
          </p>
        </div>
      </div>

      {!recommendationsUnlocked && (
        <div className="discovery-progress">

          <div className="discovery-progress-label">
            <span>Getting to know you</span>

            <span>
              {questionsAnswered}/{DISCOVERY_QUESTIONS}
            </span>
          </div>

          <div className="discovery-progress-track">
            <div
              className="discovery-progress-fill"
              style={{
                width: `${Math.min(
                  100,
                  (questionsAnswered / DISCOVERY_QUESTIONS) * 100
                )}%`,
              }}
            />
          </div>

          <p>
            Share what matters to you. You can skip a question
            whenever you want.
          </p>

        </div>
      )}

      {recommendationsUnlocked && (
        <div className="discovery-unlocked">
          <span>✓</span>
          Recommendations unlocked — keep refining your matches.
        </div>
      )}

      <div className="assistant-conversation">

        {messages.map((message, index) => (
          <div
            key={index}
            className={
              message.role === "user"
                ? "user-message"
                : "assistant-message"
            }
          >
            {message.text}
          </div>
        ))}

        {loading && (
          <div className="assistant-message">
            {initialised ? "Thinking..." : "Getting things ready..."}
          </div>
        )}

        {error && (
          <div className="assistant-message">
            {error}
          </div>
        )}

      </div>

      <div className="assistant-input">

        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
  if (event.key === "Enter") handleSend();
}}
          placeholder={
            recommendationsUnlocked
              ? "What would you like to explore today?"
              : "Tell me what you're looking for..."
          }
          disabled={loading || !initialised}
        />

        <button
          onClick={handleSend}
          disabled={!input.trim() || loading || !initialised}
        >
          {loading ? "..." : "↑"}
        </button>

      </div>

      <p className="assistant-note">
        {recommendationsUnlocked
          ? "Your preferences can evolve through conversation."
          : "Your recommendations will unlock after three meaningful answers."}
      </p>

    </aside>
  );
}

export default PreferenceAssistant;
