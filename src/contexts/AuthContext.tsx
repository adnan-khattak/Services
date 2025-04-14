import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../utils/supabaseClient';
import { SessionContext } from '../../App';

// Define types
type AuthContextType = {
  user: User | null;
  isLoading: boolean;
};

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, isLoading: sessionLoading } = useContext(SessionContext);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Update user when session changes
    if (sessionLoading) return;
    
    setUser(session?.user || null);
    setIsLoading(false);
  }, [session, sessionLoading]);

  const value = {
    user,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to easily access auth context
export const useAuth = () => useContext(AuthContext);

export default AuthContext; 