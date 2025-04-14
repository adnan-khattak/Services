import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useRoute } from '@react-navigation/native';

interface Service {
  id: number;
  title: string;
  category: string;
  price: string;
  imageUrl: string;
  description: string;
}

interface RouteParams {
  service: Service;
}

const ServiceDetailsScreen = () => {
  const route = useRoute();
  const { service } = route.params as RouteParams;

  // In a real implementation, we would fetch this from Supabase
  const providerPhoneNumber = '+1234567890';

  const handleCallPress = () => {
    Linking.openURL(`tel:${providerPhoneNumber}`);
  };

  return (
    <ScrollView style={styles.container}>
      <Image source={{ uri: service.imageUrl }} style={styles.image} />
      
      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>{service.title}</Text>
          <Text style={styles.price}>{service.price}</Text>
        </View>
        
        <View style={styles.categoryContainer}>
          <Text style={styles.categoryLabel}>Category:</Text>
          <Text style={styles.categoryValue}>{service.category}</Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{service.description}</Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Provider</Text>
          <Text style={styles.providerInfo}>
            This information would be fetched from the Supabase database
            in a real implementation.
          </Text>
        </View>
        
        <TouchableOpacity style={styles.callButton} onPress={handleCallPress}>
          <Text style={styles.callButtonText}>Call Service Provider</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  image: {
    width: '100%',
    height: hp('30%'),
  },
  contentContainer: {
    padding: wp('5%'),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp('2%'),
  },
  title: {
    fontSize: hp('3%'),
    fontWeight: 'bold',
    color: '#2E384D',
    width: '70%',
  },
  price: {
    fontSize: hp('2.5%'),
    fontWeight: 'bold',
    color: '#4E8AF4',
  },
  categoryContainer: {
    flexDirection: 'row',
    marginBottom: hp('2%'),
  },
  categoryLabel: {
    fontSize: hp('1.8%'),
    color: '#8798AD',
    marginRight: wp('2%'),
  },
  categoryValue: {
    fontSize: hp('1.8%'),
    color: '#2E384D',
    fontWeight: '500',
  },
  section: {
    marginBottom: hp('3%'),
  },
  sectionTitle: {
    fontSize: hp('2.2%'),
    fontWeight: 'bold',
    color: '#2E384D',
    marginBottom: hp('1%'),
  },
  description: {
    fontSize: hp('1.8%'),
    color: '#2E384D',
    lineHeight: hp('2.5%'),
  },
  providerInfo: {
    fontSize: hp('1.8%'),
    color: '#8798AD',
    fontStyle: 'italic',
  },
  callButton: {
    backgroundColor: '#4E8AF4',
    paddingVertical: hp('2%'),
    borderRadius: 10,
    alignItems: 'center',
    marginTop: hp('2%'),
  },
  callButtonText: {
    color: '#FFFFFF',
    fontSize: hp('2%'),
    fontWeight: 'bold',
  },
});

export default ServiceDetailsScreen; 