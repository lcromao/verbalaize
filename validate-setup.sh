#!/bin/bash

# Validation script for Verbalaize setup
# Checks if all required files exist and are properly configured

echo "🔍 Validating Verbalaize setup..."
echo ""

# Check required files
echo "📁 Checking required files..."
files_to_check=(
    "docker-compose.yml"
    "Dockerfile" 
    "app/main.py"
    "frontend/src/lib/utils.ts"
    "frontend/package.json"
    "frontend/Dockerfile"
    "requirements.txt"
)

missing_files=()
for file in "${files_to_check[@]}"; do
    if [[ -f "$file" ]]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (MISSING)"
        missing_files+=("$file")
    fi
done

echo ""

# Check utils.ts content
if [[ -f "frontend/src/lib/utils.ts" ]]; then
    if grep -q "cn.*inputs.*ClassValue" "frontend/src/lib/utils.ts"; then
        echo "✅ frontend/src/lib/utils.ts has correct content"
    else
        echo "❌ frontend/src/lib/utils.ts exists but content is incorrect"
        echo "   Expected: cn function with ClassValue inputs"
    fi
fi

echo ""

# Check Docker setup
echo "🐳 Checking Docker setup..."
if command -v docker &> /dev/null; then
    echo "  ✅ Docker is installed"
    if command -v docker-compose &> /dev/null; then
        echo "  ✅ Docker Compose is installed"
    else
        echo "  ❌ Docker Compose is NOT installed"
    fi
else
    echo "  ❌ Docker is NOT installed"
fi

echo ""

# Summary
if [[ ${#missing_files[@]} -eq 0 ]]; then
    echo "🎉 All files are present!"
    echo ""
    echo "📋 Next steps:"
    echo "  1. Run: ./build.sh"
    echo "  2. Run: docker-compose up"
    echo "  3. Access: http://localhost:3000"
else
    echo "⚠️  Missing files detected:"
    for file in "${missing_files[@]}"; do
        echo "    - $file"
    done
    echo ""
    echo "Please ensure all files are committed to the repository."
fi
