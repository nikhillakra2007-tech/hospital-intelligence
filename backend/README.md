# Hospital Intelligence - Backend

FastAPI backend for the Hospital Intelligence platform. It serves the existing
`hospital_intelligence` PostgreSQL database (defined by `../database/schema.sql`,
seeded from `../database/seed.sql`) with CRUD APIs for patients, hospitals,
hospital operations, health grids, environmental data, and risk assessments,
plus read-only dashboard analytics endpoints.

Stack: Python, FastAPI, SQLAlchemy 2.x, Pydantic v2, Alembic, psycopg 3.

## 1. What the backend does

- REST CRUD endpoints under `/api` for all six datasets.
- Read-only analytics under `/api/dashboard` (summary, hospital capacity,
  risk distribution, environment).
- `/health` liveness endpoint.
- Interactive docs at `/docs` and `/redoc`.

The existing database is the source of truth. The app never recreates or
resets it. Alembic is configured for future schema migrations only.

## 2. Create a virtual environment (PowerShell)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

## 3. Install requirements

```powershell
pip install -r requirements.txt
```

## 4. Configure `.env`

```powershell
Copy-Item .env.example .env
```

Edit `.env` and set your real PostgreSQL password:

```
DATABASE_URL=postgresql+psycopg://postgres:YOUR_PASSWORD@localhost:5432/hospital_intelligence
```

## 5. Start PostgreSQL and prepare the database

Ensure the PostgreSQL service is running. Create the database and load the
existing schema/seed files once:

```powershell
psql -U postgres -c "CREATE DATABASE hospital_intelligence;"
psql -U postgres -d hospital_intelligence -f ..\database\schema.sql
psql -U postgres -d hospital_intelligence -f ..\database\seed.sql
```

Skip this if `hospital_intelligence` already exists with data.

## 6. Run the FastAPI server

```powershell
uvicorn app.main:app --reload
```

## 7. Access the docs

- Swagger UI: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc

## 8. Test `/health`

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

Expected response: `status = ok`.

## Alembic (future migrations only)

```powershell
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

Do not autogenerate against a database you cannot reset; review every generated
script before upgrading.
