import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};

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

export const processImageFile = (file, options = {}) => {
  const {
    maxWidth = 512,
    maxHeight = 512,
    quality = 0.9,
    maintainAspectRatio = true,
    format = 'webp'
  } = options;
  
  return new Promise((resolve, reject) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      reject(new Error('File must be an image'));
      return;
    }
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      let { width, height } = img;
      
      if (maintainAspectRatio) {
        // Calculate new dimensions maintaining aspect ratio
        const aspectRatio = width / height;
        
        if (width > maxWidth || height > maxHeight) {
          if (aspectRatio > 1) {
            // Landscape
            width = Math.min(width, maxWidth);
            height = width / aspectRatio;
            
            if (height > maxHeight) {
              height = maxHeight;
              width = height * aspectRatio;
            }
          } else {
            // Portrait
            height = Math.min(height, maxHeight);
            width = height * aspectRatio;
            
            if (width > maxWidth) {
              width = maxWidth;
              height = width / aspectRatio;
            }
          }
        }
      } else {
        // Force exact dimensions
        width = Math.min(width, maxWidth);
        height = Math.min(height, maxHeight);
      }
      
      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;
      
      // Configure canvas for high quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw resized image
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to specified format
      const mimeType = `image/${format}`;
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const processedFile = new File([blob], `processed-image.${format}`, {
              type: mimeType,
              lastModified: Date.now()
            });
            
            console.log(`Image processed: ${file.size} bytes → ${blob.size} bytes`);
            resolve(processedFile);
          } else {
            reject(new Error(`Failed to convert image to ${format}`));
          }
        },
        mimeType,
        quality
      );
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image for processing'));
    };
    
    img.src = URL.createObjectURL(file);
  });
};

export const apiService = {
  // Authenticate user with base64 image
  authenticateUser: async (imageData, threshold = 0.6) => {
    try {
      // Validate threshold
      if (threshold < 0 || threshold > 1) {
        throw new Error('Threshold must be between 0 and 1');
      }

      // If imageData is a File object, process it first
      if (imageData instanceof File) {
        // Validate file type
        if (!imageData.type.startsWith('image/')) {
          throw new Error('File must be an image');
        }

        const processedImage = await processImageFile(imageData, {
          maxWidth: 512,
          maxHeight: 512,
          quality: 0.9,
          format: 'webp'
        });
        
        // Convert processed image to base64
        const base64Data = await fileToBase64(processedImage);
        imageData = base64Data;
      }
      
      // Validate imageData
      if (!imageData || typeof imageData !== 'string') {
        throw new Error('Invalid image data provided');
      }
      
      // Remove data URL prefix if present (e.g., "data:image/webp;base64,")
      const base64Data = imageData.includes(',') ? imageData.split(',')[1] : imageData;
      
      // Validate base64 data
      if (!base64Data || base64Data.trim() === '') {
        throw new Error('Empty or invalid base64 image data');
      }
      
      // Use FormData for better compatibility with FastAPI Form parameters
      const formData = new FormData();
      formData.append('image', base64Data);
      formData.append('threshold', threshold.toString());
      
      const response = await api.post('/authenticate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Validate response
      if (!response.data) {
        throw new Error('Empty response from authentication service');
      }
      
      return response.data;
    } catch (error) {
      // Handle different types of errors
      if (error.response) {
        // Server responded with error status
        const statusCode = error.response.status;
        const errorMessage = error.response.data?.message || error.response.data?.detail || 'Server error';
        throw new Error(`Authentication failed (${statusCode}): ${errorMessage}`);
      } else if (error.request) {
        // Network error
        throw new Error('Authentication failed: Unable to connect to server');
      } else {
        // Other errors (validation, processing, etc.)
        throw new Error(`Authentication failed: ${error.message}`);
      }
    }
  },

  addUser: async (userName, imageFile) => {
    try {
      // Validate inputs
      if (!userName || !userName.trim()) {
        throw new Error('User name is required');
      }
      
      if (!imageFile) {
        throw new Error('Image file is required');
      }

      // Validate file type
      if (!imageFile.type.startsWith('image/')) {
        throw new Error('File must be an image');
      }
      
      // Process image: resize and convert to WebP
      const processedImage = await processImageFile(imageFile, {
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.9,
        maintainAspectRatio: true,
        format: 'webp'
      });
      
      console.log(`Image size reduced from ${imageFile.size} to ${processedImage.size} bytes`);
      
      const formData = new FormData();
      formData.append('user_name', userName.trim().toLowerCase());
      formData.append('image', processedImage);
      
      const response = await api.post('/addUser', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Validate response
      if (!response.data) {
        throw new Error('Empty response from server');
      }
      
      return response.data;
    } catch (error) {
      // Handle different types of errors
      if (error.response) {
        // Server responded with error status
        const statusCode = error.response.status;
        const errorMessage = error.response.data?.message || error.response.data?.detail || 'Server error';
        throw new Error(`Failed to add user (${statusCode}): ${errorMessage}`);
      } else if (error.request) {
        // Network error
        throw new Error('Failed to add user: Unable to connect to server');
      } else {
        // Other errors (validation, processing, etc.)
        throw new Error(`Failed to add user: ${error.message}`);
      }
    }
  },

  // Get all registered users
  getAllUsers: async () => {
    try {
      const response = await api.get('/getAllUsers');
      return response.data;
    } catch (error) {
      if (error.response) {
        const statusCode = error.response.status;
        const errorMessage = error.response.data?.message || error.response.data?.detail || 'Server error';
        throw new Error(`Failed to get users (${statusCode}): ${errorMessage}`);
      } else if (error.request) {
        throw new Error('Failed to get users: Unable to connect to server');
      } else {
        throw new Error(`Failed to get users: ${error.message}`);
      }
    }
  },

  // Delete user
  deleteUser: async (userName) => {
    try {
      if (!userName || !userName.trim()) {
        throw new Error('User name is required');
      }
      
      const response = await api.delete(`/deleteUser/${encodeURIComponent(userName.trim().toLowerCase())}`);
      return response.data;
    } catch (error) {
      if (error.response) {
        const statusCode = error.response.status;
        const errorMessage = error.response.data?.message || error.response.data?.detail || 'Server error';
        throw new Error(`Failed to delete user (${statusCode}): ${errorMessage}`);
      } else if (error.request) {
        throw new Error('Failed to delete user: Unable to connect to server');
      } else {
        throw new Error(`Failed to delete user: ${error.message}`);
      }
    }
  },

  // Health check
  checkHealth: async () => {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      if (error.response) {
        const statusCode = error.response.status;
        const errorMessage = error.response.data?.message || error.response.data?.detail || 'Server error';
        throw new Error(`Health check failed (${statusCode}): ${errorMessage}`);
      } else if (error.request) {
        throw new Error('Health check failed: Unable to connect to server');
      } else {
        throw new Error(`Health check failed: ${error.message}`);
      }
    }
  },
};

export default api;
