#!/bin/bash

# POSQ Database Restore Script
# Usage: ./scripts/restore.sh <backup_file>

BACKUP_FILE=$1
BACKUP_DIR="./backups"
DB_PATH="./server/data/posq.db"

if [ -z "$BACKUP_FILE" ]; then
    echo "❌ Please specify a backup file"
    echo "Usage: $0 <backup_file>"
    echo ""
    echo "Available backups:"
    ls -la "$BACKUP_DIR"/*.db 2>/dev/null | while read line; do
        echo "  $line"
    done
    exit 1
fi

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Check if backup file is in the backups directory
if [[ "$BACKUP_FILE" != "$BACKUP_DIR"/* ]]; then
    echo "⚠️  Warning: Backup file is not in the backups directory"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Restore cancelled"
        exit 1
    fi
fi

echo "🔄 Restoring database from: $BACKUP_FILE"

# Create backup of current database
if [ -f "$DB_PATH" ]; then
    CURRENT_BACKUP="$BACKUP_DIR/pre_restore_$(date +%Y%m%d_%H%M%S).db"
    echo "💾 Creating backup of current database: $CURRENT_BACKUP"
    cp "$DB_PATH" "$CURRENT_BACKUP"
fi

# Restore database
echo "📥 Restoring database..."
cp "$BACKUP_FILE" "$DB_PATH"

if [ $? -eq 0 ]; then
    echo "✅ Database restored successfully"
    
    # Get file size
    FILE_SIZE=$(du -h "$DB_PATH" | cut -f1)
    echo "📊 Restored database size: $FILE_SIZE"
    
    # Show backup info if available
    INFO_FILE="${BACKUP_FILE%.db}.info"
    if [ -f "$INFO_FILE" ]; then
        echo ""
        echo "📝 Backup information:"
        cat "$INFO_FILE"
    fi
    
    echo ""
    echo "🎉 Restore completed successfully"
    echo "💡 You may need to restart the application for changes to take effect"
    
else
    echo "❌ Restore failed"
    exit 1
fi