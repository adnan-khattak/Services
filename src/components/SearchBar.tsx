import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ViewStyle,
  DimensionValue,
} from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface SearchBarProps {
  onSearch: (text: string) => void;
  placeholder?: string;
  initialValue?: string;
  style?: ViewStyle;
  containerStyle?: ViewStyle;
  width?: DimensionValue;
  height?: number;
  compact?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = 'Search...',
  initialValue = '',
  style,
  containerStyle,
  width = '100%',
  height = hp(5),
  compact = false,
}) => {
  const [searchText, setSearchText] = useState(initialValue);

  const handleClear = () => {
    setSearchText('');
    onSearch('');
  };

  const handleChangeText = (text: string) => {
    setSearchText(text);
    onSearch(text);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <View 
        style={[
          styles.searchContainer, 
          { height, width },
          compact && styles.compactSearch,
          style
        ]}
      >
        <Ionicons 
          name="search-outline" 
          size={compact ? 16 : 20} 
          color="#8798AD" 
          style={styles.searchIcon} 
        />
        
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#8798AD"
          value={searchText}
          onChangeText={handleChangeText}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        
        {searchText.length > 0 && Platform.OS === 'android' && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Ionicons name="close-circle" size={16} color="#8798AD" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F8FA',
    borderRadius: 8,
    paddingHorizontal: wp(3),
  },
  compactSearch: {
    borderRadius: 20,
    paddingHorizontal: wp(2),
  },
  searchIcon: {
    marginRight: wp(2),
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    height: '100%',
    padding: 0,
  },
  clearButton: {
    padding: 5,
  },
});

export default SearchBar; 