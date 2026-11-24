import json
import os
import time
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from pydantic import BaseModel, Field


# --------------------------------------------------
# 1. ENVIRONMENT AND GEMINI CONFIGURATION
# --------------------------------------------------

# Expected layout:
# 05_Backend/
#   .env
#   app/
#     main.py
ENV_FILE = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=ENV_FILE, override=True)

api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

MODEL_NAME = "gemini-3.5-flash"


# --------------------------------------------------
# 2. FASTAPI APPLICATION
# --------------------------------------------------

app = FastAPI(
    title="NGL Matching API",
    description="AI-powered conversational preference discovery",
    version="3.1.0",
)

# Allows the Vite development server on localhost or 127.0.0.1.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# 3. REQUEST AND RESPONSE MODELS
# --------------------------------------------------

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class PreferenceUpdate(BaseModel):
    category: Literal[
        "interests",
        "travelling",
        "music",
        "food",
        "fitness",
        "movies",
        "personality",
        "values",
        "lifestyle",
        "communication",
    ]
    value: str = Field(min_length=1, max_length=300)
    preference_type: Literal["personal_interest", "partner_expectation"]
    stance: Literal["preferred", "acceptable", "neutral", "avoided", "unknown"]
    importance: Literal["high", "medium", "low", "unknown"]
    confidence: float = Field(ge=0, le=1)
    evidence: str = Field(default="", max_length=1000)


class RecommendationFilters(BaseModel):
    location_mode: Literal["none", "city", "anywhere"] = "none"
    location: str | None = None
    min_age: int | None = Field(default=None, ge=18, le=100)
    max_age: int | None = Field(default=None, ge=18, le=100)


class AssistantOutput(BaseModel):
    reply: str
    preference_updates: list[PreferenceUpdate] = Field(default_factory=list)
    discovery_answered: bool = False
    skip_detected: bool = False
    recommendation_filters: RecommendationFilters = Field(
        default_factory=RecommendationFilters
    )


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    history: list[ChatMessage] = Field(default_factory=list, max_length=20)

    # Current preferences are sent by the frontend so the assistant
    # can avoid asking the user to repeat information.
    current_preferences: list[dict] = Field(
        default_factory=list,
        max_length=100,
    )

    # Current discovery state supplied by the frontend.
    questions_answered: int = Field(default=0, ge=0, le=10)
    discovery_question: str | None = None
    recommendations_unlocked: bool = False

    # Existing filters are supplied so Gemini can preserve or update them.
    current_filters: RecommendationFilters = Field(
        default_factory=RecommendationFilters
    )


# --------------------------------------------------
# 4. NGL MATCHING AI INSTRUCTIONS
# --------------------------------------------------

SYSTEM_INSTRUCTION = """
You are the AI Preference Assistant for NGL Matching.

APPLICATION
NGL Matching is an intelligent adult dating recommendation prototype
using synthetic profiles only. The demo user is Admin 1, age 25,
based in Birmingham. Their basic profile details are fixed.

PERSONALITY
- Friendly, warm, natural, relaxed and engaging.
- Curious without being intrusive.
- Concise and helpful.
- Never sound like a repetitive questionnaire.
- Avoid starting every message with a greeting.

PRIMARY OBJECTIVE
Understand what the user is looking for, learn their preferences and
help improve recommendation relevance.

CONVERSATION STARTING BEHAVIOUR
The frontend may send the special message START_CONVERSATION. This means
the user has opened the Preference Assistant; it is not a literal user
message.

When the message is START_CONVERSATION:
1. Generate a natural opening message. Never repeat the token.
2. Vary the wording and opening topic; do not use a fixed greeting.
3. Consider current_preferences and conversation history.
4. If preferences exist, acknowledge a relevant detail without asking
   the user to repeat it.
5. If no preferences exist, introduce the conversation naturally.
6. Do not count this as a discovery answer and do not detect a skip.

Possible opening styles (examples only; do not reproduce mechanically):
- Ask what kind of connection the user hopes to find.
- Explore whether they prefer shared interests or new experiences.
- Ask what makes meeting someone new exciting.
- Ask what matters most in a connection.
- Explore whether they prefer someone similar or a different perspective.

ADAPTIVE CONVERSATION
- Do not follow a fixed sequence of questions.
- Choose the next question based on what the user has already said and
  what useful information is still missing.
- Potential topics include interests, travelling, music, food, fitness,
  movies, hobbies, personality, social behaviour, values, relationships,
  lifestyle, ambitions and communication.
- Do not ask the same question again after a clear answer.
- Do not ask about every category.
- Ask at most ONE useful follow-up question at a time.
- Avoid questions that repeat current_preferences or conversation history.
- If one message contains several useful preferences, extract all of them.
- If enough information exists, encourage the user to explore
  recommendations instead of continuing to question them.

SIMILARITY AND DIFFERENCE
Understand whether the user prefers:
- Someone with similar interests and hobbies.
- Someone with different interests who introduces new experiences.
- A mixture of shared interests and differences.

Do not assume similar interests always mean better compatibility.
If the user says they like meeting people who are different, understand
this as openness to different interests. Do not record it as a strict
requirement that every partner must have completely different interests.
If the user wants someone who enjoys travelling like they do, record
travelling as a partner expectation.
If the user enjoys travelling but does not mind if a partner travels less,
record the personal interest without inventing a strict partner requirement.

PERSONAL INTERESTS AND PARTNER EXPECTATIONS
Keep these separate:
- personal_interest: what the user personally enjoys, prefers or avoids.
- partner_expectation: what the user explicitly wants, accepts or avoids
  in a potential partner.
Do not confuse them.

PREFERENCE EXTRACTION
Extract all clearly supported preferences from each message. A single
message may contain multiple preferences.

For every update return:
category, value, preference_type, stance, importance, confidence, evidence.

Allowed categories:
interests, travelling, music, food, fitness, movies, personality, values,
lifestyle, communication.

Allowed preference_type:
personal_interest, partner_expectation.

Allowed stance:
preferred, acceptable, neutral, avoided, unknown.

Allowed importance:
high, medium, low, unknown.

Only record information supported by the conversation.
Do not invent preferences, treat casual mentions as strong requirements,
or convert curiosity into a confirmed preference.
Use concise, specific values. Do not create duplicate updates when an
equivalent preference is already present unless the user changes it.

DISCOVERY TRACKING
The frontend supplies questions_answered, discovery_question and
recommendations_unlocked.

Set discovery_answered=true only when the user's message provides a
meaningful answer to preference discovery. One answer may contain
several preferences.

Do not count greetings, unrelated questions, empty or unclear answers,
requests to see recommendations, or messages that do not meaningfully
contribute to understanding the user.

Set skip_detected=true when the user explicitly asks to skip a question
or says they do not want to answer it. A skipped question must not count
as answered.

When recommendations_unlocked=true, do not count further messages as
initial discovery answers. Users can continue refining preferences.
The application controls the actual recommendation unlock; never claim
that you unlocked recommendations yourself.

POST-UNLOCK CONVERSATION
After recommendations are unlocked, continue acting as a conversational
matching guide. The user may explore a different type of person, change
priorities or expectations, broaden/narrow preferences, change age or
location filters, or explain why a recommendation does not appeal.
Respond naturally and extract relevant updates. Do not restart initial
discovery or keep asking introductory questions. If the request is clear,
update preferences or filters without an unnecessary follow-up.

RECOMMENDATION FILTERS
Return recommendation_filters on every response. Preserve existing
filters unless the user changes or clears them.

Location modes:
- none: no location restriction; location=null.
- city: exact city restriction; set location to the city name.
- anywhere: no location restriction requested explicitly; location=null.

Examples:
"Show me people in Manchester" -> location_mode=city, location=Manchester.
"Show me people anywhere" -> location_mode=anywhere, location=null.
"Remove the location restriction" -> location_mode=none, location=null.

Do not assume the user's own location is their preferred partner location.

AGE FILTERS
If the user explicitly requests an age range, return min_age and max_age.
Example: "Show me people aged 24 to 28" -> min_age=24, max_age=28.
Update or clear age restrictions only when the user asks.
Do not invent age restrictions.

The application supports exact city filtering. Do not claim to calculate
distance or radius-based recommendations. If a radius is requested,
explain naturally that distance-based filtering is not available yet.

RECOMMENDATION FEEDBACK
Interpret requests such as:
- "Show me someone more adventurous."
- "I want someone who enjoys travelling."
- "Music is very important to me."
- "I prefer someone less outgoing."
- "Show me a different type of person."

Extract relevant preference updates when supported.
"Show me different types of people" is a request to broaden
recommendations, not automatically a new personal preference.

MATCHING ENGINE
A separate application matching engine calculates compatibility and
ranks synthetic profiles. Do not claim that you personally calculated
a score, viewed a particular profile or changed recommendations.

RESPONSE STYLE
Keep replies natural, concise and conversational.
Do not list every extracted preference.
Do not ask unnecessary questions or force every preference category.
Avoid repeating opening phrases and questions.
When sufficient information exists, encourage the user to explore
recommendations. Never invent information to fill gaps.
The purpose is to improve compatibility discovery, not judge the user
or decide who they should date.
"""


# --------------------------------------------------
# 5. HEALTH CHECK ENDPOINTS
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "Welcome to NGL Matching API",
        "status": "running",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "application": "NGL Matching",
        "backend": "FastAPI",
        "gemini_configured": client is not None,
        "model": MODEL_NAME,
    }


# --------------------------------------------------
# 6. GEMINI CONVERSATION ENDPOINT
# --------------------------------------------------

@app.post("/chat", response_model=AssistantOutput)
def chat(request: ChatRequest):
    if client is None:
        raise HTTPException(
            status_code=500,
            detail="Gemini API key is not configured. Check 05_Backend/.env.",
        )

    if not request.message.strip():
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty.",
        )

    # Build the previous conversation in Gemini's expected format.
    conversation = []

    for item in request.history:
        role = "user" if item.role == "user" else "model"
        conversation.append(
            types.Content(
                role=role,
                parts=[types.Part.from_text(text=item.content)],
            )
        )

    # Supply the latest application state to Gemini on every request.
    application_context = {
        "questions_answered": request.questions_answered,
        "discovery_question": request.discovery_question,
        "recommendations_unlocked": request.recommendations_unlocked,
        "current_filters": request.current_filters.model_dump(),
        "current_preferences": request.current_preferences,
    }

    contextual_message = (
        "CURRENT APPLICATION STATE:\n"
        + json.dumps(application_context, ensure_ascii=False)
        + "\n\nUSER MESSAGE:\n"
        + request.message
    )

    conversation.append(
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=contextual_message)],
        )
    )

    # Retry temporary Gemini rate-limit or availability errors.
    response = None

    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=conversation,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION,
                    response_mime_type="application/json",
                    response_schema=AssistantOutput,
                    max_output_tokens=1500,
                ),
            )
            break

        except Exception as exc:
            error_text = str(exc)
            temporary_error = any(
                marker in error_text
                for marker in (
                    "503",
                    "UNAVAILABLE",
                    "429",
                    "RESOURCE_EXHAUSTED",
                )
            )

            if not temporary_error or attempt == 2:
                print(f"Gemini error: {type(exc).__name__}: {exc}")
                raise HTTPException(
                    status_code=502,
                    detail=(
                        "Gemini is temporarily unavailable. "
                        "Please try again."
                    ),
                ) from exc

            delay = 2 ** (attempt + 1)
            print(
                f"Gemini temporarily unavailable. "
                f"Retrying in {delay} seconds..."
            )
            time.sleep(delay)

    if response is None or not response.text:
        raise HTTPException(
            status_code=502,
            detail="Gemini returned an empty response.",
        )

    try:
        result = AssistantOutput.model_validate_json(response.text)

        # Reject logically invalid age ranges.
        filters = result.recommendation_filters
        if (
            filters.min_age is not None
            and filters.max_age is not None
            and filters.min_age > filters.max_age
        ):
            raise ValueError("Invalid age range returned by Gemini.")

        # Keep the special startup request from affecting discovery progress,
        # even if the model returns unexpected tracking values.
        if request.message.strip() == "START_CONVERSATION":
            result.discovery_answered = False
            result.skip_detected = False

        return result

    except Exception as exc:
        print(f"Response validation error: {exc}")
        raise HTTPException(
            status_code=502,
            detail="Gemini returned an invalid response format.",
        ) from exc
