import React, { useState, useEffect } from 'react';
import { 
  View, 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet, 
  Image, 
  Text,
  Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { uploadImageToCloudinary, uploadImageFromUri } from '../services/cloudinaryService';

interface ImageUploaderProps {
  initialImageUrl?: string;
  onImageUploaded: (imageUrl: string) => void;
  size?: number;
  showIcon?: boolean;
  circular?: boolean;
  placeholderText?: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  initialImageUrl,
  onImageUploaded,
  size = 100,
  showIcon = true,
  circular = true,
  placeholderText = 'Tap to upload'
}) => {
  const [imageUrl, setImageUrl] = useState<string | undefined>(initialImageUrl);
  const [loading, setLoading] = useState<boolean>(false);

  // Update local image if prop changes
  useEffect(() => {
    if (initialImageUrl && initialImageUrl !== imageUrl) {
      console.log('ImageUploader: Updating from initialImageUrl prop:', initialImageUrl);
      setImageUrl(initialImageUrl);
    }
  }, [initialImageUrl]);

  const pickImage = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'You need to grant access to your photos to upload an image.');
        return;
      }

      // Pick image from library
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      console.log('ImagePicker result:', 
        { cancelled: result.canceled, uri: result.assets?.[0]?.uri?.substring(0, 50) });

      if (result.canceled) return;

      setLoading(true);

      try {
        let cloudinaryUrl;
        
        // Use base64 if available, otherwise use URI
        if (result.assets[0].base64) {
          cloudinaryUrl = await uploadImageToCloudinary(result.assets[0].base64);
        } else {
          cloudinaryUrl = await uploadImageFromUri(result.assets[0].uri);
        }

        // Update local state
        setImageUrl(cloudinaryUrl);
        
        // Notify parent component
        onImageUploaded(cloudinaryUrl);
        
      } catch (error) {
        console.error('Failed to upload image:', error);
        Alert.alert('Upload Failed', 'Failed to upload image. Please try again.');
      } finally {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image from library');
    }
  };

  return (
    <TouchableOpacity 
      onPress={pickImage} 
      style={[
        styles.container, 
        { 
          width: size, 
          height: size,
          borderRadius: circular ? size / 2 : size / 10
        }
      ]}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="large" color="#2196F3" />
      ) : imageUrl ? (
        <Image 
          source={{ uri: imageUrl }} 
          style={[
            styles.image, 
            { borderRadius: circular ? size / 2 : size / 10 }
          ]} 
          onError={() => {
            setImageUrl(undefined);
            Alert.alert('Error', 'Failed to load image');
          }}
        />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>{placeholderText}</Text>
        </View>
      )}
      
      {showIcon && !loading && (
        <View style={styles.iconContainer}>
          <Ionicons name="camera" size={size / 5} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#e1e4e8',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  placeholderText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
  iconContainer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
    padding: 8,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#fff',
  },
});

export default ImageUploader; 