"""
Unit tests for database utilities and connection
"""

import pytest
from unittest.mock import patch, MagicMock
from app.database.connection import DatabaseConfig, test_database_connection as db_test_connection, check_required_tables
from app.database.utils import load_sql_file, get_migration_files, create_seed_data


class TestDatabaseConfig:
    """Test database configuration"""
    
    def test_database_config_initialization(self):
        """Test database config initialization"""
        config = DatabaseConfig()
        # Should initialize without error even with missing env vars
        assert hasattr(config, 'supabase_url')
        assert hasattr(config, 'supabase_anon_key')
        assert hasattr(config, 'supabase_service_role_key')
        assert hasattr(config, 'database_url')
    
    @patch.dict('os.environ', {
        'SUPABASE_URL': 'https://test.supabase.co',
        'SUPABASE_ANON_KEY': 'test_anon_key'
    })
    def test_database_config_configured(self):
        """Test database config when properly configured"""
        config = DatabaseConfig()
        assert config.is_configured is True
        assert config.supabase_url == 'https://test.supabase.co'
        assert config.supabase_anon_key == 'test_anon_key'
    
    def test_database_config_not_configured(self):
        """Test database config when not configured"""
        with patch.dict('os.environ', {}, clear=True):
            config = DatabaseConfig()
            assert config.is_configured is False


class TestDatabaseConnection:
    """Test database connection functions"""
    
    @pytest.mark.asyncio
    async def test_database_connection_not_configured(self):
        """Test database connection when not configured"""
        with patch('app.database.connection.supabase', None):
            result = await db_test_connection()
            assert result["status"] == "error"
            assert "not configured" in result["message"]
    
    @pytest.mark.asyncio
    async def test_database_connection_success(self):
        """Test successful database connection"""
        mock_supabase = MagicMock()
        mock_supabase.table.return_value.select.return_value.limit.return_value.execute.return_value = {}
        
        with patch('app.database.connection.supabase', mock_supabase):
            result = await db_test_connection()
            assert result["status"] == "success"
            assert result["configured"] is True
    
    @pytest.mark.asyncio
    async def test_database_connection_failure(self):
        """Test database connection failure"""
        mock_supabase = MagicMock()
        mock_supabase.table.return_value.select.return_value.limit.return_value.execute.side_effect = Exception("Connection failed")
        
        with patch('app.database.connection.supabase', mock_supabase):
            result = await db_test_connection()
            assert result["status"] == "error"
            assert "Connection failed" in result["message"]
    
    def test_check_required_tables_not_configured(self):
        """Test checking tables when database not configured"""
        with patch('app.database.connection.supabase', None):
            result = check_required_tables()
            assert result["status"] == "error"
            assert "not configured" in result["message"]
    
    def test_check_required_tables_success(self):
        """Test checking required tables successfully"""
        mock_supabase = MagicMock()
        mock_supabase.table.return_value.select.return_value.limit.return_value.execute.return_value = {}
        
        with patch('app.database.connection.supabase', mock_supabase):
            result = check_required_tables()
            assert result["status"] == "success"
            assert len(result["existing_tables"]) == 6  # All required tables
            assert len(result["missing_tables"]) == 0


class TestDatabaseUtils:
    """Test database utility functions"""
    
    def test_load_sql_file_not_found(self):
        """Test loading non-existent SQL file"""
        with pytest.raises(FileNotFoundError):
            load_sql_file("non_existent_file.sql")
    
    def test_get_migration_files(self):
        """Test getting migration files"""
        # This test will work if migration files exist
        migration_files = get_migration_files()
        assert isinstance(migration_files, list)
        # Should find at least our initial migration
        if migration_files:
            assert any("001_initial_schema.sql" in f for f in migration_files)
    
    def test_create_seed_data(self):
        """Test seed data creation"""
        seed_data = create_seed_data()
        assert "document_templates" in seed_data
        assert isinstance(seed_data["document_templates"], list)
        assert len(seed_data["document_templates"]) >= 3
        
        # Check SOW template
        sow_template = next(
            (t for t in seed_data["document_templates"] if t["template_type"] == "sow"), 
            None
        )
        assert sow_template is not None
        assert sow_template["name"] == "Statement of Work (SOW)"
        assert sow_template["is_public"] is True
        assert "project_name" in sow_template["variables"]
    
    def test_seed_data_template_structure(self):
        """Test seed data template structure"""
        seed_data = create_seed_data()
        for template in seed_data["document_templates"]:
            assert "name" in template
            assert "template_type" in template
            assert "template_content" in template
            assert "variables" in template
            assert isinstance(template["variables"], list)
            assert "format" in template
            assert "is_public" in template