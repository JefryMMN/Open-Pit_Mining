import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';

// Regex patterns
const USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]{3,19}$/; // Starts with letter, 4-20 chars, alphanumeric + underscore
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/; // Min 6 chars, at least 1 letter and 1 number

export const LoginPage: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
    const [touched, setTouched] = useState<{ username?: boolean; password?: boolean }>({});
    const setIsLoggedIn = useAppStore((s) => s.setIsLoggedIn);

    const validateUsername = (value: string): string | undefined => {
        if (!value.trim()) return 'Username is required';
        if (!USERNAME_REGEX.test(value)) {
            return 'Username must be 4-20 characters, start with a letter, and contain only letters, numbers, or underscores';
        }
        return undefined;
    };

    const validatePassword = (value: string): string | undefined => {
        if (!value.trim()) return 'Password is required';
        if (!PASSWORD_REGEX.test(value)) {
            return 'Password must be at least 6 characters with at least 1 letter and 1 number';
        }
        return undefined;
    };

    const handleUsernameChange = (value: string) => {
        setUsername(value);
        if (touched.username) {
            setErrors(prev => ({ ...prev, username: validateUsername(value) }));
        }
    };

    const handlePasswordChange = (value: string) => {
        setPassword(value);
        if (touched.password) {
            setErrors(prev => ({ ...prev, password: validatePassword(value) }));
        }
    };

    const handleBlur = (field: 'username' | 'password') => {
        setTouched(prev => ({ ...prev, [field]: true }));
        if (field === 'username') {
            setErrors(prev => ({ ...prev, username: validateUsername(username) }));
        } else {
            setErrors(prev => ({ ...prev, password: validatePassword(password) }));
        }
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();

        const usernameError = validateUsername(username);
        const passwordError = validatePassword(password);

        setErrors({ username: usernameError, password: passwordError });
        setTouched({ username: true, password: true });

        if (!usernameError && !passwordError) {
            setIsLoggedIn(true);
        }
    };

    return (
        <div className="login-page">
            <h1 className="login-floating-title">Mining Monitoring System</h1>

            <form onSubmit={handleLogin} className="login-container">
                <div className="login-field">
                    <input
                        type="text"
                        placeholder="Username"
                        className={`login-input ${errors.username && touched.username ? 'input-error' : ''}`}
                        value={username}
                        onChange={(e) => handleUsernameChange(e.target.value)}
                        onBlur={() => handleBlur('username')}
                    />
                    {errors.username && touched.username && (
                        <span className="error-text">{errors.username}</span>
                    )}
                </div>
                <div className="login-field">
                    <input
                        type="password"
                        placeholder="Password"
                        className={`login-input ${errors.password && touched.password ? 'input-error' : ''}`}
                        value={password}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        onBlur={() => handleBlur('password')}
                    />
                    {errors.password && touched.password && (
                        <span className="error-text">{errors.password}</span>
                    )}
                </div>
                <button type="submit" className="login-btn">Login</button>
                <p className="login-footer-text">Government Access Only</p>
            </form>
        </div>
    );
};
