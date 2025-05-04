import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

const LoginPage = () => {
    const [selectedRole, setSelectedRole] = useState(null);
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const navigate = useNavigate();

    const roles = ['Clerk', 'Supervisor', 'Admin', 'Mayor'];

    const handleLogin = () => {
        if (!selectedRole) {
            alert('Please select a role');
            return;
        }

        // Here you would typically verify credentials first
        // For now, we'll just navigate based on role
        switch(selectedRole) {
            case 'Clerk':
                navigate('/CleckPage');
                break;
            case 'Supervisor':
                navigate('/SupervisorPage');
                break;
            case 'Admin':
                navigate('/AdministratorPage');
                break;
            case 'Mayor':
                navigate('/MayorPage');
                break;
            default:
                alert('Invalid role selected');
        }
    };

    return (
        <div className='login-page'>
            <div className="login-container">
                <div className="logo">
                    <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#3498db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                        <path d="M3.27 6.96L12 12.01l8.73-5.05"></path>
                        <path d="M12 22.08V12"></path>
                    </svg>
                    <h1>RRTS</h1>
                    <p>Road Repair Tracking System</p>
                </div>

                <div className="form">
                    <p>Username</p>
                    <input 
                        type="text" 
                        id="username" 
                        placeholder="Enter your username" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="inputs" 
                    />
                    <p>Password</p>
                    <input 
                        id="password" 
                        className="inputs" 
                        placeholder="Enter your password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type="password" 
                    />
                </div>

                <div className="roles-grid">
                    {roles.map((role) => (
                        <div 
                        key={role}
                        className={`roles-items ${selectedRole === role ? 'selected' : ''}`}
                        onClick={() => setSelectedRole(role)}
                        >
                            {role}
                        </div>
                    ))}
                </div>

                <button onClick={handleLogin}>Login</button>
                <p className="FPW">Forgot password?</p>
            </div>
        </div>
    );
};

export default LoginPage;