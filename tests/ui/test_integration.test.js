import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import App from '../../../UI/src/App';

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

// Mock react-webcam
jest.mock('react-webcam', () => {
  return React.forwardRef((props, ref) => {
    const { onUserMedia } = props;
    
    React.useImperativeHandle(ref, () => ({
      getScreenshot: jest.fn(() => 'data:image/jpeg;base64,test_screenshot_data')
    }));

    React.useEffect(() => {
      if (onUserMedia) {
        setTimeout(() => onUserMedia(), 100);
      }
    }, [onUserMedia]);

    return <div data-testid="webcam">Mock Webcam</div>;
  });
});

describe('UI Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.URL.createObjectURL = jest.fn(() => 'mock-preview-url');
    global.URL.revokeObjectURL = jest.fn();
    window.confirm = jest.fn(() => true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Complete User Registration and Authentication Flow', () => {
    test('complete user registration and authentication workflow', async () => {
      // Mock initial empty user list
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { user_names: [] }
      });

      // Mock successful user addition
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          is_saved: true,
          user_name: 'john_doe',
          message: 'User added successfully'
        }
      });

      // Mock updated user list after addition
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { user_names: ['john_doe'] }
      });

      // Mock successful authentication
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          is_authenticated: true,
          user_name: 'john_doe'
        }
      });

      render(<App />);

      // Step 1: Verify we start on authentication tab
      expect(screen.getByText('Face Authentication')).toBeInTheDocument();

      // Step 2: Navigate to Add User tab
      fireEvent.click(screen.getByRole('button', { name: 'Add User' }));
      expect(screen.getByText('Add New User')).toBeInTheDocument();

      // Step 3: Fill out user registration form
      const nameInput = screen.getByLabelText(/user name/i);
      const fileInput = screen.getByLabelText(/user photo/i);
      const file = new File(['fake image'], 'john.jpg', { type: 'image/jpeg' });

      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Step 4: Submit user registration
      const submitButton = screen.getByRole('button', { name: /add user/i });
      fireEvent.click(submitButton);

      // Step 5: Verify successful registration and automatic navigation to user management
      await waitFor(() => {
        expect(screen.getByText(/user added successfully/i)).toBeInTheDocument();
        expect(screen.getByText('User Management')).toBeInTheDocument();
      });

      // Step 6: Verify user appears in user list
      await waitFor(() => {
        expect(screen.getByText('john_doe')).toBeInTheDocument();
        expect(screen.getByText('Registered Users (1)')).toBeInTheDocument();
      });

      // Step 7: Navigate back to authentication tab
      fireEvent.click(screen.getByRole('button', { name: 'Authenticate' }));
      expect(screen.getByText('Face Authentication')).toBeInTheDocument();

      // Step 8: Wait for camera to be ready and perform authentication
      await waitFor(() => {
        expect(screen.queryByText(/waiting for camera access/i)).not.toBeInTheDocument();
      });

      const captureButton = screen.getByRole('button', { name: /capture image/i });
      fireEvent.click(captureButton);

      // Step 9: Verify successful authentication
      await waitFor(() => {
        expect(screen.getByText(/welcome.*john_doe/i)).toBeInTheDocument();
      });

      // Verify all API calls were made correctly
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/getAllUsers');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/addUser', expect.any(FormData), expect.any(Object));
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/authenticate', expect.any(FormData), expect.any(Object));
    });

    test('handles authentication of unregistered user', async () => {
      // Mock authentication response for unregistered user
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          is_authenticated: true,
          user_name: null
        }
      });

      render(<App />);

      // Navigate to authentication tab (already there by default)
      expect(screen.getByText('Face Authentication')).toBeInTheDocument();

      // Wait for camera to be ready
      await waitFor(() => {
        expect(screen.queryByText(/waiting for camera access/i)).not.toBeInTheDocument();
      });

      // Perform authentication
      const captureButton = screen.getByRole('button', { name: /capture image/i });
      fireEvent.click(captureButton);

      // Verify message about not being registered
      await waitFor(() => {
        expect(screen.getByText(/looks like you have not registered yet/i)).toBeInTheDocument();
      });
    });

    test('handles failed authentication (spoofing detected)', async () => {
      // Mock authentication failure
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          is_authenticated: false,
          user_name: null
        }
      });

      render(<App />);

      // Perform authentication
      await waitFor(() => {
        expect(screen.queryByText(/waiting for camera access/i)).not.toBeInTheDocument();
      });

      const captureButton = screen.getByRole('button', { name: /capture image/i });
      fireEvent.click(captureButton);

      // Verify failure message
      await waitFor(() => {
        expect(screen.getByText(/authentication failed.*face not recognized/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Management Workflow', () => {
    test('complete user management workflow - add, view, delete', async () => {
      // Mock initial user list
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { user_names: ['alice', 'bob'] }
      });

      // Mock successful user deletion
      mockAxiosInstance.delete.mockResolvedValueOnce({
        data: {
          is_deleted: true,
          user_name: 'alice',
          message: 'User deleted successfully'
        }
      });

      render(<App />);

      // Navigate to user management tab
      fireEvent.click(screen.getByRole('button', { name: 'Manage Users' }));
      expect(screen.getByText('User Management')).toBeInTheDocument();

      // Verify initial user list
      await waitFor(() => {
        expect(screen.getByText('alice')).toBeInTheDocument();
        expect(screen.getByText('bob')).toBeInTheDocument();
        expect(screen.getByText('Registered Users (2)')).toBeInTheDocument();
      });

      // Delete first user (alice)
      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]); // Delete alice

      // Verify deletion confirmation and success
      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete user "alice"?');
        expect(screen.getByText(/user deleted successfully/i)).toBeInTheDocument();
        expect(screen.queryByText('alice')).not.toBeInTheDocument(); // Alice should be removed
        expect(screen.getByText('bob')).toBeInTheDocument(); // Bob should remain
      });
    });

    test('handles refresh functionality', async () => {
      // Mock initial user list
      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: { user_names: ['user1'] } })
        .mockResolvedValueOnce({ data: { user_names: ['user1', 'user2'] } });

      render(<App />);

      // Navigate to user management tab
      fireEvent.click(screen.getByRole('button', { name: 'Manage Users' }));

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Registered Users (1)')).toBeInTheDocument();
      });

      // Click refresh button
      const refreshButton = screen.getByRole('button', { name: /refresh users/i });
      fireEvent.click(refreshButton);

      // Verify updated list
      await waitFor(() => {
        expect(screen.getByText('Registered Users (2)')).toBeInTheDocument();
        expect(screen.getByText('user1')).toBeInTheDocument();
        expect(screen.getByText('user2')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('handles network errors gracefully', async () => {
      // Mock network error for user list fetch
      mockAxiosInstance.get.mockRejectedValueOnce({
        response: {
          status: 500,
          data: { detail: 'Database connection failed' }
        }
      });

      render(<App />);

      // Navigate to user management tab
      fireEvent.click(screen.getByRole('button', { name: 'Manage Users' }));

      // Verify error handling
      await waitFor(() => {
        expect(screen.getByText(/database connection failed/i)).toBeInTheDocument();
      });
    });

    test('handles authentication threshold adjustment', async () => {
      // Mock authentication with custom threshold
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          is_authenticated: true,
          user_name: 'test_user'
        }
      });

      render(<App />);

      // Adjust threshold
      const thresholdSlider = screen.getByRole('slider');
      fireEvent.change(thresholdSlider, { target: { value: '0.9' } });
      expect(screen.getByText('0.9')).toBeInTheDocument();

      // Perform authentication with new threshold
      await waitFor(() => {
        expect(screen.queryByText(/waiting for camera access/i)).not.toBeInTheDocument();
      });

      const captureButton = screen.getByRole('button', { name: /capture image/i });
      fireEvent.click(captureButton);

      // Verify authentication was called (threshold would be in FormData)
      await waitFor(() => {
        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          '/authenticate',
          expect.any(FormData),
          expect.any(Object)
        );
      });
    });

    test('handles form validation errors', async () => {
      render(<App />);

      // Navigate to add user tab
      fireEvent.click(screen.getByRole('button', { name: 'Add User' }));

      // Try to submit with empty form
      const form = screen.getByText('Add New User').closest('form');
      fireEvent.submit(form);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/please enter a user name/i)).toBeInTheDocument();
      });

      // Fill name but leave file empty
      const nameInput = screen.getByLabelText(/user name/i);
      fireEvent.change(nameInput, { target: { value: 'test_user' } });
      fireEvent.submit(form);

      // Should show file validation error
      await waitFor(() => {
        expect(screen.getByText(/please select an image file/i)).toBeInTheDocument();
      });
    });

    test('handles user deletion cancellation', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { user_names: ['test_user'] }
      });

      // Mock cancelled confirmation
      window.confirm = jest.fn(() => false);

      render(<App />);

      // Navigate to user management
      fireEvent.click(screen.getByRole('button', { name: 'Manage Users' }));

      await waitFor(() => {
        expect(screen.getByText('test_user')).toBeInTheDocument();
      });

      // Try to delete user but cancel
      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      // Verify deletion was cancelled
      expect(window.confirm).toHaveBeenCalled();
      expect(mockAxiosInstance.delete).not.toHaveBeenCalled();
      expect(screen.getByText('test_user')).toBeInTheDocument();
    });
  });

  describe('Loading States and UI Feedback', () => {
    test('shows loading states during async operations', async () => {
      // Mock delayed responses
      mockAxiosInstance.get.mockImplementationOnce(
        () => new Promise(resolve => 
          setTimeout(() => resolve({ data: { user_names: ['user1'] } }), 200)
        )
      );

      mockAxiosInstance.post.mockImplementationOnce(
        () => new Promise(resolve => 
          setTimeout(() => resolve({
            data: { is_authenticated: true, user_name: 'user1' }
          }), 200)
        )
      );

      render(<App />);

      // Test user management loading
      fireEvent.click(screen.getByRole('button', { name: 'Manage Users' }));
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
        expect(screen.getByText('user1')).toBeInTheDocument();
      });

      // Test authentication loading
      fireEvent.click(screen.getByRole('button', { name: 'Authenticate' }));
      
      await waitFor(() => {
        expect(screen.queryByText(/waiting for camera access/i)).not.toBeInTheDocument();
      });

      const captureButton = screen.getByRole('button', { name: /capture image/i });
      fireEvent.click(captureButton);

      expect(screen.getByText(/processing authentication/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /processing/i })).toBeDisabled();

      await waitFor(() => {
        expect(screen.queryByText(/processing authentication/i)).not.toBeInTheDocument();
        expect(screen.getByText(/welcome.*user1/i)).toBeInTheDocument();
      });
    });

    test('shows appropriate success and error messages', async () => {
      // Test success messages
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          is_saved: true,
          message: 'User registered successfully'
        }
      });

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { user_names: ['new_user'] }
      });

      render(<App />);

      // Add user successfully
      fireEvent.click(screen.getByRole('button', { name: 'Add User' }));
      
      const nameInput = screen.getByLabelText(/user name/i);
      const fileInput = screen.getByLabelText(/user photo/i);
      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });

      fireEvent.change(nameInput, { target: { value: 'new_user' } });
      fireEvent.change(fileInput, { target: { files: [file] } });
      fireEvent.click(screen.getByRole('button', { name: /add user/i }));

      await waitFor(() => {
        expect(screen.getByText(/user registered successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility and User Experience', () => {
    test('has proper ARIA labels and roles', () => {
      render(<App />);

      // Check that buttons have proper roles and accessible names
      expect(screen.getByRole('button', { name: 'Authenticate' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add User' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Manage Users' })).toBeInTheDocument();

      // Navigate to add user tab and check form accessibility
      fireEvent.click(screen.getByRole('button', { name: 'Add User' }));
      
      expect(screen.getByLabelText(/user name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/user photo/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add user/i })).toBeInTheDocument();
    });

    test('maintains proper focus management', () => {
      render(<App />);

      // Tab navigation should work properly
      const authenticateTab = screen.getByRole('button', { name: 'Authenticate' });
      const addUserTab = screen.getByRole('button', { name: 'Add User' });
      
      expect(authenticateTab).toHaveClass('active');
      
      fireEvent.click(addUserTab);
      expect(addUserTab).toHaveClass('active');
      expect(authenticateTab).not.toHaveClass('active');
    });

    test('provides clear feedback for user actions', async () => {
      mockAxiosInstance.post.mockRejectedValueOnce({
        response: {
          status: 422,
          data: { detail: 'No face detected in image' }
        }
      });

      render(<App />);

      // Navigate to add user tab
      fireEvent.click(screen.getByRole('button', { name: 'Add User' }));

      // Try to add user with invalid image
      const nameInput = screen.getByLabelText(/user name/i);
      const fileInput = screen.getByLabelText(/user photo/i);
      const file = new File(['invalid'], 'test.jpg', { type: 'image/jpeg' });

      fireEvent.change(nameInput, { target: { value: 'test_user' } });
      fireEvent.change(fileInput, { target: { files: [file] } });
      fireEvent.click(screen.getByRole('button', { name: /add user/i }));

      // Should show clear error message
      await waitFor(() => {
        expect(screen.getByText(/no face detected in image/i)).toBeInTheDocument();
      });
    });
  });
});
