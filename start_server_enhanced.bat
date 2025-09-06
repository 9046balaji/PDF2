@echo off
REM Enhanced server starter script with multiple options
REM Usage: 
REM   start_server_enhanced.bat                  - Start server on default port 5000
REM   start_server_enhanced.bat 8080             - Start server on specified port
REM   start_server_enhanced.bat 8080 forward     - Start server with CORS for forwarding
REM   start_server_enhanced.bat 8080 ngrok       - Start server and expose with ngrok

setlocal EnableDelayedExpansion

REM Process arguments
set PORT=%1
set MODE=%2

REM Default port is 5000 if not specified
if "%PORT%"=="" set PORT=5000

REM Print header
echo ======================================================
echo PDF Tool Server - Enhanced Starter
echo ======================================================
echo.

REM Check if ngrok mode is requested and verify ngrok is installed
if /i "%MODE%"=="ngrok" (
    where ngrok >nul 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo Error: ngrok is not installed or not in PATH.
        echo Please install ngrok from https://ngrok.com/download
        echo and add it to your PATH, then try again.
        echo.
        echo Alternatively, you can manually run ngrok in another terminal with:
        echo   ngrok http %PORT%
        echo.
        echo Starting server without ngrok...
        set MODE=
    )
)

REM Set environment variables
set PORT=%PORT%
set FLASK_APP=app.py
set FLASK_ENV=development

REM Handle different modes
if /i "%MODE%"=="forward" (
    echo Starting server on port %PORT% with CORS for forwarding...
    echo.
    
    REM Check if flask-cors is installed
    pip show flask-cors >nul 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo Installing flask-cors for port forwarding...
        pip install flask-cors
    )
    
    REM Set forwarding environment variable
    set ENABLE_CORS=1
    
    REM Start the server
    start /b cmd /c "python app.py"
    
) else if /i "%MODE%"=="ngrok" (
    echo Starting server on port %PORT% with ngrok tunnel...
    echo.
    
    REM Check if flask-cors is installed
    pip show flask-cors >nul 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo Installing flask-cors for port forwarding...
        pip install flask-cors
    )
    
    REM Set forwarding environment variable
    set ENABLE_CORS=1
    
    REM Start the server in background
    start /b cmd /c "python app.py"
    
    REM Wait for server to start
    echo Waiting for server to start...
    timeout /t 3 /nobreak >nul
    
    REM Start ngrok
    echo Starting ngrok tunnel to port %PORT%...
    echo.
    start ngrok http %PORT% --log=stdout
    
) else (
    echo Starting server on port %PORT%...
    echo.
    
    REM Start the Flask application normally
    python app.py
)

endlocal
