@echo off
TITLE First Job Tracker - Backend Setup

echo ==========================================
echo First Job Rejection Tracker - Backend Setup
echo ==========================================
echo.

echo Checking for Node.js installation...
node --version >nul 2>&1
if %errorlevel% == 0 (
    echo ✓ Node.js is installed
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo   Version: %NODE_VERSION%
) else (
    echo ✗ Node.js is not installed
    echo.
    echo Please install Node.js from https://nodejs.org/
    echo Then run this script again
    echo.
    pause
    exit /b 1
)

echo.
echo Checking for npm...
npm --version >nul 2>&1
if %errorlevel% == 0 (
    echo ✓ npm is installed
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo   Version: %NPM_VERSION%
) else (
    echo ✗ npm is not installed
    echo.
    echo Please reinstall Node.js from https://nodejs.org/
    echo Then run this script again
    echo.
    pause
    exit /b 1
)

echo.
echo Navigating to backend directory...
cd /d "%~dp0backend"
if %errorlevel% neq 0 (
    echo ✗ Failed to navigate to backend directory
    echo   Current directory: %cd%
    echo   Expected directory: %~dp0backend
    echo.
    pause
    exit /b 1
)

echo ✓ Current directory: %cd%

echo.
echo Installing dependencies...
npm install
if %errorlevel% == 0 (
    echo ✓ Dependencies installed successfully
) else (
    echo ✗ Failed to install dependencies
    echo   Please check your internet connection and try again
    echo.
    pause
    exit /b 1
)

echo.
echo Setup completed successfully!
echo.
echo To start the development server, run:
echo   npm run dev
echo.
echo To start the production server, run:
echo   npm start
echo.
echo The server will run on port 3001 by default
echo Health check endpoint: http://localhost:3001/api/health
echo.
pause
