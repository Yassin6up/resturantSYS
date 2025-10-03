#!/bin/bash

# POSQ Backup Script
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_PATH="./data/posq.db"

echo "🔄 Starting POSQ backup..."

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo "❌ Database file not found at $DB_PATH"
    exit 1
fi

# Create backup filename
BACKUP_FILE="$BACKUP_DIR/posq_backup_$TIMESTAMP.db"

# Copy database file
cp "$DB_PATH" "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Database backup created: $BACKUP_FILE"
    
    # Compress backup
    gzip "$BACKUP_FILE"
    echo "✅ Backup compressed: $BACKUP_FILE.gz"
    
    # Clean up old backups (keep last 30 days)
    find "$BACKUP_DIR" -name "posq_backup_*.db.gz" -mtime +30 -delete
    echo "🧹 Old backups cleaned up"
    
    echo "🎉 Backup completed successfully!"
else
    echo "❌ Backup failed!"
    exit 1
fi