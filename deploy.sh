#!/bin/bash

# Curealog Deployment Script
# This script automates the deployment process on a fresh Linux VPS

set -e  # Exit on error

echo "=========================================="
echo "Curealog Deployment Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    print_error "Please do not run this script as root. Use a regular user with sudo privileges."
    exit 1
fi

# Step 1: Update system
echo ""
echo "Step 1: Updating system packages..."
sudo apt update && sudo apt upgrade -y
print_success "System updated"

# Step 2: Install Docker
echo ""
echo "Step 2: Installing Docker..."
if ! command -v docker &> /dev/null; then
    sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io
    sudo usermod -aG docker $USER
    print_success "Docker installed"
else
    print_info "Docker already installed"
fi

# Step 3: Install Docker Compose
echo ""
echo "Step 3: Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    print_success "Docker Compose installed"
else
    print_info "Docker Compose already installed"
fi

# Step 4: Install Nginx
echo ""
echo "Step 4: Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
    print_success "Nginx installed"
else
    print_info "Nginx already installed"
fi

# Step 5: Install Certbot
echo ""
echo "Step 5: Installing Certbot..."
if ! command -v certbot &> /dev/null; then
    sudo apt install -y certbot python3-certbot-nginx
    print_success "Certbot installed"
else
    print_info "Certbot already installed"
fi

# Step 6: Configure Firewall
echo ""
echo "Step 6: Configuring firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
print_success "Firewall configured"

# Step 7: Install Fail2Ban
echo ""
echo "Step 7: Installing Fail2Ban..."
if ! command -v fail2ban-client &> /dev/null; then
    sudo apt install -y fail2ban
    sudo systemctl enable fail2ban
    sudo systemctl start fail2ban
    print_success "Fail2Ban installed"
else
    print_info "Fail2Ban already installed"
fi

# Step 8: Check environment file
echo ""
echo "Step 8: Checking environment configuration..."
if [ ! -f .env ]; then
    print_warning ".env file not found!"
    if [ -f .env.docker.example ]; then
        cp .env.docker.example .env
        print_info "Created .env from .env.docker.example"
        print_warning "IMPORTANT: Edit .env file with your actual configuration before continuing!"
        echo ""
        read -p "Press Enter after you've edited the .env file..."
    else
        print_error ".env.docker.example not found. Cannot proceed."
        exit 1
    fi
else
    print_success ".env file exists"
fi

# Step 9: Generate secure keys
echo ""
echo "Step 9: Generating secure keys..."
print_info "SECRET_KEY: $(openssl rand -hex 32)"
print_info "EMR_ENCRYPTION_KEY: $(openssl rand -base64 32)"
print_warning "Copy these keys to your .env file!"
echo ""
read -p "Press Enter to continue..."

# Step 10: Build and start services
echo ""
echo "Step 10: Building Docker images..."
docker-compose build
print_success "Docker images built"

echo ""
echo "Step 11: Starting services..."
docker-compose up -d
print_success "Services started"

# Wait for services to be ready
echo ""
echo "Waiting for services to be ready..."
sleep 10

# Step 12: Run database migrations
echo ""
echo "Step 12: Running database migrations..."
docker-compose exec -T backend alembic upgrade head
print_success "Database migrations completed"

# Step 13: Check service status
echo ""
echo "Step 13: Checking service status..."
docker-compose ps

# Step 14: Create backup directory and script
echo ""
echo "Step 14: Setting up backup system..."
mkdir -p ~/backups

cat > ~/backups/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=~/backups
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER_NAME="curealog-db"
DB_NAME="curealog"
DB_USER="curealog_user"

mkdir -p $BACKUP_DIR
docker exec $CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +7 -delete
echo "Backup completed: $DATE"
EOF

chmod +x ~/backups/backup.sh
print_success "Backup system configured"

# Step 15: Summary
echo ""
echo "=========================================="
echo "Deployment Summary"
echo "=========================================="
echo ""
print_success "Docker and Docker Compose installed"
print_success "Nginx installed"
print_success "SSL/TLS tools installed (Certbot)"
print_success "Firewall configured"
print_success "Fail2Ban installed"
print_success "Application services started"
print_success "Database migrations completed"
print_success "Backup system configured"
echo ""
print_warning "Next Steps:"
echo "1. Configure your domain DNS to point to this server"
echo "2. Set up Nginx reverse proxy (see DEPLOYMENT_GUIDE.md)"
echo "3. Obtain SSL certificate: sudo certbot --nginx -d yourdomain.com"
echo "4. Set up cron job for backups: crontab -e"
echo "   Add: 0 2 * * * ~/backups/backup.sh >> ~/backups/backup.log 2>&1"
echo ""
print_info "Application URLs:"
echo "  - Frontend: http://$(curl -s ifconfig.me):3000"
echo "  - Backend API: http://$(curl -s ifconfig.me):8000"
echo "  - API Docs: http://$(curl -s ifconfig.me):8000/docs"
echo ""
print_warning "IMPORTANT: Review and update your .env file with production values!"
echo ""
print_success "Deployment completed successfully! 🎉"
echo ""
echo "For detailed instructions, see DEPLOYMENT_GUIDE.md"
echo "=========================================="
