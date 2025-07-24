#!/bin/bash

# Temporary fix for @/lib/utils import issues in Docker
# This script converts @/lib/utils imports to relative imports

echo "Converting @/lib/utils imports to relative imports..."

# Find all TypeScript/TSX files and replace the import
find src/components/ui -name "*.tsx" -type f -exec sed -i '' 's/import { cn } from "@\/lib\/utils"/import { cn } from "..\/..\/lib\/utils"/g' {} \;

echo "Import conversion complete!"
echo "Note: This is a temporary workaround. The proper fix is to resolve the Vite alias configuration."
