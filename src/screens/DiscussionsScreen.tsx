import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../utils/supabaseClient';
import { SessionContext } from '../../App';
import { format, formatDistanceToNow } from 'date-fns';

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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

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
      } else {
        setPosts([]);
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
      
      Alert.alert('Error', 'Failed to update like status');
    }
  };
  
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return 'recently';
    }
  };

  const renderPostItem = ({ item }: { item: Post }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.userInfo}>
          {item.profile?.avatar_url ? (
            <Image source={{ uri: item.profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.placeholderAvatar]}>
              <Text style={styles.avatarText}>
                {item.profile?.username?.[0]?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <View>
            <Text style={styles.username}>{item.profile?.username || 'Anonymous'}</Text>
            <Text style={styles.timestamp}>{formatTimestamp(item.created_at)}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.postContent}>{item.content}</Text>
      
      {item.media && item.media.length > 0 && (
        <Image source={{ uri: item.media[0] }} style={styles.postMedia} />
      )}
      
      <View style={styles.postActions}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => handleLikePost(item.id)}
        >
          <Text style={[styles.actionText, item.isLiked && styles.likedText]}>
            {item.likes} {item.likes === 1 ? 'Like' : 'Likes'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('PostDetails', { postId: item.id })}
        >
          <Text style={styles.actionText}>
            {item.comments} {item.comments === 1 ? 'Comment' : 'Comments'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4E8AF4" />
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPostItem}
          keyExtractor={item => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No discussions yet. Start a new one!</Text>
            </View>
          }
        />
      )}
      
      <TouchableOpacity 
        style={styles.newPostButton}
        onPress={() => navigation.navigate('NewPost')}
      >
        <Text style={styles.newPostButtonText}>New Discussion</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  listContent: {
    padding: wp('4%'),
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: wp('4%'),
    marginBottom: hp('2%'),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp('1.5%'),
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: hp('5%'),
    height: hp('5%'),
    borderRadius: hp('2.5%'),
    marginRight: wp('2%'),
  },
  placeholderAvatar: {
    backgroundColor: '#4E8AF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: hp('2%'),
  },
  username: {
    fontSize: hp('1.8%'),
    fontWeight: 'bold',
    color: '#2E384D',
  },
  timestamp: {
    fontSize: hp('1.3%'),
    color: '#8798AD',
  },
  postContent: {
    fontSize: hp('1.7%'),
    color: '#2E384D',
    lineHeight: hp('2.3%'),
    marginBottom: hp('1.5%'),
  },
  postMedia: {
    width: '100%',
    height: hp('25%'),
    borderRadius: 8,
    marginBottom: hp('1.5%'),
  },
  postActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E4E8F0',
    paddingTop: hp('1.5%'),
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: wp('5%'),
  },
  actionText: {
    fontSize: hp('1.5%'),
    color: '#8798AD',
  },
  likedText: {
    color: '#4E8AF4',
    fontWeight: '500',
  },
  newPostButton: {
    position: 'absolute',
    right: wp('5%'),
    bottom: hp('2%'),
    backgroundColor: '#4E8AF4',
    paddingVertical: hp('1.5%'),
    paddingHorizontal: wp('5%'),
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  newPostButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: hp('1.7%'),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: hp('3%'),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#8798AD',
    fontSize: hp('1.8%'),
    textAlign: 'center',
  },
});

export default DiscussionsScreen; 