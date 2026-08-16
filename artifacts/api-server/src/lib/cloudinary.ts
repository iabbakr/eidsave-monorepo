import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export type UploadCategory = 
  | 'animals' 
  | 'avatars' 
  | 'kyc' 
  | 'support' 
  | 'receipts' 
  | 'deliveries' 
  | 'banners';

export const uploadMedia = async (
  fileBufferOrPath: string,
  category: UploadCategory,
  customFilename?: string
) => {
  const root = process.env.CLOUDINARY_ROOT_FOLDER || 'eidsave';
  
  return cloudinary.uploader.upload(fileBufferOrPath, {
    folder: `${root}/${category}`,
    public_id: customFilename,
    resource_type: 'auto',
    ...(category === 'kyc' ? { type: 'authenticated' } : {}), // Secures sensitive KYC documents
  });
};