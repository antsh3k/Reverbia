"""
Database connection configuration for Supabase
"""

import os
from typing import Optional
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()


class DatabaseConfig:
    """Database configuration settings"""
    
    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL", "")
        self.supabase_anon_key = os.getenv("SUPABASE_ANON_KEY", "")
        self.supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        self.database_url = os.getenv("DATABASE_URL", "")
    
    @property
    def is_configured(self) -> bool:
        """Check if database is properly configured"""
        return bool(self.supabase_url and self.supabase_anon_key)


# Global database configuration
db_config = DatabaseConfig()

# Global Supabase client (will be None if not configured)
supabase: Optional[Client] = None

if db_config.is_configured:
    try:
        supabase = create_client(db_config.supabase_url, db_config.supabase_anon_key)
    except Exception as e:
        print(f"Failed to initialize Supabase client: {e}")


def get_supabase_client() -> Optional[Client]:
    """Get the Supabase client instance"""
    return supabase


def get_admin_supabase_client() -> Optional[Client]:
    """Get Supabase client with service role key for admin operations"""
    if db_config.supabase_url and db_config.supabase_service_role_key:
        try:
            return create_client(
                db_config.supabase_url, 
                db_config.supabase_service_role_key
            )
        except Exception as e:
            print(f"Failed to initialize admin Supabase client: {e}")
    return None


async def test_database_connection() -> dict:
    """Test database connection and return status"""
    if not supabase:
        return {
            "status": "error",
            "message": "Supabase client not configured",
            "configured": db_config.is_configured
        }
    
    try:
        # Try a simple query to test connection
        result = supabase.table("users").select("count").limit(1).execute()
        return {
            "status": "success",
            "message": "Database connection successful",
            "configured": True
        }
    except Exception as e:
        return {
            "status": "error", 
            "message": f"Database connection failed: {str(e)}",
            "configured": True
        }


def check_required_tables() -> dict:
    """Check if required tables exist in the database"""
    if not supabase:
        return {"status": "error", "message": "Database not configured"}
    
    required_tables = [
        "users", "user_profiles", "meetings", 
        "transcripts", "documents", "document_templates"
    ]
    
    try:
        # Check each table by attempting a simple query
        existing_tables = []
        missing_tables = []
        
        for table in required_tables:
            try:
                supabase.table(table).select("count").limit(1).execute()
                existing_tables.append(table)
            except Exception:
                missing_tables.append(table)
        
        return {
            "status": "success" if not missing_tables else "warning",
            "existing_tables": existing_tables,
            "missing_tables": missing_tables,
            "message": f"Found {len(existing_tables)}/{len(required_tables)} required tables"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to check tables: {str(e)}"
        }