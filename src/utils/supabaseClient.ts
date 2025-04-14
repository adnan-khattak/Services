import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

// Get Supabase URL and anon key from environment variables
const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = SUPABASE_ANON_KEY;

// Log the configuration for debugging - remove in production
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key length:', supabaseAnonKey ? supabaseAnonKey.length : 0);

// Create a custom storage handler for AsyncStorage
const AsyncStorageAdapter = {
  getItem: (key: string) => {
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    return AsyncStorage.removeItem(key);
  },
};

// Create a Supabase client with AsyncStorage
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// User types
export interface UserProfile {
  id: string;
  username: string;
  phone?: string;
  role: 'user' | 'service_provider';
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceProvider {
  id: string;
  userId: string;
  businessName: string;
  address: string;
  workType: string;
  yearsOfExperience: number;
  experienceCountry: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  createdAt?: string;
  updatedAt?: string;
}

export interface Service {
  id: string;
  providerId: string;
  title: string;
  description: string;
  price: string;
  category: string;
  location: string;
  media: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Post {
  id: string;
  userId: string;
  content: string;
  media?: string[];
  likes: number;
  comments: number;
  createdAt?: string;
  updatedAt?: string;
}

// Auth helpers
export const signIn = async (email: string, password: string) => {
  return supabase.auth.signInWithPassword({ email, password });
};

export const signUp = async (email: string, password: string, userData: Partial<UserProfile>) => {
  const { data, error } = await supabase.auth.signUp({ email, password });
  
  if (error) {
    throw error;
  }
  
  if (data?.user) {
    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        { 
          id: data.user.id, 
          ...userData, 
          role: 'user', // Default role
        },
      ]);
      
    if (profileError) {
      throw profileError;
    }
  }
  
  return { data, error: null };
};

export const signOut = async () => {
  return supabase.auth.signOut();
};

export const getCurrentUser = async () => {
  return supabase.auth.getUser();
};

export const getCurrentSession = async () => {
  return supabase.auth.getSession();
};

// Services helpers
export const getServices = async (category?: string, limit = 10) => {
  let query = supabase
    .from('services')
    .select('*')
    .order('createdAt', { ascending: false })
    .limit(limit);
    
  if (category && category !== 'All') {
    query = query.eq('category', category);
  }
  
  return query;
};

export const getServiceById = async (id: string) => {
  return supabase
    .from('services')
    .select('*, profiles(username, phone)')
    .eq('id', id)
    .single();
};

export const createService = async (serviceData: Partial<Service>) => {
  return supabase
    .from('services')
    .insert([serviceData]);
};

// Posts helpers
export const getPosts = async (limit = 10) => {
  return supabase
    .from('posts')
    .select('*, profiles(username)')
    .order('createdAt', { ascending: false })
    .limit(limit);
};

export const getPostById = async (id: string) => {
  const { data: post, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) {
    throw error;
  }
  
  // Get the profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .eq('id', post.user_id)
    .single();
    
  if (profileError && profileError.code !== 'PGRST116') {
    // PGRST116 is not found, which is ok - user might be deleted
    throw profileError;
  }
  
  return {
    data: {
      ...post,
      profile
    },
    error: null
  };
};

export const createPost = async (postData: Partial<Post>) => {
  return supabase
    .from('posts')
    .insert([postData]);
};

export const likePost = async (postId: string, userId: string) => {
  // First check if already liked
  const { data: existingLike } = await supabase
    .from('likes')
    .select('*')
    .eq('post_id', postId)
    .eq('user_id', userId);
    
  if (existingLike && existingLike.length > 0) {
    // Unlike
    await supabase
      .from('likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);
      
    // Decrement post likes count
    await supabase
      .from('posts')
      .update({ likes: supabase.rpc('decrement', { x: 1 }) })
      .eq('id', postId);
      
    return { liked: false };
  } else {
    // Like
    await supabase
      .from('likes')
      .insert([{ post_id: postId, user_id: userId }]);
      
    // Increment post likes count
    await supabase
      .from('posts')
      .update({ likes: supabase.rpc('increment', { x: 1 }) })
      .eq('id', postId);
      
    return { liked: true };
  }
};

// Profile helpers
export const getUserProfile = async (userId: string) => {
  return supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
};

export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>) => {
  return supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);
};

// Service provider application type
export type ServiceProviderApplication = {
  userId: string;
  businessName: string;
  address: string;
  workType: string;
  yearsOfExperience: number;
  experienceCountry: string;
  contact_phone?: string;
  contact_email?: string;
  bio?: string;
};

/**
 * Submit an application to become a service provider
 */
export const applyForServiceProvider = async (application: ServiceProviderApplication) => {
  try {
    const { error } = await supabase
      .from('service_providers')
      .insert([{
        user_id: application.userId,
        business_name: application.businessName,
        address: application.address,
        work_type: application.workType,
        years_of_experience: application.yearsOfExperience,
        experience_country: application.experienceCountry,
        contact_phone: application.contact_phone,
        contact_email: application.contact_email,
        bio: application.bio
      }]);
    
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Error submitting service provider application:', error);
    throw error;
  }
};

/**
 * Get the service provider profile for a user
 */
export const getServiceProviderProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('service_providers')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error getting service provider profile:', error);
    return null;
  }
};

// Storage helpers
export const uploadMedia = async (filePath: string, file: any, bucket: 'service_media' | 'post_media') => {
  const fileExt = filePath.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const fullPath = `${fileName}`;
  
  const { error } = await supabase.storage
    .from(bucket)
    .upload(fullPath, file);
    
  if (error) {
    throw error;
  }
  
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(fullPath);
    
  return data.publicUrl;
}; 