'use client';

import { useState, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  X, 
  Image as ImageIcon, 
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { uploadFile, generateFilePath, STORAGE_BUCKETS } from '@/lib/storage';

interface ImageUploadProps {
  userId: string;
  matchId: string;
  onUploadComplete: (url: string) => void;
  onUploadError: (error: string) => void;
  disabled?: boolean;
  maxFiles?: number;
  acceptedFileTypes?: string[];
}

export function ImageUpload({
  userId,
  matchId,
  onUploadComplete,
  onUploadError,
  disabled = false,
  maxFiles = 1,
  acceptedFileTypes = ['image/jpeg', 'image/png', 'image/webp'],
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (disabled || uploading) return;

    const file = acceptedFiles[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      const filePath = generateFilePath(userId, matchId, file.name);
      const result = await uploadFile({
        bucket: STORAGE_BUCKETS.MATCH_PROOFS,
        path: filePath,
        file,
        options: {
          cacheControl: '3600',
          upsert: false,
        },
      });

      if (result.error) {
        setError(result.error);
        onUploadError(result.error);
      } else {
        setUploadedImage(result.url);
        onUploadComplete(result.url);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Lỗi upload không xác định';
      setError(errorMessage);
      onUploadError(errorMessage);
    } finally {
      setUploading(false);
    }
  }, [userId, matchId, onUploadComplete, onUploadError, disabled, uploading]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {} as Record<string, string[]>),
    maxFiles,
    disabled: disabled || uploading,
  });

  const handleFileSelect = () => {
    if (disabled || uploading) return;
    fileInputRef.current?.click();
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    setError(null);
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files[0]) {
      onDrop([files[0]]);
    }
  };

  return (
    <div className="space-y-4">
      {!uploadedImage && (
        <Card>
          <CardContent className="p-6">
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-primary/50'
                }
                ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <input {...getInputProps()} />
              <input
                ref={fileInputRef}
                type="file"
                accept={acceptedFileTypes.join(',')}
                onChange={handleFileInputChange}
                className="hidden"
                disabled={disabled || uploading}
              />

              {uploading ? (
                <div className="space-y-4">
                  <Loader2 className="h-12 w-12 text-primary mx-auto animate-spin" />
                  <div>
                    <p className="text-lg font-semibold">Đang upload...</p>
                    <p className="text-sm text-muted-foreground">
                      Vui lòng chờ trong giây lát
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="mx-auto w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                  
                  <div>
                    <p className="text-lg font-semibold">
                      {isDragActive ? 'Thả file vào đây' : 'Upload hình ảnh'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Kéo thả file hoặc{' '}
                      <button
                        type="button"
                        onClick={handleFileSelect}
                        className="text-primary hover:underline"
                        disabled={disabled}
                      >
                        chọn file
                      </button>
                    </p>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    <p>Định dạng hỗ trợ: JPEG, PNG, WebP</p>
                    <p>Kích thước tối đa: 5MB</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {uploadedImage && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={uploadedImage}
                  alt="Uploaded proof"
                  className="w-20 h-20 object-cover rounded-lg border"
                />
                <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
              </div>
              
              <div className="flex-1">
                <p className="font-semibold text-green-600">Upload thành công!</p>
                <p className="text-sm text-muted-foreground">
                  Hình ảnh đã được upload và sẵn sàng sử dụng
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveImage}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
