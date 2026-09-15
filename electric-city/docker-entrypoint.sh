#!/bin/sh
set -e

# Idempotent — only applies migrations that haven't run yet against the
# database file in the mounted /app/data volume.
npx prisma migrate deploy

exec npm start
