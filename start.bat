@echo off
title O2O Gym - Starting...
color 0A
setlocal enabledelayedexpansion

echo.
echo  ================================
echo    O2O Gym Management System
echo  ================================
echo.

cd /d "%~dp0"

:: ----------------------------------------------------------------
:: [1/6] Ensure Docker is running
:: ----------------------------------------------------------------
echo [1/6] Checking Docker...
docker info >nul 2>&1
if errorlevel 1 (
    echo   Docker is not running. Launching Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo   Waiting for Docker engine to start ^(this can take a minute^)...
    :wait_docker
    timeout /t 5 /nobreak >nul
    docker info >nul 2>&1
    if errorlevel 1 goto wait_docker
)
echo   Docker is running.

:: ----------------------------------------------------------------
:: [2/6] Start database + redis
:: ----------------------------------------------------------------
echo [2/6] Starting Database ^(Postgres + Redis^)...
docker compose up -d
if errorlevel 1 (
    echo   ERROR: docker compose failed. See message above.
    pause
    exit /b 1
)

:: ----------------------------------------------------------------
:: [3/6] Wait until Postgres is actually healthy ^(not a fixed sleep^)
:: ----------------------------------------------------------------
echo [3/6] Waiting for Postgres to become healthy...
:wait_pg
for /f %%s in ('docker inspect --format "{{.State.Health.Status}}" o2o-gym-postgres-1 2^>nul') do set PG_STATUS=%%s
if not "!PG_STATUS!"=="healthy" (
    timeout /t 2 /nobreak >nul
    goto wait_pg
)
echo   Postgres is healthy.

:: ----------------------------------------------------------------
:: [4/6] Apply database schema ^(migrations^) + seed
::   migrate deploy is data-safe: it creates missing tables and
::   applies pending migrations WITHOUT wiping existing data.
:: ----------------------------------------------------------------
echo [4/6] Applying database migrations...
cd backend
call npx prisma migrate deploy
if errorlevel 1 (
    echo   migrate deploy failed - falling back to db push...
    call npx prisma db push
    if errorlevel 1 (
        echo   ERROR: could not set up database schema. Aborting.
        pause
        exit /b 1
    )
)

echo [4/6] Seeding initial data ^(idempotent^)...
call npm run db:seed:prod

:: ----------------------------------------------------------------
:: [5/6] Start backend + frontend
:: ----------------------------------------------------------------
echo [5/6] Starting Backend Server...
start "O2O Backend" cmd /k "cd /d %~dp0backend && npm run dev"
timeout /t 4 /nobreak >nul

echo [6/6] Starting Frontend...
start "O2O Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 6 /nobreak >nul

echo.
echo  ================================
echo    O2O Gym is starting up!
echo    Login: admin / Admin@123
echo  ================================
echo.
start http://localhost:3000

endlocal
exit
