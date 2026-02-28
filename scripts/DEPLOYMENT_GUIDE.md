# Complete Deployment Guide - Linux VPS

This guide covers deploying the Curealog application to a Linux VPS (Ubuntu/Debian) with Docker.

## Prerequisites

- A Linux VPS (Ubuntu 20.04+ or Debian 11+ recommended)
- Root or sudo access
- Domain name (optional but recommended)
- Minimum 2GB RAM, 2 CPU cores, 20GB storage

---

## Step 1: Initial Server Setup

### 1.1 Connect to Your VPS

```bash
ssh root@your_server_ip
# or
ssh your_username@your_server_ip
```

### 1.2 Update System Packages

```bash
sudo apt update
sudo apt upgrade -y
```

### 1.3 Create a Non-Root User (if using root)

```bash
adduser curealog
usermod -aG sudo curealog
su - curealog
```

### 1.4 Configure Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

---

## Step 2: Install Docker and Docker Compose

### 2.1 Install Docker

```bash
# Remove old versions
sudo apt remove docker docker-engine docker.io containerd runc

# Install dependencies
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Verify installation
sudo docker --version
```

### 2.2 Install Docker Compose

```bash
# Download Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make it executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

### 2.3 Add User to Docker Group

```bash
sudo usermod -aG docker $USER
newgrp docker

# Test Docker without sudo
docker ps
```

---

## Step 3: Install Git and Clone Repository

### 3.1 Install Git

```bash
sudo apt install -y git
```

### 3.2 Clone Your Repository

```bash
cd ~
git clone https://github.com/your-username/curealog.git
cd curealog
```

**OR** if using private repository:

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"
cat ~/.ssh/id_ed25519.pub
# Add this key to your GitHub account

# Clone repository
git clone git@github.com:your-username/curealog.git
cd curealog
```

---

## Step 4: Configure Environment Variables

### 4.1 Copy and Edit Environment File

```bash
cp .env.docker.example .env
nano .env
```

### 4.2 Update Critical Variables

Update these values in `.env`:

```bash
# Change database credentials
POSTGRES_PASSWORD=your_strong_password_here

# Update JWT secret
SECRET_KEY=generate_a_new_strong_secret_key_here

# Update encryption key (generate new one)
EMR_ENCRYPTION_KEY=generate_new_32_byte_base64_key

# Update domain/IP for production
GOOGLE_REDIRECT_URI=https://yourdomain.com/google/auth/callback

# Update API URLs for your domain
NEXT_PUBLIC_API_BASE_URL=https://yourdomain.com/api
NEXT_PRIVATE_API_BASE_URL=http://backend:8000

# Add your actual API keys
GEMINI_API_KEY=your_actual_key
CLOUDINARY_API_KEY=your_actual_key
# ... etc
```

### 4.3 Generate Secure Keys

```bash
# Generate SECRET_KEY
openssl rand -hex 32

# Generate EMR_ENCRYPTION_KEY (32-byte base64)
openssl rand -base64 32
```

---

## Step 5: Prepare Application Files

### 5.1 Check GCP Credentials (if using Google Cloud)

```bash
# Make sure gcp_credentials.json exists in backend folder
ls backend/gcp_credentials.json

# If not, create it:
nano backend/gcp_credentials.json
# Paste your GCP service account JSON
```

### 5.2 Update Docker Compose for Production

Edit `docker-compose.yml`:

```bash
nano docker-compose.yml
```

Change the backend command from development to production:

```yaml
# Change this line:
command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# To this:
command: uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## Step 6: Build and Start Services

### 6.1 Build Docker Images

```bash
docker-compose build
```

### 6.2 Start Services

```bash
docker-compose up -d
```

### 6.3 Check Service Status

```bash
docker-compose ps
docker-compose logs -f
```

### 6.4 Run Database Migrations

```bash
docker-compose exec backend alembic upgrade head
```

---

## Step 7: Install and Configure Nginx (Reverse Proxy)

### 7.1 Install Nginx

```bash
sudo apt install -y nginx
```

### 7.2 Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/curealog
```

Add this configuration:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Configuration
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates (will be added by Certbot)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api {
        rewrite ^/api/(.*) /$1 break;
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend direct access (optional)
    location /docs {
        proxy_pass http://localhost:8000/docs;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket support
    location /socket.io {
        proxy_pass http://localhost:8000/socket.io;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Client body size (for file uploads)
    client_max_body_size 50M;
}
```

### 7.3 Enable Site and Test Configuration

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/curealog /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## Step 8: Install SSL Certificate (Let's Encrypt)

### 8.1 Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 8.2 Obtain SSL Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts:
- Enter your email
- Agree to terms
- Choose whether to redirect HTTP to HTTPS (recommended: yes)

### 8.3 Test Auto-Renewal

```bash
sudo certbot renew --dry-run
```

---

## Step 9: Configure Domain DNS

Point your domain to your VPS IP:

### DNS Records to Add:

```
Type    Name    Value               TTL
A       @       your_vps_ip         3600
A       www     your_vps_ip         3600
```

Wait for DNS propagation (can take up to 48 hours, usually much faster).

---

## Step 10: Set Up Automatic Backups

### 10.1 Create Backup Script

```bash
mkdir -p ~/backups
nano ~/backups/backup.sh
```

Add this script:

```bash
#!/bin/bash

# Configuration
BACKUP_DIR=~/backups
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER_NAME="curealog-db"
DB_NAME="curealog"
DB_USER="curealog_user"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker exec $CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Backup uploaded files (if any)
tar -czf $BACKUP_DIR/files_backup_$DATE.tar.gz ~/curealog/backend/static

# Keep only last 7 days of backups
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +7 -delete
find $BACKUP_DIR -name "files_backup_*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

### 10.2 Make Script Executable

```bash
chmod +x ~/backups/backup.sh
```

### 10.3 Set Up Cron Job

```bash
crontab -e
```

Add this line (daily backup at 2 AM):

```
0 2 * * * ~/backups/backup.sh >> ~/backups/backup.log 2>&1
```

---

## Step 11: Set Up Monitoring and Logging

### 11.1 Install Log Rotation

```bash
sudo nano /etc/logrotate.d/curealog
```

Add:

```
/home/curealog/curealog/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 curealog curealog
    sharedscripts
}
```

### 11.2 Monitor Docker Containers

```bash
# View logs
docker-compose logs -f --tail=100

# Check resource usage
docker stats

# Check container health
docker-compose ps
```

---

## Step 12: Security Hardening

### 12.1 Configure Fail2Ban

```bash
sudo apt install -y fail2ban

# Create local configuration
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local
```

Enable SSH protection:

```ini
[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
```

```bash
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 12.2 Disable Root Login

```bash
sudo nano /etc/ssh/sshd_config
```

Change:

```
PermitRootLogin no
PasswordAuthentication no  # If using SSH keys
```

```bash
sudo systemctl restart sshd
```

### 12.3 Set Up Automatic Security Updates

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## Step 13: Application Management Commands

### Start Application

```bash
cd ~/curealog
docker-compose up -d
```

### Stop Application

```bash
docker-compose down
```

### Restart Application

```bash
docker-compose restart
```

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d

# Run migrations
docker-compose exec backend alembic upgrade head
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### Database Access

```bash
# Access PostgreSQL
docker-compose exec db psql -U curealog_user -d curealog

# Backup database manually
docker-compose exec db pg_dump -U curealog_user curealog > backup.sql

# Restore database
cat backup.sql | docker-compose exec -T db psql -U curealog_user curealog
```

---

## Step 14: Performance Optimization

### 14.1 Configure Docker Resource Limits

Edit `docker-compose.yml` to add resource limits:

```yaml
services:
  backend:
    # ... existing config
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### 14.2 Enable Nginx Caching

Add to Nginx config:

```nginx
# Add at server level
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m;

# Add in location blocks
proxy_cache my_cache;
proxy_cache_valid 200 60m;
```

---

## Step 15: Troubleshooting

### Check Service Status

```bash
docker-compose ps
systemctl status nginx
systemctl status docker
```

### Common Issues

**Port already in use:**
```bash
sudo lsof -i :8000
sudo lsof -i :3000
# Kill process if needed
sudo kill -9 <PID>
```

**Database connection issues:**
```bash
docker-compose logs db
docker-compose restart db
```

**Permission issues:**
```bash
sudo chown -R $USER:$USER ~/curealog
```

**Out of disk space:**
```bash
# Check disk usage
df -h

# Clean Docker
docker system prune -a
docker volume prune
```

---

## Step 16: Monitoring and Maintenance

### Daily Checks

```bash
# Check if services are running
docker-compose ps

# Check disk space
df -h

# Check logs for errors
docker-compose logs --tail=50 | grep -i error
```

### Weekly Maintenance

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Clean Docker resources
docker system prune -f

# Check backup status
ls -lh ~/backups/
```

### Monthly Tasks

- Review security logs
- Update SSL certificates (automatic with Certbot)
- Review and optimize database
- Check application performance

---

## Quick Reference Commands

```bash
# Start everything
docker-compose up -d

# Stop everything
docker-compose down

# View logs
docker-compose logs -f

# Restart a service
docker-compose restart backend

# Update application
git pull && docker-compose up -d --build

# Database backup
docker-compose exec db pg_dump -U curealog_user curealog > backup_$(date +%Y%m%d).sql

# Check status
docker-compose ps && systemctl status nginx

# View resource usage
docker stats
```

---

## Support and Additional Resources

- Docker Documentation: https://docs.docker.com/
- Nginx Documentation: https://nginx.org/en/docs/
- Let's Encrypt: https://letsencrypt.org/
- PostgreSQL Documentation: https://www.postgresql.org/docs/

---

## Security Checklist

- [ ] Changed all default passwords
- [ ] Generated new SECRET_KEY and EMR_ENCRYPTION_KEY
- [ ] Configured firewall (UFW)
- [ ] Installed SSL certificate
- [ ] Disabled root login
- [ ] Set up Fail2Ban
- [ ] Configured automatic backups
- [ ] Enabled automatic security updates
- [ ] Reviewed and secured API keys
- [ ] Set up monitoring and logging

---

**Deployment Complete!** 🎉

Your application should now be accessible at:
- https://yourdomain.com (Frontend)
- https://yourdomain.com/api (Backend API)
- https://yourdomain.com/docs (API Documentation)
