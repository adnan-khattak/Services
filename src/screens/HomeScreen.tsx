import React, { useState, useEffect, useContext } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, ActivityIndicator, RefreshControl, SafeAreaView, Platform } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../utils/supabaseClient';
import { SessionContext } from '../../App';

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
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingServices, setLoadingServices] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPosts();
    fetchServices();
  }, []);

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
      } else {
        setServices([]);
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
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4E8AF4']}
            tintColor="#4E8AF4"
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
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4E8AF4" />
            </View>
          ) : services.length > 0 ? (
            <View style={styles.servicesGrid}>
              {services.map(service => (
                <TouchableOpacity 
                  key={service.id} 
                  style={styles.serviceCard}
                  onPress={() => navigation.navigate('ServiceDetails', { service })}
                >
                  <Image 
                    source={{ 
                      uri: service.media && service.media.length > 0 
                        ? service.media[0] 
                        : 'https://via.placeholder.com/150'
                    }} 
                    style={styles.serviceImage} 
                  />
                  <Text style={styles.serviceTitle}>{service.title}</Text>
                  <Text style={styles.serviceCategory}>{service.category}</Text>
                  <Text style={styles.servicePrice}>{service.price}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No services available yet.</Text>
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
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4E8AF4" />
            </View>
          ) : posts.length > 0 ? (
            <View style={styles.discussionsContainer}>
              {posts.map(post => (
                <TouchableOpacity 
                  key={post.id} 
                  style={styles.postCard}
                  onPress={() => navigation.navigate('PostDetails', { postId: post.id })}
                >
                  <Text style={styles.postUsername}>{post.profile?.username || 'Anonymous'}</Text>
                  <Text style={styles.postContent}>{post.content}</Text>
                  {post.media && post.media.length > 0 && (
                    <Image source={{ uri: post.media[0] }} style={styles.postImage} />
                  )}
                  <View style={styles.postStats}>
                    <Text style={styles.postStat}>{post.likes} likes</Text>
                    <Text style={styles.postStat}>{post.comments} comments</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No posts yet. Be the first to start a discussion!</Text>
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
    backgroundColor: '#F5F7FA',
    paddingTop: Platform.OS === 'android' ? 0 : hp('1%'),
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  section: {
    marginBottom: hp('3%'),
    padding: wp('4%'),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp('1.5%'),
  },
  sectionTitle: {
    fontSize: hp('2.5%'),
    fontWeight: 'bold',
    color: '#2E384D',
  },
  seeMoreText: {
    fontSize: hp('1.8%'),
    color: '#4E8AF4',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: wp('3%'),
    marginBottom: hp('1.5%'),
    width: wp('43%'),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  serviceImage: {
    width: '100%',
    height: hp('15%'),
    borderRadius: 8,
    marginBottom: hp('1%'),
  },
  serviceTitle: {
    fontSize: hp('2%'),
    fontWeight: 'bold',
    color: '#2E384D',
  },
  serviceCategory: {
    fontSize: hp('1.5%'),
    color: '#8798AD',
    marginBottom: hp('0.5%'),
  },
  servicePrice: {
    fontSize: hp('1.8%'),
    fontWeight: '600',
    color: '#4E8AF4',
  },
  discussionsContainer: {
    marginTop: hp('1%'),
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: wp('4%'),
    marginBottom: hp('1.5%'),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  postUsername: {
    fontSize: hp('1.8%'),
    fontWeight: 'bold',
    color: '#2E384D',
    marginBottom: hp('0.5%'),
  },
  postContent: {
    fontSize: hp('1.7%'),
    color: '#2E384D',
    marginBottom: hp('1%'),
  },
  postImage: {
    width: '100%',
    height: hp('20%'),
    borderRadius: 8,
    marginBottom: hp('1%'),
  },
  postStats: {
    flexDirection: 'row',
  },
  postStat: {
    fontSize: hp('1.5%'),
    color: '#8798AD',
    marginRight: wp('3%'),
  },
  loadingContainer: {
    height: hp('20%'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: wp('4%'),
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    height: hp('15%'),
  },
  emptyText: {
    color: '#8798AD',
    textAlign: 'center',
    fontSize: hp('1.8%'),
  },
});

export default HomeScreen; 