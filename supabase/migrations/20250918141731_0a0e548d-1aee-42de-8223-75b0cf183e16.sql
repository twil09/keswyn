-- Ensure submissions bucket exists and is private (for teacher/admin access only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('submissions', 'submissions', false, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/zip'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/zip'];

-- Create storage policies for submissions bucket
-- Students can upload their own files
CREATE POLICY "Students can upload their own submission files"
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'submissions' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Students can view their own files
CREATE POLICY "Students can view their own submission files"
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'submissions' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Teachers and admins can view all submission files
CREATE POLICY "Teachers and admins can view all submission files"
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'submissions'
  AND (is_admin(auth.uid()) OR is_teacher(auth.uid()))
);

-- Teachers and admins can download submission files
CREATE POLICY "Teachers and admins can download submission files"
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'submissions'
  AND (is_admin(auth.uid()) OR is_teacher(auth.uid()))
);