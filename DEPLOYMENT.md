# POSQ Deployment Guide

## Quick Start (5 minutes)

### 1. Prerequisites
- Docker and Docker Compose installed
- Git installed
- 2GB+ available disk space

### 2. Clone and Setup
```bash
git clone <repository-url>
cd posq-restaurant-pos
./scripts/setup.sh
```

### 3. Access the System
- **Customer Menu**: http://localhost:3001/menu?table=T01&branch=casa01
- **Admin Dashboard**: http://localhost:3001/admin
- **Login**: admin / admin123 (or use PIN: 1234)

## Deployment Options

### Option 1: Local Development
```bash
./scripts/setup.sh
# Choose option 1 for development mode
```
- Frontend: http://localhost:5173 (with hot reload)
- Backend: http://localhost:3001
- Database: SQLite (./server/data/posq.db)

### Option 2: Production (Single Server)
```bash
./scripts/setup.sh
# Choose option 2 for production mode
```
- Application: http://localhost:3001
- Database: SQLite (./data/posq.db)
- Optimized build with single container

### Option 3: Production + Cloud Database
```bash
./scripts/setup.sh
# Choose option 3 for cloud mode
```
- Application: http://localhost:3001
- Database: MySQL/PostgreSQL (configure in .env)
- Multi-branch support

## Manual Setup

### 1. Environment Configuration
```bash
cp server/.env.example server/.env
# Edit server/.env with your settings
```

### 2. Install Dependencies
```bash
# Root dependencies
npm install

# Server dependencies
cd server && npm install

# Frontend dependencies
cd ../frontend && npm install
```

### 3. Database Setup
```bash
cd server
npm run migrate
npm run seed
```

### 4. Start Services
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Production Deployment

### VPS/Cloud Server Deployment

1. **Server Setup**:
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

2. **Deploy Application**:
```bash
git clone <repository-url>
cd posq-restaurant-pos
cp server/.env.example server/.env
# Edit .env with production values
docker-compose up --build -d
```

3. **Setup SSL (Optional)**:
```bash
# Install Certbot
sudo apt install certbot nginx

# Configure Nginx reverse proxy
sudo nano /etc/nginx/sites-available/posq

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com
```

### Docker Compose Profiles

```bash
# Basic production
docker-compose up -d

# With MySQL database
docker-compose --profile cloud up -d

# With printer service
docker-compose --profile printer up -d

# Full setup with all services
docker-compose --profile cloud --profile printer up -d
```

## Configuration

### Environment Variables (.env)
```env
# Operating Mode
OPERATING_MODE=LOCAL  # or CLOUD

# Server
PORT=3001
NODE_ENV=production
JWT_SECRET=your-secret-key
FRONTEND_URL=https://yourdomain.com

# Database (LOCAL)
DB_PATH=./data/posq.db

# Database (CLOUD)
DB_CLIENT=mysql2
DB_HOST=your-db-host
DB_PORT=3306
DB_USER=posq_user
DB_PASSWORD=secure-password
DB_NAME=posq_db

# Payments (Optional)
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
```

### Database Migration

#### LOCAL to CLOUD Migration:
1. Export SQLite data:
```bash
sqlite3 data/posq.db .dump > backup.sql
```

2. Import to MySQL/PostgreSQL:
```bash
mysql -u posq_user -p posq_db < backup.sql
```

3. Update .env and restart:
```bash
OPERATING_MODE=CLOUD
docker-compose restart
```

## Monitoring & Maintenance

### Health Checks
```bash
# Check application health
curl http://localhost:3001/health

# Check Docker containers
docker-compose ps

# View logs
docker-compose logs -f
```

### Backup & Recovery
```bash
# Manual backup
./scripts/backup.sh

# Restore from backup
cp backups/posq_backup_YYYYMMDD_HHMMSS.db.gz data/
gunzip data/posq_backup_YYYYMMDD_HHMMSS.db.gz
mv data/posq_backup_YYYYMMDD_HHMMSS.db data/posq.db
docker-compose restart
```

### Updates
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up --build -d
```

## Troubleshooting

### Common Issues

**Port 3001 already in use:**
```bash
sudo lsof -i :3001
# Kill the process or change PORT in .env
```

**Database connection failed:**
```bash
# Check database file permissions
ls -la data/posq.db

# Recreate database
rm data/posq.db
docker-compose exec app npm run migrate
docker-compose exec app npm run seed
```

**Frontend not loading:**
```bash
# Check if frontend is built
ls -la frontend/dist/

# Rebuild frontend
cd frontend
npm run build
```

**QR codes not working:**
- Verify FRONTEND_URL in .env
- Check table configuration in admin
- Ensure QR codes point to correct domain

### Log Analysis
```bash
# Application logs
docker-compose logs app

# Database logs (if using external DB)
docker-compose logs mysql

# Printer service logs
docker-compose logs printer-service

# Nginx logs (if using reverse proxy)
sudo tail -f /var/log/nginx/access.log
```

## Performance Optimization

### Production Optimizations
1. **Enable compression** in Nginx
2. **Use CDN** for static assets
3. **Configure caching** headers
4. **Monitor database** performance
5. **Set up log rotation**

### Scaling Considerations
- **Load balancing**: Use Nginx for multiple app instances
- **Database scaling**: Read replicas for high traffic
- **File storage**: Use S3/MinIO for images
- **Monitoring**: Implement Prometheus/Grafana

## Security Checklist

- [ ] Change default passwords
- [ ] Use strong JWT secrets
- [ ] Enable HTTPS in production
- [ ] Configure firewall rules
- [ ] Regular security updates
- [ ] Monitor access logs
- [ ] Backup encryption
- [ ] Database access restrictions

## Support

### Getting Help
1. Check the troubleshooting section
2. Review application logs
3. Test with provided scripts
4. Create GitHub issue with:
   - Environment details
   - Error messages
   - Steps to reproduce

### Useful Commands
```bash
# Test setup
./scripts/test-setup.js

# Generate QR codes
./scripts/generate-qr-sheet.js

# Create backup
./scripts/backup.sh

# View all containers
docker ps -a

# Clean up Docker
docker system prune -a
```

---

**POSQ** - Production-ready restaurant management made simple. 🚀