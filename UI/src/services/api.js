import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Add request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const apiService = {
  // Authenticate user with base64 image
  authenticateUser: async (imageData, threshold = 0.6) => {
    const formData = new FormData();
    // Remove data URL prefix if present
    const base64Data = imageData.includes(',') ? imageData.split(',')[1] : imageData;
    formData.append('image', base64Data);
    formData.append('threshold', threshold.toString());
    
    const response = await api.post('/authenticate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Add new user
  addUser: async (userName, imageFile) => {
    if (!userName || !userName.trim()) {
      throw new Error('User name is required');
    }
    
    if (!imageFile) {
      throw new Error('Image file is required');
    }
    
    const formData = new FormData();
    formData.append('user_name', userName.trim().toLowerCase());
    formData.append('image', imageFile);
    
    const response = await api.post('/addUser', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get all registered users
  getAllUsers: async () => {
    const response = await api.get('/getAllUsers');
    return response.data;
  },

  // Delete user
  deleteUser: async (userName) => {
    if (!userName || !userName.trim()) {
      throw new Error('User name is required');
    }
    
    const response = await api.delete(`/deleteUser/${encodeURIComponent(userName.trim().toLowerCase())}`);
    return response.data;
  },

  // Health check
  checkHealth: async () => {
    const response = await api.get('/health');
    return response.data;
  },
};

export default api;
