import React, { useState, useEffect, useContext, useCallback } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator, 
  RefreshControl, 
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../utils/supabaseClient';
import { SessionContext } from '../../App';
import SearchBar from '../components/SearchBar';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MediaCarousel from '../components/MediaCarousel';

type RootStackParamList = {
  Home: undefined;
  Services: undefined;
  ServiceDetails: { service: any };
  Discussions: undefined;
  PostDetails: { postId: string };
};

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Post {
  id: string;
  created_at: string;
  user_id: string;
  content: string;
  media: string[] | null;
  likes: number;
  comments: number;
  profile: {
    id: string;
    username: string;
    avatar_url?: string;
  } | null;
}

interface Service {
  id: string;
  title: string;
  category: string;
  price: string;
  description: string;
  location: string;
  media: string[];
  rating: number;
  reviews_count: number;
  user_id: string;
  created_at: string;
  profile?: {
    username: string;
    avatar_url?: string;
  } | null;
}

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { session } = useContext(SessionContext);
  const [posts, setPosts] = useState<Post[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingServices, setLoadingServices] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPosts();
    fetchServices();
  }, []);

  // Filter posts and services when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPosts(posts);
      setFilteredServices(services);
      return;
    }

    const query = searchQuery.toLowerCase();
    
    // Filter posts
    const matchedPosts = posts.filter(post => 
      post.content.toLowerCase().includes(query)
    );
    setFilteredPosts(matchedPosts);
    
    // Filter services
    const matchedServices = services.filter(service => 
      service.title.toLowerCase().includes(query) || 
      service.description.toLowerCase().includes(query) ||
      service.category.toLowerCase().includes(query)
    );
    setFilteredServices(matchedServices);
  }, [searchQuery, posts, services]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchPosts(), fetchServices()]);
    setRefreshing(false);
  };

  const fetchServices = async () => {
    try {
      if (!refreshing) setLoadingServices(true);
      
      const { data, error } = await supabase
        .from('services')
        .select(`
          id,
          title,
          description,
          price,
          category,
          location,
          media,
          rating,
          reviews_count,
          user_id,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(4);
        
      if (error) throw error;

      // Get user IDs from services to fetch profiles
      if (data && data.length > 0) {
        const userIds = data.map(service => service.user_id);
        
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);
          
        if (profilesError) throw profilesError;
        
        // Join services with profiles
        const servicesWithProfiles = data.map(service => {
          const profile = profilesData.find(p => p.id === service.user_id);
          return {
            ...service,
            profile: profile || null
          };
        });
        
        setServices(servicesWithProfiles);
        setFilteredServices(servicesWithProfiles);
      } else {
        setServices([]);
        setFilteredServices([]);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoadingServices(false);
    }
  };

  const fetchPosts = async () => {
    try {
      if (!refreshing) setLoadingPosts(true);
      
      // First get the posts
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          created_at,
          user_id,
          content,
          media,
          likes,
          comments
        `)
        .order('created_at', { ascending: false })
        .limit(4);
        
      if (error) throw error;
      
      // Then fetch profiles for these posts if there are any posts
      if (data && data.length > 0) {
        const userIds = data.map(post => post.user_id);
        
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);
          
        if (profilesError) throw profilesError;
        
        // Match profiles to posts
        const postsWithProfiles = data.map(post => {
          const profile = profilesData.find(p => p.id === post.user_id);
          return {
            ...post,
            profile: profile || null
          };
        });
        
        setPosts(postsWithProfiles);
        setFilteredPosts(postsWithProfiles);
      } else {
        setPosts([]);
        setFilteredPosts([]);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  const renderServiceItem = (service: Service) => (
    <TouchableOpacity
      key={service.id}
      style={styles.serviceCard}
      onPress={() => navigation.navigate('ServiceDetails', { service })}
    >
      {service.media && service.media.length > 0 ? (
        <Image
          source={{
            uri: service.media[0]
          }}
          style={styles.serviceImage}
        />
      ) : (
        <View style={styles.placeholderImage}>
          <Ionicons name="image-outline" size={24} color="#B4C4E0" />
        </View>
      )}
      <View style={styles.serviceInfo}>
        <Text style={styles.serviceTitle} numberOfLines={1}>{service.title}</Text>
        <Text style={styles.serviceCategory}>{service.category}</Text>
        <Text style={styles.servicePrice}>{service.price}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.appTitle}>Service App</Text>
          <SearchBar 
            onSearch={handleSearch}
            placeholder="Search services, posts..."
            width={wp(60)}
            compact={true}
            containerStyle={styles.searchBarContainer}
          />
        </View>
      </View>
      
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2B7CE5']}
            tintColor="#2B7CE5"
          />
        }
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular Services</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Services')}>
              <Text style={styles.seeMoreText}>See More</Text>
            </TouchableOpacity>
          </View>
          
          {loadingServices && !refreshing ? (
            <ActivityIndicator size="large" color="#2B7CE5" style={styles.loader} />
          ) : filteredServices.length > 0 ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.servicesList}
              contentContainerStyle={styles.servicesContainer}
            >
              {filteredServices.map(service => renderServiceItem(service))}
            </ScrollView>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery ? 'No matching services found' : 'No services available yet'}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Discussions</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Discussions')}>
              <Text style={styles.seeMoreText}>See More</Text>
            </TouchableOpacity>
          </View>
          
          {loadingPosts && !refreshing ? (
            <ActivityIndicator size="large" color="#2B7CE5" style={styles.loader} />
          ) : filteredPosts.length > 0 ? (
            <View>
              {filteredPosts.map((post) => (
                <TouchableOpacity
                  key={post.id}
                  style={styles.postCard}
                  onPress={() => navigation.navigate('PostDetails', { postId: post.id })}
                >
                  <View style={styles.postHeader}>
                    <Image
                      source={{
                        uri: post.profile?.avatar_url || `https://ui-avatars.com/api/?name=${post.profile?.username || 'User'}`
                      }}
                      style={styles.userAvatar}
                    />
                    <View>
                      <Text style={styles.username}>
                        {post.profile?.username || 'Anonymous User'}
                      </Text>
                      <Text style={styles.postTime}>
                        {new Date(post.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={styles.postContent} numberOfLines={3}>
                    {post.content}
                  </Text>
                  
                  {post.media && post.media.length > 0 && (
                    <Image
                      source={{ uri: post.media[0] }}
                      style={styles.postImage}
                    />
                  )}
                  
                  <View style={styles.postFooter}>
                    <View style={styles.postStat}>
                      <Ionicons name="heart-outline" size={16} color="#8798AD" />
                      <Text style={styles.statText}>{post.likes}</Text>
                    </View>
                    <View style={styles.postStat}>
                      <Ionicons name="chatbubble-outline" size={16} color="#8798AD" />
                      <Text style={styles.statText}>{post.comments}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery ? 'No matching discussions found' : 'No discussions available yet'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  searchBarContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  section: {
    marginBottom: hp(3),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    marginBottom: hp(1),
    marginTop: hp(2),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A2D40',
  },
  seeMoreText: {
    fontSize: 14,
    color: '#2B7CE5',
    fontWeight: '500',
  },
  servicesList: {
    paddingLeft: wp(4),
  },
  servicesContainer: {
    paddingRight: wp(4),
    paddingVertical: hp(1),
  },
  serviceCard: {
    width: wp(40),
    marginRight: wp(3),
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  serviceImage: {
    width: '100%',
    height: hp(15),
    backgroundColor: '#F5F8FA',
  },
  placeholderImage: {
    width: '100%',
    height: hp(15),
    backgroundColor: '#F5F8FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceInfo: {
    padding: 12,
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
    marginHorizontal: wp(4),
    marginBottom: hp(2),
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2D40',
  },
  postTime: {
    fontSize: 12,
    color: '#8798AD',
  },
  postContent: {
    fontSize: 14,
    color: '#1A2D40',
    marginBottom: 10,
    lineHeight: 20,
  },
  postImage: {
    width: '100%',
    height: hp(20),
    borderRadius: 8,
    marginBottom: 10,
  },
  postFooter: {
    flexDirection: 'row',
    marginTop: 5,
  },
  postStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  statText: {
    fontSize: 12,
    color: '#8798AD',
    marginLeft: 4,
  },
  loader: {
    marginVertical: hp(5),
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: hp(3),
  },
  emptyText: {
    fontSize: 14,
    color: '#8798AD',
    textAlign: 'center',
  },
});

export default HomeScreen; 