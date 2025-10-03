#!/bin/bash

# POSQ Database Restore Script
# This script restores database from backups

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

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Configuration
BACKUP_DIR="./backups"
DB_TYPE=${DB_TYPE:-sqlite}
DB_PATH=${DB_PATH:-./data/posq.db}

# Function to list available backups
list_backups() {
    print_status "Available backups:"
    
    if [ -d "$BACKUP_DIR" ] && [ "$(ls -A "$BACKUP_DIR")" ]; then
        echo ""
        echo "SQLite backups:"
        ls -lah "$BACKUP_DIR"/*sqlite*.gz 2>/dev/null || echo "  No SQLite backups found"
        
        echo ""
        echo "MySQL backups:"
        ls -lah "$BACKUP_DIR"/*mysql*.gz 2>/dev/null || echo "  No MySQL backups found"
        
        echo ""
        echo "PostgreSQL backups:"
        ls -lah "$BACKUP_DIR"/*postgresql*.gz 2>/dev/null || echo "  No PostgreSQL backups found"
    else
        echo "No backups found in $BACKUP_DIR"
    fi
}

# Function to restore SQLite database
restore_sqlite() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        print_error "Backup file not specified"
        echo "Usage: $0 sqlite <backup_file>"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        print_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    print_warning "This will replace the current database!"
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Restore cancelled"
        exit 0
    fi
    
    print_status "Restoring SQLite database from $backup_file..."
    
    # Create backup of current database
    if [ -f "$DB_PATH" ]; then
        cp "$DB_PATH" "${DB_PATH}.backup.$(date +%Y%m%d_%H%M%S)"
        print_status "Current database backed up"
    fi
    
    # Restore from backup
    if [[ "$backup_file" == *.gz ]]; then
        gunzip -c "$backup_file" > "$DB_PATH"
    else
        cp "$backup_file" "$DB_PATH"
    fi
    
    print_success "SQLite database restored successfully"
}

# Function to restore MySQL database
restore_mysql() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        print_error "Backup file not specified"
        echo "Usage: $0 mysql <backup_file>"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        print_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    print_warning "This will replace the current database!"
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Restore cancelled"
        exit 0
    fi
    
    print_status "Restoring MySQL database from $backup_file..."
    
    # Restore from backup
    if [[ "$backup_file" == *.gz ]]; then
        gunzip -c "$backup_file" | mysql \
            --host="$DB_HOST" \
            --port="$DB_PORT" \
            --user="$DB_USER" \
            --password="$DB_PASSWORD" \
            "$DB_NAME"
    else
        mysql \
            --host="$DB_HOST" \
            --port="$DB_PORT" \
            --user="$DB_USER" \
            --password="$DB_PASSWORD" \
            "$DB_NAME" < "$backup_file"
    fi
    
    print_success "MySQL database restored successfully"
}

# Function to restore PostgreSQL database
restore_postgresql() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        print_error "Backup file not specified"
        echo "Usage: $0 postgresql <backup_file>"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        print_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    print_warning "This will replace the current database!"
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Restore cancelled"
        exit 0
    fi
    
    print_status "Restoring PostgreSQL database from $backup_file..."
    
    # Restore from backup
    if [[ "$backup_file" == *.gz ]]; then
        gunzip -c "$backup_file" | PGPASSWORD="$DB_PASSWORD" psql \
            --host="$DB_HOST" \
            --port="$DB_PORT" \
            --username="$DB_USER" \
            --dbname="$DB_NAME"
    else
        PGPASSWORD="$DB_PASSWORD" psql \
            --host="$DB_HOST" \
            --port="$DB_PORT" \
            --username="$DB_USER" \
            --dbname="$DB_NAME" \
            < "$backup_file"
    fi
    
    print_success "PostgreSQL database restored successfully"
}

# Function to show help
show_help() {
    echo "POSQ Database Restore Script"
    echo ""
    echo "Usage:"
    echo "  $0 list                                    # List available backups"
    echo "  $0 sqlite <backup_file>                   # Restore SQLite database"
    echo "  $0 mysql <backup_file>                     # Restore MySQL database"
    echo "  $0 postgresql <backup_file>                # Restore PostgreSQL database"
    echo ""
    echo "Examples:"
    echo "  $0 list"
    echo "  $0 sqlite backups/posq_sqlite_20240101_120000.db.gz"
    echo "  $0 mysql backups/posq_mysql_20240101_120000.sql.gz"
    echo "  $0 postgresql backups/posq_postgresql_20240101_120000.sql.gz"
    echo ""
    echo "Environment Variables:"
    echo "  DB_TYPE     - Database type (sqlite, mysql, postgresql)"
    echo "  DB_PATH     - SQLite database path"
    echo "  DB_HOST     - Database host"
    echo "  DB_PORT     - Database port"
    echo "  DB_NAME     - Database name"
    echo "  DB_USER     - Database user"
    echo "  DB_PASSWORD - Database password"
}

# Main function
main() {
    echo "=========================================="
    echo "  POSQ Database Restore"
    echo "=========================================="
    echo ""
    
    case "$1" in
        "list")
            list_backups
            ;;
        "sqlite")
            restore_sqlite "$2"
            ;;
        "mysql")
            restore_mysql "$2"
            ;;
        "postgresql")
            restore_postgresql "$2"
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            print_error "Invalid command: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
    
    echo ""
    echo "Restore completed successfully! 🎉"
}

# Run main function
main "$@"