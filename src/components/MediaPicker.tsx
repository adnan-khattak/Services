import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { launchImageLibrary, launchCamera, Asset } from 'react-native-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { 
  validateMediaFile, 
  MEDIA_CONSTRAINTS, 
  ALLOWED_IMAGE_TYPES, 
  ALLOWED_VIDEO_TYPES 
} from '../utils/cloudinaryClient';

interface MediaPickerProps {
  mediaFiles: Asset[];
  setMediaFiles: (files: Asset[]) => void;
  mediaType: 'SERVICE' | 'POST' | 'COMMENT';
  maxImages?: number;
  maxVideos?: number;
}

const MediaPicker: React.FC<MediaPickerProps> = ({
  mediaFiles,
  setMediaFiles,
  mediaType,
  maxImages,
  maxVideos,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  
  // Use the provided limits or fall back to defaults from MEDIA_CONSTRAINTS
  const imageLimit = maxImages || MEDIA_CONSTRAINTS[mediaType].MAX_IMAGES;
  const videoLimit = maxVideos || MEDIA_CONSTRAINTS[mediaType].MAX_VIDEOS;
  
  // Count current images and videos
  const currentImages = mediaFiles.filter(file => 
    ALLOWED_IMAGE_TYPES.includes(file.type || '')).length;
    
  const currentVideos = mediaFiles.filter(file => 
    ALLOWED_VIDEO_TYPES.includes(file.type || '')).length;

  const pickImage = async () => {
    if (currentImages >= imageLimit) {
      Alert.alert('Limit Reached', `You can only upload up to ${imageLimit} images`);
      return;
    }
    
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        maxWidth: 1000,
        maxHeight: 1000,
        quality: 0.8,
        selectionLimit: imageLimit - currentImages,
      });
      
      if (result.didCancel) {
        return;
      }
      
      if (result.errorCode) {
        Alert.alert('Error', result.errorMessage || 'Unknown error occurred');
        return;
      }
      
      if (result.assets) {
        // Validate each image before adding
        const validatedAssets = [];
        
        for (const asset of result.assets) {
          const validation = validateMediaFile(asset, 'image', mediaType);
          
          if (validation.valid) {
            validatedAssets.push(asset);
          } else {
            Alert.alert('Invalid Image', validation.error || 'Image does not meet requirements');
          }
        }
        
        if (validatedAssets.length > 0) {
          setMediaFiles([...mediaFiles, ...validatedAssets]);
        }
      }
    } catch (err) {
      console.error('Error picking images:', err);
      Alert.alert('Error', 'Failed to pick images');
    }
  };
  
  const pickVideo = async () => {
    if (currentVideos >= videoLimit) {
      Alert.alert('Limit Reached', `You can only upload up to ${videoLimit} videos`);
      return;
    }
    
    try {
      const result = await launchImageLibrary({
        mediaType: 'video',
        quality: 0.8,
        selectionLimit: 1, // Always limit to 1 video at a time
      });
      
      if (result.didCancel) {
        return;
      }
      
      if (result.errorCode) {
        Alert.alert('Error', result.errorMessage || 'Unknown error occurred');
        return;
      }
      
      if (result.assets) {
        // Validate video before adding
        const asset = result.assets[0];
        const validation = validateMediaFile(asset, 'video', mediaType);
        
        if (validation.valid) {
          setMediaFiles([...mediaFiles, asset]);
        } else {
          Alert.alert('Invalid Video', validation.error || 'Video does not meet requirements');
        }
      }
    } catch (err) {
      console.error('Error picking video:', err);
      Alert.alert('Error', 'Failed to pick video');
    }
  };

  const removeMedia = (index: number) => {
    const updatedMedia = [...mediaFiles];
    updatedMedia.splice(index, 1);
    setMediaFiles(updatedMedia);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Media</Text>
        <Text style={styles.subtitle}>
          {`Max ${imageLimit} images (1MB each) & ${videoLimit} video (≤15s, ≤5MB)`}
        </Text>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.mediaPreviewScroll}
        contentContainerStyle={styles.mediaPreviewContent}
      >
        {mediaFiles.map((media, index) => (
          <View key={index} style={styles.mediaPreview}>
            <Image 
              source={{ uri: media.uri }} 
              style={styles.previewImage} 
              resizeMode="cover"
            />
            
            {ALLOWED_VIDEO_TYPES.includes(media.type || '') && (
              <View style={styles.videoIndicator}>
                <Ionicons name="videocam" size={16} color="#FFF" />
              </View>
            )}
            
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeMedia(index)}
            >
              <Ionicons name="close-circle" size={22} color="#F23B5F" />
            </TouchableOpacity>
          </View>
        ))}
        
        <View style={styles.mediaActions}>
          {currentImages < imageLimit && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={pickImage}
              disabled={isUploading}
            >
              <Ionicons name="image-outline" size={24} color="#2B7CE5" />
              <Text style={styles.addButtonText}>Image</Text>
            </TouchableOpacity>
          )}
          
          {currentVideos < videoLimit && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={pickVideo}
              disabled={isUploading}
            >
              <Ionicons name="videocam-outline" size={24} color="#2B7CE5" />
              <Text style={styles.addButtonText}>Video</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
      
      {isUploading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#2B7CE5" />
          <Text style={styles.loadingText}>Uploading media...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: hp(1),
    width: '100%',
  },
  header: {
    marginBottom: hp(1),
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2D40',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#8798AD',
  },
  mediaPreviewScroll: {
    flexGrow: 0,
  },
  mediaPreviewContent: {
    alignItems: 'center',
  },
  mediaPreview: {
    width: wp(25),
    height: wp(25),
    borderRadius: 8,
    marginRight: wp(2),
    position: 'relative',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  videoIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 4,
    padding: 4,
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  mediaActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButton: {
    width: wp(25),
    height: wp(25),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D0DAE4',
    borderStyle: 'dashed',
    backgroundColor: '#F5F8FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(2),
  },
  addButtonText: {
    marginTop: 4,
    fontSize: 12,
    color: '#2B7CE5',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(1),
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#8798AD',
  },
});

export default MediaPicker; 