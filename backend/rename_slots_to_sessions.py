#!/usr/bin/env python3
"""
Script to rename all occurrences of 'slot' to 'session' in the codebase.
Run this from the backend directory: python rename_slots_to_sessions.py
"""

import os
import re
from pathlib import Path

# Mapping of old names to new names (exact replacements)
EXACT_REPLACEMENTS = {
    # Classes
    'AppointmentSlot': 'AppointmentSession',
    'SlotRecurrencePattern': 'SessionRecurrencePattern',
    'SlotType': 'SessionType',
    'SlotStatus': 'SessionStatus',
    'SlotManagementService': 'SessionManagementService',
    'SlotRecurrenceService': 'SessionRecurrenceService',
    
    # Pydantic Models
    'SimpleSlotCreate': 'SimpleSessionCreate',
    'AdvancedSlotCreate': 'AdvancedSessionCreate',
    'UnifiedSlotCreate': 'UnifiedSessionCreate',
    'SlotRecurrencePatternCreate': 'SessionRecurrencePatternCreate',
    'SlotRecurrencePatternResponse': 'SessionRecurrencePatternResponse',
    'SlotResponse': 'SessionResponse',
    
    # Fields and variables
    'slot_type': 'session_type',
    'simple_slot': 'simple_session',
    'advanced_slot': 'advanced_session',
    'appointment_slot_id': 'appointment_session_id',
    'parent_slot_id': 'parent_session_id',
    'parent_slot': 'parent_session',
    'child_slots': 'child_sessions',
    'slot_info': 'session_info',
    'slot_data': 'session_data',
    'slot_count': 'session_count',
    'slots_count': 'sessions_count',
    'slots_generated_count': 'sessions_generated_count',
    'get_pattern_slots': 'get_pattern_sessions',
    'delete_pattern_and_slots': 'delete_pattern_and_sessions',
    'get_slots_by_pattern': 'get_sessions_by_pattern',
    '_generate_weekly_slots_for_pattern': '_generate_weekly_sessions_for_pattern',
    
    # Tables
    'appointment_slots': 'appointment_sessions',
    'slot_recurrence_patterns': 'session_recurrence_patterns',
    
    # Imports and module names
    'appointment_slot_model': 'appointment_session_model',
    'slot_management_service': 'session_management_service',
    'slot_recurrence_service': 'session_recurrence_service',
    'slot_management_routes': 'session_management_routes',
    'appointment_slot_routes': 'appointment_session_routes',
    'appointment_slot_router': 'appointment_session_router',
    'slot_management_router': 'session_management_router',
    
    # Router tags
    '"Slot Management"': '"Session Management"',
    '"Appointment Slots"': '"Appointment Sessions"',
    
    # URL paths
    '"/slots/': '"/sessions/',
    '"/appointment-slots/': '"/appointment-sessions/',
}

def replace_in_file(file_path):
    """Replace all occurrences in a single file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Do exact replacements first
        for old, new in EXACT_REPLACEMENTS.items():
            content = content.replace(old, new)
        
        # Only write if content changed
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Updated: {file_path}")
            return True
        return False
    except Exception as e:
        print(f"❌ Error processing {file_path}: {e}")
        return False

def rename_files():
    """Rename service and route files"""
    renames = [
        ('services/slot_management_service.py', 'services/session_management_service.py'),
        ('services/slot_recurrence_service.py', 'services/session_recurrence_service.py'),
        ('routes/slot_management_routes.py', 'routes/session_management_routes.py'),
        ('routes/appointment_slot_routes.py', 'routes/appointment_session_routes.py'),
    ]
    
    for old_path, new_path in renames:
        old_file = Path(old_path)
        new_file = Path(new_path)
        
        if old_file.exists():
            old_file.rename(new_file)
            print(f"📝 Renamed: {old_path} → {new_path}")
        else:
            print(f"⚠️  File not found: {old_path}")

def main():
    """Main function to process all files"""
    print("🔄 Starting slot → session migration...\n")
    
    backend_dir = Path('.')
    
    # File patterns to process
    patterns = ['**/*.py', '**/*.md']
    
    # Directories to exclude
    exclude_dirs = {'__pycache__', '.git', 'venv', 'env', 'node_modules', 'alembic/versions'}
    
    updated_count = 0
    
    print("📝 Updating file contents...\n")
    for pattern in patterns:
        for file_path in backend_dir.glob(pattern):
            # Skip excluded directories
            if any(excluded in file_path.parts for excluded in exclude_dirs):
                continue
            
            # Skip this script itself
            if file_path.name == 'rename_slots_to_sessions.py':
                continue
            
            if replace_in_file(file_path):
                updated_count += 1
    
    print(f"\n✅ Updated {updated_count} files\n")
    
    print("📝 Renaming files...\n")
    rename_files()
    
    print("\n" + "="*60)
    print("✅ Migration complete!")
    print("="*60)
    print("\n⚠️  IMPORTANT: Next steps:\n")
    print("1. Create database migration:")
    print("   alembic revision -m 'Rename slots to sessions'")
    print("   Then edit the migration file with the SQL changes")
    print("")
    print("2. Update main.py imports manually")
    print("")
    print("3. Test all endpoints:")
    print("   - POST /sessions/")
    print("   - GET /sessions/patterns")
    print("   - GET /sessions/available")
    print("   - POST /appointments/book")
    print("")
    print("4. Update frontend to use new API endpoints and field names")
    print("")
    print("5. Run tests: pytest")
    print("")
    print("⚠️  This is a BREAKING CHANGE - coordinate with frontend team!")
    print("")

if __name__ == '__main__':
    main()
