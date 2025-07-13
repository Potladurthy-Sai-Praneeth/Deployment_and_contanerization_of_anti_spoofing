import React, { useState } from 'react';
import AuthenticationTab from './components/AuthenticationTab';
import AddUserTab from './components/AddUserTab';
import UserManagementTab from './components/UserManagementTab';

function App() {
  const [activeTab, setActiveTab] = useState('authenticate');
  const [userRefreshTrigger, setUserRefreshTrigger] = useState(0);

  const tabs = [
    { id: 'authenticate', label: 'Authenticate', component: AuthenticationTab },
    { id: 'addUser', label: 'Add User', component: AddUserTab },
    { id: 'manageUsers', label: 'Manage Users', component: UserManagementTab }
  ];

  const handleUserAdded = () => {
    // Trigger refresh of user list
    setUserRefreshTrigger(prev => prev + 1);
    // Switch to manage users tab to show the newly added user
    setActiveTab('manageUsers');
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'authenticate':
        return <AuthenticationTab />;
      case 'addUser':
        return <AddUserTab onUserAdded={handleUserAdded} />;
      case 'manageUsers':
        return <UserManagementTab refreshTrigger={userRefreshTrigger} />;
      default:
        return <AuthenticationTab />;
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Anti-Spoofing Face Recognition</h1>
        <p>Secure face authentication with anti-spoofing detection</p>
      </div>

      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {renderActiveTab()}
      </div>
    </div>
  );
}

export default App;
