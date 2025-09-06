// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,   
  sendPasswordResetEmail,
  updateProfile as updateFirebaseProfile,
  signOut
} from "firebase/auth";
import { Box, CircularProgress, Typography } from '@mui/material';
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { auth, firestore } from "../firebase.js";  // ✅ make sure to include .js

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

  // 🔹 Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(firestore, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data());
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

  // 🔹 Login
  const login = async (email, password) => {
    try {
      setError("");
      setLoading(true);

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      await updateDoc(doc(firestore, "users", firebaseUser.uid), {
        lastLogin: new Date()
      });

      const userDoc = await getDoc(doc(firestore, "users", firebaseUser.uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
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

  // 🔹 Register
  const register = async (userData) => {
    try {
      setError("");
      setLoading(true);

      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        userData.email, 
        userData.password
      );
      const firebaseUser = userCredential.user;

      await updateFirebaseProfile(firebaseUser, {
        displayName: userData.name
      });

      await setDoc(doc(firestore, "users", firebaseUser.uid), {
        name: userData.name,
        email: userData.email,
        role: userData.role,
        createdAt: new Date(),
        lastLogin: new Date(),
        status: "active"
      });

      return { 
        success: true, 
        message: "Account created successfully!",
        user: firebaseUser
      };
    } catch (error) {
      const errorMessage = getFirebaseErrorMessage(error.code);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Logout
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

  // 🔹 Forgot Password
  const forgotPassword = async (email) => {
    try {
      setError("");
      await sendPasswordResetEmail(auth, email);
      return { success: true, message: "Password reset email sent!" };
    } catch (error) {
      const errorMessage = getFirebaseErrorMessage(error.code);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // 🔹 Update Profile
  const updateProfile = async (profileData) => {
    try {
      setError("");
      if (auth.currentUser) {
        await updateFirebaseProfile(auth.currentUser, {
          displayName: profileData.name
        });

        await updateDoc(doc(firestore, "users", auth.currentUser.uid), {
          ...profileData,
          updatedAt: new Date()
        });

        const userDoc = await getDoc(doc(firestore, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
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

  const value = {
    user,
    userProfile,
    login,
    signup: register,
    logout,
    forgotPassword,
    resetPassword: forgotPassword,
    updateProfile,
    loading,
    error,
    setError: clearError,
    isAuthenticated: !!user
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
          color: '#4CAF50', // Green color
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

  // Usage in your component
  return (
    <AuthContext.Provider value={value}>
      {loading ? <SimpleGreenLoading /> : children}
    </AuthContext.Provider>
  );
};
