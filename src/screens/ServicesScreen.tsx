import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, SafeAreaView, Platform } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../utils/supabaseClient';
import { SessionContext } from '../../App';
import Ionicons from 'react-native-vector-icons/Ionicons';

type RootStackParamList = {
  Services: undefined;
  ServiceDetails: { service: any };
  AddService: undefined;
};

type ServicesScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Services'>;

interface Service {
  id: string;
  title: string;
  category: string;
  price: string;
  description: string;
  location: string;
  media: string[];
  rating: number;
  reviews_count: number;
  user_id: string;
  created_at: string;
  profile?: {
    username: string;
    avatar_url?: string;
  } | null;
}

const ServicesScreen = () => {
  const navigation = useNavigation<ServicesScreenNavigationProp>();
  const { session } = useContext(SessionContext);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const categories = ['All', 'Home', 'Beauty', 'Education', 'Other'];

  useEffect(() => {
    fetchServices();
  }, [selectedCategory]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('services')
        .select(`
          id,
          title,
          description,
          price,
          category,
          location,
          media,
          rating,
          reviews_count,
          user_id,
          created_at
        `)
        .order('created_at', { ascending: false });
        
      // Add category filter if not 'All'
      if (selectedCategory !== 'All') {
        query = query.eq('category', selectedCategory);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;

      // Get user IDs from services to fetch profiles
      if (data && data.length > 0) {
        const userIds = data.map(service => service.user_id);
        
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);
          
        if (profilesError) throw profilesError;
        
        // Join services with profiles
        const servicesWithProfiles = data.map(service => {
          const profile = profilesData.find(p => p.id === service.user_id);
          return {
            ...service,
            profile: profile || null
          };
        });
        
        setServices(servicesWithProfiles);
      } else {
        setServices([]);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchServices();
  };

  const renderCategoryItem = (category: string) => (
    <TouchableOpacity
      key={category}
      style={[
        styles.categoryItem,
        selectedCategory === category && styles.selectedCategoryItem
      ]}
      onPress={() => setSelectedCategory(category)}
    >
      <Text 
        style={[
          styles.categoryText,
          selectedCategory === category && styles.selectedCategoryText
        ]}
      >
        {category}
      </Text>
    </TouchableOpacity>
  );

  const renderServiceItem = ({ item }: { item: Service }) => (
    <TouchableOpacity 
      style={styles.serviceCard}
      onPress={() => navigation.navigate('ServiceDetails', { service: item })}
    >
      <Image 
        source={{ 
          uri: item.media && item.media.length > 0 
            ? item.media[0] 
            : 'https://via.placeholder.com/150'
        }} 
        style={styles.serviceImage} 
      />
      <Text style={styles.serviceTitle}>{item.title}</Text>
      <Text style={styles.serviceCategory}>{item.category}</Text>
      <Text style={styles.servicePrice}>{item.price}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.categoriesContainer}>
          {categories.map(category => renderCategoryItem(category))}
        </View>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          <Ionicons name="refresh" size={24} color="#4E8AF4" />
        </TouchableOpacity>
      </View>
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4E8AF4" />
        </View>
      ) : (
        <FlatList
          data={services}
          renderItem={renderServiceItem}
          keyExtractor={item => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#4E8AF4']}
              tintColor="#4E8AF4"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No services available in this category.</Text>
            </View>
          }
        />
      )}

      {session && (
        <TouchableOpacity 
          style={[
            styles.addButton,
            Platform.OS === 'ios' ? styles.addButtonIOS : {}
          ]}
          onPress={() => navigation.navigate('AddService')}
        >
          <Text style={styles.addButtonText}>+ Add Service</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: wp('4%'),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp('2%'),
    paddingBottom: hp('1%'),
    borderBottomWidth: 1,
    borderBottomColor: '#E4E8F0',
  },
  categoriesContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  refreshButton: {
    padding: wp('2%'),
  },
  categoryItem: {
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('1%'),
    marginRight: wp('2%'),
    borderRadius: 20,
    backgroundColor: '#F5F7FA',
  },
  selectedCategoryItem: {
    backgroundColor: '#4E8AF4',
  },
  categoryText: {
    fontSize: hp('1.7%'),
    color: '#8798AD',
  },
  selectedCategoryText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  listContent: {
    paddingBottom: hp('2%'),
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: wp('3%'),
    marginBottom: hp('2%'),
    width: wp('43%'),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  serviceImage: {
    width: '100%',
    height: hp('15%'),
    borderRadius: 8,
    marginBottom: hp('1%'),
  },
  serviceTitle: {
    fontSize: hp('2%'),
    fontWeight: 'bold',
    color: '#2E384D',
  },
  serviceCategory: {
    fontSize: hp('1.5%'),
    color: '#8798AD',
    marginBottom: hp('0.5%'),
  },
  servicePrice: {
    fontSize: hp('1.8%'),
    fontWeight: '600',
    color: '#4E8AF4',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    marginTop: hp('10%'),
    alignItems: 'center',
    justifyContent: 'center',
    padding: wp('5%'),
  },
  emptyText: {
    color: '#8798AD',
    fontSize: hp('1.8%'),
    textAlign: 'center',
  },
  addButton: {
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
  addButtonIOS: {
    shadowOpacity: 0.3,
    shadowRadius: 5,
    bottom: hp('4%'), // Adjust for iOS to account for home indicator
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: hp('1.7%'),
  },
});

export default ServicesScreen; 