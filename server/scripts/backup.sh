#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")"/.. && pwd)"
DB_FILE="$ROOT_DIR/data/posq.sqlite"
BACKUP_DIR="$ROOT_DIR/backups"
mkdir -p "$BACKUP_DIR"
TS="$(date +%Y%m%d_%H%M%S)"
cp "$DB_FILE" "$BACKUP_DIR/posq_$TS.sqlite"
echo "Backup created at $BACKUP_DIR/posq_$TS.sqlite"