import cloudinary from '../config/cloudinary.js';

export const uploadToCloudinary = async (file) => {
  try {
    // Use the `upload` method instead of `upload_stream`
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'patients', // Optional: Specify a folder in Cloudinary
      resource_type: 'auto', // Automatically detect the file type (image, video, etc.)
    });

    return result; // Return the Cloudinary response
  } catch (error) {
    throw new Error('Cloudinary upload failed: ' + error.message);
  }
};