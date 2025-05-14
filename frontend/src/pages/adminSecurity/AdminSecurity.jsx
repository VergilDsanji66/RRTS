import React, { useState, useEffect } from 'react';
import { ref, get, set, remove } from 'firebase/database';
import { database } from '../../firebase/firebase';
import { FaEye, FaEyeSlash } from 'react-icons/fa'; // Import eye icons

const AdminSecurity = () => {
    const [users, setUsers] = useState([]);
    const [newUser, setNewUser] = useState({
        username: '',
        password: '',
        role: 'Clerk',
        district: ''
    });
    const [isEditing, setIsEditing] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false); // State for password visibility

    const roles = ['Clerk', 'Supervisor', 'Admin', 'Mayor'];
    const districts = ['North', 'South', 'East', 'West'];

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const usersRef = ref(database, 'users');
            const snapshot = await get(usersRef);
            if (snapshot.exists()) {
                const usersData = snapshot.val();
                const usersArray = Object.keys(usersData).map(key => ({
                    id: key,
                    ...usersData[key]
                }));
                setUsers(usersArray);
            } else {
                setUsers([]);
            }
        } catch (err) {
            setError('Failed to fetch users');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewUser(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (!newUser.username || !newUser.password) {
            setError('Username and password are required');
            return;
        }

        if (newUser.role === 'Supervisor' && !newUser.district) {
            setError('District is required for Supervisors');
            return;
        }

        setLoading(true);
        try {
            const userRef = ref(database, `users/${newUser.username}`);
            
            if (isEditing) {
                // Update existing user
                await set(userRef, {
                    username: newUser.username,
                    password: newUser.password,
                    role: newUser.role,
                    district: newUser.role === 'Supervisor' ? newUser.district : null
                });
            } else {
                // Check if user already exists
                const snapshot = await get(userRef);
                if (snapshot.exists()) {
                    throw new Error('User already exists');
                }
                
                // Create new user
                await set(userRef, {
                    username: newUser.username,
                    password: newUser.password,
                    role: newUser.role,
                    district: newUser.role === 'Supervisor' ? newUser.district : null
                });
            }
            
            await fetchUsers();
            resetForm();
        } catch (err) {
            setError(err.message || 'Failed to save user');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const editUser = (user) => {
        setNewUser({
            username: user.username,
            password: user.password,
            role: user.role,
            district: user.district || ''
        });
        setIsEditing(user.id);
    };

    const deleteUser = async (userId) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            setLoading(true);
            try {
                const userRef = ref(database, `users/${userId}`);
                await remove(userRef);
                await fetchUsers();
            } catch (err) {
                setError('Failed to delete user');
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
    };

    const resetForm = () => {
        setNewUser({
            username: '',
            password: '',
            role: 'Clerk',
            district: ''
        });
        setIsEditing(null);
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <div className="cleck">
            <h1>User Management</h1>
            
            <div className="cleck-container">
                <h3 style={{margin: '1rem 0'}}>{isEditing ? 'Edit User' : 'Add New User'}</h3>
                
                <form onSubmit={handleSubmit} className="Complaint-container">
                    {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
                    
                    <div className="Complaint-grid">
                        <div className="complaint-grid-item">
                            <label>Username</label>
                            <input
                                type="text"
                                name="username"
                                value={newUser.username}
                                onChange={handleInputChange}
                                className="inputs"
                                disabled={isEditing}
                                required
                            />
                        </div>
                        
                        <div className="complaint-grid-item">
                            <label>Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={newUser.password}
                                    onChange={handleInputChange}
                                    className="inputs"
                                    required
                                    style={{ width: '100%', paddingRight: '2.5rem' }}
                                />
                                <button
                                    type="button"
                                    onClick={togglePasswordVisibility}
                                    style={{
                                        position: 'absolute',
                                        right: '0.5rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#666'
                                    }}
                                >
                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                        </div>
                        
                        <div className="complaint-grid-item">
                            <label>Role</label>
                            <select
                                name="role"
                                value={newUser.role}
                                onChange={handleInputChange}
                                className="inputs"
                                required
                            >
                                {roles.map(role => (
                                    <option key={role} value={role}>{role}</option>
                                ))}
                            </select>
                        </div>
                        
                        {newUser.role === 'Supervisor' && (
                            <div className="complaint-grid-item">
                                <label>District</label>
                                <select
                                    name="district"
                                    value={newUser.district}
                                    onChange={handleInputChange}
                                    className="inputs"
                                    required={newUser.role === 'Supervisor'}
                                >
                                    <option value="">Select District</option>
                                    {districts.map(district => (
                                        <option key={district} value={district}>{district}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button type="submit" disabled={loading}>
                            {loading ? 'Processing...' : isEditing ? 'Update User' : 'Add User'}
                        </button>
                        {isEditing && (
                            <button type="button" onClick={resetForm} className="secondary">
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </div>
            
            <div className="entries-container">
                <h3 style={{margin: '1rem 0'}}>User List</h3>
                
                <div className="entries">
                    <div className="entries-header">
                        <span style={{ flex: 2 }}>Username</span>
                        <span style={{ flex: 1 }}>Role</span>
                        <span style={{ flex: 1 }}>District</span>
                        <span style={{ flex: 1 }}>Actions</span>
                    </div>
                    
                    {loading && !users.length ? (
                        <div>Loading users...</div>
                    ) : users.length === 0 ? (
                        <div>No users found</div>
                    ) : (
                        users.map(user => (
                            <div key={user.id} className="entries-item">
                                <span style={{ flex: 2 }}>{user.username}</span>
                                <span style={{ flex: 1 }}>{user.role}</span>
                                <span style={{ flex: 1 }}>{user.district || '-'}</span>
                                <span style={{ flex: 1, display: 'flex', gap: '0.5rem' }}>
                                    <button 
                                        onClick={() => editUser(user)} 
                                        style={{ 
                                            padding: '0.3rem 0.6rem',
                                            backgroundColor: '#3498db',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '0.3rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Edit
                                    </button>
                                    <button 
                                        onClick={() => deleteUser(user.id)} 
                                        style={{ 
                                            padding: '0.3rem 0.6rem',
                                            backgroundColor: '#e74c3c',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '0.3rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Delete
                                    </button>
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminSecurity;