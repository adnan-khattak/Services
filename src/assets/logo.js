import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

const Logo = ({ size = 100, color = '#4E8AF4', imageSource }) => {
  return (
    <View style={[styles.logoContainer, { width: size, height: size }]}>
      <View style={[styles.circle, { backgroundColor: color }]}>
        <Image
          source={imageSource}
          style={styles.image}
          resizeMode="contain"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '60%',
    height: '60%',
  },
});

export default Logo;
