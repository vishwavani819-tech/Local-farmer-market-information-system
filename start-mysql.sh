#!/usr/bin/env bash
# Starts the portable MySQL 8 server bundled in .tools (development only).
# Data directory: .tools/mysql-data   Port: 3307   User: root (no password)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MYSQL_HOME="$ROOT/.tools/mysql-8.0.40-winx64"
DATA_DIR="$ROOT/.tools/mysql-data"

if [ ! -x "$MYSQL_HOME/bin/mysqld.exe" ]; then
  echo "MySQL not found at $MYSQL_HOME"
  echo "Install MySQL 8 locally instead, then set DB_URL (see README)."
  exit 1
fi

if "$MYSQL_HOME/bin/mysqladmin.exe" -u root -h 127.0.0.1 -P 3307 ping >/dev/null 2>&1; then
  echo "MySQL is already running on port 3307."
  exit 0
fi

echo "Starting MySQL on port 3307…"
"$MYSQL_HOME/bin/mysqld.exe" \
  --basedir="$(cygpath -w "$MYSQL_HOME")" \
  --datadir="$(cygpath -w "$DATA_DIR")" \
  --port=3307 --mysqlx=OFF &
sleep 6

if "$MYSQL_HOME/bin/mysqladmin.exe" -u root -h 127.0.0.1 -P 3307 ping >/dev/null 2>&1; then
  echo "MySQL is ready."
else
  echo "MySQL did not start. Check the logs in $DATA_DIR"
  exit 1
fi
