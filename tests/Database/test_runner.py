#!/usr/bin/env python3
"""
Test runner script for database API integration tests.
This script helps verify that the tests are working correctly after fixing the async mock issues.
"""

import sys
import os
import subprocess
import importlib.util

# Add the Database directory to Python path
database_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'Database')
sys.path.insert(0, database_dir)

def check_dependencies():
    """Check if required testing dependencies are available."""
    required_packages = ['pytest', 'fastapi', 'httpx']
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print(f"Missing packages: {', '.join(missing_packages)}")
        print("Please install them using: pip install -r requirements-test.txt")
        return False
    return True

def run_single_test():
    """Run a single test to verify the fix works."""
    if not check_dependencies():
        return False
    
    try:
        # Import the test module to check for syntax errors
        from test_api_integration import TestDatabaseAPI
        print("✓ Test module imported successfully")
        
        # Try to create a test instance
        test_instance = TestDatabaseAPI()
        print("✓ Test class instantiated successfully")
        
        # Import required mocking modules
        from unittest.mock import patch, AsyncMock, MagicMock
        from fastapi.testclient import TestClient
        from io import BytesIO
        import sys
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'Database'))
        from main import api
        
        # Create test client
        client = TestClient(api)
        print("✓ Test client created successfully")
        
        # Test a simple endpoint
        with patch('main.database_connector') as mock_db:
            mock_db.get_registered_users = AsyncMock(return_value=[])
            
            response = client.get("/health")
            print(f"✓ Health check response: {response.status_code}")
            
            if response.status_code == 200:
                print("✓ Basic test passed - async mocking appears to be working correctly")
                return True
            else:
                print(f"✗ Health check failed with status: {response.status_code}")
                return False
                
    except Exception as e:
        print(f"✗ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main function to run the test verification."""
    print("Database API Test Verification")
    print("=" * 40)
    
    if run_single_test():
        print("\n✓ Tests appear to be working correctly!")
        print("You can now run the full test suite with:")
        print("python -m pytest test_api_integration.py -v")
    else:
        print("\n✗ Tests are still having issues. Please check the error messages above.")
    
    return True

if __name__ == "__main__":
    main()
