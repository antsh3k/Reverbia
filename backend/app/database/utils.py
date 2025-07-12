"""
Database utility functions
"""

import os
from typing import List, Dict, Any, Optional
from pathlib import Path
from .connection import get_admin_supabase_client


def load_sql_file(file_path: str) -> str:
    """Load SQL content from file"""
    try:
        with open(file_path, 'r') as f:
            return f.read()
    except FileNotFoundError:
        raise FileNotFoundError(f"SQL file not found: {file_path}")


def get_migration_files() -> List[str]:
    """Get list of migration files in order"""
    migrations_dir = Path(__file__).parent / "migrations"
    if not migrations_dir.exists():
        return []
    
    migration_files = []
    for file_path in sorted(migrations_dir.glob("*.sql")):
        migration_files.append(str(file_path))
    
    return migration_files


async def run_migration(file_path: str) -> Dict[str, Any]:
    """Run a single migration file"""
    supabase = get_admin_supabase_client()
    if not supabase:
        return {
            "status": "error",
            "message": "Admin Supabase client not available"
        }
    
    try:
        sql_content = load_sql_file(file_path)
        
        # Note: Supabase Python client doesn't directly support raw SQL execution
        # In a real implementation, you would use a PostgreSQL driver like asyncpg
        # or use Supabase's REST API for database operations
        
        # For now, we'll return a placeholder response
        return {
            "status": "info",
            "message": f"Migration file loaded: {os.path.basename(file_path)}",
            "note": "SQL execution requires direct PostgreSQL connection or Supabase dashboard"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to run migration {file_path}: {str(e)}"
        }


async def run_all_migrations() -> List[Dict[str, Any]]:
    """Run all pending migrations"""
    migration_files = get_migration_files()
    results = []
    
    for file_path in migration_files:
        result = await run_migration(file_path)
        results.append({
            "file": os.path.basename(file_path),
            **result
        })
    
    return results


def create_seed_data() -> Dict[str, Any]:
    """Create initial seed data for development"""
    seed_data = {
        "document_templates": [
            {
                "name": "Statement of Work (SOW)",
                "description": "Professional SOW template for client projects",
                "template_type": "sow",
                "template_content": """
# Statement of Work

## Project Overview
**Project Name:** {{project_name}}
**Client:** {{client_name}}
**Date:** {{project_date}}

## Scope of Work
{{project_scope}}

## Timeline
**Start Date:** {{start_date}}
**End Date:** {{end_date}}
**Duration:** {{duration}}

## Deliverables
{{deliverables}}

## Budget
**Total Cost:** {{total_cost}}
**Payment Terms:** {{payment_terms}}

## Terms and Conditions
{{terms_conditions}}
                """,
                "variables": [
                    "project_name", "client_name", "project_date",
                    "project_scope", "start_date", "end_date", 
                    "duration", "deliverables", "total_cost", 
                    "payment_terms", "terms_conditions"
                ],
                "format": "pdf",
                "is_public": True
            },
            {
                "name": "Meeting Summary",
                "description": "Standard meeting summary template",
                "template_type": "summary",
                "template_content": """
# Meeting Summary

**Date:** {{meeting_date}}
**Duration:** {{meeting_duration}}
**Participants:** {{participants}}

## Key Discussion Points
{{key_points}}

## Decisions Made
{{decisions}}

## Action Items
{{action_items}}

## Next Steps
{{next_steps}}
                """,
                "variables": [
                    "meeting_date", "meeting_duration", "participants",
                    "key_points", "decisions", "action_items", "next_steps"
                ],
                "format": "pdf",
                "is_public": True
            },
            {
                "name": "Technical Specification",
                "description": "Technical specification document template",
                "template_type": "technical_spec",
                "template_content": """
# Technical Specification

## Project Overview
{{project_overview}}

## Requirements
### Functional Requirements
{{functional_requirements}}

### Non-Functional Requirements
{{non_functional_requirements}}

## Architecture
{{architecture_description}}

## Dependencies
{{dependencies}}

## Implementation Plan
{{implementation_plan}}

## Testing Strategy
{{testing_strategy}}
                """,
                "variables": [
                    "project_overview", "functional_requirements",
                    "non_functional_requirements", "architecture_description",
                    "dependencies", "implementation_plan", "testing_strategy"
                ],
                "format": "pdf",
                "is_public": True
            }
        ]
    }
    
    return seed_data


async def initialize_database() -> Dict[str, Any]:
    """Initialize database with schema and seed data"""
    results = {
        "migrations": [],
        "seed_data": None,
        "status": "success"
    }
    
    try:
        # Run migrations
        migration_results = await run_all_migrations()
        results["migrations"] = migration_results
        
        # Create seed data
        seed_data = create_seed_data()
        results["seed_data"] = {
            "status": "prepared",
            "templates_count": len(seed_data["document_templates"])
        }
        
    except Exception as e:
        results["status"] = "error"
        results["error"] = str(e)
    
    return results