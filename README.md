# NGL Matching
### An Intelligent and Interactive Dating Recommendation System

NGL Matching is an AI-assisted dating recommendation prototype developed for the Intelligent Interactive Systems module at the University of Birmingham.

The project explores how conversational AI and transparent preference models can improve users' understanding and control of dating recommendations.

Rather than relying entirely on profile similarity, NGL Matching allows users to communicate their preferences naturally, inspect the preferences identified by the system, correct inaccurate assumptions and observe how recommendations change.

The prototype uses synthetic profiles and is intended for demonstrating human-AI interaction and recommendation design.

## 1. Problem and Research Motivation

Dating applications use recommendation algorithms to help users discover potential partners. However, stated preferences do not always predict who someone will actually find attractive.

Research by Eastwick and Finkel (2008), Joel et al. (2017), and Whyte and Torgler (2017) highlights limitations in relying on declared preferences to predict attraction or actual choices.

Furthermore, Chen, Hsieh and Lin (2023) highlight the importance of considering both sides of a potential match rather than evaluating recommendations only through individual responses.

These findings suggest that profile similarity alone is insufficient for identifying genuinely compatible partners.

NGL Matching explores one part of this problem: whether making inferred preferences visible and editable can improve users' understanding and control over recommendations.

## 2. Project Objectives

The main objectives are to:

- Explore conversational AI as a method of discovering user preferences.
- Allow users to express preferences through natural-language interaction.
- Provide a visible and editable preference model called Taste Mirror.
- Help users inspect and correct inferred preferences.
- Generate recommendations using a preference-based compatibility engine.
- Allow users to refine recommendations through feedback and filtering.
- Demonstrate an interactive feedback loop between the user and AI system.

## 3. Main Features

### Preference Assistant

An AI-powered conversational assistant that interprets natural-language messages, identifies relevant preferences and asks adaptive follow-up questions.

It distinguishes between the user's personal interests and their expectations of a potential partner.

### Taste Mirror

A visible and editable representation of the preferences identified by the system.

Users can inspect, modify and remove preferences, giving them greater control over how the application understands their interests and expectations.

### Intelligent Recommendations

A separate matching engine compares the user's preferences against a collection of synthetic profiles and ranks potential recommendations.

### Compatibility Information

Recommendations display compatibility information and explanations to help users understand why a profile may be relevant.

### Recommendation Filters

Users can refine recommendations through:
- Preferred location or city.
- Minimum and maximum age.
- Changes to preference priorities.

### Adaptive Preference Refinement

Users can continue interacting with the Preference Assistant after recommendations are unlocked. Changes to preferences can influence subsequent recommendations.

## 4. Design Rationale

The central design concept is Taste Mirror, a visible and editable preference model.

This concept responds to the research gap identified in Assignment 1: it is uncertain whether making inferred preferences visible and editable can help users recognise unsuitable recommendations and make better-informed decisions.

Instead of treating AI-generated preferences as automatically correct, the system allows users to inspect and correct them.

The conversational interface supports natural preference discovery, while the Taste Mirror provides a persistent representation that users can review and control.

The matching engine then uses the available preference information to rank synthetic profiles.

The design aims to improve transparency and perceived user control. It does not assume that preference editing guarantees compatibility or romantic attraction.

## 5. Technology Stack

| Component | Technology |
|---|---|
| Frontend | React |
| Development server | Vite |
| Backend | Python |
| API framework | FastAPI |
| Conversational AI | Google Gemini API |
| Data validation | Pydantic |
| Styling | CSS |
| Version control | Git and GitHub |

## 6. System Architecture

The application follows a frontend-backend architecture.

1. The React frontend provides the Profile, Discover Matches and Preference Assistant interfaces.
2. The FastAPI backend receives conversational requests from the frontend.
3. The Gemini API interprets user messages and generates structured preference updates.
4. The backend validates the AI response and returns the structured information.
5. The frontend updates the Taste Mirror through the preference management system.
6. A separate matching engine compares preferences against synthetic profiles.
7. Ranked recommendations are displayed to the user.
8. Users can provide further feedback or edit preferences, creating an iterative interaction loop.

The Gemini API supports conversational interpretation and preference extraction. The separate application matching engine performs profile ranking.

## 7. Project Structure

```text
Prototype/
│
├── README.md
├── .gitignore
│
├── 04_Frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── PreferenceAssistant.jsx
│   │   │   └── Sidebar.jsx
│   │   ├── context/
│   │   │   └── PreferenceContext.jsx
│   │   ├── data/
│   │   │   └── syntheticProfiles.js
│   │   ├── pages/
│   │   │   ├── Matches.jsx
│   │   │   └── Profile.jsx
│   │   ├── services/
│   │   │   ├── matchingEngine.js
│   │   │   └── preferenceEngine.js
│   │   └── styles/
│   │       └── global.css
│   └── package.json
│
└── 05_Backend/
    ├── app/
    │   └── main.py
    ├── requirements.txt
    └── .env.example
```

## 8. Installation and Setup

### Requirements

- Python 3.10 or later.
- Node.js and npm.
- A Google Gemini API key.

### Backend Setup

Open a terminal inside `05_Backend`.

Create a virtual environment:

```powershell
python -m venv .venv
```

Activate it:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install the dependencies:

```powershell
pip install -r requirements.txt
```

Create a `.env` file inside `05_Backend` using `.env.example` as a reference.

Add your Gemini API key:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Start the backend:

```powershell
python -m uvicorn app.main:app --reload --port 8000
```

Backend address:

`http://127.0.0.1:8000`

API documentation:

`http://127.0.0.1:8000/docs`

### Frontend Setup

Open a separate terminal inside `04_Frontend`.

Install dependencies:

```powershell
npm install
```

Start the development server:

```powershell
npm run dev
```

Open the local URL provided by Vite, usually:

`http://localhost:5173`

## 9. Development and Testing

The prototype was developed iteratively, with the frontend, backend, conversational AI and matching engine integrated and tested.

Functional tests included:

- Initial conversational interaction.
- Extracting multiple preferences from one message.
- Distinguishing personal interests from partner expectations.
- Recommendation unlocking after meaningful discovery answers.
- Skipping questions without increasing the discovery count.
- Handling unrelated messages without inventing preferences.
- Updating and correcting existing preferences.
- Manually editing the Taste Mirror.
- Changes to recommendation rankings after preference updates.
- Applying and clearing age and location filters.

## 10. Limitations and Future Work

The current implementation has several limitations:

- It uses synthetic profiles rather than real users.
- It does not provide real user registration, dating, or messaging services.
- Compatibility scores are produced by a prototype matching algorithm and should not be interpreted as predictions of genuine romantic attraction.
- The system does not currently implement reciprocal matching or verify whether both people would choose each other.
- Location filtering supports city-level restrictions rather than geographical distance calculations.
- Gemini responses may vary between interactions.
- The prototype has not been evaluated through a longitudinal study with real dating-app users.

Future development could investigate reciprocal preference matching, greater recommendation diversity and user evaluation over time.

## 11. AI Use Acknowledgement

Google Gemini API is integrated into the application to support conversational preference discovery and structured preference extraction.

AI tools were also used during development to assist with coding, debugging, implementation guidance and documentation. The application was developed and tested iteratively, with its features and implementation decisions reviewed throughout the development process.

## 12. References

The following research informed the project's problem definition and design rationale:

•	Amershi, S. et al. (2019) ‘Guidelines for Human-AI Interaction’, Proceedings of the 2019 CHI Conference on Human Factors in Computing Systems. https://doi.org/10.1145/3290605.3300233
•	Chen, K.-M., Hsieh, Y.-W. and Lin, M.-J. (2023) ‘Reducing Recommendation Inequality via Two-Sided Matching: A Field Experiment of Online Dating’, International Economic Review, 64(3), pp. 1201–1221. https://doi.org/10.1111/iere.12631
•	Cramer, H. et al. (2008) ‘The Effects of Transparency on Trust in and Acceptance of a Content-Based Art Recommender’, User Modeling and User-Adapted Interaction, 18, pp. 455–496. https://doi.org/10.1007/s11257-008-9051-3
•	Eastwick, P.W. and Finkel, E.J. (2008) ‘Sex Differences in Mate Preferences Revisited: Do People Know What They Initially Desire in a Romantic Partner?’, Journal of Personality and Social Psychology, 94(2), pp. 245–264. https://doi.org/10.1037/0022-3514.94.2.245
•	Joel, S., Eastwick, P.W. and Finkel, E.J. (2017) ‘Is Romantic Desire Predictable? Machine Learning Applied to Initial Romantic Attraction’, Psychological Science, 28(10), pp. 1478–1489. https://doi.org/10.1177/0956797617714580
•	Sinha, R.R. and Swearingen, K. (2002) ‘The Role of Transparency in Recommender Systems’, CHI Extended Abstracts, pp. 830–831. https://doi.org/10.1145/506443.506619
•	Tintarev, N. and Masthoff, J. (2007) ‘A Survey of Explanations in Recommender Systems’, 2007 IEEE 23rd International Conference on Data Engineering Workshop, pp. 801–810. https://doi.org/10.1109/ICDEW.2007.4401070
•	Whyte, S. and Torgler, B. (2017) ‘Preference Versus Choice in Online Dating’, Cyberpsychology, Behavior, and Social Networking, 20(3), pp. 150–156. https://doi.org/10.1089/cyber.2016.0528

---
