import React, { useState, useEffect, useContext, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator, 
  Alert,
  RefreshControl,
  SafeAreaView
} from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../utils/supabaseClient';
import { SessionContext } from '../../App';
import { format, formatDistanceToNow } from 'date-fns';
import Ionicons from 'react-native-vector-icons/Ionicons';
import SearchBar from '../components/SearchBar';

type RootStackParamList = {
  Discussions: undefined;
  PostDetails: { postId: string };
  NewPost: undefined;
};

type DiscussionsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Discussions'>;

interface Post {
  id: string;
  created_at: string;
  user_id: string;
  content: string;
  media: string[] | null;
  likes: number;
  comments: number;
  isLiked?: boolean;
  profile: {
    id: string;
    username: string;
    avatar_url?: string;
  } | null;
}

const DiscussionsScreen = () => {
  const navigation = useNavigation<DiscussionsScreenNavigationProp>();
  const { session } = useContext(SessionContext);
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  // Filter posts based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPosts(posts);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = posts.filter(post => 
      post.content.toLowerCase().includes(query) ||
      (post.profile?.username || '').toLowerCase().includes(query)
    );
    
    setFilteredPosts(filtered);
  }, [searchQuery, posts]);

  // Check if user has liked posts
  useEffect(() => {
    if (session?.user && posts.length > 0) {
      checkUserLikes();
    }
  }, [posts, session]);

  const checkUserLikes = async () => {
    if (!session?.user) return;
    
    try {
      const { data, error } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', session.user.id);
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        const likedPostIds = data.map(like => like.post_id);
        
        setPosts(prevPosts => 
          prevPosts.map(post => ({
            ...post,
            isLiked: likedPostIds.includes(post.id)
          }))
        );
      }
    } catch (error) {
      console.error('Error checking user likes:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      
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
        .order('created_at', { ascending: false });
        
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
            profile: profile || null,
            isLiked: false // Default value, should be updated with user's like status
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
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  const handleLikePost = async (postId: string) => {
    if (!session?.user) {
      Alert.alert('Error', 'You need to be logged in to like posts');
      return;
    }
    
    // Find the post
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    // Update UI optimistically
    setPosts(prevPosts => 
      prevPosts.map(post => {
        if (post.id === postId) {
          return { 
            ...post, 
            likes: post.isLiked ? post.likes - 1 : post.likes + 1,
            isLiked: !post.isLiked 
          };
        }
        return post;
      })
    );
    
    // Also update filtered posts
    setFilteredPosts(prevPosts => 
      prevPosts.map(post => {
        if (post.id === postId) {
          return { 
            ...post, 
            likes: post.isLiked ? post.likes - 1 : post.likes + 1,
            isLiked: !post.isLiked 
          };
        }
        return post;
      })
    );
    
    try {
      if (post.isLiked) {
        // Unlike: Delete the like record
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', session.user.id);
          
        // Update post likes count
        await supabase
          .from('posts')
          .update({ likes: post.likes - 1 })
          .eq('id', postId);
      } else {
        // Like: Insert a like record
        await supabase
          .from('likes')
          .insert([{ 
            post_id: postId, 
            user_id: session.user.id 
          }]);
          
        // Update post likes count
        await supabase
          .from('posts')
          .update({ likes: post.likes + 1 })
          .eq('id', postId);
      }
    } catch (error) {
      console.error('Error updating like:', error);
      
      // Revert the optimistic update if there's an error
      setPosts(prevPosts => 
        prevPosts.map(p => {
          if (p.id === postId) {
            return { 
              ...p, 
              likes: p.isLiked ? p.likes + 1 : p.likes - 1,
              isLiked: !p.isLiked 
            };
          }
          return p;
        })
      );
      
      setFilteredPosts(prevPosts => 
        prevPosts.map(p => {
          if (p.id === postId) {
            return { 
              ...p, 
              likes: p.isLiked ? p.likes + 1 : p.likes - 1,
              isLiked: !p.isLiked 
            };
          }
          return p;
        })
      );
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return 'recently';
    }
  };

  const renderPostItem = ({ item }: { item: Post }) => (
    <TouchableOpacity 
      style={styles.postCard}
      onPress={() => navigation.navigate('PostDetails', { postId: item.id })}
    >
      <View style={styles.postHeader}>
        <Image 
          source={{ 
            uri: item.profile?.avatar_url || `https://ui-avatars.com/api/?name=${item.profile?.username || 'User'}`
          }} 
          style={styles.userAvatar} 
        />
        <View style={styles.headerInfo}>
          <Text style={styles.username}>{item.profile?.username || 'Anonymous User'}</Text>
          <Text style={styles.timestamp}>{formatTimestamp(item.created_at)}</Text>
        </View>
      </View>
      
      <Text style={styles.postContent} numberOfLines={5}>{item.content}</Text>
      
      {item.media && item.media.length > 0 && (
        <Image 
          source={{ uri: item.media[0] }} 
          style={styles.postImage} 
          resizeMode="cover"
        />
      )}
      
      <View style={styles.postFooter}>
        <TouchableOpacity 
          style={styles.likeButton}
          onPress={() => handleLikePost(item.id)}
        >
          <Ionicons 
            name={item.isLiked ? "heart" : "heart-outline"} 
            size={20} 
            color={item.isLiked ? "#F23B5F" : "#8798AD"} 
          />
          <Text style={[styles.footerText, item.isLiked && styles.likedText]}>
            {item.likes} {item.likes === 1 ? 'like' : 'likes'}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.commentButton}>
          <Ionicons name="chatbubble-outline" size={18} color="#8798AD" />
          <Text style={styles.footerText}>
            {item.comments} {item.comments === 1 ? 'comment' : 'comments'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
            <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.appTitle}>Discussions</Text>
          <SearchBar 
            onSearch={handleSearch}
            placeholder="Search posts..."
            width={wp(60)}
            compact={true}
            containerStyle={styles.searchBarContainer}
          />
        </View>
      </View>
      {/* <SearchBar 
        onSearch={handleSearch}
        placeholder="Search discussions..."
      /> */}
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2B7CE5" />
        </View>
      ) : (
        <FlatList
          data={filteredPosts}
          renderItem={renderPostItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#2B7CE5']}
              tintColor="#2B7CE5"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery ? 'No discussions match your search.' : 'No discussions yet. Start a new one!'}
              </Text>
            </View>
          }
        />
      )}
      
      {session && (
        <TouchableOpacity 
          style={styles.floatingButton}
          onPress={() => navigation.navigate('NewPost')}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: wp(4),
    paddingBottom: hp(10), // Add extra padding for the floating button
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
  headerInfo: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2D40',
  },
  timestamp: {
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
    height: wp(50),
    borderRadius: 8,
    marginBottom: 10,
  },
  postFooter: {
    flexDirection: 'row',
    marginTop: 5,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  commentButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#8798AD',
    marginLeft: 4,
  },
  likedText: {
    color: '#F23B5F',
  },
  emptyContainer: {
    padding: hp(5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#8798AD',
    textAlign: 'center',
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

export default DiscussionsScreen; 