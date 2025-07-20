import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

// Mock components to isolate App component testing
jest.mock('../../../UI/src/components/AuthenticationTab', () => {
  return function MockAuthenticationTab() {
    return <div data-testid="authentication-tab">Authentication Tab</div>;
  };
});

jest.mock('../../../UI/src/components/AddUserTab', () => {
  return function MockAddUserTab({ onUserAdded }) {
    return (
      <div data-testid="add-user-tab">
        Add User Tab
        <button onClick={onUserAdded} data-testid="mock-add-user">Add User</button>
      </div>
    );
  };
});

jest.mock('../../../UI/src/components/UserManagementTab', () => {
  return function MockUserManagementTab({ refreshTrigger }) {
    return (
      <div data-testid="user-management-tab">
        User Management Tab - Refresh: {refreshTrigger}
      </div>
    );
  };
});

// Mock react-webcam
jest.mock('react-webcam', () => {
  return function MockWebcam() {
    return <div data-testid="webcam">Mock Webcam</div>;
  };
});

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders App component with header and tabs', () => {
    render(<App />);
    
    // Check header
    expect(screen.getByText('Anti-Spoofing Face Recognition')).toBeInTheDocument();
    expect(screen.getByText('Secure face authentication with anti-spoofing detection')).toBeInTheDocument();
    
    // Check if tab buttons are rendered
    expect(screen.getByText('Authenticate')).toBeInTheDocument();
    expect(screen.getByText('Add User')).toBeInTheDocument();
    expect(screen.getByText('Manage Users')).toBeInTheDocument();
  });

  test('renders authentication tab by default', () => {
    render(<App />);
    
    // Authentication tab should be active by default
    expect(screen.getByTestId('authentication-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('add-user-tab')).not.toBeInTheDocument();
    expect(screen.queryByTestId('user-management-tab')).not.toBeInTheDocument();
  });

  test('switches to add user tab when clicked', () => {
    render(<App />);
    
    // Click on Add User tab
    fireEvent.click(screen.getByText('Add User'));
    
    // Add User tab should be active
    expect(screen.getByTestId('add-user-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('authentication-tab')).not.toBeInTheDocument();
    expect(screen.queryByTestId('user-management-tab')).not.toBeInTheDocument();
  });

  test('switches to manage users tab when clicked', () => {
    render(<App />);
    
    // Click on Manage Users tab
    fireEvent.click(screen.getByText('Manage Users'));
    
    // Manage Users tab should be active
    expect(screen.getByTestId('user-management-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('authentication-tab')).not.toBeInTheDocument();
    expect(screen.queryByTestId('add-user-tab')).not.toBeInTheDocument();
  });

  test('handles user added callback correctly', () => {
    render(<App />);
    
    // Switch to Add User tab
    fireEvent.click(screen.getByText('Add User'));
    expect(screen.getByTestId('add-user-tab')).toBeInTheDocument();
    
    // Simulate user addition
    fireEvent.click(screen.getByTestId('mock-add-user'));
    
    // Should switch to Manage Users tab
    expect(screen.getByTestId('user-management-tab')).toBeInTheDocument();
    expect(screen.getByText('User Management Tab - Refresh: 1')).toBeInTheDocument();
  });

  test('increments refresh trigger on multiple user additions', () => {
    render(<App />);
    
    // Switch to Add User tab and add first user
    fireEvent.click(screen.getByText('Add User'));
    fireEvent.click(screen.getByTestId('mock-add-user'));
    expect(screen.getByText('User Management Tab - Refresh: 1')).toBeInTheDocument();
    
    // Switch back to Add User tab and add second user
    fireEvent.click(screen.getByText('Add User'));
    fireEvent.click(screen.getByTestId('mock-add-user'));
    expect(screen.getByText('User Management Tab - Refresh: 2')).toBeInTheDocument();
  });

  test('tab buttons have correct active state styling', () => {
    render(<App />);
    
    const authenticateButton = screen.getByText('Authenticate').closest('button');
    const addUserButton = screen.getByText('Add User').closest('button');
    const manageUsersButton = screen.getByText('Manage Users').closest('button');
    
    // Authenticate should be active by default
    expect(authenticateButton).toHaveClass('tab', 'active');
    expect(addUserButton).toHaveClass('tab');
    expect(addUserButton).not.toHaveClass('active');
    expect(manageUsersButton).toHaveClass('tab');
    expect(manageUsersButton).not.toHaveClass('active');
    
    // Switch to Add User
    fireEvent.click(addUserButton);
    expect(authenticateButton).not.toHaveClass('active');
    expect(addUserButton).toHaveClass('tab', 'active');
    expect(manageUsersButton).not.toHaveClass('active');
    
    // Switch to Manage Users
    fireEvent.click(manageUsersButton);
    expect(authenticateButton).not.toHaveClass('active');
    expect(addUserButton).not.toHaveClass('active');
    expect(manageUsersButton).toHaveClass('tab', 'active');
  });

  test('handles rapid tab switching', () => {
    render(<App />);
    
    const tabs = ['Add User', 'Manage Users', 'Authenticate', 'Add User', 'Manage Users'];
    const expectedComponents = [
      'add-user-tab',
      'user-management-tab', 
      'authentication-tab',
      'add-user-tab',
      'user-management-tab'
    ];
    
    tabs.forEach((tabName, index) => {
      fireEvent.click(screen.getByText(tabName));
      expect(screen.getByTestId(expectedComponents[index])).toBeInTheDocument();
    });
  });

  test('maintains correct tab state after user addition flow', () => {
    render(<App />);
    
    // Start on authentication tab
    expect(screen.getByTestId('authentication-tab')).toBeInTheDocument();
    
    // Switch to add user tab
    fireEvent.click(screen.getByText('Add User'));
    expect(screen.getByTestId('add-user-tab')).toBeInTheDocument();
    
    // Add user (this should switch to manage users tab)
    fireEvent.click(screen.getByTestId('mock-add-user'));
    expect(screen.getByTestId('user-management-tab')).toBeInTheDocument();
    
    // Switch back to authenticate tab
    fireEvent.click(screen.getByText('Authenticate'));
    expect(screen.getByTestId('authentication-tab')).toBeInTheDocument();
  });
});
