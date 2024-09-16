import React, { useState } from 'react';
import './Register.css';
import eyeIcon from '../assets/icons/eye-icon.png';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { firebaseConfig } from '../firebaseConfig';
import { Link, useNavigate } from 'react-router-dom';

initializeApp(firebaseConfig);
const db = getFirestore();
const auth = getAuth();

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    nationality: '',
    email: '',
    password: '',
    confirmPassword: '',
    termsAccepted: false,
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [dialogueMessage, setDialogueMessage] = useState('');
  const [showDialogue, setShowDialogue] = useState(false);
  const [loading, setLoading] = useState(false); // State to manage the loading indicator

  const validate = () => {
    const errors = {};
    if (!form.firstName) errors.firstName = 'First name is required';
    if (!form.lastName) errors.lastName = 'Last name is required';
    if (!form.nationality) errors.nationality = 'Nationality is required';
    if (!form.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      errors.email = 'Email address must be valid';
    }
    if (!form.password) {
      errors.password = 'Password is required';
    } else if (form.password.length < 8 || !/\d/.test(form.password)) {
      errors.password = 'Weak password, please add a number and ensure it is at least 8 characters long';
    }
    if (form.password !== form.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    if (!form.termsAccepted) errors.termsAccepted = 'You must accept the terms to proceed';
    return errors;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value
    });
    setErrors({
      ...errors,
      [name]: '' // Clear error on change
    });
  };

  const sendTelegramNotification = async (firstName, email) => {
    const botToken = '7289905112:AAEUKiAq1S9X8mDt8RYESVbPU6wYlirN72c';
    const chatId = '1395717860';
    const message = `${firstName} just signed up for M-Temple.\n\nEmail: ${email}`;
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(message)}`;

    try {
      await fetch(telegramUrl);
    } catch (error) {
      console.error('Error sending Telegram message:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
    } else {
      setLoading(true); // Start loading
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
        const user = userCredential.user;

        await setDoc(doc(db, 'users', user.uid), {
          Balance: 0,
          firstName: form.firstName,
          lastName: form.lastName,
          nationality: form.nationality,
          email: form.email,
          accountActive: true,
          signedIn: true, // Automatically sign in user
          username: `@${form.firstName}`,
          bio: 'Hi, I am new here',
          plan: 'FREE',
          profilepic: 0,
          quotes: 0,
          books: 0,
          images: 0,
          videos: 0,
          followers: 0,
          followings: 0,
        });

        // Send Telegram notification
        await sendTelegramNotification(form.firstName, form.email);

        setDialogueMessage('Registration Successful');
      } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
          setDialogueMessage('Account Already Exists');
        } else {
          console.error('Error during registration:', error.message);
          setDialogueMessage('Failed, Retry Registration');
        }
      } finally {
        setLoading(false); // End loading
        setShowDialogue(true);
      }

      // Redirect to page after 2 seconds if successful or account already exists
      if (dialogueMessage === 'Registration Successful') {
        setTimeout(() => {
          navigate('/editprofile');
        }, 1000);
      } else if (dialogueMessage === 'Account Already Exists') {
        setTimeout(() => {
          navigate('/');
        }, 1000);
      }
    }
  };

  return (
    <div className="register-container">
      <form onSubmit={handleSubmit} noValidate>
        <input
          type="text"
          name="firstName"
          placeholder="First Name"
          value={form.firstName}
          onChange={handleChange}
        />
        {errors.firstName && <p className="error-text">{errors.firstName}</p>}

        <input
          type="text"
          name="lastName"
          placeholder="Last Name"
          value={form.lastName}
          onChange={handleChange}
        />
        {errors.lastName && <p className="error-text">{errors.lastName}</p>}

        <input
          type="text"
          name="nationality"
          placeholder="Nationality"
          value={form.nationality}
          onChange={handleChange}
        />
        {errors.nationality && <p className="error-text">{errors.nationality}</p>}

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
        />
        {errors.email && <p className="error-text">{errors.email}</p>}

        <div className="password-container">
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
          />
          <img
            src={eyeIcon}
            alt="Toggle password visibility"
            className="eye-icon"
            onClick={() => setShowPassword(!showPassword)}
          />
        </div>
        {errors.password && <p className="error-text">{errors.password}</p>}

        <div className="password-container">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            name="confirmPassword"
            placeholder="Confirm Password"
            value={form.confirmPassword}
            onChange={handleChange}
          />
          <img
            src={eyeIcon}
            alt="Toggle confirm password visibility"
            className="eye-icon"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          />
        </div>
        {errors.confirmPassword && <p className="error-text">{errors.confirmPassword}</p>}

        <div className="checkbox-group">
          <input
            type="checkbox"
            name="termsAccepted"
            checked={form.termsAccepted}
            onChange={handleChange}
          />
          <label>
            I accept the <Link to="/about">Terms and Services</Link>
          </label>
          {errors.termsAccepted && <p className="error-text">{errors.termsAccepted}</p>}
        </div>

        <button type="submit">Register</button>
      </form>

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

export default Register;
