# Startup script for NexGenEMR (Windows PowerShell)

echo "Starting Backend in a new window..."
# Open Backend in a new terminal window
Start-Process powershell -ArgumentList "-NoExit", "-Command", 'cd backend; .\venv\Scripts\Activate.ps1; uvicorn main:app --host 0.0.0.0 --port 8000 --reload'

echo "Starting Frontend in a new window..."
# Open Frontend in a new terminal window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"
