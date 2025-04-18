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
  Modal,
  FlatList,
} from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useNavigation } from '@react-navigation/native';
import { SessionContext } from '../../App';
import { supabase } from '../utils/supabaseClient';
import { uploadMultipleFiles } from '../utils/cloudinaryClient';
import Ionicons from 'react-native-vector-icons/Ionicons';
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
  const [showCategoryModal, setShowCategoryModal] = useState(false);

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
        console.log('Attempting to show interstitial ad after service creation');
        const adDisplayed = await showInterstitialAd();
        console.log('Interstitial ad display result:', adDisplayed ? 'Displayed successfully' : 'Failed to display');
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
              onChangeText={(text) => {
                // Add $ prefix if user hasn't added it
                if (text && !text.startsWith('$') && text !== '') {
                  setPrice(`$${text}`);
                } else {
                  setPrice(text);
                }
              }}
              placeholder="E.g., $50/hr or $200 flat rate"
              placeholderTextColor="#8798AD"
              keyboardType="default"
            />
            
            <Text style={styles.label}>Category</Text>
            <TouchableOpacity 
              style={styles.categorySelector}
              onPress={() => setShowCategoryModal(true)}
            >
              <Text style={styles.categoryText}>{category}</Text>
              <Ionicons name="chevron-down" size={16} color="#8798AD" />
            </TouchableOpacity>
            
            {/* Category Selection Modal */}
            <Modal
              visible={showCategoryModal}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowCategoryModal(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Select Category</Text>
                  
                  <FlatList
                    data={SERVICE_CATEGORIES}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.categoryItem}
                        onPress={() => {
                          setCategory(item);
                          setShowCategoryModal(false);
                        }}
                      >
                        <Text 
                          style={[
                            styles.categoryItemText,
                            category === item && styles.selectedCategoryText
                          ]}
                        >
                          {item}
                        </Text>
                        {category === item && (
                          <Ionicons name="checkmark" size={18} color="#2B7CE5" />
                        )}
                      </TouchableOpacity>
                    )}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                  />
                  
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowCategoryModal(false)}
                  >
                    <Text style={styles.closeButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
            
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
    fontSize: Math.min(16, wp(4)),
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
    fontSize: Math.min(14, wp(3.5)),
    color: '#1A2D40',
    width: '100%',
    maxHeight: hp(15),
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
    maxHeight: hp(7),
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: Math.min(16, wp(4)),
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
    fontSize: Math.min(14, wp(3.5)),
  },
  categorySelector: {
    backgroundColor: '#F5F8FA',
    borderRadius: 8,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1),
  },
  categoryText: {
    fontSize: Math.min(14, wp(3.5)),
    color: '#1A2D40',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: wp(80),
    backgroundColor: 'white',
    borderRadius: 12,
    padding: wp(5),
    maxHeight: hp(70),
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: Math.min(18, wp(4.5)),
    fontWeight: '600',
    color: '#1A2D40',
    marginBottom: hp(2),
    textAlign: 'center',
  },
  categoryItem: {
    paddingVertical: hp(1.5),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryItemText: {
    fontSize: Math.min(16, wp(4)),
    color: '#1A2D40',
  },
  selectedCategoryText: {
    color: '#2B7CE5',
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F2F5',
  },
  closeButton: {
    backgroundColor: '#F0F2F5',
    borderRadius: 8,
    paddingVertical: hp(1.2),
    marginTop: hp(2),
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#1A2D40',
    fontSize: Math.min(14, wp(3.5)),
    fontWeight: '600',
  },
});

export default AddServiceScreen; 