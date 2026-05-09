# NiftyCaldav

Een kalenderapplicatie met FastAPI-backend en **React + TypeScript**-frontend, gebouwd als een laag bovenop **Radicale** (CalDAV-server).

---

## 🏗️ Projectstructuur

```
NiftyCaldav/
├── api/                          # FastAPI Backend
│   ├── src/
│   │   ├── database/             # Database & seed
│   │   ├── models/               # SQLAlchemy modellen
│   │   ├── schemas/              # Pydantic schemas
│   │   ├── services/             # Business logic (CalDAV, ICS, auth)
│   │   ├── routes/               # API endpoints
│   │   └── main.py
│   ├── tests/                     # Unit tests (pytest)
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                     # React + TypeScript Frontend
│   ├── src/
│   │   ├── views/                # Home, Login, Admin, Settings, ICS Import
│   │   ├── router/
│   │   └── main.tsx
│   ├── cypress/                  # E2E tests
│   └── Dockerfile
├── radicale-config/              # Radicale configuratie (automatisch aangemaakt)
├── radicale-data/                # Radicale data (agenda's, events)
├── setup-radicale.sh             # Setup script voor eerstmalige configuratie
├── docker-compose.yml
├── README.md
└── prd.md                       # Product Requirements Document
```

---

## 🚀 Snelle Start

### Vereiste: Python 3 en bcrypt
Radicale vereist de `bcrypt` module. Deze wordt automatisch geïnstalleerd bij het opstarten van de container.

### Eerstmalige Setup
Voer het setup script uit om de Radicale data folder en admin gebruiker aan te maken:
```bash
./setup-radicale.sh
```
Het script vraagt om een admin wachtwoord en maakt de benodigde folders en files aan.

### Docker opstarten
```bash
docker compose up -d
```

Toegang:
- **Frontend**: http://localhost:3330
- **API Docs (Swagger)**: http://localhost:8880/docs
- **API Redoc**: http://localhost:8880/redoc
- **Radicale**: http://localhost:5232

Inloggen met de admin gebruiker die je hebt aangemaakt tijdens de setup.

---

## 🎯 API Overzicht

Voor **gedetailleerde endpoint documentatie**, inclusief parameters, request/response voorbeelden en het uitproberen van endpoints, zie:
📖 **[Swagger UI](http://localhost:8880/docs)** of **[ReDoc](http://localhost:8880/redoc)**

### Belangrijkste Endpoints

| Domein | Endpoints |
|--------|-----------|
| **Authenticatie** | `POST /auth/login`, `POST /auth/token` |
| **Gebruikers** | `GET /users/`, `POST /users/`, `GET /users/me`, `GET/PUT/DELETE /users/{id}` |
| **Agenda's** | `GET/POST /calendars/`, `GET/PUT/DELETE /calendars/{id}` |
| **Gedeeld** | `POST/GET /calendars/{id}/shares`, `PUT/DELETE /calendars/{id}/shares/{user_id}` |
| **Events** | `GET/POST /events/`, `GET/PUT/DELETE /events/{id}` |
| **ICS Import** | `POST /ics/import`, `POST /ics/import-from-url` |

---

## 🛠️ Technologieën

| Laag | Technologieën |
|------|---------------|
| **Backend** | Python 3.11, FastAPI, SQLAlchemy, SQLite, `caldav`, `icalendar`, JWT, bcrypt |
| **Frontend** | React 18, TypeScript, Vite, React Query, React Router, Tailwind CSS |
| **DevOps** | Docker, Docker Compose, Cypress (E2E), pytest |

---

## 📜 Licentie
MIT License

---

## 📞 Support
- **API Documentatie**: http://localhost:8880/docs
- **Docker Logs**: `docker compose logs -f`
- **PRD**: [prd.md](./prd.md)

```bash
# Commando's
./setup-radicale.sh            # Eerstmalige setup (admin gebruiker aanmaken)
docker compose up -d          # Start alles
docker compose down            # Stop alles
docker compose build --no-cache # Rebuild
```