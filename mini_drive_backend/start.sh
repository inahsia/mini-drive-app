#!/bin/bash

# Start script for Render deployment
export DJANGO_SETTINGS_MODULE=mini_drive_backend.production_settings

echo "🚀 Starting Mini Drive API..."
exec gunicorn mini_drive_backend.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120