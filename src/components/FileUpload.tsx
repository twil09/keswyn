import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, FileText, Image, FileIcon } from 'lucide-react';

interface FileUploadProps {
  onFileUploaded: (fileUrl: string, fileName: string) => void;
  stepId: string;
  maxFiles?: number;
  acceptedFileTypes?: string[];
}

interface UploadedFile {
  file: File;
  progress: number;
  url?: string;
  error?: string;
}

export function FileUpload({ 
  onFileUploaded, 
  stepId, 
  maxFiles = 5, 
  acceptedFileTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png', 
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/zip'
  ]
}: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const uploadFile = async (file: File): Promise<string> => {
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error('User not authenticated');

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.data.user.id}/${stepId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('submissions')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('submissions')
      .getPublicUrl(data.path);

    return publicUrl;
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    if (uploadedFiles.length + acceptedFiles.length > maxFiles) {
      toast({
        title: "Too many files",
        description: `You can only upload up to ${maxFiles} files.`,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      file,
      progress: 0
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Upload files one by one
    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      
      try {
        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setUploadedFiles(prev => prev.map((f, index) => 
            f.file === file ? { ...f, progress: Math.min(f.progress + 10, 90) } : f
          ));
        }, 100);

        const fileUrl = await uploadFile(file);
        
        clearInterval(progressInterval);
        
        setUploadedFiles(prev => prev.map(f => 
          f.file === file ? { ...f, progress: 100, url: fileUrl } : f
        ));

        onFileUploaded(fileUrl, file.name);

        toast({
          title: "File uploaded",
          description: `${file.name} has been uploaded successfully.`,
        });

      } catch (error: any) {
        setUploadedFiles(prev => prev.map(f => 
          f.file === file ? { ...f, error: error.message } : f
        ));

        toast({
          title: "Upload failed",
          description: `Failed to upload ${file.name}: ${error.message}`,
          variant: "destructive",
        });
      }
    }

    setIsUploading(false);
  }, [uploadedFiles.length, maxFiles, onFileUploaded, stepId, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'application/zip': ['.zip']
    },
    maxFiles,
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const removeFile = (fileToRemove: UploadedFile) => {
    setUploadedFiles(prev => prev.filter(f => f !== fileToRemove));
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <Image className="h-4 w-4 text-blue-500" />;
      default:
        return <FileIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
        {isDragActive ? (
          <p className="text-sm text-primary">Drop the files here...</p>
        ) : (
          <>
            <p className="text-sm font-medium mb-2">
              Drag & drop files here, or click to select files
            </p>
            <p className="text-xs text-muted-foreground">
              Supports PDF, Images, Word docs, Text files, and ZIP files (max 50MB each, {maxFiles} files total)
            </p>
          </>
        )}
      </div>

      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Uploaded Files:</h4>
          {uploadedFiles.map((uploadedFile, index) => (
            <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
              {getFileIcon(uploadedFile.file.name)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{uploadedFile.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                {uploadedFile.progress < 100 && uploadedFile.progress > 0 && (
                  <Progress value={uploadedFile.progress} className="h-1 mt-1" />
                )}
                {uploadedFile.error && (
                  <p className="text-xs text-destructive mt-1">{uploadedFile.error}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {uploadedFile.url && (
                  <Badge variant="secondary" className="text-xs">
                    Uploaded
                  </Badge>
                )}
                {uploadedFile.error && (
                  <Badge variant="destructive" className="text-xs">
                    Failed
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(uploadedFile)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}