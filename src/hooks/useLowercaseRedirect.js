// src/hooks/useLowercaseRedirect.js
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function useLowercaseRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    const lowerPath = location.pathname.toLowerCase();
    
    // If URL has uppercase, redirect to lowercase
    if (location.pathname !== lowerPath) {
      navigate(lowerPath + location.search, { replace: true });
    }
  }, [location, navigate]);
}