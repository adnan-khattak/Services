import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Linking,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Platform
} from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useRoute, useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../utils/supabaseClient';
import MediaCarousel from '../components/MediaCarousel';

interface ServiceProfile {
  username?: string;
  avatar_url?: string;
}

interface Service {
  id: string;
  title: string;
  category: string;
  price: string;
  description: string;
  location: string;
  media: string[];
  user_id: string;
  created_at: string;
  profile?: ServiceProfile;
}

interface ServiceProvider {
  contact_phone?: string;
  contact_email?: string;
}

interface RouteParams {
  service: Service;
}

const ServiceDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { service: initialService } = route.params as RouteParams;
  
  const [service, setService] = useState<Service>(initialService);
  const [loading, setLoading] = useState(true);
  const [providerProfile, setProviderProfile] = useState<ServiceProfile | null>(null);
  const [providerContact, setProviderContact] = useState<ServiceProvider | null>(null);

  // New function to fetch service provider info
  const fetchServiceProviderInfo = React.useCallback(async (userId: string) => {
    try {
      console.log('Fetching service provider info for user ID:', userId);
      
      // First try service_providers table
      const { data: providerData, error: providerError } = await supabase
        .from('service_providers')
        .select('contact_phone, contact_email')
        .eq('user_id', userId)
        .single();
      
      if (providerError) {
        console.log('No data found in service_providers, trying profiles table');
        
        // Try profiles table which might contain contact info
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('phone, email')
          .eq('id', userId)
          .single();
          
        if (!profileError && profileData) {
          console.log('Found contact info in profiles:', profileData);
          setProviderContact({
            contact_phone: profileData.phone,
            contact_email: profileData.email
          });
          return;
        }
        
        // Last attempt - try users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('phone, email')
          .eq('id', userId)
          .single();
          
        if (!userError && userData) {
          console.log('Found contact info in users table:', userData);
          setProviderContact({
            contact_phone: userData.phone,
            contact_email: userData.email
          });
          return;
        }
        
        console.log('No contact info found in any table');
        return;
      }
      
      if (providerData) {
        console.log('Found provider data:', providerData);
        setProviderContact(providerData);
      }
    } catch (error) {
      console.error('Error fetching service provider info:', error);
    }
  }, []);

  useEffect(() => {
    const fetchServiceDetails = async () => {
      try {
        setLoading(true);
        console.log('Fetching service details for ID:', initialService.id);
  
        // First fetch the service details without attempting a join
        const { data: serviceData, error: serviceError } = await supabase
          .from('services')
          .select('*')
          .eq('id', initialService.id)
          .single();
  
        if (serviceError) {
          console.error('Error fetching service data:', serviceError);
          throw serviceError;
        }
  
        console.log('Service data fetched:', serviceData);
  
        if (serviceData) {
          // Then separately fetch the profile info using the user_id from service
          console.log('Fetching profile for user_id:', serviceData.user_id);
          
          if (!serviceData.user_id) {
            console.warn('No user_id found in service data');
            setService(serviceData);
            setProviderProfile(null);
            return;
          }
  
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', serviceData.user_id)
            .single();
  
          if (profileError) {
            // Log but don't throw the error for profile fetch issues
            console.error('Error fetching profile:', profileError);
            
            // Try a different approach if the first one fails - maybe the id field is different
            console.log('Trying alternative profile fetch approach');
            const { data: altProfileData, error: altProfileError } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('user_id', serviceData.user_id)
              .single();
              
            if (!altProfileError && altProfileData) {
              console.log('Alternative profile fetch successful:', altProfileData);
              // Combine the data
              const updatedService = {
                ...serviceData,
                profile: altProfileData
              };
              
              setService(updatedService);
              setProviderProfile(altProfileData);
              await fetchServiceProviderInfo(serviceData.user_id);
              return;
            } else if (altProfileError) {
              console.error('Alternative profile fetch also failed:', altProfileError);
            }
          }
  
          // Combine the data
          const updatedService = {
            ...serviceData,
            profile: profileData || null
          };
          
          console.log('Setting service with profile:', profileData ? 'found' : 'not found');
          setService(updatedService);
          setProviderProfile(profileData || null);
          await fetchServiceProviderInfo(serviceData.user_id);
        }
      } catch (error) {
        console.error('Error fetching service details:', error);
      } finally {
        setLoading(false);
      }
    };

    if (initialService && initialService.id) {
      fetchServiceDetails();
    }
  }, [initialService, fetchServiceProviderInfo]);

  const handleCallPress = () => {
    if (!providerContact || (!providerContact.contact_phone && !providerContact.contact_email)) {
      Alert.alert('No Contact Info', 'This service provider has not added contact information yet.');
      return;
    }
    
    const phoneNumber = providerContact.contact_phone;
    const email = providerContact.contact_email;
    
    // If there's a phone number, use that first
    if (phoneNumber && phoneNumber.trim()) {
      const formattedNumber = phoneNumber.replace(/\D/g, ''); // Remove non-numeric chars
      console.log('Dialing phone number:', formattedNumber);
      Linking.openURL(`tel:${formattedNumber}`);
    } 
    // If there's no phone but there is an email, offer to email
    else if (email && email.trim()) {
      Alert.alert(
        'Contact Provider',
        'Would you like to send an email to this service provider?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Email',
            onPress: () => {
              console.log('Sending email to:', email);
              Linking.openURL(`mailto:${email}`);
            }
          }
        ]
      );
    } else {
      Alert.alert('No Contact Methods', 'This service provider has not added any contact methods yet.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2B7CE5" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#1A2D40" />
          </TouchableOpacity>
        </View>

        <MediaCarousel media={service.media || []} height={hp(35)} autoPlay={true} />
        
        <View style={styles.contentContainer}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{service.title}</Text>
            <Text style={styles.price}>
              {service.price.startsWith('$') ? service.price : `$${service.price}`}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="location-outline" size={16} color="#8798AD" />
              <Text style={styles.infoText}>{service.location}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="folder-outline" size={16} color="#8798AD" />
              <Text style={styles.infoText}>{service.category}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={16} color="#8798AD" />
              <Text style={styles.infoText}>{formatDate(service.created_at)}</Text>
            </View>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{service.description}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Provider</Text>
            {providerProfile ? (
              <View style={styles.providerContainer}>
                <View style={styles.providerInfo}>
                  <Text style={styles.providerName}>
                    {providerProfile.username || 'Anonymous'}
                  </Text>
                  {providerContact?.contact_phone && (
                    <Text style={styles.providerContact}>{providerContact.contact_phone}</Text>
                  )}
                </View>
              </View>
            ) : (
              <Text style={styles.noProviderInfo}>
                Provider information not available
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity style={styles.callButton} onPress={handleCallPress}>
          <Ionicons name="call-outline" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Call</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    position: 'absolute',
    zIndex: 10,
    top: Platform.OS === 'ios' ? hp(5) : 10,
    left: wp(3),
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: hp(5),
    height: hp(5),
    borderRadius: hp(2.5),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  contentContainer: {
    padding: wp(5),
  },
  titleContainer: {
    marginBottom: hp(2),
  },
  title: {
    fontSize: Math.min(wp(5.5), 24),
    fontWeight: '700',
    color: '#1A2D40',
    marginBottom: 6,
  },
  price: {
    fontSize: Math.min(wp(5), 22),
    fontWeight: '700',
    color: '#2B7CE5',
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: hp(3),
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: wp(4),
    marginBottom: hp(1),
  },
  infoText: {
    fontSize: Math.min(14, wp(3.5)),
    color: '#8798AD',
    marginLeft: 6,
  },
  section: {
    marginBottom: hp(3),
  },
  sectionTitle: {
    fontSize: Math.min(18, wp(4.5)),
    fontWeight: '600',
    color: '#1A2D40',
    marginBottom: hp(1),
  },
  description: {
    fontSize: Math.min(15, wp(3.8)),
    color: '#1A2D40',
    lineHeight: Math.min(22, hp(3)),
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F2F5',
    marginVertical: hp(2),
  },
  providerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: wp(3),
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2D40',
    marginBottom: 4,
  },
  providerContact: {
    fontSize: 14,
    color: '#8798AD',
  },
  noProviderInfo: {
    fontSize: 14,
    color: '#8798AD',
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    padding: wp(4),
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
    backgroundColor: '#FFFFFF',
  },
  callButton: {
    flex: 1,
    backgroundColor: '#2B7CE5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.5),
    borderRadius: 8,
    maxHeight: hp(7),
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: Math.min(15, wp(3.8)),
    marginLeft: 8,
  },
});

export default ServiceDetailsScreen; 