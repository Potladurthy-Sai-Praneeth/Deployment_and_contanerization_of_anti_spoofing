import React, { useState } from 'react';
import { apiService } from '../services/api';

const AddUserTab = ({ onUserAdded }) => {
  const [userName, setUserName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!userName.trim()) {
      setResult({
        type: 'error',
        message: 'Please enter a user name.'
      });
      return;
    }

    if (!selectedFile) {
      setResult({
        type: 'error',
        message: 'Please select an image file.'
      });
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      const response = await apiService.addUser(userName.trim(), selectedFile);
      
      if (response.is_saved) {
        setResult({
          type: 'success',
          message: response.message
        });
        
        // Reset form
        setUserName('');
        setSelectedFile(null);
        setPreviewUrl(null);
        
        // Clear file input
        const fileInput = document.getElementById('userImage');
        if (fileInput) {
          fileInput.value = '';
        }
        
        // Notify parent component to refresh user list
        if (onUserAdded) {
          onUserAdded();
        }
      } else {
        setResult({
          type: 'error',
          message: response.message
        });
      }
    } catch (error) {
      console.error('Add user error:', error);
      let errorMessage = 'Failed to add user. Please try again.';
      
      if (error.response?.status === 503) {
        errorMessage = 'Service temporarily unavailable. Please try again in a moment.';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setResult({
        type: 'error',
        message: errorMessage
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <h2>Add New User</h2>
      <p>Upload a clear photo of the user's face and provide their name.</p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="userName">User Name:</label>
          <input
            type="text"
            id="userName"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter user name"
            disabled={isProcessing}
          />
        </div>

        <div className="form-group">
          <label htmlFor="userImage">User Photo:</label>
          <input
            type="file"
            id="userImage"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isProcessing}
          />
        </div>

        {previewUrl && (
          <div className="form-group">
            <label>Preview:</label>
            <div style={{ textAlign: 'center' }}>
              <img
                src={previewUrl}
                alt="Preview"
                style={{
                  maxWidth: '300px',
                  maxHeight: '300px',
                  border: '2px solid #ddd',
                  borderRadius: '8px'
                }}
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isProcessing || !userName.trim() || !selectedFile}
          className="btn btn-success"
        >
          {isProcessing ? 'Processing...' : 'Add User'}
        </button>
      </form>

      {result && (
        <div className={`alert alert-${result.type === 'success' ? 'success' : 'error'}`}>
          {result.message}
        </div>
      )}
    </div>
  );
};

export default AddUserTab;
