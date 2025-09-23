// src/context/AuthContext.js - Role-based collections version
import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,   
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile as updateFirebaseProfile,
  signOut,
  reload
} from "firebase/auth";
import { Box, CircularProgress, Typography } from '@mui/material';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from "firebase/firestore";
import { auth, firestore } from "../firebase.js";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Role-based collection mapping
  const getCollectionName = (role) => {
    switch (role) {
      case 'officer': // DENR Officer
        return 'admin';
      case 'planter':
      case 'stakeholder':
      default:
        return 'users';
    }
  };

  // Get all possible collections for email checking
  const getAllCollections = () => ['admin', 'users'];

  // Disposable email domains
  const disposableEmailDomains = [
    '10minutemail.com', 'tempmail.org', 'guerrillamail.com', 
    'mailinator.com', 'yopmail.com', 'temp-mail.org',
    'throwaway.email', 'getnada.com', '20minutemail.com',
    'maildrop.cc', 'mohmal.com', 'emailondeck.com'
  ];

  // Email domain suggestions
  const emailDomainSuggestions = {
    'gmail.co': 'gmail.com',
    'gmail.cm': 'gmail.com',
    'gmai.com': 'gmail.com',
    'yahooo.com': 'yahoo.com',
    'yahoo.co': 'yahoo.com',
    'hotmai.com': 'hotmail.com',
    'hotmail.co': 'hotmail.com',
    'outlok.com': 'outlook.com',
  };

  // Find user in appropriate collection
  const findUserProfile = async (userId) => {
    const collections = getAllCollections();
    
    for (const collectionName of collections) {
      try {
        const userDoc = await getDoc(doc(firestore, collectionName, userId));
        if (userDoc.exists()) {
          return {
            data: userDoc.data(),
            collection: collectionName
          };
        }
      } catch (error) {
        console.error(`Error checking ${collectionName}:`, error);
      }
    }
    
    return null;
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Reload user to get latest emailVerified status
          await reload(firebaseUser);
          
          // Find user profile in appropriate collection
          const userProfileData = await findUserProfile(firebaseUser.uid);
          
          if (userProfileData) {
            setUserProfile({
              ...userProfileData.data,
              _collection: userProfileData.collection
            });
            
            // Update emailVerified status if changed
            if (userProfileData.data.emailVerified !== firebaseUser.emailVerified) {
              await updateDoc(doc(firestore, userProfileData.collection, firebaseUser.uid), {
                emailVerified: firebaseUser.emailVerified,
                status: firebaseUser.emailVerified ? "active" : "pending_verification"
              });
              
              setUserProfile(prev => ({ 
                ...prev, 
                emailVerified: firebaseUser.emailVerified,
                status: firebaseUser.emailVerified ? "active" : "pending_verification"
              }));
            }
          }
          setUser(firebaseUser);
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setError("Failed to load user profile");
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const clearError = () => setError("");

  const getFirebaseErrorMessage = (errorCode) => {
    const errorMessages = {
      "auth/invalid-email": "Invalid email address.",
      "auth/user-disabled": "This account has been disabled.",
      "auth/user-not-found": "No account found with this email.",
      "auth/wrong-password": "Incorrect password.",
      "auth/email-already-in-use": "This email is already registered.",
      "auth/weak-password": "Password should be at least 6 characters.",
      "auth/network-request-failed": "Network error.",
      "auth/too-many-requests": "Too many attempts. Try again later.",
      "auth/requires-recent-login": "Please log in again."
    };
    return errorMessages[errorCode] || "An unexpected error occurred.";
  };

  // Email validation functions
  const validateEmailFormat = (email) => {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email);
  };

  const isDisposableEmail = (email) => {
    const domain = email.split('@')[1]?.toLowerCase();
    return disposableEmailDomains.includes(domain);
  };

  const getDomainSuggestion = (email) => {
    const domain = email.split('@')[1]?.toLowerCase();
    const suggestion = emailDomainSuggestions[domain];
    if (suggestion) {
      const username = email.split('@')[0];
      return `${username}@${suggestion}`;
    }
    return null;
  };

  // Check if email exists across all collections
  const checkEmailExists = async (email) => {
    const collections = getAllCollections();
    
    for (const collectionName of collections) {
      try {
        const usersRef = collection(firestore, collectionName);
        const q = query(usersRef, where('email', '==', email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          return {
            exists: true,
            collection: collectionName,
            userData: querySnapshot.docs[0].data()
          };
        }
      } catch (error) {
        console.error(`Error checking email in ${collectionName}:`, error);
      }
    }
    
    return { exists: false };
  };

  // Comprehensive email validation
  const validateEmail = async (email) => {
    const validation = {
      isValid: false,
      errors: [],
      isDisposable: false,
      emailExists: false,
      suggestion: null,
      existsInCollection: null
    };

    // Format validation
    if (!validateEmailFormat(email)) {
      validation.errors.push('Invalid email format');
      return validation;
    }

    // Check disposable
    if (isDisposableEmail(email)) {
      validation.isDisposable = true;
      validation.errors.push('Please use a permanent email address');
    }

    // Check domain suggestion
    const suggestion = getDomainSuggestion(email);
    if (suggestion) {
      validation.suggestion = `Did you mean ${suggestion}?`;
    }

    // Check if exists across collections
    const emailCheck = await checkEmailExists(email);
    if (emailCheck.exists) {
      validation.emailExists = true;
      validation.existsInCollection = emailCheck.collection;
      validation.errors.push('This email is already registered');
    }

    validation.isValid = validation.errors.length === 0;
    return validation;
  };

  // Login with email verification check
  const login = async (email, password) => {
    try {
      setError("");
      setLoading(true);

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Check email verification
      if (!firebaseUser.emailVerified) {
        return { 
          success: false, 
          error: "Please verify your email before logging in. Check your inbox.",
          requiresVerification: true 
        };
      }

      // Find user profile and update last login
      const userProfileData = await findUserProfile(firebaseUser.uid);
      
      if (userProfileData) {
        await updateDoc(doc(firestore, userProfileData.collection, firebaseUser.uid), {
          lastLogin: new Date()
        });

        setUserProfile({
          ...userProfileData.data,
          _collection: userProfileData.collection
        });
      }

      return { success: true, user: firebaseUser };
    } catch (error) {
      const errorMessage = getFirebaseErrorMessage(error.code);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Enhanced registration with role-based collection storage
  const register = async (userData) => {
    try {
      setError("");
      setLoading(true);

      // Validate email
      const emailValidation = await validateEmail(userData.email);
      if (!emailValidation.isValid) {
        throw new Error(emailValidation.errors[0]);
      }

      // Determine target collection based on role
      const targetCollection = getCollectionName(userData.role);

      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        userData.email, 
        userData.password
      );
      const firebaseUser = userCredential.user;

      // Update display name
      await updateFirebaseProfile(firebaseUser, {
        displayName: userData.name
      });

      // Send email verification
      await sendEmailVerification(firebaseUser, {
        url: `${window.location.origin}/login?verified=true`,
        handleCodeInApp: false,
      });

      // Save to appropriate collection based on role
      await setDoc(doc(firestore, targetCollection, firebaseUser.uid), {
        uid: firebaseUser.uid,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        emailVerified: false,
        createdAt: new Date(),
        lastLogin: null,
        status: "pending_verification",
        collection: targetCollection // Track which collection this user belongs to
      });

      // Sign out user until they verify email
      await signOut(auth);

      return { 
        success: true, 
        message: `Account created successfully! Please check your email to verify your account. You will be registered as ${userData.role === 'officer' ? 'Admin' : 'User'}.`,
        requiresVerification: true,
        collection: targetCollection
      };
    } catch (error) {
      const errorMessage = getFirebaseErrorMessage(error.code) || error.message;
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Send email verification
  const sendVerificationEmail = async () => {
    try {
      if (auth.currentUser && !auth.currentUser.emailVerified) {
        await sendEmailVerification(auth.currentUser, {
          url: `${window.location.origin}/login?verified=true`,
          handleCodeInApp: false,
        });
        return { success: true, message: "Verification email sent" };
      }
      return { success: false, error: "No user to verify or already verified" };
    } catch (error) {
      console.error('Send verification error:', error);
      const errorMessage = getFirebaseErrorMessage(error.code);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Logout
  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
      setError("");
    } catch (error) {
      setError("Failed to logout. Please try again.");
    }
  };

  // Reset Password
  const resetPassword = async (email) => {
    try {
      setError("");
      
      // Validate email format
      if (!validateEmailFormat(email)) {
        throw new Error('Please enter a valid email address');
      }

      // Check if email exists in any collection (optional - for better UX)
      const emailCheck = await checkEmailExists(email);
      if (!emailCheck.exists) {
        // Don't reveal if email exists for security, but still send reset email
        // Firebase will handle this gracefully
      }

      await sendPasswordResetEmail(auth, email, {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false,
      });
      return { success: true, message: "Password reset email sent successfully" };
    } catch (error) {
      console.error('Password reset error:', error);
      
      let errorMessage;
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many requests. Please try again later';
          break;
        default:
          errorMessage = error.message || 'Failed to send password reset email';
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Update Profile
  const updateProfile = async (profileData) => {
    try {
      setError("");
      if (auth.currentUser && userProfile) {
        await updateFirebaseProfile(auth.currentUser, {
          displayName: profileData.name
        });

        // Update in the correct collection
        const targetCollection = userProfile._collection || getCollectionName(userProfile.role);
        
        await updateDoc(doc(firestore, targetCollection, auth.currentUser.uid), {
          ...profileData,
          updatedAt: new Date()
        });

        // Fetch updated profile
        const userDoc = await getDoc(doc(firestore, targetCollection, auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserProfile({
            ...userDoc.data(),
            _collection: targetCollection
          });
        }

        return { success: true, message: "Profile updated successfully!" };
      }
      return { success: false, error: "No user logged in" };
    } catch (error) {
      const errorMessage = getFirebaseErrorMessage(error.code);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Helper function to check if user is admin
  const isAdmin = () => {
    return userProfile?.role === 'officer' || userProfile?._collection === 'admin';
  };

  // Helper function to check if user is planter
  const isPlanter = () => {
    return userProfile?.role === 'planter';
  };

  // Helper function to check if user is stakeholder
  const isStakeholder = () => {
    return userProfile?.role === 'stakeholder';
  };

  const value = {
    user,
    userProfile,
    login,
    signup: register,
    register,
    logout,
    resetPassword,
    forgotPassword: resetPassword,
    updateProfile,
    sendVerificationEmail,
    checkEmailExists,
    validateEmail,
    validateEmailFormat,
    isDisposableEmail,
    getDomainSuggestion,
    getCollectionName,
    findUserProfile,
    isAdmin,
    isPlanter,
    isStakeholder,
    loading,
    error,
    setError: clearError,
    isAuthenticated: !!user,
    isEmailVerified: user?.emailVerified || false
  };

  const SimpleGreenLoading = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#fafafa',
        padding: 3,
      }}
    >
      <CircularProgress
        size={60}
        thickness={4}
        sx={{
          color: '#4CAF50',
          mb: 2,
          animation: 'pulse 1.5s infinite ease-in-out',
        }}
      />
      <Typography
        variant="body1"
        sx={{
          color: '#388E3C',
          fontWeight: 500,
        }}
      >
        Loading...
      </Typography>
    </Box>
  );

  return (
    <AuthContext.Provider value={value}>
      {loading ? <SimpleGreenLoading /> : children}
    </AuthContext.Provider>
  );
};