import { Platform } from 'react-native';

// Fallback implementation for when Google Mobile Ads has compatibility issues
// This lets the app run without crashing while we fix the underlying issues

// Initialize ads - fallback implementation
export const initializeAds = async (): Promise<boolean> => {
  console.log('Using fallback ad initialization to prevent app crashes');
  return true;
};

// Show interstitial ad - fallback implementation
export const showInterstitialAd = async (): Promise<boolean> => {
  console.log('Using fallback ad display to prevent app crashes');
  return false;
}; 