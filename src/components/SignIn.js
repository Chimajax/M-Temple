import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { firebaseConfig } from '../firebaseConfig';
import './SignIn.css';
import eyeIcon from '../assets/icons/eye-icon.png'; // Import the eye icon

// Initialize Firebase
initializeApp(firebaseConfig);
const db = getFirestore();
const auth = getAuth();

const SignIn = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false); // State for "Remember me" checkbox
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false); // State to manage password visibility
  const [loading, setLoading] = useState(false);
  const [dialogueMessage, setDialogueMessage] = useState('');
  const [showDialogue, setShowDialogue] = useState(false);

  // Load saved email and password from local storage if "Remember me" is checked
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedPassword = localStorage.getItem('rememberedPassword');
    const savedRememberMe = JSON.parse(localStorage.getItem('rememberMe'));

    if (savedRememberMe) {
      setEmail(savedEmail || '');
      setPassword(savedPassword || '');
      setRememberMe(true);
    }
  }, []);

  const validate = () => {
    const errors = {};
    if (!email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Email address must be valid';
    }
    if (!password) {
      errors.password = 'Password is required';
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
    } else {
      setLoading(true); // Start loading
      try {
        await signInWithEmailAndPassword(auth, email, password);
        const user = auth.currentUser;

        // Update Firestore `signedIn` status to `true`
        await updateDoc(doc(db, 'users', user.uid), {
          signedIn: true
        });

        // Save to localStorage if "Remember me" is checked
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
          localStorage.setItem('rememberedPassword', password);
          localStorage.setItem('rememberMe', JSON.stringify(true));
        } else {
          localStorage.removeItem('rememberedEmail');
          localStorage.removeItem('rememberedPassword');
          localStorage.setItem('rememberMe', JSON.stringify(false));
        }

        setDialogueMessage('Sign In Successful');
        setShowDialogue(true);

        // Redirect to the home page after 2 seconds
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } catch (error) {
        let errorMessage = 'Failed: '; // Base message

        switch (error.code) {
          case 'auth/wrong-password':
            case 'auth/invalid-credential': 
            errorMessage += 'Wrong email or Password';
            console.log('wrong password');
            break;
          case 'firebase/auth/user-not-found':
            errorMessage += 'No user found with this email';
            break;
          case 'firebase/auth/invalid-email':
            errorMessage += 'Invalid Email Address';
            break;
          case 'firebase/auth/network-request-failed':
            errorMessage += 'Network error. Please try again later.';
            break;
          default:
            errorMessage = `An error occurred: ${error.message}`; // Generic fallback message
            console.log('not working');
        }

        setErrors({ ...errors, password: errorMessage }); // Set error message for the password field
        setDialogueMessage(errorMessage);
        setShowDialogue(true);
      } finally {
        setLoading(false); // End loading
      }
    }
  };

  return (
    <div className="sign-in-container">
      <form onSubmit={handleSubmit} noValidate>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErrors({ ...errors, email: '' });
          }}
        />
        {errors.email && <p className="error-text">{errors.email}</p>}

        <div className="password-container">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrors({ ...errors, password: '' });
            }}
          />
          <img
            src={eyeIcon}
            alt="Toggle password visibility"
            className="eye-icon"
            onClick={() => setShowPassword(!showPassword)}
          />
        </div>
        {errors.password && <p className="error-text">{errors.password}</p>}

        <div className="remember-me-container">
          <input
            type="checkbox"
            id="rememberMe"
            checked={rememberMe}
            onChange={() => setRememberMe(!rememberMe)}
          />
          <label htmlFor="rememberMe">Remember me</label>
        </div>

        <button type="submit">Sign In</button>
      </form>

      <p className="forgot-password">
        <Link to="#">Forgot Password?</Link>
      </p>

      <p className="register-link">
        Don't have an account? <Link to="/register">Click REGISTER</Link>
      </p>

      <h2 className="or-divider">OR</h2>

      <button className="google-signin">Continue with Google</button>

      {loading && (
        <div className="loading-circle"></div> // Loading circle element
      )}

      {showDialogue && (
        <div className="register-dialogue-box">
          <p>{dialogueMessage}</p>
          <button onClick={() => setShowDialogue(false)}>OK</button>
        </div>
      )}
    </div>
  );
};

export default SignIn;
