# POSQ Deployment Guide

This guide covers different deployment scenarios for the POSQ Restaurant POS system.

## 🌐 Production: Multi-Restaurant with Automatic Subdomains

This is the real production path: one server, one wildcard DNS record, and
every restaurant gets `{slug}.yourdomain.com` automatically the moment it's
created - no per-restaurant DNS or server config.

### How it works
- `docker-compose.prod.yml` runs Caddy in front of everything. Caddy handles
  TLS automatically, including a **wildcard certificate** for `*.yourdomain.com`
  (via a DNS-01 challenge - see `deploy/Caddy.Dockerfile`), and reverse-proxies
  to the API and frontend containers based on the Host header.
- The API's `resolveTenant` middleware (`server/src/middleware/tenant.js`)
  reads that same Host header to figure out which restaurant a request
  belongs to. Caddy preserves the original Host header by default, so no
  extra config is needed for this to work.
- New restaurants need zero infrastructure changes: their subdomain works
  the instant their `branches.slug` row exists, because the wildcard DNS
  record and wildcard cert already cover it.

### One-time setup
1. **DNS**: create an A (or AAAA) record for `yourdomain.com` and a second
   one for `*.yourdomain.com`, both pointing at this server's IP. A single
   wildcard record covers every current and future restaurant.
2. **Cloudflare token** (or another DNS provider): the wildcard cert needs a
   DNS-01 challenge, which needs API access to create a TXT record on your
   zone. Create a Cloudflare API token scoped to `Zone:DNS:Edit` on your
   zone. Using a different DNS provider? Swap the module in
   `deploy/Caddy.Dockerfile` for the matching one from
   [github.com/caddy-dns](https://github.com/caddy-dns), and the `dns
   cloudflare` line in `deploy/Caddyfile`.
3. **Environment**: `cp .env.production.example .env.production` and fill it
   in - real secrets (`openssl rand -base64 48` for JWT secrets), your
   domain, DB password, Stripe keys.
4. **Launch**:
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
   ```
   First boot issues the wildcard cert, which can take a minute or two -
   watch progress with `docker compose -f docker-compose.prod.yml logs -f caddy`.
5. **Verify**: `https://yourdomain.com` (marketing), `https://admin.yourdomain.com`
   (your super-admin console), and `https://anything.yourdomain.com` should
   all resolve with valid HTTPS.

### Scaling
The API is stateless aside from Socket.IO, which uses the Redis adapter
(`REDIS_URL` is already wired in `docker-compose.prod.yml`), so it's safe to
run more than one instance:
```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --scale api=3
```
Caddy load-balances across all running `api` replicas automatically.

### What's NOT automated here
- **Backups**: `mysql_data` is a named Docker volume; set up your own
  scheduled `mysqldump` (or your host's managed-MySQL backup feature if you
  swap in one) - this compose file does not do it for you.
- **Monitoring/alerting**: `/health` (liveness) and `/health/ready` (DB
  connectivity) exist for a load balancer or uptime checker to poll, but
  nothing here sends you an alert - wire that up in whatever
  monitoring/uptime tool you use.
- **Stripe webhooks**: point two webhook endpoints at
  `https://admin.yourdomain.com/api/payments/webhook/stripe` (order
  payments) and `https://admin.yourdomain.com/api/billing/webhook`
  (subscription billing) in the Stripe dashboard, using the signing secrets
  in `.env.production`.

---

## 🚀 Local Docker (single restaurant, no TLS, no subdomains)

### Prerequisites
- Docker and Docker Compose
- Git

### 1. Clone and Setup
```bash
git clone <repository-url>
cd posq-restaurant-pos
```

### 2. Start Services
```bash
docker compose up -d --build
```

### 3. Access Application
- **Customer PWA**: http://localhost:5173
- **Admin Dashboard**: http://localhost:5173/admin/login
- **API Server**: http://localhost:3001
- **Printer Service**: http://localhost:4000

## 🏠 Local Development

### Prerequisites
- Node.js 18+
- npm or yarn

### 1. Install Dependencies
```bash
npm install
cd server && npm install
cd ../frontend && npm install
cd ../printer-service && npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Database Setup
```bash
cd server
npm run migrate
npm run seed
```

### 4. Start Development Servers
```bash
# Terminal 1: Backend
cd server && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev

# Terminal 3: Printer Service
cd printer-service && npm run dev
```

## ☁️ Cloud Deployment

### Option 1: VPS Deployment

#### 1. Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 2. Application Deployment
```bash
# Clone repository
git clone <repository-url>
cd posq-restaurant-pos

# Configure environment
cp .env.example .env
nano .env
# Set OPERATING_MODE=CLOUD
# Configure database credentials
# Set domain and SSL settings

# Start services
docker-compose up --build -d
```

#### 3. SSL Setup (Nginx + Certbot)
```bash
# Install Nginx
sudo apt install nginx certbot python3-certbot-nginx -y

# Configure Nginx
sudo nano /etc/nginx/sites-available/posq
```

Nginx configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/posq /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

### Option 2: Docker Swarm

#### 1. Initialize Swarm
```bash
docker swarm init
```

#### 2. Deploy Stack
```bash
docker stack deploy -c docker-compose.yml posq
```

#### 3. Scale Services
```bash
docker service scale posq_api=3
docker service scale posq_frontend=2
```

## 🗄️ Database Setup

### SQLite (Local Mode)
```bash
# Database is automatically created
# Located at: server/data/posq.db
# Backup: cp server/data/posq.db backups/
```

### MySQL (Cloud Mode)
```bash
# Install MySQL
sudo apt install mysql-server -y

# Create database
mysql -u root -p
CREATE DATABASE posq;
CREATE USER 'posq'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON posq.* TO 'posq'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Run migrations
cd server
DB_TYPE=mysql npm run migrate
npm run seed
```

### PostgreSQL (Cloud Mode)
```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Create database
sudo -u postgres psql
CREATE DATABASE posq;
CREATE USER posq WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE posq TO posq;
\q

# Run migrations
cd server
DB_TYPE=pg npm run migrate
npm run seed
```

## 🖨️ Printer Setup

### Network Printers
1. Connect printer to network
2. Note printer IP address
3. Configure in admin settings
4. Test print from dashboard

### USB Printers
1. Connect printer via USB
2. Install printer drivers
3. Configure printer service
4. Test connection

### Printer Configuration
```bash
# Test printer service
curl -X POST http://localhost:4000/test \
  -H "Content-Type: application/json" \
  -d '{"printerId": "kitchen"}'
```

## 🔧 Configuration

### Environment Variables

#### Required
```bash
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-domain.com
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=posq
DB_USER=posq
DB_PASSWORD=your_password
JWT_SECRET=your-super-secret-jwt-key
```

#### Optional
```bash
# Payment Gateway
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Printer Service
DEFAULT_PRINTER_IP=192.168.1.100

# Operating Mode
OPERATING_MODE=CLOUD

# Sync Settings
SYNC_ENABLED=true
CENTRAL_SERVER_URL=https://central.posq.com
```

### SSL Configuration
```bash
# Generate SSL certificate
sudo certbot certonly --standalone -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Monitoring

### Health Checks
```bash
# API Health
curl http://localhost:3001/health

# Printer Service Health
curl http://localhost:4000/health

# Database Connection
curl http://localhost:3001/api/settings/database/test
```

### Logs
```bash
# View logs
docker-compose logs -f

# Specific service logs
docker-compose logs -f api
docker-compose logs -f frontend
docker-compose logs -f printer
```

### Backup
```bash
# Automated backup script
./scripts/backup.sh

# Manual backup
./scripts/backup.sh sqlite
./scripts/backup.sh mysql
./scripts/backup.sh postgresql
```

## 🔄 Updates

### Application Updates
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up --build -d

# Run migrations if needed
docker-compose exec api npm run migrate
```

### Database Migrations
```bash
# Run migrations
docker-compose exec api npm run migrate

# Rollback if needed
docker-compose exec api npm run migrate:rollback
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Database Connection Failed
```bash
# Check database status
sudo systemctl status mysql
sudo systemctl status postgresql

# Test connection
mysql -u posq -p posq
psql -U posq -d posq
```

#### 2. Printer Not Working
```bash
# Check printer service
curl http://localhost:4000/health

# Test printer connection
telnet 192.168.1.100 9100
```

#### 3. SSL Certificate Issues
```bash
# Check certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew
```

#### 4. Performance Issues
```bash
# Check resource usage
docker stats

# Scale services
docker-compose up --scale api=3 -d
```

### Log Analysis
```bash
# Application logs
tail -f server/logs/combined.log
tail -f server/logs/error.log

# System logs
journalctl -u docker
journalctl -u nginx
```

## 🔒 Security

### Firewall Configuration
```bash
# Allow necessary ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### Database Security
```bash
# MySQL security
sudo mysql_secure_installation

# PostgreSQL security
sudo -u postgres psql
ALTER USER posq PASSWORD 'strong_password';
```

### Application Security
- Use strong JWT secrets
- Enable HTTPS in production
- Regular security updates
- Monitor access logs
- Implement rate limiting

## 📈 Scaling

### Horizontal Scaling
```bash
# Scale API servers
docker-compose up --scale api=5 -d

# Load balancer configuration
# Use Nginx or HAProxy for load balancing
```

### Database Scaling
- Use read replicas for MySQL/PostgreSQL
- Implement connection pooling
- Consider database sharding for large deployments

### Caching
```bash
# Redis configuration
# Enable Redis for session storage and caching
```

## 🆘 Support

### Getting Help
1. Check the logs first
2. Review this deployment guide
3. Check GitHub issues
4. Contact support team

### Emergency Procedures
```bash
# Stop all services
docker-compose down

# Restore from backup
./scripts/restore.sh sqlite backups/posq_20240101.db.gz

# Restart services
docker-compose up -d
```

---

**POSQ Deployment Guide** - Comprehensive deployment instructions for all scenarios.