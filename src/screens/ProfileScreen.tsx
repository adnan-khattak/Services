import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useNavigation, NavigationProp } from '@react-navigation/native';
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
  
  useEffect(() => {
    const checkServiceProviderStatus = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('service_providers')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (error) throw error;
        
        setIsServiceProvider(!!data);
      } catch (error) {
        console.error('Error checking service provider status:', error);
      }
    };
    
    checkServiceProviderStatus();
  }, [user]);
  
  useEffect(() => {
    if (user) {
      fetchUserContent();
    } else {
      setLoading(false);
    }
  }, [user, activeTab]);
  
  const fetchUserContent = async () => {
    setLoading(true);
    try {
      if (activeTab === 'services' && user) {
        // Fetch service provider status and services
        const { data: services, error } = await supabase
          .from('services')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
            
        if (error) throw error;
        setUserServices(services || []);
      } else if (activeTab === 'discussions' && user) {
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
    <ScrollView style={styles.container}>
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
          <Text style={styles.addButtonText}>Add Service</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('ServiceProviderApplication')}
        >
          <Text style={styles.addButtonText}>Become a Service Provider</Text>
        </TouchableOpacity>
      )}
      
      <TouchableOpacity 
        style={[styles.addButton, styles.discussionButton]}
        onPress={() => navigation.navigate('NewPost')}
      >
        <Text style={styles.addButtonText}>New Discussion</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.addButton, styles.logoutButton]}
        onPress={handleLogout}
      >
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
      
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'services' && styles.activeTab]}
          onPress={() => setActiveTab('services')}
        >
          <Text style={[styles.tabText, activeTab === 'services' && styles.activeTabText]}>
            My Services
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'discussions' && styles.activeTab]}
          onPress={() => setActiveTab('discussions')}
        >
          <Text style={[styles.tabText, activeTab === 'discussions' && styles.activeTabText]}>
            My Discussions
          </Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4E8AF4" />
        </View>
      ) : activeTab === 'services' ? (
        <View style={styles.servicesContainer}>
          {userServices.length > 0 ? (
            <FlatList
              data={userServices}
              renderItem={renderServiceItem}
              keyExtractor={item => item.id.toString()}
              numColumns={2}
              columnWrapperStyle={styles.columnWrapper}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.emptyText}>
              {isServiceProvider 
                ? 'You haven\'t added any services yet.' 
                : 'Upgrade to Service Provider to add services.'}
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.discussionsContainer}>
          {userPosts.length > 0 ? (
            <FlatList
              data={userPosts}
              renderItem={renderPostItem}
              keyExtractor={item => item.id.toString()}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.emptyText}>You haven't created any discussions yet.</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: hp('15%'),
  },
  errorText: {
    fontSize: hp('2%'),
    color: '#8798AD',
    textAlign: 'center',
    marginBottom: hp('2%'),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp('5%'),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E4E8F0',
  },
  logoutIcon: {
    padding: wp('2%'),
  },
  avatar: {
    width: hp('10%'),
    height: hp('10%'),
    borderRadius: hp('5%'),
    marginRight: wp('4%'),
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: hp('2.5%'),
    fontWeight: 'bold',
    color: '#2E384D',
    marginBottom: hp('0.5%'),
  },
  email: {
    fontSize: hp('1.7%'),
    color: '#8798AD',
    marginBottom: hp('1%'),
  },
  roleContainer: {
    backgroundColor: '#EBF1FF',
    paddingHorizontal: wp('2%'),
    paddingVertical: hp('0.5%'),
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: hp('1.5%'),
    color: '#4E8AF4',
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: '#4E8AF4',
    margin: wp('4%'),
    padding: hp('1.5%'),
    borderRadius: 10,
    alignItems: 'center',
  },
  discussionButton: {
    backgroundColor: '#6C5CE7',
    marginTop: 0,
  },
  logoutButton: {
    backgroundColor: '#FF4D4F',
    marginTop: hp('1%'),
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: hp('1.8%'),
    fontWeight: 'bold',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: hp('1.8%'),
    fontWeight: 'bold',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: wp('4%'),
    marginVertical: hp('2%'),
    borderRadius: 10,
    backgroundColor: '#E4E8F0',
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: hp('1.5%'),
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: hp('1.7%'),
    color: '#8798AD',
  },
  activeTabText: {
    color: '#2E384D',
    fontWeight: '600',
  },
  servicesContainer: {
    paddingHorizontal: wp('2%'),
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: wp('2%'),
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    width: wp('42%'),
    borderRadius: 10,
    marginBottom: hp('2%'),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    overflow: 'hidden',
  },
  serviceImage: {
    width: '100%',
    height: wp('30%'),
  },
  serviceTitle: {
    fontSize: hp('1.8%'),
    fontWeight: 'bold',
    color: '#2E384D',
    padding: wp('2%'),
    paddingBottom: 0,
  },
  serviceCategory: {
    fontSize: hp('1.5%'),
    color: '#8798AD',
    padding: wp('2%'),
    paddingTop: hp('0.5%'),
    paddingBottom: 0,
  },
  servicePrice: {
    fontSize: hp('1.7%'),
    fontWeight: '600',
    color: '#4E8AF4',
    padding: wp('2%'),
  },
  discussionsContainer: {
    padding: wp('4%'),
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    padding: wp('4%'),
    borderRadius: 10,
    marginBottom: hp('2%'),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  postContent: {
    fontSize: hp('1.7%'),
    color: '#2E384D',
    marginBottom: hp('1.5%'),
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E4E8F0',
    paddingTop: hp('1%'),
  },
  postTimestamp: {
    fontSize: hp('1.3%'),
    color: '#8798AD',
  },
  postStats: {
    flexDirection: 'row',
  },
  postStat: {
    fontSize: hp('1.3%'),
    color: '#8798AD',
    marginLeft: wp('2%'),
  },
  emptyText: {
    fontSize: hp('1.7%'),
    color: '#8798AD',
    textAlign: 'center',
    padding: hp('5%'),
  },
});

export default ProfileScreen; 