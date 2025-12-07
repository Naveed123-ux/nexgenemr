#!/bin/bash

# Script to delete all test files and markdown files
# This will remove:
# - All .md files
# - All test_*.py files
# - All test_*.sh files
# - All *test*.js files

echo "Starting cleanup of test and markdown files..."
echo ""

# Find and delete all .md files
echo "Deleting markdown files..."
find . -type f -name "*.md" -not -path "*/node_modules/*" -not -path "*/.venv/*" -not -path "*/.git/*" | while read file; do
    echo "  Deleting: $file"
    rm "$file"
done

# Find and delete all test_*.py files
echo ""
echo "Deleting Python test files..."
find . -type f -name "test_*.py" -not -path "*/node_modules/*" -not -path "*/.venv/*" -not -path "*/.git/*" | while read file; do
    echo "  Deleting: $file"
    rm "$file"
done

# Find and delete all test_*.sh files
echo ""
echo "Deleting shell test files..."
find . -type f -name "test_*.sh" -not -path "*/node_modules/*" -not -path "*/.venv/*" -not -path "*/.git/*" | while read file; do
    echo "  Deleting: $file"
    rm "$file"
done

# Find and delete all *test*.js files
echo ""
echo "Deleting JavaScript test files..."
find . -type f -name "*test*.js" -not -path "*/node_modules/*" -not -path "*/.venv/*" -not -path "*/.git/*" | while read file; do
    echo "  Deleting: $file"
    rm "$file"
done

# Find and delete test directories
echo ""
echo "Deleting test directories..."
find . -type d -name "tests" -not -path "*/node_modules/*" -not -path "*/.venv/*" -not -path "*/.git/*" | while read dir; do
    echo "  Deleting directory: $dir"
    rm -rf "$dir"
done

find . -type d -name "__tests__" -not -path "*/node_modules/*" -not -path "*/.venv/*" -not -path "*/.git/*" | while read dir; do
    echo "  Deleting directory: $dir"
    rm -rf "$dir"
done

echo ""
echo "Cleanup complete!"
