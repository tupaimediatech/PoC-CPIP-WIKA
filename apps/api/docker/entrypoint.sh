#!/bin/sh
set -e

echo "==> Setting up SQLite database..."
mkdir -p /var/www/html/storage/db
if [ ! -f /var/www/html/storage/db/database.sqlite ]; then
    touch /var/www/html/storage/db/database.sqlite
    chown www-data:www-data /var/www/html/storage/db/database.sqlite
    chmod 664 /var/www/html/storage/db/database.sqlite
fi

echo "==> Generating app key if needed..."
php artisan key:generate --force --no-interaction 2>/dev/null || true

echo "==> Running migrations..."
php artisan migrate --force

echo "==> Seeding database..."
php artisan db:seed --force 2>/dev/null || true

echo "==> Optimizing Laravel..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

echo "==> Starting services..."
exec "$@"
