import { supabase } from './supabase';

export interface UploadResult {
  path: string;
  url: string;
  error?: string;
}

export interface UploadOptions {
  bucket: string;
  path: string;
  file: File;
  options?: {
    cacheControl?: string;
    upsert?: boolean;
  };
}

// Client-side upload function
export const uploadFile = async (
  options: UploadOptions
): Promise<UploadResult> => {
  try {
    const { bucket, path, file, options: uploadOptions } = options;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { path: '', url: '', error: 'Chỉ được upload file hình ảnh' };
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return {
        path: '',
        url: '',
        error: 'File quá lớn. Kích thước tối đa là 5MB',
      };
    }

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: uploadOptions?.cacheControl || '3600',
        upsert: uploadOptions?.upsert || false,
      });

    if (error) {
      console.error('Upload error:', error);
      return { path: '', url: '', error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      path: data.path,
      url: urlData.publicUrl,
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      path: '',
      url: '',
      error: error instanceof Error ? error.message : 'Lỗi không xác định',
    };
  }
};

// Server-side upload is handled through API routes
// See /api/matches/[id]/settle for server-side upload implementation

// Delete file function
export const deleteFile = async (
  bucket: string,
  path: string
): Promise<boolean> => {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    return !error;
  } catch (error) {
    console.error('Delete error:', error);
    return false;
  }
};

// Generate unique file path
export const generateFilePath = (
  userId: string,
  matchId: string,
  filename: string
): string => {
  const timestamp = Date.now();
  const extension = filename.split('.').pop();
  return `matches/${matchId}/proofs/${userId}_${timestamp}.${extension}`;
};

// Storage bucket names
export const STORAGE_BUCKETS = {
  MATCH_PROOFS: 'match-proofs',
  USER_AVATARS: 'user-avatars',
} as const;
