#!/bin/bash

# POSQ Database Backup Script
# This script creates backups of the database

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_TYPE=${DB_TYPE:-sqlite}
DB_PATH=${DB_PATH:-./data/posq.db}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Function to backup SQLite database
backup_sqlite() {
    print_status "Backing up SQLite database..."
    
    if [ ! -f "$DB_PATH" ]; then
        print_error "SQLite database not found at $DB_PATH"
        exit 1
    fi
    
    BACKUP_FILE="$BACKUP_DIR/posq_sqlite_$DATE.db"
    cp "$DB_PATH" "$BACKUP_FILE"
    
    # Compress the backup
    gzip "$BACKUP_FILE"
    
    print_success "SQLite backup created: ${BACKUP_FILE}.gz"
}

# Function to backup MySQL database
backup_mysql() {
    print_status "Backing up MySQL database..."
    
    BACKUP_FILE="$BACKUP_DIR/posq_mysql_$DATE.sql"
    
    mysqldump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --user="$DB_USER" \
        --password="$DB_PASSWORD" \
        --single-transaction \
        --routines \
        --triggers \
        "$DB_NAME" > "$BACKUP_FILE"
    
    # Compress the backup
    gzip "$BACKUP_FILE"
    
    print_success "MySQL backup created: ${BACKUP_FILE}.gz"
}

# Function to backup PostgreSQL database
backup_postgresql() {
    print_status "Backing up PostgreSQL database..."
    
    BACKUP_FILE="$BACKUP_DIR/posq_postgresql_$DATE.sql"
    
    PGPASSWORD="$DB_PASSWORD" pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --verbose \
        --clean \
        --no-owner \
        --no-privileges > "$BACKUP_FILE"
    
    # Compress the backup
    gzip "$BACKUP_FILE"
    
    print_success "PostgreSQL backup created: ${BACKUP_FILE}.gz"
}

# Function to cleanup old backups
cleanup_old_backups() {
    print_status "Cleaning up old backups (keeping last 7 days)..."
    
    find "$BACKUP_DIR" -name "*.gz" -type f -mtime +7 -delete
    
    print_success "Old backups cleaned up"
}

# Function to list backups
list_backups() {
    print_status "Available backups:"
    
    if [ -d "$BACKUP_DIR" ] && [ "$(ls -A "$BACKUP_DIR")" ]; then
        ls -lah "$BACKUP_DIR"/*.gz 2>/dev/null || echo "No backups found"
    else
        echo "No backups found"
    fi
}

# Main function
main() {
    echo "=========================================="
    echo "  POSQ Database Backup"
    echo "=========================================="
    echo ""
    
    case "$1" in
        "sqlite")
            backup_sqlite
            ;;
        "mysql")
            backup_mysql
            ;;
        "postgresql")
            backup_postgresql
            ;;
        "list")
            list_backups
            exit 0
            ;;
        "cleanup")
            cleanup_old_backups
            exit 0
            ;;
        *)
            # Auto-detect database type
            case "$DB_TYPE" in
                "sqlite"|"sqlite3")
                    backup_sqlite
                    ;;
                "mysql")
                    backup_mysql
                    ;;
                "postgresql"|"pg")
                    backup_postgresql
                    ;;
                *)
                    print_error "Unknown database type: $DB_TYPE"
                    echo "Usage: $0 [sqlite|mysql|postgresql|list|cleanup]"
                    exit 1
                    ;;
            esac
            ;;
    esac
    
    cleanup_old_backups
    
    echo ""
    echo "Backup completed successfully! 🎉"
}

# Run main function
main "$@"