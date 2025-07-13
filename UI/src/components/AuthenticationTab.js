import React, { useState } from 'react';
import CameraCapture from './CameraCapture';
import { apiService } from '../services/api';

const AuthenticationTab = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [threshold, setThreshold] = useState(0.6);

  const handleCapture = async (imageSrc) => {
    setIsProcessing(true);
    setResult(null);

    try {
      // Convert base64 to the format expected by the API
      const base64Data = imageSrc.split(',')[1];
      
      const response = await apiService.authenticateUser(base64Data, threshold);
      
      setResult({
        type: response.is_authenticated ? 'success' : 'error',
        message: response.is_authenticated 
          ? `Welcome back, ${response.user_name}!` 
          : 'Authentication failed. Face not recognized or potential spoofing detected.',
        userName: response.user_name
      });
    } catch (error) {
      console.error('Authentication error:', error);
      setResult({
        type: 'error',
        message: error.response?.data?.detail || 'Authentication failed. Please try again.',
        userName: null
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <h2>Face Authentication</h2>
      <p>Position your face in front of the camera and click "Capture Image" to authenticate.</p>
      
      <div className="threshold-control">
        <label>Authentication Threshold: </label>
        <input
          type="range"
          min="0.3"
          max="1.0"
          step="0.1"
          value={threshold}
          onChange={(e) => setThreshold(parseFloat(e.target.value))}
        />
        <div className="threshold-value">{threshold}</div>
        <small>Lower values are more strict, higher values are more lenient</small>
      </div>

      <CameraCapture 
        onCapture={handleCapture}
        disabled={isProcessing}
      />

      {isProcessing && (
        <div className="alert alert-info">
          Processing authentication...
        </div>
      )}

      {result && (
        <div className={`alert alert-${result.type === 'success' ? 'success' : 'error'}`}>
          {result.message}
        </div>
      )}
    </div>
  );
};

export default AuthenticationTab;
