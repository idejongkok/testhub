#!/bin/bash

# Backup
cp src/pages/TestRunsPage.tsx src/pages/TestRunsPage.backup.tsx

# Add imports at top (after existing imports)
sed -i '10 a import TestRunExecutor from '\''@/components/TestRunExecutor'\''' src/pages/TestRunsPage.tsx
sed -i '11 a import { useNavigate } from '\''react-router-dom'\''' src/pages/TestRunsPage.tsx  
sed -i '12 a import { Edit2, Trash2, FileText } from '\''lucide-react'\''' src/pages/TestRunsPage.tsx

echo "TestRunsPage patched! Check src/pages/TestRunsPage.tsx"
echo "Backup saved to src/pages/TestRunsPage.backup.tsx"
echo ""
echo "MANUAL STEPS NEEDED:"
echo "1. Add 'const navigate = useNavigate()' after other useState declarations"
echo "2. Replace old execute modal with <TestRunExecutor .../>"
echo "3. Add handleEdit, handleDelete, handleViewReport functions"
echo "4. Add Report/Edit/Delete buttons in test run cards"
echo ""
echo "See UPDATE_INSTRUCTIONS.md for details"
