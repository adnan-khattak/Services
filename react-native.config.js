module.exports = {
  dependencies: {
    // Temporarily exclude react-native-google-mobile-ads due to Kotlin version conflicts
    'react-native-google-mobile-ads': {
      platforms: {
        android: null,
        ios: null
      }
    }
  }
}; 