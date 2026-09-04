# Hospital Intelligence

> **Healthcare Command Center & Population Risk Analytics Platform**  
> An end-to-end intelligence system for regional healthcare monitoring, hospital bed capacity tracking, environmental exposure analysis, and ML-driven patient cardiac risk prediction across the National Capital Territory of Delhi.

---

## 🌐 Live Deployments

| Component | Platform | URL |
| :--- | :--- | :--- |
| **Frontend Web App** | **Vercel** | [https://hospital-intelligence-theta.vercel.app](https://hospital-intelligence-theta.vercel.app) |
| **Backend REST API** | **Render** | [https://hospital-intelligence-backend.onrender.com](https://hospital-intelligence-backend.onrender.com) |
| **Interactive API Docs** | **Swagger UI** | [https://hospital-intelligence-backend.onrender.com/docs](https://hospital-intelligence-backend.onrender.com/docs) |
| **Database** | **Neon PostgreSQL** | Cloud Serverless PostgreSQL 16+ with spatial data layer |

---

## 🏛 System Architecture

```mermaid
graph TD
    Client["Vercel Frontend<br/>(React 19, TypeScript, Vite, Tailwind, Leaflet)"]
    API["Render Backend<br/>(FastAPI, SQLAlchemy 2, Pydantic v2)"]
    ML["Inference Engine<br/>(Scikit-Learn RandomForest, Joblib)"]
    DB[("Neon PostgreSQL<br/>(Hospitals, Patients, Grids, Operations, Environment)")]

    Client -->|"REST / JSON"| API
    API -->|"SQLAlchemy ORM"| DB
    API -->|"Feature Vector Ingestion"| ML
    ML -->|"Calibrated Probabilities & Risk Tiers"| API
```

---

## ✨ Key Features

1. **Interactive Geospatial Command Center (Delhi Map)**
   - Displays **6,284 spatial grid cells** (500m resolution) covering NCT Delhi with exact boundary polygons.
   - **1,728 healthcare facilities and hospitals** imported from OpenStreetMap with marker clustering, search-by-name, and locality filters.
   - Seamless drill-down from district overview to individual facility capacity and coordinates.

2. **Machine Learning Risk Intelligence**
   - **HospitalRiskModel (v1)**: Random Forest model trained on clinical indicators (systolic/diastolic blood pressure, glucose, cholesterol, BMI, heart rate, cardiac history, diabetes, hypertension).
   - Dynamic batch inference scoring patients in real time with continuous risk scores (0.0 to 1.0) and categorical risk tiers (`LOW`, `MODERATE`, `HIGH`).
   - Contextual environmental blending combining clinical risk with ambient zone Air Quality Index (AQI).

3. **Hospital Operations & Capacity Tracking**
   - Real-time aggregation of total beds, reported beds, ICU capacity, and emergency-ready facilities.
   - Hospital ranking and instant search with fuzzy matching across names, localities, and districts.

4. **Environmental & Climate Health Context**
   - Monitored AQI, temperature, and rainfall records across regional health grids.
   - Correlates environmental severity with population health vulnerability.

---

## 📁 Repository Structure

```
hospital-intelligence/
├── backend/
│   ├── app/
│   │   ├── core/               # App configuration & settings
│   │   ├── db/                 # Database engine & session providers
│   │   ├── models/             # SQLAlchemy ORM database models
│   │   ├── routes/             # REST API routers (hospitals, patients, risk, map, dashboard)
│   │   ├── schemas/            # Pydantic v2 validation schemas
│   │   ├── services/           # Analytics, ML, & spatial data aggregation services
│   │   └── main.py             # FastAPI entrypoint & CORS configuration
│   ├── ml/
│   │   └── risk/               # Random Forest model pipeline, feature extractors, metrics
│   ├── scripts/                # Spatial data migration & demo data restore utilities
│   ├── requirements.txt        # Python backend dependencies
│   └── README.md               # Backend-specific guide
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable UI widgets, charts, Leaflet map, modals
│   │   ├── hooks/              # Custom React data hooks (useApi)
│   │   ├── pages/              # Dashboard, Hospitals, Patients, Environment, Risk
│   │   ├── services/           # Axios API client & endpoints
│   │   ├── types/              # TypeScript interface definitions
│   │   └── utils/              # Formatting, tokens, search ranking
│   ├── package.json            # Frontend npm dependencies & scripts
│   └── vite.config.ts          # Vite build configuration
├── database/
│   ├── schema.sql              # Relational database schema DDL
│   └── seed.sql                # Baseline reference data
└── data/                       # Raw reference CSV datasets
```

---

## 🚀 Local Development Setup

### 1. Prerequisites
- **Node.js**: v18 or later (`v24.x` recommended)
- **Python**: 3.11 or 3.12
- **PostgreSQL**: 15+ (local or remote Neon instance)

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv

# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# Linux / macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
# Copy .env.example to .env and set your DATABASE_URL
```

Sample `.env`:
```ini
DATABASE_URL=postgresql+psycopg://postgres:password@localhost:5432/hospital_intelligence
```

Run the backend server:
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
API Documentation will be available at:
- **Swagger**: `http://127.0.0.1:8000/docs`
- **ReDoc**: `http://127.0.0.1:8000/redoc`

### 3. Frontend Setup

```bash
cd frontend

# Install npm packages
npm install

# Configure environment variables (.env)
echo "VITE_API_BASE_URL=http://127.0.0.1:8000" > .env

# Start development server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 📡 API Reference Overview

| Route | Method | Description |
| :--- | :--- | :--- |
| `/health` | `GET` | Service liveness & health check |
| `/api/dashboard/summary` | `GET` | High-level metrics: total patients, facilities, beds, high risk count |
| `/api/dashboard/hospital-capacity` | `GET` | Bed capacity, patient counts, and average ML scores per hospital |
| `/api/dashboard/risk-distribution` | `GET` | Overall population breakdown by risk category |
| `/api/dashboard/environment` | `GET` | Environmental metrics (AQI, temp, rainfall) across health grids |
| `/api/map/delhi` | `GET` | Full Delhi geospatial dataset: 6,284 grid polygons & 1,728 hospital POIs |
| `/api/hospitals` | `GET, POST` | Hospital registry listing with filter by district and type |
| `/api/patients` | `GET, POST` | Patient records with clinical biomarkers |
| `/api/risk/predictions` | `GET` | Live batch ML inference over the patient registry |
| `/api/risk/run-assessment` | `POST` | Triggers a fresh ML inference run and returns execution metrics |
| `/api/risk/model-info` | `GET` | Random Forest model metadata, feature importances, and validation scores |

---

## ☁ Deployment

### Frontend (Vercel)
- Configured with Vite build output in `dist/`.
- Deployed via the Vercel CLI / GitHub integration.
- Production environment variable: `VITE_API_BASE_URL=https://hospital-intelligence-backend.onrender.com`.

### Backend (Render)
- Web service configured on Render.
- Build command: `pip install -r requirements.txt`.
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
- Environment variable: `DATABASE_URL` pointing to the Neon cloud PostgreSQL database.
