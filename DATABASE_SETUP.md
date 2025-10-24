# Database Configuration Guide

This project supports **SQLite**, **MySQL**, and **PostgreSQL**. Here's how to switch between them:

---

## 🟢 Option 1: PostgreSQL (Recommended for Cloud/Replit)

PostgreSQL is ideal for production and cloud deployments. **Already configured on Replit!**

### Configuration

Update `server/.env`:

```env
# Change DB_TYPE to pg (or postgresql)
DB_TYPE=pg

# PostgreSQL connection (already set by Replit)
# These variables are automatically available:
# - DATABASE_URL
# - PGHOST
# - PGPORT
# - PGUSER
# - PGPASSWORD
# - PGDATABASE
```

Update `server/knexfile.js` to use Replit's PostgreSQL:

```javascript
development: {
  client: 'pg',
  connection: process.env.DATABASE_URL || {
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE
  },
  migrations: {
    directory: './src/migrations'
  },
  seeds: {
    directory: './src/seeds'
  }
}
```

### Run Migrations & Seeds

```bash
cd server
npm run migrate
npm run seed
```

---

## 🔵 Option 2: MySQL (For External MySQL Server)

If you have your own MySQL server (local or remote):

### 1. Install MySQL Driver (Already installed: mysql2)

```bash
cd server
npm install mysql2
```

### 2. Update Configuration

Edit `server/.env`:

```env
# Database Type
DB_TYPE=mysql2

# MySQL Connection Details
DB_HOST=your-mysql-host.com      # e.g., localhost, db.example.com
DB_PORT=3306                       # Default MySQL port
DB_USER=your_username              # e.g., root, posq_user
DB_PASSWORD=your_password          # Your MySQL password
DB_NAME=posq                       # Database name
```

### 3. Create MySQL Database

First, create a database in MySQL:

```sql
CREATE DATABASE posq CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'posq_user'@'%' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON posq.* TO 'posq_user'@'%';
FLUSH PRIVILEGES;
```

### 4. Run Migrations & Seeds

```bash
cd server
npm run migrate
npm run seed
```

---

## ⚪ Option 3: SQLite (Current - Development Only)

SQLite is already configured and works great for local development.

**No external database server needed!**

```env
DB_TYPE=sqlite3
SQLITE_PATH=./data/posq.db
```

---

## 🚀 Quick Setup Commands

### For PostgreSQL (Replit)
```bash
cd server

# Update .env file
echo "DB_TYPE=pg" >> .env

# Run migrations and seeds
npm run migrate
npm run seed

# Restart server
npm start
```

### For MySQL (External Server)
```bash
cd server

# Update .env with your MySQL credentials
nano .env

# Run migrations and seeds
npm run migrate
npm run seed

# Restart server
npm start
```

---

## 📊 Database Migration Commands

```bash
# Create a new migration
npm run migrate:make migration_name

# Run all pending migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback

# Run seeds
npm run seed
```

---

## 🔍 Connection Testing

To test your database connection:

```bash
cd server
node -e "require('./src/database/init').testConnection()"
```

---

## 📝 Environment Variables Reference

### PostgreSQL
- `DB_TYPE=pg` or `DB_TYPE=postgresql`
- `DATABASE_URL` (Replit provides this automatically)
- Or individual: `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`

### MySQL
- `DB_TYPE=mysql2`
- `DB_HOST` - MySQL server hostname
- `DB_PORT` - MySQL port (default: 3306)
- `DB_USER` - MySQL username
- `DB_PASSWORD` - MySQL password
- `DB_NAME` - Database name

### SQLite
- `DB_TYPE=sqlite3`
- `SQLITE_PATH` - Path to SQLite file (default: `./data/posq.db`)

---

## ⚠️ Important Notes

1. **Replit Users**: PostgreSQL is recommended and already set up for you!
2. **Production**: Never use SQLite in production - use PostgreSQL or MySQL
3. **Migrations**: Always run migrations after switching databases
4. **Backup**: Backup your data before switching database types
5. **Driver Installation**: 
   - PostgreSQL: `npm install pg`
   - MySQL: `npm install mysql2`
   - SQLite: `npm install sqlite3` (already included)

---

## 🎯 Recommended Database by Environment

| Environment | Recommended Database | Why? |
|------------|---------------------|------|
| **Development (Local)** | SQLite | Simple, no setup required |
| **Development (Replit)** | PostgreSQL | Free, managed, built-in |
| **Staging** | PostgreSQL or MySQL | Production-like environment |
| **Production** | PostgreSQL or MySQL | Scalable, reliable, concurrent |

---

## 🆘 Troubleshooting

### Connection Error
- Verify credentials in `.env`
- Check if database server is running
- Ensure database exists
- Check firewall/security settings

### Migration Error
- Delete all tables and re-run migrations
- Check migration files for syntax errors
- Ensure database user has CREATE/ALTER permissions

### Data Loss After Switch
- Different databases = different data
- Backup SQLite data before switching
- Re-run seeds to populate test data
