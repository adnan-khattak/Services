import React, { useState, useEffect, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  TouchableOpacity, 
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
import Ionicons from 'react-native-vector-icons/Ionicons';
import SearchBar from '../components/SearchBar';
import { format } from 'date-fns';
import MediaCarousel from '../components/MediaCarousel';

type RootStackParamList = {
  Posts: undefined;
  PostDetails: { post: any };
  NewPost: undefined;
};

type PostsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Posts'>;

interface Post {
  id: string;
  title: string;
  content: string;
  media: string[];
  created_at: string;
  user_id: string;
  profile?: {
    username: string;
    avatar_url?: string;
  } | null;
  likes_count: number;
  comments_count: number;
  liked_by_current_user?: boolean;
}

const PostsScreen = () => {
  const navigation = useNavigation<PostsScreenNavigationProp>();
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
      post.title.toLowerCase().includes(query) || 
      post.content.toLowerCase().includes(query) ||
      (post.profile?.username && post.profile.username.toLowerCase().includes(query))
    );
    
    setFilteredPosts(filtered);
  }, [searchQuery, posts]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          title,
          content,
          media,
          created_at,
          user_id,
          likes_count,
          comments_count
        `)
        .order('created_at', { ascending: false });
        
      if (error) throw error;

      if (data && data.length > 0) {
        // Get user IDs from posts to fetch profiles
        const userIds = data.map(post => post.user_id);
        
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);
          
        if (profilesError) throw profilesError;
        
        // Check if posts are liked by the current user
        let postsWithLikeInfo = [...data];
        
        if (session?.user) {
          const { data: likesData, error: likesError } = await supabase
            .from('post_likes')
            .select('post_id')
            .eq('user_id', session.user.id);
            
          if (!likesError && likesData) {
            const likedPostIds = likesData.map(like => like.post_id);
            
            postsWithLikeInfo = data.map(post => ({
              ...post,
              liked_by_current_user: likedPostIds.includes(post.id)
            }));
          }
        }
        
        // Join posts with profiles
        const postsWithProfiles = postsWithLikeInfo.map(post => {
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

  const handleLikePost = async (postId: string, currentlyLiked: boolean) => {
    if (!session) return;
    
    try {
      const userId = session.user.id;
      
      if (currentlyLiked) {
        // Unlike post
        await supabase
          .from('post_likes')
          .delete()
          .match({ user_id: userId, post_id: postId });
          
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post.id === postId 
              ? { 
                  ...post, 
                  likes_count: Math.max(0, post.likes_count - 1),
                  liked_by_current_user: false 
                }
              : post
          )
        );
      } else {
        // Like post
        await supabase
          .from('post_likes')
          .insert({ user_id: userId, post_id: postId });
          
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post.id === postId 
              ? { 
                  ...post, 
                  likes_count: post.likes_count + 1,
                  liked_by_current_user: true 
                }
              : post
          )
        );
      }
      
      // Update filtered posts as well
      setFilteredPosts(prevPosts => 
        prevPosts.map(post => 
          posts.find(p => p.id === post.id) || post
        )
      );
    } catch (error) {
      console.error('Error liking/unliking post:', error);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      return dateString;
    }
  };

  const renderPostItem = ({ item }: { item: Post }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.userInfo}>
          {item.profile?.avatar_url ? (
            <Image 
              source={{ uri: item.profile.avatar_url }} 
              style={styles.avatar} 
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {item.profile?.username?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <View>
            <Text style={styles.username}>{item.profile?.username || 'Unknown User'}</Text>
            <Text style={styles.postDate}>{formatDate(item.created_at)}</Text>
          </View>
        </View>
      </View>
      
      <TouchableOpacity
        onPress={() => navigation.navigate('PostDetails', { post: item })}
      >
        <Text style={styles.postTitle}>{item.title}</Text>
        <Text style={styles.postContent} numberOfLines={3}>{item.content}</Text>
        
        {item.media && item.media.length > 0 && (
          <View style={styles.mediaContainer}>
            <MediaCarousel 
              media={item.media} 
              height={wp(50)} 
              showPagination={true}
              autoPlay={false}
            />
          </View>
        )}
      </TouchableOpacity>
      
      <View style={styles.postFooter}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleLikePost(item.id, !!item.liked_by_current_user)}
        >
          <Ionicons 
            name={item.liked_by_current_user ? "heart" : "heart-outline"} 
            size={20} 
            color={item.liked_by_current_user ? "#F86A6A" : "#8798AD"} 
          />
          <Text style={styles.actionText}>{item.likes_count}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('PostDetails', { post: item })}
        >
          <Ionicons name="chatbubble-outline" size={20} color="#8798AD" />
          <Text style={styles.actionText}>{item.comments_count}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.screenTitle}>Community</Text>
          <SearchBar 
            onSearch={handleSearch}
            placeholder="Search posts..."
            width={wp(60)}
            compact={true}
            containerStyle={styles.searchBarContainer}
          />
        </View>
      </View>
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2B7CE5" />
        </View>
      ) : (
        <FlatList
          data={filteredPosts}
          renderItem={renderPostItem}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
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
                {searchQuery ? 'No posts match your search.' : 'No posts yet. Be the first to share!'}
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
  container: {
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
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2B7CE5',
  },
  searchBarContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: wp(4),
    paddingBottom: hp(10),
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: hp(2),
    padding: wp(4),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1.5),
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E1E8ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8798AD',
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2D40',
  },
  postDate: {
    fontSize: 12,
    color: '#8798AD',
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2D40',
    marginBottom: hp(1),
  },
  postContent: {
    fontSize: 14,
    color: '#4A617C',
    marginBottom: hp(1.5),
  },
  mediaContainer: {
    marginBottom: hp(1.5),
    borderRadius: 8,
    overflow: 'hidden',
  },
  postFooter: {
    flexDirection: 'row',
    marginTop: hp(1),
    paddingTop: hp(1),
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: wp(5),
  },
  actionText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#8798AD',
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

export default PostsScreen; 