import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabaseClient';
import Ionicons from 'react-native-vector-icons/Ionicons';

type RootStackParamList = {
  Profile: undefined;
  ServiceDetails: { service: any };
  AddService: undefined;
  NewPost: undefined;
  Auth: undefined;
  Main: undefined;
  ServiceProviderApplication: undefined;
};

type ProfileScreenNavigationProp = NavigationProp<RootStackParamList>;

interface Service {
  id: string;
  title: string;
  category: string;
  price: string;
  media?: string[];
  description?: string;
  created_at: string;
}

interface Post {
  id: string;
  content: string;
  likes: number;
  comments: number;
  created_at: string;
  media?: string[];
}

const ProfileScreen = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'services' | 'discussions'>('services');
  const [userServices, setUserServices] = useState<Service[]>([]);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isServiceProvider, setIsServiceProvider] = useState(false);
  
  // Check if user is a service provider
  useEffect(() => {
    const checkServiceProviderStatus = async () => {
      if (!user) return;
      
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          throw profileError;
        }
        
        setIsServiceProvider(!!profileData);
      } catch (error) {
        console.error('Error checking service provider status:', error);
      }
    };
    
    checkServiceProviderStatus();
  }, [user]);
  
  // Function to fetch user content based on active tab
  const fetchUserContent = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    try {
      if (activeTab === 'services') {
        // Fetch service provider status and services
        const { data: services, error } = await supabase
          .from('services')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
            
        if (error) throw error;
        setUserServices(services || []);
      } else if (activeTab === 'discussions') {
        // Fetch posts created by this user
        const { data: posts, error } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        setUserPosts(posts || []);
      }
    } catch (error) {
      console.error('Error fetching user content:', error);
      Alert.alert('Error', 'Failed to load your content');
    } finally {
      setLoading(false);
    }
  }, [user, activeTab]);
  
  // Fetch data when tab changes
  useEffect(() => {
    fetchUserContent();
  }, [fetchUserContent, activeTab]);
  
  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchUserContent();
    }, [fetchUserContent])
  );

  const handleTabChange = (tab: 'services' | 'discussions') => {
    if (tab !== activeTab) {
      setActiveTab(tab);
      // fetchUserContent will be triggered by the useEffect that depends on activeTab
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Navigate to Auth screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      });
    } catch (error) {
      console.error('Error during logout:', error);
      Alert.alert('Error', 'Failed to log out');
    }
  };

  const renderServiceItem = ({ item }: { item: Service }) => (
    <TouchableOpacity 
      style={styles.serviceCard}
      onPress={() => navigation.navigate('ServiceDetails', { service: item })}
    >
      <Image 
        source={{ 
          uri: item.media && item.media.length > 0 
            ? item.media[0] 
            : 'https://via.placeholder.com/150?text=No+Image'
        }} 
        style={styles.serviceImage} 
      />
      <Text style={styles.serviceTitle}>{item.title}</Text>
      <Text style={styles.serviceCategory}>{item.category}</Text>
      <Text style={styles.servicePrice}>{item.price}</Text>
    </TouchableOpacity>
  );

  const renderPostItem = ({ item }: { item: Post }) => (
    <View style={styles.postCard}>
      <Text style={styles.postContent}>{item.content}</Text>
      
      {item.media && item.media.length > 0 && (
        <Image 
          source={{ uri: item.media[0] }} 
          style={styles.postImage}
          resizeMode="cover"
        />
      )}
      
      <View style={styles.postFooter}>
        <Text style={styles.postTimestamp}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
        <View style={styles.postStats}>
          <Text style={styles.postStat}>{item.likes} likes</Text>
          <Text style={styles.postStat}>{item.comments} comments</Text>
        </View>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons 
        name={activeTab === 'services' ? 'construct-outline' : 'chatbubble-outline'} 
        size={50} 
        color="#B4C4E0" 
      />
      <Text style={styles.emptyText}>
        {activeTab === 'services' 
          ? 'You haven\'t added any services yet' 
          : 'You haven\'t created any discussions yet'
        }
      </Text>
      <TouchableOpacity 
        style={styles.emptyButton}
        onPress={() => navigation.navigate(
          activeTab === 'services' ? 'AddService' : 'NewPost'
        )}
      >
        <Text style={styles.emptyButtonText}>
          {activeTab === 'services' ? 'Add Service' : 'Start Discussion'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Please log in to view your profile</Text>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={() => navigation.navigate('Auth')}
        >
          <Text style={styles.logoutButtonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.header}>
          <Image 
            source={{ 
              uri: `https://ui-avatars.com/api/?name=${user?.email || 'User'}` 
            }} 
            style={styles.avatar} 
          />
          <View style={styles.userInfo}>
            <Text style={styles.username}>{user?.email ? user.email.split('@')[0] : 'User'}</Text>
            <Text style={styles.email}>{user?.email || ''}</Text>
            <View style={styles.roleContainer}>
              <Text style={styles.roleText}>
                {isServiceProvider ? 'Service Provider' : 'User'}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutIcon}>
            <Ionicons name="log-out-outline" size={24} color="#FF4D4F" />
          </TouchableOpacity>
        </View>
        
        {isServiceProvider ? (
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate('AddService')}
          >
            <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add New Service</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.applyButton}
            onPress={() => navigation.navigate('ServiceProviderApplication')}
          >
            <Ionicons name="briefcase-outline" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Become a Service Provider</Text>
          </TouchableOpacity>
        )}
        
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[
              styles.tab, 
              activeTab === 'services' && styles.activeTab
            ]}
            onPress={() => handleTabChange('services')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'services' && styles.activeTabText
            ]}>
              My Services
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.tab, 
              activeTab === 'discussions' && styles.activeTab
            ]}
            onPress={() => handleTabChange('discussions')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'discussions' && styles.activeTabText
            ]}>
              My Discussions
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.contentContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2B7CE5" />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : (
            <>
              {activeTab === 'services' && (
                <>
                  {userServices.length > 0 ? (
                    <FlatList
                      data={userServices}
                      renderItem={renderServiceItem}
                      keyExtractor={(item) => item.id}
                      numColumns={2}
                      columnWrapperStyle={styles.servicesRow}
                      scrollEnabled={false}
                    />
                  ) : (
                    renderEmptyState()
                  )}
                </>
              )}
              
              {activeTab === 'discussions' && (
                <>
                  {userPosts.length > 0 ? (
                    <FlatList
                      data={userPosts}
                      renderItem={renderPostItem}
                      keyExtractor={(item) => item.id}
                      scrollEnabled={false}
                    />
                  ) : (
                    renderEmptyState()
                  )}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>
      
      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={() => navigation.navigate(
          activeTab === 'services' ? 'AddService' : 'NewPost'
        )}
      >
        <Ionicons name="add" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp(5),
    backgroundColor: '#FFFFFF',
  },
  avatar: {
    width: wp(15),
    height: wp(15),
    borderRadius: wp(7.5),
  },
  userInfo: {
    marginLeft: wp(3),
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A2D40',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#8798AD',
    marginBottom: 4,
  },
  roleContainer: {
    backgroundColor: '#E6F2FF',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 12,
    color: '#2B7CE5',
    fontWeight: '500',
  },
  logoutIcon: {
    padding: 5,
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#2B7CE5',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(4),
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: wp(5),
    marginBottom: hp(2),
  },
  applyButton: {
    flexDirection: 'row',
    backgroundColor: '#32A37F',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(4),
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: wp(5),
    marginBottom: hp(2),
  },
  addButtonText: {
    color: '#FFFFFF',
    marginLeft: wp(2),
    fontSize: 14,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: wp(5),
    marginBottom: hp(2),
    borderRadius: 8,
    backgroundColor: '#F5F8FA',
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: hp(1.5),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabText: {
    color: '#8798AD',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#1A2D40',
    fontWeight: '600',
  },
  contentContainer: {
    paddingHorizontal: wp(5),
    paddingBottom: hp(5),
  },
  loadingContainer: {
    padding: hp(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: hp(1),
    color: '#8798AD',
    fontSize: 14,
  },
  errorText: {
    fontSize: 16,
    color: '#1A2D40',
    marginBottom: hp(2),
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: '#2B7CE5',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(5),
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  servicesRow: {
    justifyContent: 'space-between',
    marginBottom: hp(2),
  },
  serviceCard: {
    width: wp(42),
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    marginBottom: hp(2),
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  serviceImage: {
    width: '100%',
    height: wp(30),
    borderRadius: 6,
    marginBottom: 10,
  },
  serviceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2D40',
    marginBottom: 5,
  },
  serviceCategory: {
    fontSize: 12,
    color: '#8798AD',
    marginBottom: 5,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2B7CE5',
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 15,
    marginBottom: hp(2),
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  postContent: {
    fontSize: 14,
    color: '#1A2D40',
    marginBottom: 10,
    lineHeight: 20,
  },
  postImage: {
    width: '100%',
    height: wp(50),
    borderRadius: 6,
    marginBottom: 10,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  postTimestamp: {
    fontSize: 12,
    color: '#8798AD',
  },
  postStats: {
    flexDirection: 'row',
  },
  postStat: {
    fontSize: 12,
    color: '#8798AD',
    marginLeft: 10,
  },
  emptyContainer: {
    padding: hp(5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: hp(1),
    marginBottom: hp(2),
    fontSize: 14,
    color: '#8798AD',
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: '#2B7CE5',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(5),
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2B7CE5',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
});

export default ProfileScreen; 