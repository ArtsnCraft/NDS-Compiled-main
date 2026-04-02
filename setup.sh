#!/bin/bash

echo "🚀 Setting up Gallery CMS..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create environment file if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local file..."
    cp env.example .env.local
    echo "⚠️  Please edit .env.local and add your Supabase credentials"
fi

# Create public directory for media files
if [ ! -d public/created ]; then
    echo "📁 Creating public/created directory..."
    mkdir -p public/created
fi

# Copy existing media files to public directory
if [ -d created ]; then
    echo "📸 Copying existing media files..."
    cp -r created/* public/created/ 2>/dev/null || true
fi

# Copy galleryData.json to public directory
if [ -f galleryData.json ]; then
    echo "📊 Copying gallery data..."
    cp galleryData.json public/
fi

echo ""
echo "🎉 Setup completed!"
echo ""
echo "Next steps:"
echo "1. Edit .env.local and add your Supabase credentials"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "For deployment instructions, see README.md" 