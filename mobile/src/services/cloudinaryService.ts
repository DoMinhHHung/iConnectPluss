import axios from 'axios';
import { CLOUDINARY_CONFIG, API_URL } from '../config/constants';

/**
 * Upload ảnh lên Cloudinary qua server proxy để bảo mật API key/secret
 * @param base64Image Chuỗi base64 của ảnh
 * @returns URL của ảnh sau khi upload
 */
export const uploadImageToCloudinary = async (base64Image: string): Promise<string> => {
  try {
    // Kiểm tra nếu image đã có prefix, nếu không thì thêm vào
    const formattedBase64 = base64Image.startsWith('data:')
      ? base64Image
      : `data:image/jpeg;base64,${base64Image}`;

    console.log('Uploading image to server for Cloudinary processing...');
    console.log('API URL:', `${API_URL}/api/chat/upload-cloudinary`);
    
    // Phương pháp mới: Upload qua server của bạn
    // Server sẽ xử lý việc upload lên Cloudinary
    const response = await axios.post(
      `${API_URL}/api/chat/upload-cloudinary`, 
      { 
        image: formattedBase64,
        folder: CLOUDINARY_CONFIG.FOLDER
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 15000, // 15 second timeout
      }
    );

    console.log('Server upload response status:', response.status);
    console.log('Server upload response data:', response.data);

    if (response.data && response.data.url) {
      return response.data.url;
    } else {
      throw new Error('No image URL returned from server');
    }
  } catch (error) {
    console.error('Error uploading image to server:', error);
    
    // Fallback: Upload trực tiếp lên Cloudinary nếu server không phản hồi
    return uploadDirectToCloudinary(base64Image);
  }
};

/**
 * Fallback method: Upload trực tiếp lên Cloudinary
 */
const uploadDirectToCloudinary = async (base64Image: string): Promise<string> => {
  try {
    // Kiểm tra nếu image đã có prefix
    const formattedBase64 = base64Image.startsWith('data:')
      ? base64Image
      : `data:image/jpeg;base64,${base64Image}`;

    console.log('Attempting direct upload to Cloudinary...');
    console.log('Cloudinary config:', {
      cloud_name: CLOUDINARY_CONFIG.CLOUD_NAME,
      upload_preset: CLOUDINARY_CONFIG.UPLOAD_PRESET,
      folder: CLOUDINARY_CONFIG.FOLDER
    });
    
    // Tạo FormData
    const formData = new FormData();
    formData.append('file', formattedBase64);
    formData.append('upload_preset', CLOUDINARY_CONFIG.UPLOAD_PRESET);
    formData.append('folder', CLOUDINARY_CONFIG.FOLDER);
    
    // Upload endpoint
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.CLOUD_NAME}/image/upload`;
    console.log('Cloudinary URL:', cloudinaryUrl);
    
    const response = await axios.post(cloudinaryUrl, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 15000, // 15 second timeout
    });
    
    console.log('Direct Cloudinary upload response status:', response.status);
    console.log('Direct Cloudinary upload response data:', response.data);
    
    return response.data.secure_url;
  } catch (error) {
    console.error('Direct Cloudinary upload failed:', error.response?.data || error.message);
    throw new Error('Failed to upload image to Cloudinary');
  }
};

/**
 * Upload ảnh lên Cloudinary từ URI (đường dẫn cục bộ của ảnh)
 * @param imageUri Đường dẫn cục bộ của ảnh 
 * @returns URL của ảnh sau khi upload
 */
export const uploadImageFromUri = async (imageUri: string): Promise<string> => {
  try {
    // Upload đến server trước (nếu có thể)
    try {
      // Tạo form data với file URI
      const formData = new FormData();
      
      // @ts-ignore - FormData append với file URI
      formData.append('file', {
        uri: imageUri,
        name: imageUri.split('/').pop() || 'image.jpg',
        type: 'image/jpeg',
      });
      
      console.log('Uploading URI image to server...');
      const response = await axios.post(
        `${API_URL}/api/chat/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      console.log('Server upload response:', response.data);
      
      // Nếu server trả về URL, sử dụng URL đó
      if (response.data && response.data.fileUrl) {
        return response.data.fileUrl;
      }
    } catch (serverError) {
      console.error('Error uploading to server, trying Cloudinary directly:', serverError);
    }
    
    // Fallback: upload trực tiếp lên Cloudinary
    // Tạo form data với file URI
    const filename = imageUri.split('/').pop() || 'image.jpg';
    const formData = new FormData();
    
    // @ts-ignore - FormData append với file URI
    formData.append('file', {
      uri: imageUri,
      name: filename,
      type: 'image/jpeg',
    });
    
    formData.append('upload_preset', CLOUDINARY_CONFIG.UPLOAD_PRESET);
    formData.append('folder', CLOUDINARY_CONFIG.FOLDER);

    // Cấu hình API endpoint của Cloudinary
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.CLOUD_NAME}/image/upload`;

    // Gửi request đến Cloudinary
    console.log('Uploading image from URI directly to Cloudinary...');
    const response = await axios.post(cloudinaryUrl, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    console.log('Cloudinary upload response:', response.data);

    // Trả về URL của ảnh
    return response.data.secure_url;
  } catch (error) {
    console.error('All image upload methods failed:', error);
    throw new Error('Failed to upload image');
  }
}; 