#!/bin/bash

# Build script for Render deployment
echo "🚀 Starting build process..."

# Set Django settings module for production
export DJANGO_SETTINGS_MODULE=mini_drive_backend.production_settings

echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

echo "🔄 Running Django migrations..."
python manage.py migrate --noinput

echo "📁 Collecting static files..."
python manage.py collectstatic --noinput

echo "✅ Build completed successfully!"

echo "�️ Running database migrations..."
python manage.py migrate

echo "�🗂️ Collecting static files..."
python manage.py collectstatic --noinput

echo "✅ Build completed successfully!"

echo "🗄️ Running database migrations..."
python manage.py migrate

echo "✅ Build completed successfully!"