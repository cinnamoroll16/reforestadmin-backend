// utils/emailValidation.js - Utility functions for email validation

// Extended list of disposable email domains
export const disposableEmailDomains = [
  // 10 minute emails
  '10minutemail.com', '10minutemail.net', '20minutemail.com',
  // Temp emails
  'tempmail.org', 'temp-mail.org', 'temp-mail.io', 'tempail.com',
  // Guerrilla emails
  'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org',
  // Other disposable services
  'mailinator.com', 'yopmail.com', 'getnada.com', 'throwaway.email',
  'maildrop.cc', 'mohmal.com', 'emailondeck.com', 'fakeinbox.com',
  // Filipino/Asian temp email services
  'tempmailo.com', 'tempemail.com', 'minuteinbox.com',
  // Add more as needed
];

// Email domain corrections for common typos
export const emailDomainSuggestions = {
  // Gmail variations
  'gmail.co': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  
  // Yahoo variations
  'yahooo.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'yahoo.cm': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  
  // Hotmail/Outlook variations
  'hotmai.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'hotmail.cm': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outlook.co': 'outlook.com',
  
  // Other common providers
  'aol.co': 'aol.com',
  'icloud.co': 'icloud.com',
};

// Validate email format with stricter rules
export const validateEmailFormat = (email) => {
  // More comprehensive email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(email)) return { isValid: false, error: 'Invalid email format' };
  
  // Additional checks
  if (email.length > 254) return { isValid: false, error: 'Email too long' };
  if (email.startsWith('.') || email.endsWith('.')) return { isValid: false, error: 'Email cannot start or end with a dot' };
  if (email.includes('..')) return { isValid: false, error: 'Email cannot contain consecutive dots' };
  
  return { isValid: true };
};

// Check if email domain is disposable
export const isDisposableEmail = (email) => {
  const domain = email.split('@')[1]?.toLowerCase();
  return disposableEmailDomains.includes(domain);
};

// Get domain suggestion for typos
export const getDomainSuggestion = (email) => {
  const domain = email.split('@')[1]?.toLowerCase();
  const suggestion = emailDomainSuggestions[domain];
  
  if (suggestion) {
    const username = email.split('@')[0];
    return `${username}@${suggestion}`;
  }
  
  return null;
};

// Enhanced password validation
export const validatePassword = (password) => {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Must be at least 8 characters long');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Must contain lowercase letters');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Must contain uppercase letters');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Must contain numbers');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Must contain special characters');
  }
  
  // Check for common weak passwords
  const commonPasswords = [
    'password', '12345678', 'qwerty123', 'admin123',
    'password123', '123456789', 'welcome123'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password)
  };
};

// Calculate password strength
const calculatePasswordStrength = (password) => {
  let score = 0;
  
  // Length bonus
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  
  // Character variety
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
  
  // Pattern complexity
  if (!/(.)\1{2,}/.test(password)) score += 1; // No repeated characters
  if (!/123|abc|qwe/i.test(password)) score += 1; // No common sequences
  
  if (score <= 3) return 'weak';
  if (score <= 5) return 'medium';
  return 'strong';
};

// ==================================================
// Firebase Security Rules for Enhanced Registration
// ==================================================

/*
Add these to your Firestore security rules:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      // Only authenticated users can read/write their own data
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Only allow email verified users to create documents
      allow create: if request.auth != null && 
                   request.auth.uid == userId && 
                   request.auth.token.email_verified == true;
      
      // Prevent email field modification after creation
      allow update: if request.auth != null && 
                   request.auth.uid == userId && 
                   resource.data.email == request.resource.data.email;
    }
    
    // Email verification tracking (optional)
    match /email_verifications/{email} {
      allow read, write: if request.auth != null;
    }
  }
}
*/

// ==================================================
// Optional: External Email Validation Service
// ==================================================

// Using Abstract API for email validation (requires API key)
export const validateWithAbstractAPI = async (email, apiKey) => {
  try {
    const response = await fetch(
      `https://emailvalidation.abstractapi.com/v1/?api_key=${apiKey}&email=${email}`
    );
    const data = await response.json();
    
    return {
      isValid: data.deliverability === 'DELIVERABLE',
      isDisposable: data.is_disposable_email.value,
      suggestion: data.autocorrect || null,
      quality: data.quality_score
    };
  } catch (error) {
    console.error('Abstract API validation error:', error);
    return { isValid: true }; // Fail gracefully
  }
};

// Using Hunter.io for email validation (requires API key)
export const validateWithHunterIO = async (email, apiKey) => {
  try {
    const response = await fetch(
      `https://api.hunter.io/v2/email-verifier?email=${email}&api_key=${apiKey}`
    );
    const data = await response.json();
    
    return {
      isValid: data.data.result === 'deliverable',
      isDisposable: data.data.disposable,
      confidence: data.data.score
    };
  } catch (error) {
    console.error('Hunter.io validation error:', error);
    return { isValid: true }; // Fail gracefully
  }
};

// ==================================================
// Enhanced AuthContext Updates
// ==================================================

// Add this to your AuthContext.js
export const enhancedRegister = async (userData) => {
  try {
    setError("");
    setLoading(true);

    // Validate email before creating account
    const emailValidation = validateEmailFormat(userData.email);
    if (!emailValidation.isValid) {
      throw new Error(emailValidation.error);
    }

    if (isDisposableEmail(userData.email)) {
      throw new Error('Please use a permanent email address');
    }

    // Check if email already exists
    const emailExists = await checkEmailExists(userData.email);
    if (emailExists) {
      throw new Error('This email is already registered');
    }

    // Validate password strength
    const passwordValidation = validatePassword(userData.password);
    if (!passwordValidation.isValid) {
      throw new Error(passwordValidation.errors[0]);
    }

    // Create Firebase user
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      userData.email, 
      userData.password
    );
    const firebaseUser = userCredential.user;

    // Update profile
    await updateProfile(firebaseUser, {
      displayName: userData.name
    });

    // Send verification email
    await sendEmailVerification(firebaseUser, {
      url: `${window.location.origin}/login?verified=true`,
      handleCodeInApp: false,
    });

    // Save to Firestore with verification status
    await setDoc(doc(firestore, "users", firebaseUser.uid), {
      name: userData.name,
      email: userData.email,
      role: userData.role,
      emailVerified: false,
      createdAt: new Date(),
      lastLogin: null,
      status: "pending_verification"
    });

    return { 
      success: true, 
      message: "Account created! Please check your email to verify your account.",
      user: firebaseUser,
      requiresVerification: true
    };
  } catch (error) {
    const errorMessage = getFirebaseErrorMessage(error.code) || error.message;
    setError(errorMessage);
    throw new Error(errorMessage);
  } finally {
    setLoading(false);
  }
};

// ==================================================
// Email Verification Check Component
// ==================================================

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Alert, Button, CircularProgress } from '@mui/material';

export const EmailVerificationBanner = () => {
  const { user, sendVerificationEmail } = useAuth();
  const [sending, setSending] = useState(false);

  if (!user || user.emailVerified) return null;

  const handleResendVerification = async () => {
    setSending(true);
    try {
      await sendVerificationEmail();
      alert('Verification email sent!');
    } catch (error) {
      alert('Failed to send verification email');
    } finally {
      setSending(false);
    }
  };

  return (
    <Alert 
      severity="warning" 
      action={
        <Button 
          color="inherit" 
          size="small" 
          onClick={handleResendVerification}
          disabled={sending}
        >
          {sending ? <CircularProgress size={16} /> : 'Resend'}
        </Button>
      }
    >
      Please verify your email address to access all features.
    </Alert>
  );
};

// ==================================================
// Testing Utilities
// ==================================================

export const testEmailValidation = () => {
  const testCases = [
    'valid@gmail.com',      // Should pass
    'test@tempmail.org',    // Should fail (disposable)
    'user@gmail.co',        // Should suggest gmail.com
    'invalid.email',        // Should fail (format)
    'test@existing.com',    // Should fail if exists
  ];

  testCases.forEach(email => {
    console.log(`Testing: ${email}`);
    console.log('Format:', validateEmailFormat(email));
    console.log('Disposable:', isDisposableEmail(email));
    console.log('Suggestion:', getDomainSuggestion(email));
    console.log('---');
  });
};

// ==================================================
// Environment Variables Needed
// ==================================================

/*
Add to your .env file:

# Optional: External email validation services
REACT_APP_ABSTRACT_API_KEY=your_abstract_api_key
REACT_APP_HUNTER_API_KEY=your_hunter_api_key

# Firebase config (you should already have these)
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_firebase_project_id
*/