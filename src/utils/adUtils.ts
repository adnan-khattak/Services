import { Platform } from 'react-native';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';

// Use test ad unit IDs in development, real IDs in production
const interstitialAdUnitId = __DEV__ 
  ? TestIds.INTERSTITIAL 
  : Platform.select({
      ios: 'ca-app-pub-6601945920254915/7147713882', // iOS interstitial ad unit ID
      android: 'ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ', // Android interstitial ad unit ID
      default: TestIds.INTERSTITIAL,
    });

// Pre-load interstitial ad instance
let interstitialAd: InterstitialAd | null = null;

// Initialize ads
export const initializeAds = async (): Promise<boolean> => {
  try {
    console.log('Initializing interstitial ads');
    preloadInterstitialAd();
    return true;
  } catch (error) {
    console.error('Failed to initialize ads:', error);
    return false;
  }
};

// Pre-load an interstitial ad to have it ready when needed
const preloadInterstitialAd = () => {
  console.log('Pre-loading interstitial ad');
  
  try {
    // Clean up existing ad if any
    if (interstitialAd) {
      interstitialAd = null;
    }
    
    // Create a new interstitial ad
    interstitialAd = InterstitialAd.createForAdRequest(interstitialAdUnitId);
    
    const unsubscribeLoaded = interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
      console.log('Interstitial ad pre-loaded successfully');
      // No need to show here, just loaded for later use
    });
    
    const unsubscribeError = interstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
      console.error('Interstitial ad load error:', error);
      interstitialAd = null;
      
      // Clean up listeners
      unsubscribeLoaded();
      unsubscribeError();
      
      // Try pre-loading again after delay
      setTimeout(() => preloadInterstitialAd(), 5000);
    });
    
    interstitialAd.load();
  } catch (error) {
    console.error('Error in pre-loading interstitial ad:', error);
  }
};

// Show interstitial ad when user completes an action
export const showInterstitialAd = async (): Promise<boolean> => {
  return new Promise(async (resolve) => {
    try {
      console.log('Attempting to show interstitial ad');
      
      // If we don't have a pre-loaded ad ready, try loading one now
      if (!interstitialAd) {
        console.log('No pre-loaded ad available, trying to load now');
        interstitialAd = InterstitialAd.createForAdRequest(interstitialAdUnitId);
        
        const loadTimeoutId = setTimeout(() => {
          console.log('Interstitial ad load timed out');
          resolve(false);
        }, 5000); // 5 second timeout for loading
        
        const unsubscribeLoaded = interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
          console.log('Interstitial ad loaded successfully on demand');
          clearTimeout(loadTimeoutId);
          unsubscribeLoaded();
          
          // Show ad after loading
          showAd(resolve);
        });
        
        const unsubscribeError = interstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
          console.error('Interstitial ad load error on demand:', error);
          clearTimeout(loadTimeoutId);
          unsubscribeLoaded();
          unsubscribeError();
          interstitialAd = null;
          resolve(false);
        });
        
        interstitialAd.load();
      } else {
        // We already have a pre-loaded ad, show it now
        showAd(resolve);
      }
    } catch (error) {
      console.error('Error showing interstitial ad:', error);
      resolve(false);
    }
  });
};

// Helper function to show the ad and handle events
const showAd = (resolvePromise: (value: boolean) => void) => {
  if (!interstitialAd) {
    resolvePromise(false);
    return;
  }
  
  // Set up event listeners for the ad display
  const unsubscribeClosed = interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
    console.log('Interstitial ad closed');
    cleanup();
    
    // Pre-load another ad for next time
    setTimeout(() => preloadInterstitialAd(), 1000);
    
    resolvePromise(true);
  });
  
  const unsubscribeOpened = interstitialAd.addAdEventListener(AdEventType.OPENED, () => {
    console.log('Interstitial ad opened');
  });
  
  const unsubscribeError = interstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
    console.error('Interstitial ad display error:', error);
    cleanup();
    resolvePromise(false);
  });
  
  // Clean up function for listeners
  const cleanup = () => {
    unsubscribeClosed();
    unsubscribeOpened();
    unsubscribeError();
    interstitialAd = null;
  };
  
  // Show the ad
  console.log('Showing interstitial ad now');
  interstitialAd.show().catch(error => {
    console.error('Error in interstitial ad show():', error);
    cleanup();
    resolvePromise(false);
  });
}; 