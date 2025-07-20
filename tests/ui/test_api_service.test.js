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

  describe('authenticateUser', () => {
    test('makes correct API call for authentication', async () => {
      const mockResponse = {
        data: {
          is_authenticated: true,
          user_name: 'test_user'
        }
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const imageData = 'data:image/jpeg;base64,test_image_data';
      const result = await apiService.authenticateUser(imageData, 0.6);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/authenticate', expect.any(FormData), {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      expect(result).toEqual(mockResponse.data);
    });

    test('handles authentication failure', async () => {
      const mockResponse = {
        data: {
          is_authenticated: false,
          user_name: null
        }
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const imageData = 'test_image_data';
      const result = await apiService.authenticateUser(imageData);

      expect(result.is_authenticated).toBe(false);
      expect(result.user_name).toBeNull();
    });

    test('handles authentication error', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: { detail: 'Spoofing detected' }
        }
      };

      mockAxiosInstance.post.mockRejectedValueOnce(errorResponse);

      const imageData = 'test_image_data';
      
      await expect(apiService.authenticateUser(imageData)).rejects.toEqual(errorResponse);
    });
  });

  describe('addUser', () => {
    test('makes correct API call for adding user', async () => {
      const mockResponse = {
        data: {
          is_saved: true,
          user_name: 'new_user',
          message: 'User added successfully'
        }
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const userName = 'new_user';
      const imageFile = new File(['fake image'], 'test.jpg', { type: 'image/jpeg' });
      const result = await apiService.addUser(userName, imageFile);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/addUser', expect.any(FormData), {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      expect(result).toEqual(mockResponse.data);
    });

    test('throws error for empty user name', async () => {
      const imageFile = new File(['fake image'], 'test.jpg', { type: 'image/jpeg' });
      
      await expect(apiService.addUser('', imageFile)).rejects.toThrow('User name is required');
      await expect(apiService.addUser(null, imageFile)).rejects.toThrow('User name is required');
    });

    test('throws error for missing image file', async () => {
      await expect(apiService.addUser('test_user', null)).rejects.toThrow('Image file is required');
    });
  });

  describe('getAllUsers', () => {
    test('makes correct API call to get all users', async () => {
      const mockResponse = {
        data: {
          user_names: ['user1', 'user2', 'user3']
        }
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const result = await apiService.getAllUsers();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/getAllUsers');
      expect(result).toEqual(mockResponse.data);
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

      const userName = 'test_user';
      const result = await apiService.deleteUser(userName);

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/deleteUser/test_user');
      expect(result).toEqual(mockResponse.data);
    });

    test('throws error for empty user name', async () => {
      await expect(apiService.deleteUser('')).rejects.toThrow('User name is required');
      await expect(apiService.deleteUser(null)).rejects.toThrow('User name is required');
    });

    test('handles URL encoding for user names with special characters', async () => {
      const mockResponse = { data: { is_deleted: true, user_name: 'user@test.com' } };
      mockAxiosInstance.delete.mockResolvedValueOnce(mockResponse);

      await apiService.deleteUser('user@test.com');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/deleteUser/user%40test.com');
    });
  });

  describe('checkHealth', () => {
    test('makes correct API call for health check', async () => {
      const mockResponse = {
        data: {
          status: 'healthy',
          message: 'Database service is running'
        }
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const result = await apiService.checkHealth();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/health');
      expect(result).toEqual(mockResponse.data);
    });
  });
});
          status: 500,
          data: { detail: 'Database error' }
        }
      };

      mockAxiosInstance.get.mockRejectedValueOnce(errorResponse);
      
      await expect(getUserNames()).rejects.toEqual(errorResponse);
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

      const userName = 'test_user';
      const result = await deleteUser(userName);

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(`/delete_user/${userName}`);
      expect(result).toEqual(mockResponse.data);
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

      const userName = 'nonexistent_user';
      
      await expect(deleteUser(userName)).rejects.toEqual(errorResponse);
    });

    test('handles special characters in user name', async () => {
      const mockResponse = {
        data: {
          is_deleted: true,
          user_name: 'user@test.com',
          message: 'User deleted successfully'
        }
      };

      mockAxiosInstance.delete.mockResolvedValueOnce(mockResponse);

      const userName = 'user@test.com';
      const result = await deleteUser(userName);

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(`/delete_user/${userName}`);
      expect(result.is_deleted).toBe(true);
    });
  });

  describe('API Configuration', () => {
    test('creates axios instance with correct base URL', () => {
      // Test default URL
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:8001',
        timeout: 30000
      });
    });

    test('creates axios instance with environment URL', () => {
      // Mock environment variable
      const originalEnv = process.env.REACT_APP_API_URL;
      process.env.REACT_APP_API_URL = 'http://api.example.com';

      // Re-import to get new configuration
      jest.resetModules();
      require('../../../UI/src/services/api');

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://api.example.com',
        timeout: 30000
      });

      // Restore original environment
      process.env.REACT_APP_API_URL = originalEnv;
    });

    test('sets up request interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
    });

    test('sets up response interceptors', () => {
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('handles timeout errors', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded'
      };

      mockAxiosInstance.post.mockRejectedValueOnce(timeoutError);

      const imageData = 'data:image/jpeg;base64,test_image_data';
      
      await expect(authenticateUser(imageData)).rejects.toEqual(timeoutError);
    });

    test('handles connection refused errors', async () => {
      const connectionError = {
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED 127.0.0.1:8001'
      };

      mockAxiosInstance.get.mockRejectedValueOnce(connectionError);
      
      await expect(getUserNames()).rejects.toEqual(connectionError);
    });

    test('handles malformed response errors', async () => {
      const malformedResponse = {
        response: {
          status: 200,
          data: 'not json'
        }
      };

      mockAxiosInstance.post.mockResolvedValueOnce(malformedResponse);

      const result = await authenticateUser('test_image');
      expect(result).toBe('not json');
    });
  });

  describe('Request Payload Validation', () => {
    test('sends correct content type for JSON requests', async () => {
      const mockResponse = { data: { success: true } };
      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      await addUser('test_user', 'image_data');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/add_user', {
        user_name: 'test_user',
        image_data: 'image_data'
      });
    });

    test('handles empty user name', async () => {
      const mockResponse = { data: { success: true } };
      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      await addUser('', 'image_data');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/add_user', {
        user_name: '',
        image_data: 'image_data'
      });
    });

    test('handles empty image data', async () => {
      const mockResponse = { data: { success: true } };
      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      await addUser('test_user', '');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/add_user', {
        user_name: 'test_user',
        image_data: ''
      });
    });
  });
});
