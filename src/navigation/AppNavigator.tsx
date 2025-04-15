import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useColorScheme } from 'react-native';

// Screens
import HomeScreen from '../screens/HomeScreen';
import ServicesScreen from '../screens/ServicesScreen';
import DiscussionsScreen from '../screens/DiscussionsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ServiceDetailsScreen from '../screens/ServiceDetailsScreen';
import AuthScreen from '../screens/AuthScreen';
import NewPostScreen from '../screens/NewPostScreen';
import AddServiceScreen from '../screens/AddServiceScreen';
import ServiceProviderApplicationScreen from '../screens/ServiceProviderApplicationScreen';
import PostDetailsScreen from '../screens/PostDetailsScreen';
import { SessionContext } from '../../App';

// Define types for stack navigator
type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  ServiceDetails: { service: any };
  PostDetails: { postId: number };
  NewPost: undefined;
  AddService: undefined;
  ServiceProviderApplication: undefined;
};

type MainTabParamList = {
  Home: undefined;
  Services: undefined;
  Discussions: undefined;
  Profile: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator = () => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string = 'home';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Services') {
            iconName = focused ? 'briefcase' : 'briefcase-outline';
          } else if (route.name === 'Discussions') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          // You can return any component here
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4E8AF4',
        tabBarInactiveTintColor: '#8798AD',
        tabBarStyle: {
          backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 5,
        },
        headerStyle: {
          backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
          elevation: 0,
          shadowColor: 'transparent',
        },
        headerTitleStyle: {
          fontWeight: 'bold',
          color: isDarkMode ? '#FFFFFF' : '#2E384D',
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
      />
      <Tab.Screen 
        name="Services" 
        component={ServicesScreen} 
      />
      <Tab.Screen
        name="Discussions" 
        component={DiscussionsScreen} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  // Use the session context to determine if user is logged in
  const { session } = useContext(SessionContext);
  const isLoggedIn = !!session;
  
  console.log('Auth state:', isLoggedIn ? 'Logged in' : 'Not logged in');
  
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName={isLoggedIn ? 'Main' : 'Auth'}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="Main" component={MainTabNavigator} />
        <Stack.Screen 
          name="ServiceDetails" 
          component={ServiceDetailsScreen} 
          options={{
            headerShown: true,
            title: 'Service Details',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
        <Stack.Screen 
          name="PostDetails" 
          component={PostDetailsScreen}
          options={{
            headerShown: true,
            title: 'Discussion',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
        <Stack.Screen 
          name="NewPost" 
          component={NewPostScreen}
          options={{
            headerShown: true,
            title: 'New Discussion',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
        <Stack.Screen 
          name="AddService" 
          component={AddServiceScreen}
          options={{
            headerShown: true,
            title: 'Add Service',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
        <Stack.Screen 
          name="ServiceProviderApplication" 
          component={ServiceProviderApplicationScreen}
          options={{
            headerShown: true,
            title: 'Become a Service Provider',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 