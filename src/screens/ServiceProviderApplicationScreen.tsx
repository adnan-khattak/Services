import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView
} from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { applyForServiceProvider, ServiceProviderApplication } from '../utils/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabaseClient';

// Define the types for navigation
type RootStackParamList = {
  Home: undefined;
  Main: undefined;
  Auth: undefined;
  ServiceDetails: { service: any };
  PostDetails: { postId: number };
  NewPost: undefined;
  AddService: undefined;
  ServiceProviderApplication: undefined;
};

const ServiceProviderApplicationScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(false);
  
  // Form fields
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [workType, setWorkType] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [experienceCountry, setExperienceCountry] = useState('');
  
  const { user } = useAuth();

  const handleSubmit = async () => {
    // Validate inputs
    if (!businessName.trim()) {
      Alert.alert('Error', 'Please enter your business name');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Error', 'Please enter your business address');
      return;
    }
    if (!workType.trim()) {
      Alert.alert('Error', 'Please select a work type');
      return;
    }
    if (!yearsOfExperience.trim() || isNaN(Number(yearsOfExperience))) {
      Alert.alert('Error', 'Please enter valid years of experience');
      return;
    }
    if (!experienceCountry.trim()) {
      Alert.alert('Error', 'Please enter your country of experience');
      return;
    }

    // Ensure user is authenticated
    if (!user || !user.id) {
      Alert.alert('Error', 'You need to be logged in to apply');
      return;
    }

    setLoading(true);
    
    try {
      // First check if user already has a service provider profile
      const { data: existingProfile, error: checkError } = await supabase
        .from('service_providers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (checkError) throw checkError;
      
      if (existingProfile) {
        // User already has a profile
        setLoading(false);
        Alert.alert(
          'Profile Exists',
          'You already have a service provider profile. You can now add services.',
          [
            { 
              text: 'OK', 
              onPress: () => navigation.goBack()
            }
          ]
        );
        return;
      }
      
      // Create new profile
      const applicationData: ServiceProviderApplication = {
        userId: user.id,
        businessName: businessName.trim(),
        address: address.trim(),
        workType: workType.trim(),
        yearsOfExperience: Number(yearsOfExperience),
        experienceCountry: experienceCountry.trim()
      };

      await applyForServiceProvider(applicationData);
      
      setLoading(false);
      Alert.alert(
        'Profile Created',
        'Your service provider profile has been created successfully. You can now add services.',
        [
          { 
            text: 'OK', 
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Failed to submit application. Please try again later.');
      console.error('Application submission error:', error);
    }
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <Text style={styles.headerText}>Become a Service Provider</Text>
          <Text style={styles.subHeaderText}>
            Fill in the details below to create your service provider profile.
            You'll be able to add services immediately after completion.
          </Text>
          
          <View style={styles.formContainer}>
            <Text style={styles.label}>Business Name</Text>
            <TextInput
              style={styles.input}
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="Your business name"
            />
            
            <Text style={styles.label}>Business Address</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="Full address"
              multiline
            />
            
            <Text style={styles.label}>Work Type</Text>
            <TextInput
              style={styles.input}
              value={workType}
              onChangeText={setWorkType}
              placeholder="e.g. Plumbing, Cleaning, Tutoring"
            />
            
            <Text style={styles.label}>Years of Experience</Text>
            <TextInput
              style={styles.input}
              value={yearsOfExperience}
              onChangeText={setYearsOfExperience}
              placeholder="Number of years"
              keyboardType="numeric"
            />
            
            <Text style={styles.label}>Country of Experience</Text>
            <TextInput
              style={styles.input}
              value={experienceCountry}
              onChangeText={setExperienceCountry}
              placeholder="Country name"
            />
            
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Application</Text>
              )}
            </TouchableOpacity>
          </View>
          
          <View style={styles.noteContainer}>
            <Text style={styles.noteText}>
              Note: After completing your profile, you'll be able to add and manage services 
              from your profile page.
            </Text>
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
    padding: wp('5%'),
  },
  contentContainer: {
    paddingBottom: Platform.OS === 'ios' ? hp('5%') : hp('2%'),
  },
  headerText: {
    fontSize: hp('2.8%'),
    fontWeight: 'bold',
    color: '#2E384D',
    marginTop: hp('2%'),
    marginBottom: hp('1%'),
  },
  subHeaderText: {
    fontSize: hp('1.8%'),
    color: '#8798AD',
    marginBottom: hp('3%'),
    lineHeight: hp('2.4%'),
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: wp('5%'),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    marginBottom: hp('3%'),
  },
  label: {
    fontSize: hp('1.8%'),
    fontWeight: '600',
    color: '#2E384D',
    marginBottom: hp('0.8%'),
    marginTop: hp('1.2%'),
  },
  input: {
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    padding: hp('1.5%'),
    fontSize: hp('1.8%'),
    borderWidth: 1,
    borderColor: '#E4E8F0',
    marginBottom: hp('1%'),
  },
  submitButton: {
    backgroundColor: '#4E8AF4',
    borderRadius: 10,
    padding: hp('2%'),
    alignItems: 'center',
    marginTop: hp('2%'),
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: hp('2%'),
    fontWeight: 'bold',
  },
  noteContainer: {
    backgroundColor: '#EBF1FF',
    borderRadius: 10,
    padding: wp('4%'),
    marginBottom: hp('4%'),
  },
  noteText: {
    fontSize: hp('1.6%'),
    color: '#4E8AF4',
    lineHeight: hp('2.2%'),
  },
  disabledButton: {
    opacity: 0.7,
  },
});

export default ServiceProviderApplicationScreen; 