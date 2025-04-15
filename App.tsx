/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { supabase } from './src/utils/supabaseClient';
import { Session } from '@supabase/supabase-js';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, ActivityIndicator, StatusBar, LogBox, Platform } from 'react-native';
import { AuthProvider } from './src/contexts/AuthContext';
import { initializeAds } from './src/utils/adUtils';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Setting a timer for a long period of time',
]);

// Create a context for the session
export const SessionContext = React.createContext<{
  session: Session | null;
  isLoading: boolean;
}>({
  session: null,
  isLoading: true,
});

function App(): JSX.Element {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize Google Mobile Ads
    initializeAds()
      .then(success => {
        console.log('Ads initialization:', success ? 'successful' : 'failed');
      })
      .catch(error => {
        console.error('Error initializing ads:', error);
      });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4E8AF4" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SessionContext.Provider value={{ session, isLoading }}>
        <AuthProvider>
          <SafeAreaProvider>
            <StatusBar
              barStyle={Platform.OS === 'ios' ? 'dark-content' : 'default'}
              backgroundColor={Platform.OS === 'ios' ? 'transparent' : '#FFFFFF'}
            />
            <AppNavigator />
          </SafeAreaProvider>
        </AuthProvider>
      </SessionContext.Provider>
    </GestureHandlerRootView>
  );
}

export default App;
