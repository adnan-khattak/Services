import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../utils/supabaseClient';
import { SessionContext } from '../../App';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';

const NewPostScreen = () => {
  const navigation = useNavigation();
  const { session } = useContext(SessionContext);
  const [content, setContent] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const pickMedia = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo', // Changed to photo only for better compatibility
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.7,
        selectionLimit: 3,
      });
      
      if (result.didCancel) {
        return;
      }
      
      if (result.errorCode) {
        Alert.alert('Error', result.errorMessage || 'Unknown error occurred');
        return;
      }
      
      if (result.assets) {
        // Limit to 3 media files total
        if (selectedMedia.length + result.assets.length > 3) {
          Alert.alert('Limit Exceeded', 'You can only upload up to 3 images');
          return;
        }
        
        setSelectedMedia([...selectedMedia, ...result.assets]);
      }
    } catch (err) {
      console.error('Error picking media:', err);
      Alert.alert('Error', 'Failed to pick media');
    }
  };

  const removeMedia = (index: number) => {
    const updatedMedia = [...selectedMedia];
    updatedMedia.splice(index, 1);
    setSelectedMedia(updatedMedia);
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please enter content for your post');
      return;
    }

    if (!session?.user) {
      Alert.alert('Error', 'You need to be logged in to create a post');
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);

    try {
      // Check if post_media bucket exists, create if not
      const { data: buckets } = await supabase.storage.listBuckets();
      const postMediaBucket = buckets?.find(bucket => bucket.name === 'post_media');
      
      if (!postMediaBucket) {
        // Create bucket if it doesn't exist
        const { error: bucketError } = await supabase.storage.createBucket('post_media', {
          public: true,
          fileSizeLimit: 5242880, // 5MB
        });
        if (bucketError) {
          console.warn('Error creating bucket:', bucketError);
          // Continue anyway, we'll try to upload
        }
      }

      const mediaUrls: string[] = [];

      // Upload media files if any
      if (selectedMedia.length > 0) {
        let uploadedCount = 0;
        
        for (const media of selectedMedia) {
          try {
            // Skip upload if the upload fails after 2 retries
            let uploadSuccess = false;
            let retryCount = 0;
            
            while (!uploadSuccess && retryCount < 3) {
              try {
                // Convert URI to blob
                const response = await fetch(media.uri);
                const blob = await response.blob();
                
                // Create unique file name
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
                const fileExt = (media.uri.split('.').pop() || 'jpg').toLowerCase();
                
                // Upload media
                const { data, error } = await supabase.storage
                  .from('post_media')
                  .upload(`${fileName}.${fileExt}`, blob);
                  
                if (error) throw error;
                
                // Get public URL
                const { data: urlData } = supabase.storage
                  .from('post_media')
                  .getPublicUrl(data?.path || '');
                  
                mediaUrls.push(urlData.publicUrl);
                uploadSuccess = true;
              } catch (error) {
                console.error(`Retry ${retryCount + 1} - Error uploading media:`, error);
                retryCount++;
                // Short delay before retry
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
            
            // Update progress
            uploadedCount++;
            setUploadProgress(Math.round((uploadedCount / selectedMedia.length) * 50)); // First 50% is uploads
            
            if (!uploadSuccess) {
              console.warn('Failed to upload media after 3 retries, continuing without this image');
            }
          } catch (error) {
            console.error('Error during media upload:', error);
            // Continue with other uploads
          }
        }
      }

      // Create post even if some media uploads failed
      setUploadProgress(75); // 75% - Starting post creation
      
      const { data, error } = await supabase
        .from('posts')
        .insert([{
          user_id: session.user.id,
          content: content.trim(),
          media: mediaUrls.length > 0 ? mediaUrls : null,
          likes: 0,
          comments: 0,
        }])
        .select();

      if (error) throw error;

      setUploadProgress(100);
      console.log('Post created successfully:', data);

      Alert.alert('Success', 'Your post has been published', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      console.error('Error creating post:', error);
      
      // Try to create post without media if media upload failed
      if (selectedMedia.length > 0) {
        try {
          const { data, error } = await supabase
            .from('posts')
            .insert([{
              user_id: session.user.id,
              content: content.trim(),
              media: null,
              likes: 0,
              comments: 0,
            }])
            .select();
            
          if (error) throw error;
          
          Alert.alert(
            'Partial Success', 
            'Your post was created but we couldn\'t upload your images. You can edit the post later to add images.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          return;
        } catch (fallbackError) {
          console.error('Fallback post creation also failed:', fallbackError);
        }
      }
      
      Alert.alert('Error', error.message || 'Failed to create post');
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <TextInput
        style={styles.contentInput}
        placeholder="What's on your mind?"
        value={content}
        onChangeText={setContent}
        multiline
        numberOfLines={5}
        placeholderTextColor="#8798AD"
      />

      {selectedMedia.length > 0 && (
        <ScrollView horizontal style={styles.mediaPreviewContainer}>
          {selectedMedia.map((media, index) => (
            <View key={index} style={styles.mediaPreviewItem}>
              <Image source={{ uri: media.uri }} style={styles.mediaPreview} />
              <TouchableOpacity
                style={styles.removeMediaButton}
                onPress={() => removeMedia(index)}
              >
                <Ionicons name="close-circle" size={24} color="#FF4D4F" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.mediaButton} onPress={pickMedia}>
          <Ionicons name="image-outline" size={24} color="#4E8AF4" />
          <Text style={styles.mediaButtonText}>Add Photos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <ActivityIndicator color="#FFFFFF" />
              {uploadProgress > 0 && (
                <Text style={styles.progressText}>{uploadProgress}%</Text>
              )}
            </>
          ) : (
            <Text style={styles.submitButtonText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: wp('5%'),
  },
  contentInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: hp('2%'),
    minHeight: hp('15%'),
    fontSize: hp('1.8%'),
    color: '#2E384D',
    textAlignVertical: 'top',
    marginBottom: hp('2%'),
  },
  mediaPreviewContainer: {
    flexDirection: 'row',
    marginBottom: hp('2%'),
  },
  mediaPreviewItem: {
    position: 'relative',
    marginRight: wp('2%'),
  },
  mediaPreview: {
    width: wp('30%'),
    height: wp('30%'),
    borderRadius: 8,
  },
  removeMediaButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: hp('1%'),
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: hp('1%'),
  },
  mediaButtonText: {
    color: '#4E8AF4',
    marginLeft: wp('1%'),
    fontSize: hp('1.6%'),
  },
  submitButton: {
    backgroundColor: '#4E8AF4',
    paddingVertical: hp('1.5%'),
    paddingHorizontal: wp('7%'),
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: hp('1.7%'),
  },
  progressText: {
    color: '#FFFFFF',
    marginLeft: 5,
    fontSize: hp('1.4%'),
  },
});

export default NewPostScreen; 