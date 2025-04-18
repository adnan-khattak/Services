import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../utils/supabaseClient';
import { uploadMultipleFiles } from '../utils/cloudinaryClient';
import { SessionContext } from '../../App';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Asset } from 'react-native-image-picker';
import MediaPicker from '../components/MediaPicker';
import { showInterstitialAd } from '../utils/adUtils';

const NewPostScreen = () => {
  const navigation = useNavigation();
  const { session } = useContext(SessionContext);
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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
      // Upload media files to Cloudinary
      const mediaUrls = [];
      
      if (mediaFiles.length > 0) {
        try {
          // Upload to Cloudinary
          const urls = await uploadMultipleFiles(
            mediaFiles, 
            'posts', // Folder name in Cloudinary
            (progress) => setUploadProgress(progress * 0.7) // 70% of the progress is for upload
          );
          
          mediaUrls.push(...urls);
        } catch (error) {
          console.error('Error uploading media to Cloudinary:', error);
          // Continue without media if upload fails
        }
      }

      // Create post
      setUploadProgress(80); // 80% - Uploads complete, creating post
      
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

      // Show interstitial ad after successful post creation
      try {
        console.log('Attempting to show interstitial ad after post creation');
        const adDisplayed = await showInterstitialAd();
        console.log('Interstitial ad display result:', adDisplayed ? 'Displayed successfully' : 'Failed to display');
      } catch (adError) {
        console.log('Ad display error:', adError);
        // Continue even if ad fails to display
      }

      Alert.alert('Success', 'Your post has been published', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      console.error('Error creating post:', error);
      
      Alert.alert(
        'Error', 
        'Failed to create post. Please try again.'
      );
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close-outline" size={28} color="#1A2D40" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Discussion</Text>
          <TouchableOpacity 
            style={[
              styles.postButton, 
              (!content.trim() || isLoading) && styles.disabledButton
            ]}
            onPress={handleSubmit}
            disabled={!content.trim() || isLoading}
          >
            <Text style={styles.postButtonText}>Post</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.contentContainer}>
          <TextInput
            style={styles.contentInput}
            placeholder="What's on your mind?"
            placeholderTextColor="#8798AD"
            multiline
            value={content}
            onChangeText={setContent}
            maxLength={2000}
          />
          
          {/* Media Picker Component */}
          <MediaPicker 
            mediaFiles={mediaFiles}
            setMediaFiles={setMediaFiles}
            mediaType="POST"
          />
        </View>
        
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#2B7CE5" />
            <Text style={styles.loadingText}>
              {uploadProgress > 0 ? `Processing (${uploadProgress}%)` : 'Processing...'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A2D40',
  },
  cancelButton: {
    padding: 5,
  },
  postButton: {
    backgroundColor: '#2B7CE5',
    paddingVertical: hp(1),
    paddingHorizontal: wp(4),
    borderRadius: 20,
  },
  postButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  disabledButton: {
    backgroundColor: '#B4C4E0',
  },
  contentContainer: {
    padding: wp(4),
  },
  contentInput: {
    fontSize: 16,
    color: '#1A2D40',
    minHeight: hp(15),
    textAlignVertical: 'top',
    paddingTop: 0,
    marginBottom: hp(2),
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: wp(4),
  },
  loadingText: {
    marginLeft: wp(2),
    color: '#8798AD',
    fontSize: 14,
  },
});

export default NewPostScreen; 