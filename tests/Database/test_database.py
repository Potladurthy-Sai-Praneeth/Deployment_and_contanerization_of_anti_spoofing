import pytest
import tempfile
import shutil
import os
import sys
from unittest.mock import Mock, patch
import asyncio
import numpy as np

# Add Database module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'Database'))

from database import Database

class TestDatabase:
    """Unit tests for Database class"""
    
    @pytest.fixture
    def temp_db_path(self):
        """Create a temporary directory for testing"""
        temp_dir = tempfile.mkdtemp()
        yield temp_dir
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def database(self, temp_db_path):
        """Create a database instance for testing"""
        return Database(db_path=temp_db_path)
    
    def test_database_initialization(self, temp_db_path):
        """Test database initialization"""
        db = Database(db_path=temp_db_path)
        assert db.client is not None
        assert db.collection_name == "RegisteredUsers"
        assert db.collection is not None
    
    def test_database_initialization_creates_directory(self):
        """Test that database initialization creates directory if it doesn't exist"""
        with tempfile.TemporaryDirectory() as temp_dir:
            non_existent_path = os.path.join(temp_dir, "new_db_folder")
            assert not os.path.exists(non_existent_path)
            
            db = Database(db_path=non_existent_path)
            assert os.path.exists(non_existent_path)
            assert db.client is not None
    
    @pytest.mark.asyncio
    async def test_insert(self, database):
        """Test adding user embedding"""
        user_name = "test_user"
        embedding = [0.1] * 128  # Mock 128-dimensional embedding
        
        result = await database.insert(user_name, embedding)
        assert result is True
    
    @pytest.mark.asyncio
    async def test_insert_duplicate(self, database):
        """Test adding duplicate user embedding"""
        user_name = "test_user"
        embedding = [0.1] * 128
        
        # Add user first time
        result1 = await database.insert(user_name, embedding)
        assert result1 is True
        
        # Try to add same user again
        result2 = await database.insert(user_name, embedding)
        assert result2 is False
    
    @pytest.mark.asyncio
    async def test_get_registered_users(self, database):
        """Test getting all registered users"""
        # Initially should be empty
        user_names = await database.get_registered_users()
        assert user_names == []
        
        # Add some users
        users = ["user1", "user2", "user3"]
        embedding = [0.1] * 128
        
        for user in users:
            await database.insert(user, embedding)
        
        # Check that all users are returned
        user_names = await database.get_registered_users()
        assert set(user_names) == set(users)
    
    @pytest.mark.asyncio
    async def test_delete_user(self, database):
        """Test deleting a user"""
        user_name = "test_user"
        embedding = [0.1] * 128
        
        # Add user
        ret_val = await database.insert(user_name, embedding)
        assert ret_val is True
        
        # Delete user
        result = await database.delete_user(user_name)
        assert result is True
        
        # Verify user is deleted
        remaining_users = await database.get_registered_users()
        assert user_name not in remaining_users
    
    @pytest.mark.asyncio
    async def test_delete_nonexistent_user(self, database):
        """Test deleting a user that doesn't exist"""
        result = await database.delete_user("nonexistent_user")
        assert result is False
    
    @pytest.mark.asyncio
    async def test_fetch_all(self, database):
        """Test fetching all users with embeddings"""
        # Initially should be empty
        user_embeddings = await database.fetch_all()
        assert user_embeddings == {}
        
        # Add some users
        users = {"user1": [0.1] * 128, "user2": [0.2] * 128}
        
        for user, embedding in users.items():
            await database.insert(user, embedding)
        
        # Check that all users and embeddings are returned
        user_embeddings = await database.fetch_all()
        assert set(user_embeddings.keys()) == set(users.keys())
        for user in users:
            assert np.allclose(np.array(user_embeddings[user]),np.array(users[user]))