#!/bin/bash

# TFT Match - Production Deployment Script
# This script deploys the application to Vercel production environment

set -e  # Exit on any error

echo "🚀 Starting TFT Match Production Deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Error: Vercel CLI is not installed. Please install it with: npm i -g vercel"
    exit 1
fi

# Check if user is logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo "❌ Error: Not logged in to Vercel. Please run: vercel login"
    exit 1
fi

# Confirmation prompt
echo "⚠️  WARNING: This will deploy to PRODUCTION!"
echo "📋 Please ensure you have:"
echo "   - Tested thoroughly on staging"
echo "   - Updated all environment variables"
echo "   - Reviewed all recent changes"
echo "   - Created a backup of the current production database"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "❌ Deployment cancelled."
    exit 1
fi

echo "📋 Pre-deployment checks..."

# Run full test suite
echo "🧪 Running full test suite..."
npm test -- --coverage --passWithNoTests

if [ $? -ne 0 ]; then
    echo "❌ Tests failed. Deployment aborted."
    exit 1
fi

# Run linting
echo "🔍 Running ESLint..."
npm run lint

if [ $? -ne 0 ]; then
    echo "❌ Linting failed. Deployment aborted."
    exit 1
fi

# Run type checking
echo "🔍 Running TypeScript type checking..."
npm run type-check

if [ $? -ne 0 ]; then
    echo "❌ Type checking failed. Deployment aborted."
    exit 1
fi

# Build the application
echo "🏗️ Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Deployment aborted."
    exit 1
fi

echo "✅ Pre-deployment checks passed!"

# Create deployment backup
echo "💾 Creating deployment backup..."
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r .next "$BACKUP_DIR/" 2>/dev/null || true
echo "📁 Backup created at: $BACKUP_DIR"

# Deploy to production
echo "🚀 Deploying to Vercel production..."
vercel --prod

if [ $? -eq 0 ]; then
    echo "✅ Production deployment successful!"
    echo "🌐 Production URL: https://tftmatch.com"
    echo "📊 Monitor deployment at: https://vercel.com/dashboard"
    
    # Run post-deployment health check
    echo "🏥 Running post-deployment health check..."
    sleep 30  # Wait for deployment to stabilize
    
    HEALTH_CHECK_URL="https://tftmatch.com/api/monitoring?endpoint=health"
    HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_CHECK_URL")
    
    if [ "$HEALTH_RESPONSE" = "200" ]; then
        echo "✅ Health check passed!"
    else
        echo "⚠️  Health check failed (HTTP $HEALTH_RESPONSE)"
        echo "🔍 Please check the application manually"
    fi
    
else
    echo "❌ Production deployment failed!"
    echo "🔄 Consider rolling back to previous version"
    exit 1
fi

echo "🎉 Production deployment completed successfully!"
echo ""
echo "Post-deployment checklist:"
echo "1. ✅ Verify all features work correctly"
echo "2. ✅ Test payment flows"
echo "3. ✅ Check monitoring and logging"
echo "4. ✅ Verify rate limiting is active"
echo "5. ✅ Test error handling"
echo "6. ✅ Monitor performance metrics"
echo ""
echo "🔗 Useful links:"
echo "   - Production: https://tftmatch.com"
echo "   - Monitoring: https://vercel.com/dashboard"
echo "   - Analytics: Check your analytics dashboard"
