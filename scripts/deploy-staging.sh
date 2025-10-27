#!/bin/bash

# TFT Match - Staging Deployment Script
# This script deploys the application to Vercel staging environment

set -e  # Exit on any error

echo "🚀 Starting TFT Match Staging Deployment..."

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

echo "📋 Pre-deployment checks..."

# Run tests
echo "🧪 Running tests..."
npm test -- --passWithNoTests

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

# Build the application
echo "🏗️ Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Deployment aborted."
    exit 1
fi

echo "✅ Pre-deployment checks passed!"

# Deploy to staging
echo "🚀 Deploying to Vercel staging..."
vercel --env=staging --target=preview

if [ $? -eq 0 ]; then
    echo "✅ Staging deployment successful!"
    echo "🌐 Staging URL: https://tft-match-staging.vercel.app"
    echo "📊 Monitor deployment at: https://vercel.com/dashboard"
else
    echo "❌ Staging deployment failed!"
    exit 1
fi

echo "🎉 Staging deployment completed successfully!"
echo ""
echo "Next steps:"
echo "1. Test the staging environment thoroughly"
echo "2. Run integration tests against staging"
echo "3. If everything looks good, deploy to production with: npm run deploy:prod"
