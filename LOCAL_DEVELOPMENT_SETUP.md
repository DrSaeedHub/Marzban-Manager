# Local Development Setup Guide

This guide explains how to run the Marzban Manager backend and frontend locally without CORS errors.

## Current Configuration

- **Backend API**: `http://127.0.0.1:5000`
- **Frontend**: `http://localhost:8080`

## Prerequisites

1. **Python 3.10+** (for backend)
2. **Node.js 18+** (for frontend)
3. **PostgreSQL** (for database)

## Step 1: Database Setup

Make sure PostgreSQL is running with the credentials in `.env`:

```bash
# Default credentials from .env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=9SKbGY2CGJWd7ml
DB_NAME=MarzbanManager
```

The backend will automatically create the database and schema on first run.

## Step 2: Run Backend

```bash
# Navigate to backend directory
cd Marzban-Manager/backend

# Create virtual environment (first time only)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies (first time only)
pip install -r requirements.txt

# Run the backend
python -m app.main
```

The backend will start on: **http://127.0.0.1:5000**

### Verify Backend is Running

Open in browser: http://127.0.0.1:5000/docs (Swagger UI)

## Step 3: Run Frontend

Open a **new terminal** window:

```bash
# Navigate to frontend directory
cd Marzban-Manager/WebPanel

# Install dependencies (first time only)
npm install

# Run the development server
npm run dev
```

The frontend will start on: **http://localhost:8080**

### Verify Frontend is Running

Open in browser: http://localhost:8080

## CORS Configuration

The CORS configuration is automatically handled:

### Backend CORS Settings (`.env`)
```bash
CORS_ORIGINS=["http://localhost:8080","http://127.0.0.1:8080"]
```

### Frontend API Configuration
The frontend automatically connects to `http://127.0.0.1:5000` (or uses `VITE_API_BASE_URL` if set).

## No CORS Errors!

With this setup, you should have **NO CORS errors** because:

1. ✅ Backend allows `localhost:8080` and `127.0.0.1:8080` origins
2. ✅ Frontend correctly points to backend at `127.0.0.1:5000`
3. ✅ Both services run on different ports (standard practice)
4. ✅ Debug mode adds extra localhost variations automatically

## Troubleshooting

### CORS Error Still Appears?

1. **Restart the backend** after changing `.env`:
   ```bash
   # Stop backend (Ctrl+C in terminal)
   # Then restart:
   python -m app.main
   ```

2. **Clear browser cache** and reload page (Ctrl+Shift+R)

3. **Check console logs**:
   - Backend logs should show allowed origins
   - Frontend console should show: `[Config] API Base URL: http://127.0.0.1:5000`

### Backend Not Starting?

1. Check PostgreSQL is running
2. Verify database credentials in `.env`
3. Check port 5000 is not in use: `netstat -ano | findstr :5000`

### Frontend Not Starting?

1. Check port 8080 is not in use
2. Run `npm install` again
3. Delete `node_modules` and reinstall if needed

## Optional: Environment Variables

### Frontend Environment Variables

Create `Marzban-Manager/WebPanel/.env` (optional):

```bash
# Override API URL if backend runs on different address
VITE_API_BASE_URL=http://127.0.0.1:5000
```

### Backend Environment Variables

All backend configuration is in `Marzban-Manager/backend/.env`

## Development Workflow

### Recommended Terminal Setup

Use 2 terminal windows:

**Terminal 1 - Backend:**
```bash
cd Marzban-Manager/backend
venv\Scripts\activate  # or source venv/bin/activate on Linux/Mac
python -m app.main
```

**Terminal 2 - Frontend:**
```bash
cd Marzban-Manager/WebPanel
npm run dev
```

### Access Points

- **Frontend**: http://localhost:8080
- **Backend API**: http://127.0.0.1:5000
- **API Docs**: http://127.0.0.1:5000/docs
- **API ReDoc**: http://127.0.0.1:5000/redoc

## Port Summary

| Service | Port | URL |
|---------|------|-----|
| Backend API | 5000 | http://127.0.0.1:5000 |
| Frontend Dev | 8080 | http://localhost:8080 |
| PostgreSQL | 5432 | localhost:5432 |

## Notes

- The backend runs in **debug mode** by default (see `DEBUG=True` in `.env`)
- Debug mode automatically allows additional localhost origins for development
- Hot reload is enabled for both backend (uvicorn) and frontend (vite)
- Changes to code will automatically reload the services
