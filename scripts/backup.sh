#!/bin/bash

# POSQ Database Backup Script
# Usage: ./scripts/backup.sh [backup_name]

BACKUP_NAME=${1:-"backup_$(date +%Y%m%d_%H%M%S)"}
BACKUP_DIR="./backups"
DB_PATH="./server/data/posq.db"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "🔄 Creating database backup: $BACKUP_NAME"

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo "❌ Database file not found: $DB_PATH"
    exit 1
fi

# Create backup
BACKUP_FILE="$BACKUP_DIR/${BACKUP_NAME}.db"
cp "$DB_PATH" "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Backup created successfully: $BACKUP_FILE"
    
    # Get file size
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "📊 Backup size: $FILE_SIZE"
    
    # Create backup info file
    INFO_FILE="$BACKUP_DIR/${BACKUP_NAME}.info"
    cat > "$INFO_FILE" << EOF
Backup Information
=================
Name: $BACKUP_NAME
Date: $(date)
Database: $DB_PATH
Backup File: $BACKUP_FILE
Size: $FILE_SIZE
Created by: $(whoami)
Host: $(hostname)
EOF
    
    echo "📝 Backup info saved: $INFO_FILE"
    
    # Clean up old backups
    echo "🧹 Cleaning up old backups (older than $RETENTION_DAYS days)..."
    find "$BACKUP_DIR" -name "*.db" -type f -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "*.info" -type f -mtime +$RETENTION_DAYS -delete
    
    echo "✅ Backup process completed"
    
else
    echo "❌ Backup failed"
    exit 1
fi

# List all backups
echo ""
echo "📋 Available backups:"
ls -la "$BACKUP_DIR"/*.db 2>/dev/null | while read line; do
    echo "  $line"
done