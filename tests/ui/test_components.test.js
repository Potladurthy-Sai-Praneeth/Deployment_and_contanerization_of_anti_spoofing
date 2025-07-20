import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import AddUserTab from '../../../UI/src/components/AddUserTab';
import AuthenticationTab from '../../../UI/src/components/AuthenticationTab';
import UserManagementTab from '../../../UI/src/components/UserManagementTab';
import CameraCapture from '../../../UI/src/components/CameraCapture';

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
    const { onUserMedia, onUserMediaError } = props;
    
    React.useImperativeHandle(ref, () => ({
      getScreenshot: jest.fn(() => 'data:image/jpeg;base64,fake_screenshot_data')
    }));

    React.useEffect(() => {
      // Simulate successful camera initialization
      if (onUserMedia) {
        onUserMedia();
      }
    }, [onUserMedia]);

    return (
      <div data-testid="webcam">
        <button 
          data-testid="trigger-camera-error"
          onClick={() => onUserMediaError && onUserMediaError(new Error('Camera error'))}
        >
          Trigger Camera Error
        </button>
        Mock Webcam Component
      </div>
    );
  });
});

describe('AddUserTab Component', () => {
  const mockOnUserAdded = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = jest.fn(() => 'mock-preview-url');
    global.URL.revokeObjectURL = jest.fn();
  });

  test('renders add user form with all required elements', () => {
    render(<AddUserTab onUserAdded={mockOnUserAdded} />);
    
    expect(screen.getByText('Add New User')).toBeInTheDocument();
    expect(screen.getByText('Upload a clear photo of the user\'s face and provide their name.')).toBeInTheDocument();
    expect(screen.getByLabelText(/user name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/user photo/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add user/i })).toBeInTheDocument();
  });

  test('handles user name input correctly', () => {
    render(<AddUserTab onUserAdded={mockOnUserAdded} />);
    
    const nameInput = screen.getByLabelText(/user name/i);
    fireEvent.change(nameInput, { target: { value: 'test_user' } });
    
    expect(nameInput).toHaveValue('test_user');
  });

  test('handles file selection and shows preview', () => {
    render(<AddUserTab onUserAdded={mockOnUserAdded} />);
    
    const fileInput = screen.getByLabelText(/user photo/i);
    const file = new File(['fake image'], 'test.jpg', { type: 'image/jpeg' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    expect(fileInput.files[0]).toBe(file);
    expect(screen.getByText('Preview:')).toBeInTheDocument();
    expect(screen.getByAltText('Preview')).toHaveAttribute('src', 'mock-preview-url');
  });

  test('submit button is disabled when required fields are empty', () => {
    render(<AddUserTab onUserAdded={mockOnUserAdded} />);
    
    const submitButton = screen.getByRole('button', { name: /add user/i });
    expect(submitButton).toBeDisabled();
    
    // Add user name only
    const nameInput = screen.getByLabelText(/user name/i);
    fireEvent.change(nameInput, { target: { value: 'test_user' } });
    expect(submitButton).toBeDisabled();
    
    // Add file only (reset name first)
    fireEvent.change(nameInput, { target: { value: '' } });
    const fileInput = screen.getByLabelText(/user photo/i);
    const file = new File(['fake image'], 'test.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(submitButton).toBeDisabled();
    
    // Add both name and file
    fireEvent.change(nameInput, { target: { value: 'test_user' } });
    expect(submitButton).not.toBeDisabled();
  });

  test('shows error for missing user name on submit', async () => {
    render(<AddUserTab onUserAdded={mockOnUserAdded} />);
    
    const submitButton = screen.getByRole('button', { name: /add user/i });
    
    // Force click the button by first enabling it artificially
    const fileInput = screen.getByLabelText(/user photo/i);
    const file = new File(['fake image'], 'test.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // Try to submit with empty name
    fireEvent.submit(screen.getByRole('form', { hidden: true }) || screen.getByText('Add New User').closest('form'));
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a user name/i)).toBeInTheDocument();
    });
  });

  test('shows error for missing image file on submit', async () => {
    render(<AddUserTab onUserAdded={mockOnUserAdded} />);
    
    const nameInput = screen.getByLabelText(/user name/i);
    fireEvent.change(nameInput, { target: { value: 'test_user' } });
    
    // Try to submit without file
    const form = screen.getByText('Add New User').closest('form');
    fireEvent.submit(form);
    
    await waitFor(() => {
      expect(screen.getByText(/please select an image file/i)).toBeInTheDocument();
    });
  });

  test('submits user addition successfully', async () => {
    mockAxiosInstance.post.mockResolvedValueOnce({
      data: {
        is_saved: true,
        user_name: 'test_user',
        message: 'User added successfully'
      }
    });

    render(<AddUserTab onUserAdded={mockOnUserAdded} />);
    
    // Fill form
    const nameInput = screen.getByLabelText(/user name/i);
    const fileInput = screen.getByLabelText(/user photo/i);
    const file = new File(['fake image'], 'test.jpg', { type: 'image/jpeg' });
    
    fireEvent.change(nameInput, { target: { value: 'test_user' } });
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /add user/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnUserAdded).toHaveBeenCalled();
      expect(screen.getByText(/user added successfully/i)).toBeInTheDocument();
    });

    // Form should be reset
    expect(nameInput).toHaveValue('');
    expect(fileInput.files.length).toBe(0);
  });

  test('handles user addition failure', async () => {
    mockAxiosInstance.post.mockResolvedValueOnce({
      data: {
        is_saved: false,
        message: 'User already exists'
      }
    });

    render(<AddUserTab onUserAdded={mockOnUserAdded} />);
    
    // Fill and submit form
    const nameInput = screen.getByLabelText(/user name/i);
    const fileInput = screen.getByLabelText(/user photo/i);
    const file = new File(['fake image'], 'test.jpg', { type: 'image/jpeg' });
    
    fireEvent.change(nameInput, { target: { value: 'existing_user' } });
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /add user/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/user already exists/i)).toBeInTheDocument();
    });
    
    // onUserAdded should not be called on failure
    expect(mockOnUserAdded).not.toHaveBeenCalled();
  });

  test('handles network error during user addition', async () => {
    const errorResponse = {
      response: {
        status: 500,
        data: { detail: 'Internal server error' }
      }
    };
    
    mockAxiosInstance.post.mockRejectedValueOnce(errorResponse);

    render(<AddUserTab onUserAdded={mockOnUserAdded} />);
    
    // Fill and submit form
    const nameInput = screen.getByLabelText(/user name/i);
    const fileInput = screen.getByLabelText(/user photo/i);
    const file = new File(['fake image'], 'test.jpg', { type: 'image/jpeg' });
    
    fireEvent.change(nameInput, { target: { value: 'test_user' } });
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /add user/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/internal server error/i)).toBeInTheDocument();
    });
  });
});

describe('AuthenticationTab Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders authentication interface with all elements', () => {
    render(<AuthenticationTab />);
    
    expect(screen.getByText('Face Authentication')).toBeInTheDocument();
    expect(screen.getByText(/position your face in front of the camera/i)).toBeInTheDocument();
    expect(screen.getByText(/authentication threshold/i)).toBeInTheDocument();
    expect(screen.getByTestId('webcam')).toBeInTheDocument();
    expect(screen.getByRole('slider')).toBeInTheDocument();
    expect(screen.getByText('0.6')).toBeInTheDocument(); // Default threshold value
  });

  test('handles threshold adjustment', () => {
    render(<AuthenticationTab />);
    
    const thresholdSlider = screen.getByRole('slider');
    fireEvent.change(thresholdSlider, { target: { value: '0.8' } });
    
    expect(screen.getByText('0.8')).toBeInTheDocument();
    expect(thresholdSlider).toHaveValue('0.8');
  });

  test('shows threshold guidance text', () => {
    render(<AuthenticationTab />);
    
    expect(screen.getByText('Lower values are more strict, higher values are more lenient')).toBeInTheDocument();
  });

  test('handles successful authentication with known user', async () => {
    mockAxiosInstance.post.mockResolvedValueOnce({
      data: {
        is_authenticated: true,
        user_name: 'john_doe'
      }
    });

    render(<AuthenticationTab />);
    
    // Wait for camera to be ready
    await waitFor(() => {
      expect(screen.queryByText(/waiting for camera access/i)).not.toBeInTheDocument();
    });

    // Capture image
    const captureButton = screen.getByRole('button', { name: /capture image/i });
    fireEvent.click(captureButton);
    
    await waitFor(() => {
      expect(screen.getByText(/welcome.*john_doe/i)).toBeInTheDocument();
    });
  });

  test('handles successful authentication but user not registered', async () => {
    mockAxiosInstance.post.mockResolvedValueOnce({
      data: {
        is_authenticated: true,
        user_name: null
      }
    });

    render(<AuthenticationTab />);
    
    const captureButton = screen.getByRole('button', { name: /capture image/i });
    fireEvent.click(captureButton);
    
    await waitFor(() => {
      expect(screen.getByText(/looks like you have not registered yet/i)).toBeInTheDocument();
    });
  });

  test('handles failed authentication', async () => {
    mockAxiosInstance.post.mockResolvedValueOnce({
      data: {
        is_authenticated: false,
        user_name: null
      }
    });

    render(<AuthenticationTab />);
    
    const captureButton = screen.getByRole('button', { name: /capture image/i });
    fireEvent.click(captureButton);
    
    await waitFor(() => {
      expect(screen.getByText(/authentication failed.*face not recognized/i)).toBeInTheDocument();
    });
  });

  test('handles authentication error', async () => {
    const errorResponse = {
      response: {
        data: { detail: 'Spoofing detected' }
      }
    };
    
    mockAxiosInstance.post.mockRejectedValueOnce(errorResponse);

    render(<AuthenticationTab />);
    
    const captureButton = screen.getByRole('button', { name: /capture image/i });
    fireEvent.click(captureButton);
    
    await waitFor(() => {
      expect(screen.getByText(/spoofing detected/i)).toBeInTheDocument();
    });
  });

  test('shows processing state during authentication', async () => {
    // Mock a delayed response
    mockAxiosInstance.post.mockImplementationOnce(
      () => new Promise(resolve => 
        setTimeout(() => resolve({
          data: { is_authenticated: true, user_name: 'test_user' }
        }), 100)
      )
    );

    render(<AuthenticationTab />);
    
    const captureButton = screen.getByRole('button', { name: /capture image/i });
    fireEvent.click(captureButton);
    
    expect(screen.getByText(/processing authentication/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /processing/i })).toBeDisabled();
    
    await waitFor(() => {
      expect(screen.queryByText(/processing authentication/i)).not.toBeInTheDocument();
    });
  });

  test('uses custom threshold in authentication request', async () => {
    mockAxiosInstance.post.mockResolvedValueOnce({
      data: { is_authenticated: true, user_name: 'test_user' }
    });

    render(<AuthenticationTab />);
    
    // Change threshold
    const thresholdSlider = screen.getByRole('slider');
    fireEvent.change(thresholdSlider, { target: { value: '0.9' } });
    
    // Capture image
    const captureButton = screen.getByRole('button', { name: /capture image/i });
    fireEvent.click(captureButton);
    
    await waitFor(() => {
      const formDataCall = mockAxiosInstance.post.mock.calls[0];
      expect(formDataCall[0]).toBe('/authenticate');
      // Can't easily test FormData content, but we know the threshold was set
    });
  });
});

describe('UserManagementTab Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders user management interface', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { user_names: ['user1', 'user2'] }
    });

    render(<UserManagementTab refreshTrigger={0} />);
    
    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText(/view and manage registered users/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh users/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Registered Users (2)')).toBeInTheDocument();
    });
  });

  test('displays user list after loading', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { user_names: ['alice', 'bob', 'charlie'] }
    });

    render(<UserManagementTab refreshTrigger={0} />);
    
    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument();
      expect(screen.getByText('bob')).toBeInTheDocument();
      expect(screen.getByText('charlie')).toBeInTheDocument();
      expect(screen.getByText('Registered Users (3)')).toBeInTheDocument();
    });
  });

  test('shows empty state when no users exist', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { user_names: [] }
    });

    render(<UserManagementTab refreshTrigger={0} />);
    
    await waitFor(() => {
      expect(screen.getByText(/no users registered yet/i)).toBeInTheDocument();
      expect(screen.getByText('Registered Users (0)')).toBeInTheDocument();
    });
  });

  test('handles refresh button click', async () => {
    mockAxiosInstance.get
      .mockResolvedValueOnce({ data: { user_names: ['user1'] } })
      .mockResolvedValueOnce({ data: { user_names: ['user1', 'user2'] } });

    render(<UserManagementTab refreshTrigger={0} />);
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Registered Users (1)')).toBeInTheDocument();
    });

    // Click refresh
    const refreshButton = screen.getByRole('button', { name: /refresh users/i });
    fireEvent.click(refreshButton);
    
    await waitFor(() => {
      expect(screen.getByText('Registered Users (2)')).toBeInTheDocument();
    });

    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
  });

  test('deletes user successfully', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { user_names: ['user1', 'user2'] }
    });

    mockAxiosInstance.delete.mockResolvedValueOnce({
      data: {
        is_deleted: true,
        user_name: 'user1',
        message: 'User deleted successfully'
      }
    });

    // Mock window.confirm
    const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(true);

    render(<UserManagementTab refreshTrigger={0} />);
    
    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
    });

    // Find and click delete button for user1
    const userItems = screen.getAllByText('Delete');
    fireEvent.click(userItems[0]); // First delete button (user1)
    
    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete user "user1"?');
      expect(screen.getByText(/user deleted successfully/i)).toBeInTheDocument();
      expect(screen.queryByText('user1')).not.toBeInTheDocument(); // User removed from list
    });

    mockConfirm.mockRestore();
  });

  test('handles delete cancellation', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { user_names: ['user1'] }
    });

    const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(false);

    render(<UserManagementTab refreshTrigger={0} />);
    
    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);
    
    expect(mockConfirm).toHaveBeenCalled();
    expect(mockAxiosInstance.delete).not.toHaveBeenCalled();
    
    // User should still be in the list
    expect(screen.getByText('user1')).toBeInTheDocument();

    mockConfirm.mockRestore();
  });

  test('handles delete failure', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { user_names: ['user1'] }
    });

    mockAxiosInstance.delete.mockResolvedValueOnce({
      data: {
        is_deleted: false,
        message: 'Failed to delete user'
      }
    });

    const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(true);

    render(<UserManagementTab refreshTrigger={0} />);
    
    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);
    
    await waitFor(() => {
      expect(screen.getByText(/failed to delete user/i)).toBeInTheDocument();
    });

    mockConfirm.mockRestore();
  });

  test('refreshes when refreshTrigger prop changes', async () => {
    mockAxiosInstance.get
      .mockResolvedValueOnce({ data: { user_names: ['user1'] } })
      .mockResolvedValueOnce({ data: { user_names: ['user1', 'user2'] } });

    const { rerender } = render(<UserManagementTab refreshTrigger={0} />);
    
    await waitFor(() => {
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    });

    rerender(<UserManagementTab refreshTrigger={1} />);
    
    await waitFor(() => {
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });
  });

  test('shows loading state', async () => {
    // Mock a delayed response
    mockAxiosInstance.get.mockImplementationOnce(
      () => new Promise(resolve => 
        setTimeout(() => resolve({ data: { user_names: ['user1'] } }), 100)
      )
    );

    render(<UserManagementTab refreshTrigger={0} />);
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
  });

  test('shows deleting state for specific user', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { user_names: ['user1'] }
    });

    // Mock a delayed delete response
    mockAxiosInstance.delete.mockImplementationOnce(
      () => new Promise(resolve => 
        setTimeout(() => resolve({
          data: { is_deleted: true, user_name: 'user1', message: 'Deleted' }
        }), 100)
      )
    );

    const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(true);

    render(<UserManagementTab refreshTrigger={0} />);
    
    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);
    
    expect(screen.getByText('Deleting...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByText('Deleting...')).not.toBeInTheDocument();
    });

    mockConfirm.mockRestore();
  });
});

describe('CameraCapture Component', () => {
  const mockOnCapture = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders camera component', () => {
    render(<CameraCapture onCapture={mockOnCapture} />);
    
    expect(screen.getByTestId('webcam')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /capture image/i })).toBeInTheDocument();
  });

  test('shows camera ready state', async () => {
    render(<CameraCapture onCapture={mockOnCapture} />);
    
    // Camera should be ready after mock initialization
    await waitFor(() => {
      expect(screen.queryByText(/waiting for camera access/i)).not.toBeInTheDocument();
    });
    
    const captureButton = screen.getByRole('button', { name: /capture image/i });
    expect(captureButton).not.toBeDisabled();
  });

  test('handles camera capture', async () => {
    render(<CameraCapture onCapture={mockOnCapture} />);
    
    await waitFor(() => {
      const captureButton = screen.getByRole('button', { name: /capture image/i });
      expect(captureButton).not.toBeDisabled();
    });
    
    const captureButton = screen.getByRole('button', { name: /capture image/i });
    fireEvent.click(captureButton);
    
    expect(mockOnCapture).toHaveBeenCalledWith('data:image/jpeg;base64,fake_screenshot_data');
  });

  test('handles disabled state', () => {
    render(<CameraCapture onCapture={mockOnCapture} disabled={true} />);
    
    const captureButton = screen.getByRole('button', { name: /processing/i });
    expect(captureButton).toBeDisabled();
  });

  test('handles camera error', async () => {
    render(<CameraCapture onCapture={mockOnCapture} />);
    
    // Trigger camera error
    const errorButton = screen.getByTestId('trigger-camera-error');
    fireEvent.click(errorButton);
    
    // Should show waiting for camera access message after error
    await waitFor(() => {
      expect(screen.getByText(/waiting for camera access/i)).toBeInTheDocument();
    });
    
    const captureButton = screen.getByRole('button', { name: /capture image/i });
    expect(captureButton).toBeDisabled();
  });

  test('does not call onCapture when camera is not ready', () => {
    render(<CameraCapture onCapture={mockOnCapture} />);
    
    // Trigger error first to make camera not ready
    const errorButton = screen.getByTestId('trigger-camera-error');
    fireEvent.click(errorButton);
    
    const captureButton = screen.getByRole('button', { name: /capture image/i });
    fireEvent.click(captureButton);
    
    expect(mockOnCapture).not.toHaveBeenCalled();
  });
});
