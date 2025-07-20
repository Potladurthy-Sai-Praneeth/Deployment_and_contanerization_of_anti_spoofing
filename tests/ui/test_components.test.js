import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import AddUserTab from '../../../UI/src/components/AddUserTab';
import AuthenticationTab from '../../../UI/src/components/AuthenticationTab';
import UserManagementTab from '../../../UI/src/components/UserManagementTab';

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

    return (
      <div data-testid="webcam">
        <button onClick={() => onUserMedia && onUserMedia()}>Start Camera</button>
        <button onClick={() => onUserMediaError && onUserMediaError(new Error('Camera error'))}>
          Camera Error
        </button>
      </div>
    );
  });
});

describe('AddUserTab Component', () => {
  const mockOnUserAdded = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders add user form', () => {
    render(<AddUserTab onUserAdded={mockOnUserAdded} />);
    
    expect(screen.getByLabelText(/user name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/user photo/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add user/i })).toBeInTheDocument();
  });

  test('handles user name input', () => {
    render(<AddUserTab onUserAdded={mockOnUserAdded} />);
    
    const nameInput = screen.getByLabelText(/user name/i);
    fireEvent.change(nameInput, { target: { value: 'test_user' } });
    
    expect(nameInput).toHaveValue('test_user');
  });

  test('handles file selection', () => {
    render(<AddUserTab onUserAdded={mockOnUserAdded} />);
    
    const fileInput = screen.getByLabelText(/user photo/i);
    const file = new File(['fake image'], 'test.jpg', { type: 'image/jpeg' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    expect(fileInput.files[0]).toBe(file);
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
  });

  test('shows error for missing user name', async () => {
    render(<AddUserTab onUserAdded={mockOnUserAdded} />);
    
    const submitButton = screen.getByRole('button', { name: /add user/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a user name/i)).toBeInTheDocument();
    });
  });

  test('shows error for missing image', async () => {
    render(<AddUserTab onUserAdded={mockOnUserAdded} />);
    
    const nameInput = screen.getByLabelText(/user name/i);
    fireEvent.change(nameInput, { target: { value: 'test_user' } });
    
    const submitButton = screen.getByRole('button', { name: /add user/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/please select an image file/i)).toBeInTheDocument();
    });
  });
});

describe('AuthenticationTab Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders authentication interface', () => {
    render(<AuthenticationTab />);
    
    expect(screen.getByTestId('webcam')).toBeInTheDocument();
    expect(screen.getByText(/authentication threshold/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /capture image/i })).toBeInTheDocument();
  });

  test('handles threshold adjustment', () => {
    render(<AuthenticationTab />);
    
    const thresholdSlider = screen.getByRole('slider');
    fireEvent.change(thresholdSlider, { target: { value: '0.8' } });
    
    expect(screen.getByText('0.8')).toBeInTheDocument();
  });

  test('handles successful authentication', async () => {
    mockAxiosInstance.post.mockResolvedValueOnce({
      data: {
        is_authenticated: true,
        user_name: 'test_user'
      }
    });

    render(<AuthenticationTab />);
    
    // Start camera first
    const startCameraButton = screen.getByText('Start Camera');
    fireEvent.click(startCameraButton);
    
    // Capture image
    const captureButton = screen.getByRole('button', { name: /capture image/i });
    fireEvent.click(captureButton);
    
    await waitFor(() => {
      expect(screen.getByText(/welcome.*test_user/i)).toBeInTheDocument();
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
    
    const startCameraButton = screen.getByText('Start Camera');
    fireEvent.click(startCameraButton);
    
    const captureButton = screen.getByRole('button', { name: /capture image/i });
    fireEvent.click(captureButton);
    
    await waitFor(() => {
      expect(screen.getByText(/authentication failed/i)).toBeInTheDocument();
    });
  });
});

describe('UserManagementTab Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders user list', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: {
        user_names: ['user1', 'user2', 'user3']
      }
    });

    render(<UserManagementTab refreshTrigger={0} />);
    
    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
      expect(screen.getByText('user2')).toBeInTheDocument();
      expect(screen.getByText('user3')).toBeInTheDocument();
      expect(screen.getByText('Registered Users (3)')).toBeInTheDocument();
    });
  });

  test('renders empty state when no users', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: {
        user_names: []
      }
    });

    render(<UserManagementTab refreshTrigger={0} />);
    
    await waitFor(() => {
      expect(screen.getByText(/no users registered yet/i)).toBeInTheDocument();
    });
  });

  test('deletes user successfully', async () => {
    // Mock initial user fetch
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: {
        user_names: ['user1', 'user2']
      }
    });

    // Mock delete response
    mockAxiosInstance.delete.mockResolvedValueOnce({
      data: {
        is_deleted: true,
        user_name: 'user1',
        message: 'User deleted successfully'
      }
    });

    // Mock confirm dialog
    window.confirm = jest.fn(() => true);

    render(<UserManagementTab refreshTrigger={0} />);
    
    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);
    
    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete user "user1"?');
      expect(screen.getByText(/user deleted successfully/i)).toBeInTheDocument();
    });
  });

  test('handles delete cancellation', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: {
        user_names: ['user1']
      }
    });

    window.confirm = jest.fn(() => false);

    render(<UserManagementTab refreshTrigger={0} />);
    
    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);
    
    expect(window.confirm).toHaveBeenCalled();
    expect(mockAxiosInstance.delete).not.toHaveBeenCalled();
  });

  test('refreshes user list when refreshTrigger changes', async () => {
    mockAxiosInstance.get.mockResolvedValue({
      data: {
        user_names: ['user1']
      }
    });

    const { rerender } = render(<UserManagementTab refreshTrigger={0} />);
    
    await waitFor(() => {
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    });

    rerender(<UserManagementTab refreshTrigger={1} />);
    
    await waitFor(() => {
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });
  });
});
