import { useState } from 'react'
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
} from 'firebase/auth'
import { auth, googleProvider } from './firebase'
import './Login.css'

// Google "G" logo SVG
const GoogleIcon = (
    <svg viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
)

// Warmr target icon (matches the nav logo)
const TargetIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
)

const ERROR_MESSAGES = {
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/popup-closed-by-user': 'Sign-in popup was closed. Please try again.',
}

function friendlyError(code) {
    return ERROR_MESSAGES[code] || 'Something went wrong. Please try again.'
}

export default function Login() {
    const [isSignUp, setIsSignUp] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            if (isSignUp) {
                await createUserWithEmailAndPassword(auth, email, password)
            } else {
                await signInWithEmailAndPassword(auth, email, password)
            }
        } catch (err) {
            setError(friendlyError(err.code))
        } finally {
            setLoading(false)
        }
    }

    async function handleGoogleSignIn() {
        setError('')
        setLoading(true)

        try {
            await signInWithPopup(auth, googleProvider)
        } catch (err) {
            if (err.code !== 'auth/popup-closed-by-user') {
                setError(friendlyError(err.code))
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="login-page">
            {/* Decorative background circle */}
            <div className="login-bg-circle" />

            <div className="login-card">
                {/* Brand */}
                <div className="login-brand">
                    {TargetIcon}
                    <span className="login-brand-name">Warmr</span>
                </div>
                <p className="login-subtitle">
                    {isSignUp ? 'Create your account' : 'Sign in to your pipeline'}
                </p>

                {/* Error */}
                {error && <div className="login-error">{error}</div>}

                {/* Form */}
                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="login-email">Email</label>
                        <input
                            id="login-email"
                            type="email"
                            className="form-input"
                            placeholder="you@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="login-password">Password</label>
                        <input
                            id="login-password"
                            type="password"
                            className="form-input"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            minLength={6}
                            autoComplete={isSignUp ? 'new-password' : 'current-password'}
                        />
                    </div>

                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? 'Please wait…' : isSignUp ? 'Create Account' : 'Sign In'}
                    </button>
                </form>

                {/* Divider */}
                <div className="login-divider"><span>or</span></div>

                {/* Google sign-in */}
                <button className="login-google-btn" onClick={handleGoogleSignIn} disabled={loading}>
                    {GoogleIcon}
                    Continue with Google
                </button>

                {/* Toggle */}
                <div className="login-toggle">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                    <button onClick={() => { setIsSignUp(prev => !prev); setError('') }}>
                        {isSignUp ? 'Sign In' : 'Sign Up'}
                    </button>
                </div>
            </div>
        </div>
    )
}
