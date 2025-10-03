#!/usr/bin/env bash
set -euo pipefail
if [ $# -lt 1 ]; then
  echo "Usage: restore.sh <backup-file>"
  exit 1
fi
ROOT_DIR="$(cd "$(dirname "$0")"/.. && pwd)"
DB_FILE="$ROOT_DIR/data/posq.sqlite"
SRC="$1"
cp "$SRC" "$DB_FILE"
echo "Restored $SRC to $DB_FILE"