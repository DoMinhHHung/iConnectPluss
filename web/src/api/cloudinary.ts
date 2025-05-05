import axios from 'axios';

/**
 * Compress an image to reduce file size before uploading
 * @param base64Image Base64 string of the image
 * @param maxWidth Maximum width of the compressed image
 * @returns Compressed image as base64 string
 */
const compressImage = (base64Image: string, maxWidth: number = 800): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Create an image element to load the base64 image
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = height * ratio;
        }

        // Create a canvas to draw the resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        // Draw the image on the canvas
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to base64 with reduced quality
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        resolve(compressedBase64);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image for compression'));
      };
      
      img.src = base64Image;
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Upload an image to Cloudinary via the server endpoint
 * @param base64Image Base64 representation of the image
 * @param folder Optional folder name in Cloudinary
 * @returns The Cloudinary URL of the uploaded image
 */
export const uploadImageToCloudinary = async (
  base64Image: string, 
  folder: string = 'italk_app'
): Promise<string> => {
  try {
    // Ensure image has the proper data URL prefix
    const formattedBase64 = base64Image.startsWith('data:')
      ? base64Image
      : `data:image/jpeg;base64,${base64Image}`;
    
    // Compress the image before uploading
    console.log('Compressing image before upload...');
    const compressedImage = await compressImage(formattedBase64);
    console.log('Image compression completed');
    
    console.log('Uploading compressed image to Cloudinary via server...');
    
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Authentication token not found");
    
    // Use the existing server endpoint for Cloudinary uploads
    const response = await axios.post(
      `http://localhost:3005/api/chat/upload-cloudinary`, 
      { 
        image: compressedImage,
        folder: folder
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        timeout: 15000, // 15 second timeout
      }
    );

    if (response.data && response.data.url) {
      console.log('Image successfully uploaded to Cloudinary');
      return response.data.url;
    } else {
      throw new Error('No image URL returned from server');
    }
  } catch (error: any) {
    console.error('Error uploading image to Cloudinary:', error);
    throw new Error(error.response?.data?.message || 'Failed to upload image to Cloudinary');
  }
}; 