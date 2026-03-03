#!/bin/bash

# This script runs both frontend and backend for NexGenEMR

# Start Backend in background
echo "Starting Backend..."
cd backend
source venv/Scripts/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &

# Start Frontend in foreground
echo "Starting Frontend..."
cd ../frontend
npm run dev
