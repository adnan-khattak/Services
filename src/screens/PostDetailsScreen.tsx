import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { SessionContext } from '../../App';
import { supabase, getPostById } from '../utils/supabaseClient';
import Ionicons from 'react-native-vector-icons/Ionicons';

type PostRouteProp = RouteProp<{
  PostDetails: {
    postId: string;
  };
}, 'PostDetails'>;

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  username?: string;
}

const PostDetailsScreen = () => {
  const route = useRoute<PostRouteProp>();
  const { postId } = route.params;
  const { session } = useContext(SessionContext);
  const navigation = useNavigation();

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    fetchPostDetails();
  }, []);

  const fetchPostDetails = async () => {
    try {
      // Fetch post
      const { data: postData, error: postError } = await getPostById(postId.toString());
      
      if (postError) throw postError;
      
      setPost(postData);
      
      // Fetch comments
      const { data: commentData, error: commentError } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
        
      if (commentError) throw commentError;
      
      // Get user IDs from comments to fetch profiles
      if (commentData && commentData.length > 0) {
        const userIds = commentData.map(comment => comment.user_id);
        
        // Fetch profiles for comment authors
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);
          
        if (profilesError) throw profilesError;
        
        // Join comments with profiles
        const formattedComments = commentData.map(comment => {
          const profile = profilesData.find(p => p.id === comment.user_id);
          return {
            ...comment,
            username: profile?.username || 'Anonymous'
          };
        });
        
        setComments(formattedComments);
      } else {
        setComments([]);
      }
      
      // Check if user liked the post
      if (session?.user) {
        const { data: likeData } = await supabase
          .from('likes')
          .select('*')
          .eq('post_id', postId)
          .eq('user_id', session.user.id)
          .single();
          
        setLiked(!!likeData);
      }
    } catch (error) {
      console.error('Error fetching post details:', error);
      Alert.alert('Error', 'Failed to load post details');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!session?.user) {
      Alert.alert('Error', 'You need to be logged in to like posts');
      return;
    }
    
    try {
      if (liked) {
        // Unlike
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', session.user.id);
          
        // Update likes count
        await supabase
          .from('posts')
          .update({ likes: post.likes - 1 })
          .eq('id', postId);
          
        setPost({ ...post, likes: post.likes - 1 });
      } else {
        // Like
        await supabase
          .from('likes')
          .insert([{ post_id: postId, user_id: session.user.id }]);
          
        // Update likes count
        await supabase
          .from('posts')
          .update({ likes: post.likes + 1 })
          .eq('id', postId);
          
        setPost({ ...post, likes: post.likes + 1 });
      }
      
      setLiked(!liked);
    } catch (error) {
      console.error('Error liking/unliking post:', error);
      Alert.alert('Error', 'Failed to like/unlike post');
    }
  };

  const submitComment = async () => {
    if (!session?.user) {
      Alert.alert('Error', 'You need to be logged in to comment');
      return;
    }
    
    if (!newComment.trim()) {
      Alert.alert('Error', 'Comment cannot be empty');
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Add comment
      const { data, error } = await supabase
        .from('comments')
        .insert([
          {
            post_id: postId,
            user_id: session.user.id,
            content: newComment.trim(),
          }
        ])
        .select();
        
      if (error) throw error;
      
      // Update comments count
      await supabase
        .from('posts')
        .update({ comments: post.comments + 1 })
        .eq('id', postId);
      
      // Get user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', session.user.id)
        .single();
        
      // Update UI
      const newCommentObject = {
        ...data[0],
        username: profileData?.username || session.user.email?.split('@')[0] || 'Anonymous'
      };
      
      setComments([...comments, newCommentObject]);
      setPost({ ...post, comments: post.comments + 1 });
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4E8AF4" />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Post not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.postCard}>
          <View style={styles.postHeader}>
            <View style={styles.userInfo}>
              {post.profile?.avatar_url ? (
                <Image
                  source={{ uri: post.profile.avatar_url }}
                  style={styles.avatar}
                />
              ) : (
                <Image
                  source={{ uri: 'https://ui-avatars.com/api/?name=' + (post.profile?.username || 'Anonymous') }}
                  style={styles.avatar}
                />
              )}
              <View>
                <Text style={styles.username}>{post.profile?.username || 'Anonymous'}</Text>
                <Text style={styles.timestamp}>
                  {new Date(post.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.postContent}>{post.content}</Text>

          {post.media && post.media.length > 0 && (
            <ScrollView horizontal style={styles.mediaContainer}>
              {post.media.map((mediaUrl: string, index: number) => (
                <Image 
                  key={index} 
                  source={{ uri: mediaUrl }} 
                  style={styles.media} 
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          )}

          <View style={styles.postActions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
              <Ionicons 
                name={liked ? "heart" : "heart-outline"} 
                size={20} 
                color={liked ? "#FF4D4F" : "#8798AD"} 
              />
              <Text style={[styles.actionText, liked && styles.likedText]}>
                {post.likes} {post.likes === 1 ? 'Like' : 'Likes'}
              </Text>
            </TouchableOpacity>
            
            <View style={styles.actionButton}>
              <Ionicons name="chatbubble-outline" size={20} color="#8798AD" />
              <Text style={styles.actionText}>
                {post.comments} {post.comments === 1 ? 'Comment' : 'Comments'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>Comments</Text>
          
          {comments.length === 0 ? (
            <Text style={styles.noCommentsText}>No comments yet. Be the first to comment!</Text>
          ) : (
            comments.map((comment) => (
              <View key={comment.id} style={styles.commentItem}>
                <Image
                  source={{ uri: 'https://ui-avatars.com/api/?name=' + comment.username }}
                  style={styles.commentAvatar}
                />
                <View style={styles.commentContent}>
                  <Text style={styles.commentUsername}>{comment.username}</Text>
                  <Text style={styles.commentText}>{comment.content}</Text>
                  <Text style={styles.commentTimestamp}>
                    {new Date(comment.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View style={styles.commentInputContainer}>
        <TextInput
          style={styles.commentInput}
          placeholder="Add a comment..."
          value={newComment}
          onChangeText={setNewComment}
          multiline
        />
        <TouchableOpacity 
          style={styles.commentButton} 
          onPress={submitComment}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </View>
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
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: hp('2%'),
    color: '#FF4D4F',
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    padding: wp('5%'),
    margin: wp('4%'),
    borderRadius: 10,
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
  mediaContainer: {
    flexDirection: 'row',
    marginBottom: hp('1.5%'),
  },
  media: {
    width: wp('70%'),
    height: hp('25%'),
    borderRadius: 8,
    marginRight: wp('2%'),
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
    marginLeft: wp('1%'),
  },
  likedText: {
    color: '#FF4D4F',
  },
  commentsSection: {
    backgroundColor: '#FFFFFF',
    padding: wp('5%'),
    margin: wp('4%'),
    marginTop: 0,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  commentsTitle: {
    fontSize: hp('2%'),
    fontWeight: 'bold',
    color: '#2E384D',
    marginBottom: hp('2%'),
  },
  noCommentsText: {
    fontSize: hp('1.6%'),
    color: '#8798AD',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: hp('2%'),
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: hp('2%'),
  },
  commentAvatar: {
    width: hp('4%'),
    height: hp('4%'),
    borderRadius: hp('2%'),
    marginRight: wp('2%'),
  },
  commentContent: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: wp('3%'),
    borderRadius: 8,
  },
  commentUsername: {
    fontSize: hp('1.5%'),
    fontWeight: 'bold',
    color: '#2E384D',
    marginBottom: hp('0.5%'),
  },
  commentText: {
    fontSize: hp('1.6%'),
    color: '#2E384D',
    marginBottom: hp('0.5%'),
  },
  commentTimestamp: {
    fontSize: hp('1.2%'),
    color: '#8798AD',
  },
  commentInputContainer: {
    flexDirection: 'row',
    padding: wp('4%'),
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E4E8F0',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    borderRadius: 20,
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('1.2%'),
    fontSize: hp('1.6%'),
    color: '#2E384D',
    maxHeight: hp('10%'),
  },
  commentButton: {
    backgroundColor: '#4E8AF4',
    width: hp('4.5%'),
    height: hp('4.5%'),
    borderRadius: hp('2.25%'),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: wp('2%'),
  },
});

export default PostDetailsScreen; 