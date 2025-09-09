-- Create storage policies for course-resources bucket
CREATE POLICY "Admins and teachers can upload course resources" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'course-resources' AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
);

CREATE POLICY "Admins and teachers can view course resources" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'course-resources' AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
);

CREATE POLICY "Admins and teachers can update course resources" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'course-resources' AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
);

CREATE POLICY "Admins and teachers can delete course resources" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'course-resources' AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
);

-- Create storage policies for course-videos bucket
CREATE POLICY "Admins and teachers can upload course videos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'course-videos' AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
);

CREATE POLICY "Users can view course videos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'course-videos');

CREATE POLICY "Admins and teachers can update course videos" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'course-videos' AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
);

CREATE POLICY "Admins and teachers can delete course videos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'course-videos' AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
);

-- Create storage policies for submissions bucket
CREATE POLICY "Students can upload their own submissions" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'submissions' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own submissions" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'submissions' AND 
  (auth.uid()::text = (storage.foldername(name))[1] OR 
   has_role(auth.uid(), 'admin'::app_role) OR 
   has_role(auth.uid(), 'teacher'::app_role))
);

CREATE POLICY "Admins and teachers can update submissions" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'submissions' AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
);

CREATE POLICY "Users can delete their own submissions" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'submissions' AND 
  (auth.uid()::text = (storage.foldername(name))[1] OR 
   has_role(auth.uid(), 'admin'::app_role) OR 
   has_role(auth.uid(), 'teacher'::app_role))
);