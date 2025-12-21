// types/images.ts
// Kuvatyypit profiilikuville ja taustakuville

export interface UserImage {
  id: string;
  image_type: 'profile' | 'background';
  file_path: string;
  name: string;
  is_active: boolean;
  is_ai_generated?: boolean;
  created_at: string;
  signedUrl?: string;
}

export interface ImageUploadResult {
  success: boolean;
  imageUrl?: string;
  filePath?: string;
  error?: string;
}

export type ImageField = 'profileImage' | 'backgroundImage';