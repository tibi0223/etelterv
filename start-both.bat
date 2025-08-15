@echo off
echo 🚀 Starting Meal Plan Application...
echo.

echo 📡 Starting Backend Server (Port 3001)...
start "Backend Server" cmd /k "node server-simple.js"

echo ⏳ Waiting for backend to start...
timeout /t 3 /nobreak >nul

echo 🌐 Starting Frontend Server (Port 3000)...
start "Frontend Server" cmd /k "npm run dev"

echo.
echo ✅ Both servers starting!
echo 📊 Frontend: http://localhost:3000
echo 📡 Backend API: http://localhost:3001/api/health
echo 🧪 Test Page: http://localhost:3000/meal-plan-test
echo.
echo Press any key to close this window...
pause >nul