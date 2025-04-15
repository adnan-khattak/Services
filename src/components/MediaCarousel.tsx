import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  Platform
} from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import Video from 'react-native-video';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MediaCarouselProps {
  media: string[];
  height?: number;
  width?: number;
  showPagination?: boolean;
  autoPlay?: boolean;
  onMediaPress?: (index: number) => void;
}

const MediaCarousel: React.FC<MediaCarouselProps> = ({
  media,
  height = hp(30),
  width = SCREEN_WIDTH - 32,
  showPagination = true,
  autoPlay = false,
  onMediaPress
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState<boolean>(false);
  const [videoError, setVideoError] = useState<boolean>(false);
  const videoRef = useRef(null);

  if (!media || media.length === 0) {
    return (
      <View style={[styles.placeholder, { height }]}>
        <Ionicons name="image-outline" size={40} color="#B4C4E0" />
        <Text style={styles.placeholderText}>No media available</Text>
      </View>
    );
  }

  const isVideo = (url: string): boolean => {
    return url.toLowerCase().endsWith('.mp4') ||
           url.toLowerCase().endsWith('.mov') ||
           url.toLowerCase().includes('video');
  };

  const renderMediaItem = ({ item, index }: { item: string; index: number }) => {
    const mediaIsVideo = isVideo(item);
    
    if (mediaIsVideo) {
      return (
        <View style={[styles.mediaItem, { height, width }]}>
          {videoError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={40} color="#B4C4E0" />
              <Text style={styles.errorText}>Video cannot be played</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={() => {
                  setVideoError(false);
                  setVideoPlaying(true);
                }}
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Image 
                source={{ uri: item.replace('.mp4', '.jpg') }} 
                style={styles.image}
                resizeMode="cover"
              />
              {!videoPlaying ? (
                <TouchableOpacity
                  style={styles.videoOverlay}
                  onPress={() => setVideoPlaying(true)}
                >
                  <View style={styles.playButton}>
                    <Ionicons name="play" size={36} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.controlsOverlay}
                  onPress={() => setVideoPlaying(false)}
                >
                  <Video
                    ref={videoRef}
                    source={{ uri: item }}
                    style={styles.videoPlayer}
                    resizeMode="cover"
                    paused={!videoPlaying}
                    repeat={true}
                    onError={(error) => {
                      console.error('Video error:', error);
                      setVideoError(true);
                      setVideoPlaying(false);
                    }}
                    controls={Platform.OS === 'ios'}
                  />
                </TouchableOpacity>
              )}
            </>
          )}
          
          <View style={styles.videoBadge}>
            <Ionicons name="videocam" size={14} color="#FFFFFF" />
          </View>
        </View>
      );
    }
    
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.mediaItem, { height, width }]}
        onPress={() => onMediaPress && onMediaPress(index)}
      >
        <Image
          source={{ uri: item }}
          style={styles.image}
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { height }]}>
      <Carousel
        loop
        width={width}
        height={height}
        autoPlay={autoPlay && !videoPlaying}
        data={media}
        scrollAnimationDuration={1000}
        renderItem={renderMediaItem}
        onProgressChange={(_, absoluteProgress) => {
          if (absoluteProgress % 1 === 0) {
            const newIndex = Math.round(absoluteProgress % media.length);
            setActiveIndex(newIndex);
            // Pause video when changing slide
            if (videoPlaying) setVideoPlaying(false);
          }
        }}
      />
      
      {showPagination && media.length > 1 && (
        <View style={styles.pagination}>
          {media.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                activeIndex === index && styles.paginationDotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  mediaItem: {
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  videoPlayer: {
    ...StyleSheet.absoluteFillObject,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pagination: {
    position: 'absolute',
    bottom: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#FFFFFF',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  placeholder: {
    backgroundColor: '#F5F8FA',
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#8798AD',
    fontSize: 14,
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F8FA',
  },
  errorText: {
    color: '#8798AD',
    fontSize: 14,
    marginTop: 8,
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#2B7CE5',
    borderRadius: 4,
  },
  retryText: {
    color: 'white',
    fontWeight: '500',
  },
});

export default MediaCarousel; 