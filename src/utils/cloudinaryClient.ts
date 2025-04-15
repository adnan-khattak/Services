import { upload } from 'cloudinary-react-native';

// Media constraints
export const MEDIA_CONSTRAINTS = {
  SERVICE: {
    MAX_IMAGES: 5,
    MAX_IMAGE_SIZE: 1024 * 1024, // 1MB
    MAX_VIDEOS: 1,
    MAX_VIDEO_SIZE: 5 * 1024 * 1024, // 5MB
    MAX_VIDEO_DURATION: 15, // seconds
  },
  POST: {
    MAX_IMAGES: 3,
    MAX_IMAGE_SIZE: 1024 * 1024, // 1MB
    MAX_VIDEOS: 1,
    MAX_VIDEO_SIZE: 5 * 1024 * 1024, // 5MB
    MAX_VIDEO_DURATION: 15, // seconds
  },
  COMMENT: {
    MAX_IMAGES: 1,
    MAX_IMAGE_SIZE: 1024 * 1024, // 1MB
    MAX_VIDEOS: 1,
    MAX_VIDEO_SIZE: 5 * 1024 * 1024, // 5MB
    MAX_VIDEO_DURATION: 15, // seconds
  },
};

// Allowed file types
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];

// Initialize Cloudinary
const CLOUDINARY_IMAGE_UPLOAD_URL = 'https://api.cloudinary.com/v1_1/dvlurxvei/image/upload';
const CLOUDINARY_VIDEO_UPLOAD_URL = 'https://api.cloudinary.com/v1_1/dvlurxvei/video/upload';
const CLOUDINARY_PRESET = 'services_pic';
const CLOUDINARY_CLOUD_NAME = 'dvlurxvei';

// Function to validate file size and type
export const validateMediaFile = (file: any, type: 'image' | 'video', mediaType: 'SERVICE' | 'POST' | 'COMMENT') => {
  // Check file size
  const maxSize = type === 'image' 
    ? MEDIA_CONSTRAINTS[mediaType].MAX_IMAGE_SIZE 
    : MEDIA_CONSTRAINTS[mediaType].MAX_VIDEO_SIZE;
    
  if (file.fileSize > maxSize) {
    return {
      valid: false,
      error: `${type === 'image' ? 'Image' : 'Video'} exceeds maximum size of ${maxSize / (1024 * 1024)}MB`
    };
  }
  
  // Check file type
  const allowedTypes = type === 'image' ? ALLOWED_IMAGE_TYPES : ALLOWED_VIDEO_TYPES;
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid ${type} format. Allowed: ${allowedTypes.join(', ')}`
    };
  }
  
  return { valid: true, error: null };
};

// Function to upload media to Cloudinary using fetch API
export const uploadToCloudinary = async (file: any, folder: string): Promise<string> => {
  try {
    // Determine if it's an image or video
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const uploadUrl = isImage ? CLOUDINARY_IMAGE_UPLOAD_URL : CLOUDINARY_VIDEO_UPLOAD_URL;
    
    // For React Native, we need to create form data
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      type: file.type,
      name: file.fileName || `${Date.now()}.${file.uri.split('.').pop()}`
    });
    formData.append('upload_preset', CLOUDINARY_PRESET);
    formData.append('folder', folder);
    
    // Upload to Cloudinary using fetch
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Return the secure URL from the response
    return data.secure_url;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw new Error('Failed to upload media');
  }
};

// Function to upload multiple files
export const uploadMultipleFiles = async (
  files: any[],
  folder: string,
  onProgress?: (progress: number) => void
): Promise<string[]> => {
  const urls: string[] = [];
  let completedUploads = 0;
  
  for (const file of files) {
    try {
      const url = await uploadToCloudinary(file, folder);
      urls.push(url);
      
      // Update progress if callback provided
      completedUploads++;
      if (onProgress) {
        onProgress(Math.round((completedUploads / files.length) * 100));
      }
    } catch (error) {
      console.error('Error during file upload:', error);
      // Continue with next file even if one fails
    }
  }
  
  return urls;
}; 