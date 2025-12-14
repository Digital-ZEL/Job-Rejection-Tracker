#!/bin/bash

# Quick script to update CORS origins in .env file
# Usage: ./update-cors.sh https://yourdomain.com

if [ -z "$1" ]; then
    echo "Usage: ./update-cors.sh <your-production-domain>"
    echo "Example: ./update-cors.sh https://myapp.com"
    exit 1
fi

DOMAIN=$1

# Update .env file
if [ -f ".env" ]; then
    # Backup original
    cp .env .env.backup
    
    # Update CORS_ORIGINS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|CORS_ORIGINS=.*|CORS_ORIGINS=$DOMAIN|" .env
    else
        # Linux
        sed -i "s|CORS_ORIGINS=.*|CORS_ORIGINS=$DOMAIN|" .env
    fi
    
    echo "✅ Updated CORS_ORIGINS to: $DOMAIN"
    echo "📝 Backup saved to: .env.backup"
else
    echo "❌ Error: .env file not found"
    exit 1
fi
