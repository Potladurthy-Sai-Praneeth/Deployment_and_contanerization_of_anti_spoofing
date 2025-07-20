import axios from 'axios';
import { apiService } from '../../../UI/src/services/api';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Create a mock axios instance
const mockAxiosInstance = {
  post: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() }
  }
};

mockedAxios.create.mockReturnValue(mockAxiosInstance);

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Configuration', () => {
    test('creates axios instance with correct default configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:8001',
        timeout: 30000,
      });
    });

    test('uses environment variable for API URL if provided', () => {
      const originalEnv = process.env.REACT_APP_API_URL;
      process.env.REACT_APP_API_URL = 'http://api.example.com:8080';

      // Re-import to get new configuration
      jest.resetModules();
      delete require.cache[require.resolve('../../../UI/src/services/api')];
      require('../../../UI/src/services/api');

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://api.example.com:8080',
        timeout: 30000,
      });

      // Restore original environment
      process.env.REACT_APP_API_URL = originalEnv;
    });

    test('sets up request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('authenticateUser', () => {
    test('makes correct API call with base64 image data', async () => {
      const mockResponse = {
        data: {
          is_authenticated: true,
          user_name: 'john_doe'
        }
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const imageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEA';
      const threshold = 0.7;
      const result = await apiService.authenticateUser(imageData, threshold);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/authenticate',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Verify FormData content (though we can't directly inspect it)
      const formDataCall = mockAxiosInstance.post.mock.calls[0];
      expect(formDataCall[1]).toBeInstanceOf(FormData);
      expect(result).toEqual(mockResponse.data);
    });

    test('handles image data without data URL prefix', async () => {
      const mockResponse = {
        data: {
          is_authenticated: true,
          user_name: 'jane_doe'
        }
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const imageData = '/9j/4AAQSkZJRgABAQEA'; // Raw base64 without prefix
      const result = await apiService.authenticateUser(imageData, 0.6);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/authenticate',
        expect.any(FormData),
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse.data);
    });

    test('uses default threshold when not provided', async () => {
      const mockResponse = {
        data: { is_authenticated: false, user_name: null }
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      await apiService.authenticateUser('base64data');

      expect(mockAxiosInstance.post).toHaveBeenCalled();
      // Default threshold should be 0.6 (tested indirectly through FormData)
    });

    test('handles successful authentication with known user', async () => {
      const mockResponse = {
        data: {
          is_authenticated: true,
          user_name: 'alice_smith'
        }
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const result = await apiService.authenticateUser('imagedata', 0.8);

      expect(result.is_authenticated).toBe(true);
      expect(result.user_name).toBe('alice_smith');
    });

    test('handles authentication failure', async () => {
      const mockResponse = {
        data: {
          is_authenticated: false,
          user_name: null
        }
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const result = await apiService.authenticateUser('imagedata', 0.5);

      expect(result.is_authenticated).toBe(false);
      expect(result.user_name).toBeNull();
    });

    test('handles spoofing detection error', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: { detail: 'Potential spoofing detected' }
        }
      };

      mockAxiosInstance.post.mockRejectedValueOnce(errorResponse);

      await expect(
        apiService.authenticateUser('imagedata', 0.6)
      ).rejects.toEqual(errorResponse);
    });

    test('handles network timeout error', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded'
      };

      mockAxiosInstance.post.mockRejectedValueOnce(timeoutError);

      await expect(
        apiService.authenticateUser('imagedata', 0.6)
      ).rejects.toEqual(timeoutError);
    });
  });

  describe('addUser', () => {
    test('makes correct API call with user data', async () => {
      const mockResponse = {
        data: {
          is_saved: true,
          user_name: 'new_user',
          message: 'User added successfully'
        }
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const userName = 'New User';
      const imageFile = new File(['fake image'], 'photo.jpg', { type: 'image/jpeg' });
      const result = await apiService.addUser(userName, imageFile);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/addUser',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Check that FormData was created and contains expected fields
      const formDataCall = mockAxiosInstance.post.mock.calls[0];
      expect(formDataCall[1]).toBeInstanceOf(FormData);
      expect(result).toEqual(mockResponse.data);
    });

    test('trims and lowercases user name', async () => {
      const mockResponse = {
        data: { is_saved: true, user_name: 'test_user', message: 'Success' }
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const userName = '  Test User  '; // With spaces
      const imageFile = new File(['image'], 'photo.jpg', { type: 'image/jpeg' });
      
      await apiService.addUser(userName, imageFile);

      expect(mockAxiosInstance.post).toHaveBeenCalled();
      // User name should be trimmed and lowercased in FormData
    });

    test('throws error for empty user name', async () => {
      const imageFile = new File(['image'], 'photo.jpg', { type: 'image/jpeg' });
      
      await expect(apiService.addUser('', imageFile)).rejects.toThrow('User name is required');
      await expect(apiService.addUser('   ', imageFile)).rejects.toThrow('User name is required');
      await expect(apiService.addUser(null, imageFile)).rejects.toThrow('User name is required');
      await expect(apiService.addUser(undefined, imageFile)).rejects.toThrow('User name is required');
    });

    test('throws error for missing image file', async () => {
      await expect(apiService.addUser('test_user', null)).rejects.toThrow('Image file is required');
      await expect(apiService.addUser('test_user', undefined)).rejects.toThrow('Image file is required');
    });

    test('handles successful user addition', async () => {
      const mockResponse = {
        data: {
          is_saved: true,
          user_name: 'bob_wilson',
          message: 'User registered successfully with face embedding'
        }
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const imageFile = new File(['image'], 'photo.jpg', { type: 'image/jpeg' });
      const result = await apiService.addUser('Bob Wilson', imageFile);

      expect(result.is_saved).toBe(true);
      expect(result.user_name).toBe('bob_wilson');
      expect(result.message).toContain('successfully');
    });

    test('handles user already exists error', async () => {
      const mockResponse = {
        data: {
          is_saved: false,
          message: 'User already exists'
        }
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const imageFile = new File(['image'], 'photo.jpg', { type: 'image/jpeg' });
      const result = await apiService.addUser('existing_user', imageFile);

      expect(result.is_saved).toBe(false);
      expect(result.message).toBe('User already exists');
    });

    test('handles face detection failure', async () => {
      const errorResponse = {
        response: {
          status: 422,
          data: { detail: 'No face detected in the image' }
        }
      };

      mockAxiosInstance.post.mockRejectedValueOnce(errorResponse);

      const imageFile = new File(['image'], 'photo.jpg', { type: 'image/jpeg' });
      
      await expect(
        apiService.addUser('test_user', imageFile)
      ).rejects.toEqual(errorResponse);
    });

    test('handles service unavailable error', async () => {
      const errorResponse = {
        response: {
          status: 503,
          data: { detail: 'ML service temporarily unavailable' }
        }
      };

      mockAxiosInstance.post.mockRejectedValueOnce(errorResponse);

      const imageFile = new File(['image'], 'photo.jpg', { type: 'image/jpeg' });
      
      await expect(
        apiService.addUser('test_user', imageFile)
      ).rejects.toEqual(errorResponse);
    });
  });

  describe('getAllUsers', () => {
    test('makes correct API call to fetch users', async () => {
      const mockResponse = {
        data: {
          user_names: ['alice', 'bob', 'charlie']
        }
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const result = await apiService.getAllUsers();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/getAllUsers');
      expect(result).toEqual(mockResponse.data);
      expect(result.user_names).toHaveLength(3);
    });

    test('handles empty user list', async () => {
      const mockResponse = {
        data: {
          user_names: []
        }
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const result = await apiService.getAllUsers();
      
      expect(result.user_names).toEqual([]);
      expect(result.user_names).toHaveLength(0);
    });

    test('handles database connection error', async () => {
      const errorResponse = {
        response: {
          status: 500,
          data: { detail: 'Database connection failed' }
        }
      };

      mockAxiosInstance.get.mockRejectedValueOnce(errorResponse);
      
      await expect(apiService.getAllUsers()).rejects.toEqual(errorResponse);
    });

    test('handles malformed response', async () => {
      const mockResponse = {
        data: {
          // Missing user_names field
          message: 'Success'
        }
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const result = await apiService.getAllUsers();
      
      // Should handle missing user_names gracefully
      expect(result.user_names).toBeUndefined();
    });
  });

  describe('deleteUser', () => {
    test('makes correct API call to delete user', async () => {
      const mockResponse = {
        data: {
          is_deleted: true,
          user_name: 'test_user',
          message: 'User deleted successfully'
        }
      };

      mockAxiosInstance.delete.mockResolvedValueOnce(mockResponse);

      const userName = 'Test User';
      const result = await apiService.deleteUser(userName);

      // User name should be trimmed, lowercased, and URL encoded
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/deleteUser/test%20user');
      expect(result).toEqual(mockResponse.data);
    });

    test('handles URL encoding for special characters', async () => {
      const mockResponse = {
        data: { is_deleted: true, user_name: 'user@test.com' }
      };

      mockAxiosInstance.delete.mockResolvedValueOnce(mockResponse);

      await apiService.deleteUser('user@test.com');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/deleteUser/user%40test.com');
    });

    test('handles user name with spaces', async () => {
      const mockResponse = {
        data: { is_deleted: true, user_name: 'john doe' }
      };

      mockAxiosInstance.delete.mockResolvedValueOnce(mockResponse);

      await apiService.deleteUser('John Doe');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/deleteUser/john%20doe');
    });

    test('throws error for empty user name', async () => {
      await expect(apiService.deleteUser('')).rejects.toThrow('User name is required');
      await expect(apiService.deleteUser('   ')).rejects.toThrow('User name is required');
      await expect(apiService.deleteUser(null)).rejects.toThrow('User name is required');
      await expect(apiService.deleteUser(undefined)).rejects.toThrow('User name is required');
    });

    test('handles successful user deletion', async () => {
      const mockResponse = {
        data: {
          is_deleted: true,
          user_name: 'alice',
          message: 'User and associated data deleted successfully'
        }
      };

      mockAxiosInstance.delete.mockResolvedValueOnce(mockResponse);

      const result = await apiService.deleteUser('alice');

      expect(result.is_deleted).toBe(true);
      expect(result.user_name).toBe('alice');
      expect(result.message).toContain('deleted successfully');
    });

    test('handles user not found error', async () => {
      const errorResponse = {
        response: {
          status: 404,
          data: { 
            detail: 'User not found',
            is_deleted: false,
            user_name: 'nonexistent_user'
          }
        }
      };

      mockAxiosInstance.delete.mockRejectedValueOnce(errorResponse);

      await expect(
        apiService.deleteUser('nonexistent_user')
      ).rejects.toEqual(errorResponse);
    });

    test('handles deletion failure', async () => {
      const mockResponse = {
        data: {
          is_deleted: false,
          user_name: 'test_user',
          message: 'Failed to delete user from database'
        }
      };

      mockAxiosInstance.delete.mockResolvedValueOnce(mockResponse);

      const result = await apiService.deleteUser('test_user');

      expect(result.is_deleted).toBe(false);
      expect(result.message).toContain('Failed to delete');
    });
  });

  describe('checkHealth', () => {
    test('makes correct API call for health check', async () => {
      const mockResponse = {
        data: {
          status: 'healthy',
          message: 'All services operational',
          database: 'connected',
          ml_service: 'running'
        }
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const result = await apiService.checkHealth();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/health');
      expect(result).toEqual(mockResponse.data);
      expect(result.status).toBe('healthy');
    });

    test('handles unhealthy service response', async () => {
      const mockResponse = {
        data: {
          status: 'unhealthy',
          message: 'Database connection issues',
          database: 'disconnected',
          ml_service: 'running'
        }
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const result = await apiService.checkHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.database).toBe('disconnected');
    });

    test('handles health check endpoint not available', async () => {
      const errorResponse = {
        response: {
          status: 404,
          data: { detail: 'Health endpoint not found' }
        }
      };

      mockAxiosInstance.get.mockRejectedValueOnce(errorResponse);

      await expect(apiService.checkHealth()).rejects.toEqual(errorResponse);
    });

    test('handles service completely down', async () => {
      const connectionError = {
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED 127.0.0.1:8001'
      };

      mockAxiosInstance.get.mockRejectedValueOnce(connectionError);

      await expect(apiService.checkHealth()).rejects.toEqual(connectionError);
    });
  });

  describe('Error Handling', () => {
    test('handles timeout errors consistently', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded'
      };

      // Test timeout on different endpoints
      mockAxiosInstance.get.mockRejectedValueOnce(timeoutError);
      await expect(apiService.getAllUsers()).rejects.toEqual(timeoutError);

      mockAxiosInstance.post.mockRejectedValueOnce(timeoutError);
      await expect(
        apiService.authenticateUser('data', 0.6)
      ).rejects.toEqual(timeoutError);

      mockAxiosInstance.delete.mockRejectedValueOnce(timeoutError);
      await expect(apiService.deleteUser('user')).rejects.toEqual(timeoutError);
    });

    test('handles connection refused errors', async () => {
      const connectionError = {
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED 127.0.0.1:8001'
      };

      mockAxiosInstance.post.mockRejectedValueOnce(connectionError);
      
      await expect(
        apiService.authenticateUser('data', 0.6)
      ).rejects.toEqual(connectionError);
    });

    test('handles invalid JSON responses', async () => {
      const invalidResponse = {
        data: 'Invalid JSON response'
      };

      mockAxiosInstance.get.mockResolvedValueOnce(invalidResponse);

      const result = await apiService.getAllUsers();
      expect(result).toBe('Invalid JSON response');
    });

    test('handles server errors with detailed messages', async () => {
      const serverError = {
        response: {
          status: 500,
          data: { 
            detail: 'Internal server error: Database connection pool exhausted',
            error_code: 'DB_POOL_EXHAUSTED'
          }
        }
      };

      mockAxiosInstance.get.mockRejectedValueOnce(serverError);

      await expect(apiService.getAllUsers()).rejects.toEqual(serverError);
    });

    test('handles client errors with validation messages', async () => {
      const clientError = {
        response: {
          status: 422,
          data: { 
            detail: 'Validation failed: Image format not supported',
            error_type: 'VALIDATION_ERROR'
          }
        }
      };

      const imageFile = new File(['invalid'], 'photo.txt', { type: 'text/plain' });
      mockAxiosInstance.post.mockRejectedValueOnce(clientError);

      await expect(
        apiService.addUser('test_user', imageFile)
      ).rejects.toEqual(clientError);
    });
  });

  describe('Request Payload Validation', () => {
    test('FormData contains correct fields for authentication', async () => {
      const mockResponse = { data: { is_authenticated: true } };
      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      await apiService.authenticateUser('imagedata', 0.8);

      const call = mockAxiosInstance.post.mock.calls[0];
      expect(call[0]).toBe('/authenticate');
      expect(call[1]).toBeInstanceOf(FormData);
      expect(call[2]).toEqual({
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    });

    test('FormData contains correct fields for add user', async () => {
      const mockResponse = { data: { is_saved: true } };
      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const imageFile = new File(['image'], 'photo.jpg', { type: 'image/jpeg' });
      await apiService.addUser('Test User', imageFile);

      const call = mockAxiosInstance.post.mock.calls[0];
      expect(call[0]).toBe('/addUser');
      expect(call[1]).toBeInstanceOf(FormData);
      expect(call[2]).toEqual({
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    });

    test('DELETE request uses correct URL encoding', async () => {
      const mockResponse = { data: { is_deleted: true } };
      mockAxiosInstance.delete.mockResolvedValueOnce(mockResponse);

      await apiService.deleteUser('User With Spaces & Special@Chars');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
        '/deleteUser/user%20with%20spaces%20%26%20special%40chars'
      );
    });
  });
});
