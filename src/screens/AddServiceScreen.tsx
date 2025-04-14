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
  Image,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useNavigation } from '@react-navigation/native';
import { SessionContext } from '../../App';
import { supabase, uploadMedia } from '../utils/supabaseClient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Picker } from '@react-native-picker/picker';
import { launchImageLibrary } from 'react-native-image-picker';

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
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Check if user is logged in
  React.useEffect(() => {
    if (!session?.user) {
      Alert.alert(
        'Not Logged In',
        'You need to be logged in to add services.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  }, [session, navigation]);

  const pickImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        maxWidth: 1000,
        maxHeight: 1000,
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
        if (mediaFiles.length + result.assets.length > 3) {
          Alert.alert('Limit Exceeded', 'You can only upload up to 3 images');
          return;
        }
        
        setMediaFiles([...mediaFiles, ...result.assets]);
      }
    } catch (err) {
      console.error('Error picking images:', err);
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const removeImage = (index: number) => {
    const updatedMedia = [...mediaFiles];
    updatedMedia.splice(index, 1);
    setMediaFiles(updatedMedia);
  };

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
    
    try {
      // Upload media files
      const mediaUrls = [];
      
      if (mediaFiles.length > 0) {
        for (const media of mediaFiles) {
          try {
            // Convert URI to blob
            const response = await fetch(media.uri);
            const blob = await response.blob();
            
            // Create a file name from URI
            const fileExt = media.uri.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            
            // Upload media
            const { data, error } = await supabase.storage
              .from('service_media')
              .upload(`${Date.now()}_${fileName}`, blob);
              
            if (error) throw error;
            
            // Get public URL
            const { data: urlData } = supabase.storage
              .from('service_media')
              .getPublicUrl(data?.path || '');
              
            mediaUrls.push(urlData.publicUrl);
          } catch (error) {
            console.error('Error uploading media:', error);
            throw new Error('Failed to upload media');
          }
        }
      }
      
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
      
      console.log('Service created successfully:', data);
      
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
              textAlignVertical="top"
            />
            
            <Text style={styles.label}>Price</Text>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              placeholder="E.g., $50/hr or $150 flat fee"
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
                {SERVICE_CATEGORIES.map((cat, index) => (
                  <Picker.Item key={index} label={cat} value={cat} />
                ))}
              </Picker>
            </View>
            
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="E.g., Chicago, IL"
              placeholderTextColor="#8798AD"
            />
            
            <Text style={styles.label}>Photos</Text>
            
            {mediaFiles.length > 0 && (
              <ScrollView horizontal style={styles.mediaPreviewContainer}>
                {mediaFiles.map((media, index) => (
                  <View key={index} style={styles.mediaPreviewItem}>
                    <Image source={{ uri: media.uri }} style={styles.mediaPreview} />
                    <TouchableOpacity
                      style={styles.removeMediaButton}
                      onPress={() => removeImage(index)}
                    >
                      <Ionicons name="close-circle" size={24} color="#FF4D4F" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
            
            <TouchableOpacity style={styles.mediaButton} onPress={pickImage}>
              <Ionicons name="camera-outline" size={24} color="#4E8AF4" />
              <Text style={styles.mediaButtonText}>Add Photos</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Add Service</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: wp('4%'),
  },
  formContainer: {
    padding: wp('5%'),
  },
  label: {
    fontSize: hp('1.8%'),
    fontWeight: 'bold',
    color: '#2E384D',
    marginBottom: hp('1%'),
    marginTop: hp('2%'),
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: hp('1.8%'),
    fontSize: hp('1.7%'),
    color: '#2E384D',
    borderWidth: 1,
    borderColor: '#E4E8F0',
  },
  textArea: {
    minHeight: hp('15%'),
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E4E8F0',
    marginBottom: hp('1%'),
  },
  picker: {
    height: hp('6%'),
    width: '100%',
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
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E4E8F0',
    borderStyle: 'dashed',
    padding: hp('2%'),
    justifyContent: 'center',
    marginBottom: hp('3%'),
  },
  mediaButtonText: {
    color: '#4E8AF4',
    marginLeft: wp('2%'),
    fontSize: hp('1.7%'),
  },
  submitButton: {
    backgroundColor: '#4E8AF4',
    borderRadius: 10,
    padding: hp('2%'),
    alignItems: 'center',
    marginTop: hp('3%'),
    marginBottom: Platform.OS === 'ios' ? hp('5%') : hp('3%'),
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: hp('1.8%'),
    fontWeight: 'bold',
  },
});

export default AddServiceScreen; 