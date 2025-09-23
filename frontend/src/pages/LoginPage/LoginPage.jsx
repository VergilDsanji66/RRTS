import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { database } from '../../firebase/firebase';
import './LoginPage.css';

const LoginPage = () => {
    const [selectedRole, setSelectedRole] = useState(null);
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const roles = ['Clerk', 'Supervisor', 'Admin', 'Mayor'];

    const handleLogin = async () => {
        setError('');
        setLoading(true);

        if (!username || !password || !selectedRole) {
            setError('All fields are required');
            setLoading(false);
            return;
        }

        try {
            // Check if user exists in database
            const userRef = ref(database, `users/${username}`);
            const snapshot = await get(userRef);

            if (!snapshot.exists()) {
                throw new Error('Invalid username or password');
            }

            const userData = snapshot.val();

            // Verify password and role
            if (userData.password !== password) {
                throw new Error('Invalid username or password');
            }

            if (userData.role !== selectedRole) {
                throw new Error(`You don't have ${selectedRole} privileges`);
            }

            // For Supervisor, check if district exists if required
            if (selectedRole === 'Supervisor' && !userData.district) {
                throw new Error('District information missing for supervisor');
            }

            // Login successful - navigate to appropriate page with user data
            const userInfo = {
                username: userData.username,
                role: userData.role,
                district: userData.district || null
            };

            switch(selectedRole) {
                case 'Clerk':
                    navigate('/CleckPage', { state: { user: userInfo } });
                    break;
                case 'Supervisor':
                    navigate('/SupervisorPage', { state: { user: userInfo } });
                    break;
                case 'Admin':
                    navigate('/AdministratorPage', { state: { user: userInfo } });
                    break;
                case 'Mayor':
                    navigate('/MayorPage', { state: { user: userInfo } });
                    break;
                default:
                    throw new Error('Invalid role selected');
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleLogin();
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
                        onKeyPress={handleKeyPress}
                        className="inputs" 
                    />
                    <p>Password</p>
                    <input 
                        id="password" 
                        className="inputs" 
                        placeholder="Enter your password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyPress={handleKeyPress}
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

                <button onClick={handleLogin} disabled={loading}>
                    {loading ? 'Logging in...' : 'Login'}
                </button>
                
                {error && (
                    <div className="error-message" style={{ 
                        color: 'red', 
                        marginTop: '10px',
                        textAlign: 'center',
                        fontSize: '14px'
                    }}>
                        {error}
                    </div>
                )}

                <p className="FPW">Forgot password?</p>
            </div>
            <p>For testing purposes: Select Admin, username: Admin and password: Admin</p>
        </div>
    );
};

export default LoginPage;