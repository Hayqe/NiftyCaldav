# Product Requirements Document (PRD) - Mistral Vibe

**Projectnaam:** Mistral Vibe
**Versie:** 1.0
**Datum:** 25 april 2026
**Eigenaar:** Hayke Tjemmes

---

## 1. Inleiding

### Doel
Ontwikkelen van een kalenderapplicatie met een FastAPI-backend en Vue.js-frontend, die als laag bovenop Radicale (CalDAV-server) functioneert. De applicatie biedt beheer van agenda’s, events, en gebruikers, met een gebruiksvriendelijke interface in de stijl van Google Calendar.

### Scope
- **Backend:** FastAPI (Python) voor CRUD-operaties, authenticatie, en CalDAV-integratie.
- **Frontend:** React/Typescript en Tailwind voor dag/week/maand/lijstweergave, eventbeheer, en admin-pagina.
- **Database:** SQLite voor gebruikersinstellingen en metadata.
- **Docker:** Drie containers (Radicale, FastAPI, app).

---

## 2. Functionele Eisen

### A. Backend (FastAPI)
   Functionaliteit                | Beschrijving                                                                                     | Opmerkingen                                                                 |
 |--------------------------------|-------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------|
 | **Agenda’s beheer**            | CRUD voor agenda’s (MKCALENDAR, DELETE, PROPPATCH)                                              | Conform CalDAV-standaard                                                    |
 | **Events beheer**              | CRUD voor events (conform iCalendar RFC 5545)                                                   | Ondersteuning voor herhalende en meerdaagse events                        |
 | **Gebruikersbeheer**           | CRUD voor gebruikers (aanmaken, updaten, verwijderen, wachtwoord reset)                       | Gebruikersopslag in SQLite                                                  |
 | **Gedeelde agenda’s**          | Beheer wie welke rechten heeft op een agenda (`read`, `write`, `admin`)                         | Tabel `calendar_shares` in SQLite                                            |
 | **Authenticatie**              | Basic Auth (initieel admin/admin), later JWT                                                    | Eerste run: admin/admin als default                                         |
 | **ICS Import**                 | Massale import van .ics-bestanden naar een geselecteerde agenda                                | Validatie en foutafhandeling                                                |

### B. Frontend (React, Typescript, Tailwind)
 | Functionaliteit                | Beschrijving                                                                                     | Opmerkingen                                                                 |
 |--------------------------------|-------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------|
 | **Kalenderweergave**           | Dag-, week-, maand-, en lijstweergave                                                          |                                           |
| sidebar | Toont datumpicker met huidige maand (en knoppen voor vorige/volgende), Lijst met agenda's van deze user (en mogelijkeid om ze te activeren/deactiveren), Lijst met gedeelde agenda's (en mogelijkheid om ze te activeren/deactiveren)  | |
|topbar | Toont logo: kalender-icon in een 5-graden rechtsom geroteerd vierkant met afgeronde hoeken. Toont kalendernaam. Toont knoppen om de agendaweergave aan te passen naar dag/week/maand/lijstweergave  | |  
 | **Eventbeheer**                | Toevoegen/updaten/verwijderen via popup-formulier (klik op kalender)                           | Drag-and-drop voor rescheduling                                              |
 | **Admin-pagina**               | Beheer van gebruikers en agenda’s (alleen voor admin-rol)                                     | Overzicht, zoeken, filteren, bulk-acties                                  |
 | **Gebruikersinstellingen**     | Instellingen voor agendakleuren, bureaubladmeldingen, tijdzone, taal                           | Opslag in SQLite                                                            |
 | **ICS Import**                 | Uploaden en importeren van .ics-bestanden                                                      | Feedback over succes/errors                                                 |

---

## 3. Niet-functionele Eisen

- Prestaties: API-responsetijd < 500ms.
- Beveiliging: HTTPS, gehashte wachtwoorden (bcrypt), CORS-beleid.
- Schaalbaarheid: Ontworpen voor 100+ gelijktijdige gebruikers.
- Compatibiliteit: Moderne browsers (Chrome, Firefox, Edge, Safari).
- Documentatie: Swagger/OpenAPI voor API, gebruikershandleiding voor frontend.

---

## 4. Technische Specificaties

### A. Backend (FastAPI)

- **Taal:** Python 3.11
- **Framework:** FastAPI
- **CalDAV-bibliotheek:** [caldav](https://pypi.org/project/caldav/)
- **Database:** SQLite (voor gebruikersinstellingen)
- **Authenticatie:** Basic Auth (initieel), later JWT
- **API-documentatie:** Swagger UI (automatisch gegenereerd)

### B. Frontend (React/Typscript/Tailwind)

- **Taal:** React, Typescript, TailwindCSS
- **Styling:** TailwindCSS of SCSS

### C. Database (SQLite)

```sql
-- Gebruikers
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Gebruikersinstellingen
CREATE TABLE user_settings (
    user_id INTEGER PRIMARY KEY,
    calendar_colors TEXT,
    notifications_enabled BOOLEAN DEFAULT FALSE,
    timezone TEXT DEFAULT 'Europe/Amsterdam',
    language TEXT DEFAULT 'nl',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Agenda's
CREATE TABLE calendars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    owner_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Gedeelde agenda's
CREATE TABLE calendar_shares (
    calendar_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    permission TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (calendar_id, user_id),
    FOREIGN KEY (calendar_id) REFERENCES calendars(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

### D. Docker opzet
version: '3.8'

services:
  radicale:
    image: radicale/radicale\:latest
    container_name: radicale
    restart: unless-stopped
    volumes:
      - ./radicale-data:/data
      - ./radicale-config:/config
    ports:
      - "5232:5232"
    environment:
      - RADICALE_AUTH_TYPE=htpasswd
      - RADICALE_HTPASSWD_FILENAME=/config/users
      - RADICALE_HTPASSWD_ENCRYPTION=bcrypt

  api:
    build: ./api
    container_name: NiftyCaldav-api
    restart: unless-stopped
    ports:
      - "8880:8000"
    volumes:
      - ./api-data:/data
    depends_on:
      - radicale
    environment:
      - RADICALE_URL=http://radicale:5232
      - DATABASE_URL=sqlite:////data/mistral.db

  frontend:
    build: ./frontend
    container_name: NiftyCaldav
    restart: unless-stopped
    ports:
      - "3330:3000"
    depends_on:
      - api
    environment:
      
      
### E. Gebruikersrollen en rechten:
| Rol | Rechten |
| --- | --- |
| Admin | Beheer van gebruikers, agenda’s, en systeeminstellingen |
| User | Beheer van eigen agenda’s, events, en instellingen |


### F. User Flow
Eerste Run

Systeem maakt automatisch admin/admin aan.
Admin logt in en wijzigt wachtwoord.
Admin-pagina

Overzicht van gebruikers en agenda’s.
Knoppen voor toevoegen/updaten/verwijderen.
Kalenderweergave

Navigatie tussen dag/week/maand/lijst.
Klik op datum/tijd om event toe te voegen.
ICS Import

Upload-knop in instellingen of admin-pagina.


### G. Checklist:
- api: unittest met pytest
- frontend: e2d unittest met cypress
- 

