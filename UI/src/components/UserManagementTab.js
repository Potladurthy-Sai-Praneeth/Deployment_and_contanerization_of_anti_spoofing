import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

const UserManagementTab = ({ refreshTrigger }) => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);
  const [result, setResult] = useState(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await apiService.getAllUsers();
      setUsers(response.user_names || []);
    } catch (error) {
      console.error('Fetch users error:', error);
      setResult({
        type: 'error',
        message: error.response?.data?.detail || 'Failed to fetch users.'
      });
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userName) => {
    if (!window.confirm(`Are you sure you want to delete user "${userName}"?`)) {
      return;
    }

    setDeletingUser(userName);
    setResult(null);

    try {
      const response = await apiService.deleteUser(userName);
      
      if (response.is_deleted) {
        setResult({
          type: 'success',
          message: response.message
        });
        
        // Remove user from local state
        setUsers(prevUsers => prevUsers.filter(user => user !== userName));
      } else {
        setResult({
          type: 'error',
          message: response.message
        });
      }
    } catch (error) {
      console.error('Delete user error:', error);
      setResult({
        type: 'error',
        message: error.response?.data?.detail || 'Failed to delete user.'
      });
    } finally {
      setDeletingUser(null);
    }
  };

  // Fetch users on component mount and when refreshTrigger changes
  useEffect(() => {
    fetchUsers();
  }, [refreshTrigger]);

  return (
    <div>
      <h2>User Management</h2>
      <p>View and manage registered users in the system.</p>

      <div style={{ marginBottom: '20px' }}>
        <button onClick={fetchUsers} disabled={isLoading} className="btn btn-primary">
          {isLoading ? 'Loading...' : 'Refresh Users'}
        </button>
      </div>

      {result && (
        <div className={`alert alert-${result.type === 'success' ? 'success' : 'error'}`}>
          {result.message}
        </div>
      )}

      {isLoading ? (
        <div className="loading">Loading users...</div>
      ) : (
        <div className="user-list">
          <h3>Registered Users ({users.length})</h3>
          
          {users.length === 0 ? (
            <div className="alert alert-info">
              No users registered yet. Add some users to get started!
            </div>
          ) : (
            users.map((userName) => (
              <div key={userName} className="user-item">
                <span className="user-name">{userName}</span>
                <button
                  onClick={() => handleDeleteUser(userName)}
                  disabled={deletingUser === userName}
                  className="btn btn-danger"
                >
                  {deletingUser === userName ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default UserManagementTab;
