import React, { useState, useContext, useEffect } from 'react';
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
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useNavigation } from '@react-navigation/native';
import { SessionContext } from '../../App';
import { supabase } from '../utils/supabaseClient';
import { uploadMultipleFiles } from '../utils/cloudinaryClient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Picker } from '@react-native-picker/picker';
import { Asset } from 'react-native-image-picker';
import MediaPicker from '../components/MediaPicker';
import { showInterstitialAd } from '../utils/adUtils';

// Service categories
const SERVICE_CATEGORIES = [
  'Home',
  'Beauty',
  'Education',
  'Other'
];

const AddServiceScreen = () => {
  const navigation = useNavigation();
  const { session } = useContext(SessionContext);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(SERVICE_CATEGORIES[0]);
  const [location, setLocation] = useState('');
  const [mediaFiles, setMediaFiles] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Check if user is logged in
  useEffect(() => {
    if (!session?.user) {
      Alert.alert(
        'Not Logged In',
        'You need to be logged in to add services.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  }, [session, navigation]);

  const handleSubmit = async () => {
    if (!session?.user) {
      Alert.alert('Error', 'You need to be logged in');
      return;
    }
    
    if (!title.trim() || !description.trim() || !price.trim() || !location.trim()) {
      Alert.alert('Error', 'Please fill in all the required fields');
      return;
    }
    
    setIsLoading(true);
    setUploadProgress(0);
    
    try {
      // Upload media files to Cloudinary
      const mediaUrls = [];
      
      if (mediaFiles.length > 0) {
        try {
          // Upload media files to Cloudinary
          const urls = await uploadMultipleFiles(
            mediaFiles,
            'services', // Folder name in Cloudinary
            (progress) => setUploadProgress(progress * 0.7) // 70% of the progress is for upload
          );
          
          mediaUrls.push(...urls);
        } catch (error) {
          console.error('Error uploading media to Cloudinary:', error);
          throw new Error('Failed to upload media');
        }
      }
      
      setUploadProgress(80); // 80% - Uploads complete, creating service
      
      // Create service
      const { data, error } = await supabase
        .from('services')
        .insert([
          {
            user_id: session.user.id,
            title: title.trim(),
            description: description.trim(),
            price: price.trim(),
            category,
            location: location.trim(),
            media: mediaUrls,
          }
        ])
        .select();
        
      if (error) throw error;
      
      setUploadProgress(100);
      console.log('Service created successfully:', data);
      
      // Show interstitial ad after successful service creation
      try {
        await showInterstitialAd();
      } catch (adError) {
        console.log('Ad display error:', adError);
        // Continue even if ad fails to display
      }
      
      Alert.alert(
        'Success',
        'Your service has been added successfully',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      console.error('Error adding service:', error);
      Alert.alert('Error', error.message || 'Failed to add service');
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{flex: 1}}
      >
        <ScrollView style={styles.container}>
          <View style={styles.formContainer}>
            <Text style={styles.label}>Service Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="E.g., Plumbing Services"
              placeholderTextColor="#8798AD"
            />
            
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe your service in detail"
              placeholderTextColor="#8798AD"
              multiline
              numberOfLines={5}
            />
            
            <Text style={styles.label}>Price</Text>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              placeholder="E.g., $50/hr or $200 flat rate"
              placeholderTextColor="#8798AD"
              keyboardType="default"
            />
            
            <Text style={styles.label}>Category</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={category}
                onValueChange={(itemValue) => setCategory(itemValue)}
                style={styles.picker}
              >
                {SERVICE_CATEGORIES.map((cat) => (
                  <Picker.Item key={cat} label={cat} value={cat} />
                ))}
              </Picker>
            </View>
            
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="E.g., New York, NY"
              placeholderTextColor="#8798AD"
            />
            
            {/* Media Picker Component */}
            <MediaPicker 
              mediaFiles={mediaFiles}
              setMediaFiles={setMediaFiles}
              mediaType="SERVICE"
            />
            
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#2B7CE5" />
                <Text style={styles.loadingText}>
                  {uploadProgress > 0 ? `Processing (${uploadProgress}%)` : 'Processing...'}
                </Text>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.submitButton}
                onPress={handleSubmit}
              >
                <Text style={styles.submitButtonText}>Add Service</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  formContainer: {
    padding: wp(5),
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2D40',
    marginBottom: hp(1),
    marginTop: hp(2),
  },
  input: {
    backgroundColor: '#F5F8FA',
    borderRadius: 8,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    fontSize: 14,
    color: '#1A2D40',
    width: '100%',
  },
  textArea: {
    height: hp(15),
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#F5F8FA',
    borderRadius: 8,
    marginBottom: hp(1),
  },
  picker: {
    width: '100%',
  },
  submitButton: {
    backgroundColor: '#2B7CE5',
    borderRadius: 8,
    paddingVertical: hp(1.8),
    marginTop: hp(3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: hp(3),
  },
  loadingText: {
    marginLeft: wp(2),
    color: '#8798AD',
    fontSize: 14,
  },
});

export default AddServiceScreen; 