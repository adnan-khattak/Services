import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// This is a placeholder component to use instead of an actual image file
// In a production app, you would use a real image or SVG
const Logo = ({ size = 100, color = '#4E8AF4' }) => {
  return (
    <View style={[styles.logoContainer, { width: size, height: size }]}>
      <View style={[styles.circle, { backgroundColor: color }]}>
        <Text style={styles.text}>S</Text>
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
  },
  text: {
    color: 'white',
    fontSize: 50,
    fontWeight: 'bold',
  },
});

export default Logo; 