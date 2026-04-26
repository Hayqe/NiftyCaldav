# NiftyCaldav

Een kalenderapplicatie met FastAPI-backend en Vue.js-frontend, die functioneert als een laag bovenop Radicale (CalDAV-server).

## 🏗️ Projectstructuur

```
NiftyCaldav/
├── api/                          # FastAPI Backend
│   ├── src/
│   │   ├── database/             # Database configuratie en seed
│   │   ├── models/               # SQLAlchemy modellen
│   │   ├── schemas/              # Pydantic schemas
│   │   ├── services/             # Business logic
│   │   │   ├── auth.py           # Authenticatie (JWT)
│   │   │   ├── users.py          # Gebruikersbeheer
│   │   │   ├── calendars.py      # Agenda's beheer
│   │   │   ├── events.py         # Events CRUD
│   │   │   ├── caldav_client.py  # CalDAV integratie
│   │   │   └── ics_import.py     # ICS-import functionaliteit
│   │   └── routes/               # API endpoints
│   │       ├── auth.py           # Authenticatie routes
│   │       ├── users.py          # Gebruikers routes
│   │       ├── calendars.py      # Agenda's routes
│   │       ├── events.py         # Events routes
│   │       └── ics.py            # ICS-import routes
│   │   └── main.py
│   ├── tests/                     # Unit tests (pytest)
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                     # Vue.js Frontend
│   ├── src/
│   │   ├── views/                # Vue componenten
│   │   │   ├── HomeView.vue      # Kalenderweergave
│   │   ├── LoginView.vue        # Inlogpagina
│   │   ├── AdminView.vue        # Admin dashboard
│   │   ├── SettingsView.vue      # Instellingen
│   │   └── ICSImportView.vue     # ICS-import interface
│   │   ├── router/              # Vue Router
│   │   └── main.js
│   ├── cypress/                  # E2E tests (Cypress)
│   │   ├── e2e/                 # Test specimens
│   │   └── support/             # Custom commands
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
├── radicale-config/              # Radicale configuratie
│   └── users                     # htpasswd gebruikersbestand
├── docker-compose.yml            # Docker configuratie
├── README.md
└── prd.md                       # Product Requirements Document
```

## 🚀 Snelle Start

### 1. Klonen en voorbereiden

```bash
cd /path/naar/NiftyCaldav
git clone <repository-url> .
```

### 2. Docker containers starten

```bash
docker compose up -d
```

Dit start:
- **Radicale** (poort 5232) - CalDAV server
- **NiftyCaldav API** (poort 8880) - FastAPI backend
- **NiftyCaldav Frontend** (poort 3330) - Vue.js frontend

### 3. Toegang

- **Frontend**: http://localhost:3330
- **API Docs (Swagger)**: http://localhost:8880/docs
- **API Redoc**: http://localhost:8880/redoc

### 4. Inloggen

Default inloggegevens:
- **Gebruikersnaam**: admin
- **Wachtwoord**: admin

---

## 📖 Gebruiksanwijzing

### Kalenderbeheer

1. **Inloggen** vier de `/login` pagina met `admin/admin`
2. Na inloggen zie je de navigatiebar met:
   - **Kalender** - Bekijk je agenda's en events
   - **Admin** - Beheer gebruikers en agenda's
   - **Instellingen** - Pas je voorkeuren aan
   - **ICS Import** - Importeer .ics-bestanden
   - **Uitloggen** - Verlaat de applicatie

### ICS Import

1. Ga naar **ICS Import**
2. Selecteer een agenda waar je naartoe wilt importeren
3. **Optie 1**: Upload een .ics-bestand via de file picker
4. **Optie 2**: Klik op "Importeren vanaf URL" en voer een publiek ICS-feed URL in
5. De events worden automatisch geimport in de geselecteerde agenda

### Admin Dashboard

De admin pagina toont:
- **Gebruikers**: Lijst van alle gebruikers met mogelijkheid om toe te voegen/verwijderen
- **Agenda's**: Overzicht van alle agenda's

---

## 🔧 Ontwikkeling

### Backend (FastAPI)

#### Afhankelijkheden installeren

```bash
cd api
pip install -r requirements.txt
```

#### Lokaal draaien

```bash
cd api
uvicorn src.main:app --reload --port 8000
```

API is dan beschikbaar op: http://localhost:8000

#### Database initialiseren

```bash
cd api
# Handmatig admin gebruiker aanmaken
python3 -c "
import sqlite3
from src.services.auth import AuthService
password_hash = AuthService.hash_password('admin')
conn = sqlite3.connect('mistral.db')
conn.execute('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', ('admin', password_hash, 'admin'))
conn.execute('INSERT INTO user_settings (user_id) VALUES (1)')
conn.commit()
conn.close()
"
```

### Frontend (Vue.js)

#### Afhankelijkheden installeren

```bash
cd frontend
npm install
```

#### Lokaal draaien

```bash
cd frontend
npm run dev
```

Frontend is dan beschikbaar op: http://localhost:3000

### Docker Commands

```bash
# Alles starten
docker compose up -d

# Alles stoppen
docker compose down

# Logs bekijken
docker compose logs -f

# Containers herbouwen
docker compose build --no-cache

# Specifieke service herbouwen
docker compose build api
```

---

## 🎯 API Endpoints

### Authenticatie
| Methode | Endpoint | Beschrijving |
|---------|----------|-------------|
| `POST` | `/auth/login` | Login met Basic Auth, retourneert JWT token |
| `POST` | `/auth/token` | Alternatief endpoint voor JWT token |

### Gebruikers
| Methode | Endpoint | Beschrijving |
|---------|----------|-------------|
| `GET` | `/users/` | Lijst alle gebruikers (admin) |
| `POST` | `/users/` | Maak nieuwe gebruiker aan (admin) |
| `GET` | `/users/me` | Huidige gebruiker info |
| `GET` | `/users/{user_id}` | Gebruiker door ID |
| `PUT` | `/users/{user_id}` | Update gebruiker |
| `DELETE` | `/users/{user_id}` | Verwijder gebruiker (admin) |
| `GET` | `/users/{user_id}/settings` | Gebruikersinstellingen |
| `PUT` | `/users/{user_id}/settings` | Update instellingen |

### Agenda's
| Methode | Endpoint | Beschrijving |
|---------|----------|-------------|
| `GET` | `/calendars/` | Lijst alle agenda's |
| `POST` | `/calendars/` | Maak nieuwe agenda aan |
| `GET` | `/calendars/{calendar_id}` | Agenda door ID |
| `PUT` | `/calendars/{calendar_id}` | Update agenda |
| `DELETE` | `/calendars/{calendar_id}` | Verwijder agenda |

### Gedeelde Agenda's
| Methode | Endpoint | Beschrijving |
|---------|----------|-------------|
| `POST` | `/calendars/{calendar_id}/shares` | Deel agenda met gebruiker |
| `GET` | `/calendars/{calendar_id}/shares` | Lijst alle delen |
| `PUT` | `/calendars/{calendar_id}/shares/{user_id}` | Update deelrechten |
| `DELETE` | `/calendars/{calendar_id}/shares/{user_id}` | Verwijder delen |

### Events
| Methode | Endpoint | Beschrijving |
|---------|----------|-------------|
| `GET` | `/events/` | Lijst events (gefilterd op calendar_id, start, end) |
| `POST` | `/events/` | Maak nieuw event aan |
| `GET` | `/events/{event_id}` | Event door ID |
| `PUT` | `/events/{event_id}` | Update event |
| `DELETE` | `/events/{event_id}` | Verwijder event |

### ICS Import
| Methode | Endpoint | Beschrijving |
|---------|----------|-------------|
| `POST` | `/ics/import` | Importeer ICS-bestand (multipart/form-data) |
| `POST` | `/ics/import-from-url` | Importeer ICS vanaf URL |

**Parameters for ICS import:**
- `calendar_id`: ID van de doelaagenda (query parameter)
- `file`: Het .ics-bestand (multipart form field)
- `ics_url`: URL van het .ics-bestand (body JSON)

---

## 📦 API Response Voorbeelden

### Succesvolle Login
```json
POST /auth/login
Authorization: Basic YWRtaW46YWRtaW4=

Response (200):
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### ICS Import Resultaat
```json
POST /ics/import?calendar_id=1
Content-Type: multipart/form-data

Response (200):
{
  "success": true,
  "message": "Successfully imported 5 of 5 events",
  "imported_count": 5,
  "errors": [],
  "calendar_id": 1
}
```

### Gebruiker Lijst
```json
GET /users/
Authorization: Bearer <token>

Response (200):
[
  {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "created_at": "2024-01-01T00:00:00",
    "updated_at": "2024-01-01T00:00:00"
  }
]
```

---

## ⚙️ Configuratie

### Omgevingsvariabelen

| Variabele | Beschrijving | Default |
|----------|-------------|---------|
| `RADICALE_URL` | Radicale server URL | http://radicale:5232 |
| `DATABASE_URL` | SQLite database URL | sqlite:////data/mistral.db |
| `SECRET_KEY` | JWT secret key | your-secret-key-here |
| `ALGORITHM` | JWT algorithm | HS256 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT expiry time | 30 |

### Radicale Configuratie

Het `radicale-config/users` bestand bevat de htpasswd-gebruikers voor Radicale.
Gebruikers kunnen worden toegevoegd met:

```bash
# Voeg gebruiker toe (bcrypt)
htpasswd -bc radicale-config/users username password
```

---

## 🧪 Testen

### Backend Tests (pytest)

```bash
cd api
docker exec NiftyCaldav-api python -m pytest tests/ -v
```

Tests bevatten:
- Authenticatie tests (login, token, protected routes)
- Gebruikersbeheer tests (CRUD, settings)
- Agenda's tests (CRUD, shares)

### Frontend E2E Tests (Cypress)

```bash
cd frontend
npm run test:e2e
```

Tests bevatten:
- Login/logout
- Navigatie
- Admin dashboard
- Settings pagina

---

## 🛠️ Technologieën

### Backend
- Python 3.11
- FastAPI
- SQLAlchemy
- SQLite
- caldav (voor CalDAV integratie)
- icalendar (voor ICS parsing)
- JWT (voor authenticatie)
- bcrypt ( voor wachtwoord hashing)

### Frontend
- Vue.js 3
- Vite
- Pinia (state management)
- Vue Router
- Tailwind CSS
- vue-cal (kalendercomponent - toekomstig)

### Infrastructure
- Docker
- Docker Compose

---

## 🤝 Bijdragen

1. Fork de repository
2. Maak een feature branch (`git checkout -b feature/naam`)
3. Commit je wijzigingen (`git commit -m 'Voeg functionaliteit toe'`)
4. Push naar de branch (`git push origin feature/naam`)
5. Open een Pull Request

---

## 📜 Licentie

MIT License

---

## 📞 Contact & Support

Voor vragen of problemen:
- Raadpleeg de README en PRD
- Check de Docker logs: `docker compose logs -f`
- Controleer de API documentatie: http://localhost:8880/docs
