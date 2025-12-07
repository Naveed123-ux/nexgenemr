# Docker Setup Guide

This guide explains how to run the Curealog application using Docker Compose.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+

## Quick Start

1. **Copy environment file**
   ```bash
   cp .env.docker.example .env
   ```

2. **Update environment variables**
   Edit `.env` and add your actual configuration values (API keys, secrets, etc.)

3. **Start all services**
   ```bash
   docker-compose up -d
   ```

4. **Check service status**
   ```bash
   docker-compose ps
   ```

5. **View logs**
   ```bash
   # All services
   docker-compose logs -f
   
   # Specific service
   docker-compose logs -f backend
   docker-compose logs -f frontend
   ```

## Services

The docker-compose setup includes:

- **db**: PostgreSQL 15 database (port 5432)
- **backend**: FastAPI application (port 8000)
- **frontend**: Next.js application (port 3000)

## Access Points

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Database: localhost:5432

## Common Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Rebuild services
docker-compose up -d --build

# Stop and remove volumes (WARNING: deletes database data)
docker-compose down -v

# Run database migrations
docker-compose exec backend alembic upgrade head

# Access backend shell
docker-compose exec backend bash

# Access frontend shell
docker-compose exec frontend sh

# View real-time logs
docker-compose logs -f
```

## Development Mode

The docker-compose.yml is configured for development with:
- Hot reload enabled for both frontend and backend
- Volume mounts for live code updates
- Debug-friendly settings

## Production Deployment

For production:

1. Update environment variables with production values
2. Remove volume mounts from docker-compose.yml
3. Set `NODE_ENV=production`
4. Use proper secrets management
5. Configure reverse proxy (nginx/traefik)
6. Enable SSL/TLS certificates

## Troubleshooting

**Database connection issues:**
```bash
docker-compose logs db
docker-compose restart db
```

**Backend not starting:**
```bash
docker-compose logs backend
docker-compose exec backend pip install -r requirements.txt
```

**Frontend build errors:**
```bash
docker-compose logs frontend
docker-compose exec frontend npm install
```

**Reset everything:**
```bash
docker-compose down -v
docker-compose up -d --build
```
