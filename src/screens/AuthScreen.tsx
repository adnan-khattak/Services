import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Alert
} from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { supabase, signUp } from '../utils/supabaseClient';
import Logo from '../assets/logo';
import { SessionContext } from '../../App';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';

// Define the navigation param list type
type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  ServiceDetails: { service: any };
  PostDetails: { postId: number };
  NewPost: undefined;
  AddService: undefined;
  ServiceProviderApplication: undefined;
};

const AuthScreen = () => {
  // Use proper type for navigation
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Login form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Additional signup fields
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  
  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    if (!isLogin && !username) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }
    
    setLoading(true);
    
    try {
      if (isLogin) {
        // Login
        console.log('Attempting to login with:', email);
        const { error, data } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        console.log('Login successful');
        
        // Navigate to Main screen on successful login
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      } else {
        // Sign up
        console.log('Attempting to sign up with:', email);
        
        // Use the signUp helper function from supabaseClient
        try {
          const { error, data } = await signUp(email, password, {
            username,
            phone
          });
          
          if (error) throw error;
          
          console.log('Sign up successful:', data);
          
          // Show confirmation message
          Alert.alert(
            'Account Created',
            'Your account has been created successfully. Please check your email to confirm your account before logging in.',
            [{ text: 'OK', onPress: () => setIsLogin(true) }]
          );
        } catch (signUpError: any) {
          console.error('Sign up error:', signUpError);
          throw signUpError;
        }
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    // Clear form fields when switching modes
    if (isLogin) {
      setUsername('');
      setPhone('');
    }
  };
  
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.logoContainer}>
        <Logo size={hp('15%')} />
        <Text style={styles.appName}>Services App</Text>
      </View>
      
      <Text style={styles.headerText}>
        {isLogin ? 'Welcome Back!' : 'Create an Account'}
      </Text>
      
      <View style={styles.formContainer}>
        {!isLogin && (
          <TextInput
            style={styles.input}
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        )}
        
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        {!isLogin && (
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        )}
        
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <TouchableOpacity 
          style={styles.authButton}
          onPress={handleAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.authButtonText}>
              {isLogin ? 'Log In' : 'Sign Up'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        style={styles.toggleContainer}
        onPress={toggleAuthMode}
      >
        <Text style={styles.toggleText}>
          {isLogin 
            ? "Don't have an account? Sign Up" 
            : "Already have an account? Log In"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F5F7FA',
    padding: wp('5%'),
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: hp('5%'),
  },
  appName: {
    fontSize: hp('3%'),
    fontWeight: 'bold',
    color: '#2E384D',
    marginTop: hp('2%'),
  },
  headerText: {
    fontSize: hp('2.5%'),
    fontWeight: 'bold',
    color: '#2E384D',
    marginBottom: hp('3%'),
    textAlign: 'center',
  },
  formContainer: {
    marginBottom: hp('3%'),
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: hp('1.8%'),
    marginBottom: hp('2%'),
    fontSize: hp('1.8%'),
    borderWidth: 1,
    borderColor: '#E4E8F0',
  },
  authButton: {
    backgroundColor: '#4E8AF4',
    borderRadius: 10,
    padding: hp('1.8%'),
    alignItems: 'center',
    marginTop: hp('1%'),
  },
  authButtonText: {
    color: '#FFFFFF',
    fontSize: hp('2%'),
    fontWeight: 'bold',
  },
  toggleContainer: {
    alignItems: 'center',
  },
  toggleText: {
    color: '#4E8AF4',
    fontSize: hp('1.7%'),
  },
});

export default AuthScreen; 