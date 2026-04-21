#!/bin/bash
set -e

echo "Running database migrations..."
alembic -c src/backend/alembic.ini upgrade head

echo "Starting application..."
exec "$@"
