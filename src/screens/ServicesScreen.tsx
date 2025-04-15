import React, { useState, useEffect, useContext, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  RefreshControl, 
  SafeAreaView, 
  StatusBar,
  ScrollView,
} from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../utils/supabaseClient';
import { SessionContext } from '../../App';
import Ionicons from 'react-native-vector-icons/Ionicons';
import SearchBar from '../components/SearchBar';

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
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const categories = ['All', 'Home', 'Beauty', 'Education', 'Other'];

  useEffect(() => {
    fetchServices();
  }, [selectedCategory]);

  // Filter services based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredServices(services);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = services.filter(service => 
      service.title.toLowerCase().includes(query) || 
      service.description.toLowerCase().includes(query) ||
      service.location.toLowerCase().includes(query)
    );
    
    setFilteredServices(filtered);
  }, [searchQuery, services]);

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
        setFilteredServices(servicesWithProfiles);
      } else {
        setServices([]);
        setFilteredServices([]);
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

  const handleSearch = (text: string) => {
    setSearchQuery(text);
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
      <View style={styles.serviceCardContent}>
        {item.media && item.media.length > 0 ? (
          <Image 
            source={{ uri: item.media[0] }} 
            style={styles.serviceImage} 
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="image-outline" size={24} color="#B4C4E0" />
          </View>
        )}
        <View style={styles.serviceContent}>
          <Text style={styles.serviceTitle} numberOfLines={1}>{item.title}</Text>
          <View style={styles.serviceMetadata}>
            <View style={styles.metadataItem}>
              <Ionicons name="folder-outline" size={14} color="#8798AD" />
              <Text style={styles.serviceCategory}>{item.category}</Text>
            </View>
            <View style={styles.metadataItem}>
              <Ionicons name="location-outline" size={14} color="#8798AD" />
              <Text style={styles.serviceLocation} numberOfLines={1}>{item.location}</Text>
            </View>
          </View>
          <Text style={styles.servicePrice}>{item.price}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.screenTitle}>Services</Text>
          <SearchBar 
            onSearch={handleSearch}
            placeholder="Search services..."
            width={wp(60)}
            compact={true}
            containerStyle={styles.searchBarContainer}
          />
        </View>
      </View>
      
      <View style={styles.categoriesContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScrollContent}
        >
          {categories.map(category => renderCategoryItem(category))}
        </ScrollView>
      </View>
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2B7CE5" />
        </View>
      ) : (
        <FlatList
          data={filteredServices}
          renderItem={renderServiceItem}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#2B7CE5']}
              tintColor="#2B7CE5"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery 
                  ? 'No services match your search.' 
                  : 'No services available in this category.'
                }
              </Text>
            </View>
          }
        />
      )}

      {session && (
        <TouchableOpacity 
          style={styles.floatingButton}
          onPress={() => navigation.navigate('AddService')}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  searchBarContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  categoriesContainer: {
    marginVertical: hp(1.5),
  },
  categoriesScrollContent: {
    paddingHorizontal: wp(4),
  },
  categoryItem: {
    paddingVertical: hp(1),
    paddingHorizontal: wp(3),
    marginRight: wp(2),
    borderRadius: 20,
    backgroundColor: '#F5F8FA',
  },
  selectedCategoryItem: {
    backgroundColor: '#2B7CE5',
  },
  categoryText: {
    fontSize: 14,
    color: '#8798AD',
  },
  selectedCategoryText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: wp(4),
    paddingBottom: hp(10),
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: hp(2),
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  serviceCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceImage: {
    width: wp(30),
    height: wp(30),
    backgroundColor: '#F5F8FA',
  },
  placeholderImage: {
    width: wp(30),
    height: wp(30),
    backgroundColor: '#F5F8FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceContent: {
    flex: 1,
    padding: 12,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2D40',
    marginBottom: 8,
  },
  serviceMetadata: {
    marginBottom: 8,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  serviceCategory: {
    fontSize: 13,
    color: '#8798AD',
    marginLeft: 6,
  },
  serviceLocation: {
    fontSize: 13,
    color: '#8798AD',
    marginLeft: 6,
    flex: 1,
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2B7CE5',
  },
  emptyContainer: {
    padding: hp(5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#8798AD',
    textAlign: 'center',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2B7CE5',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
});

export default ServicesScreen; 