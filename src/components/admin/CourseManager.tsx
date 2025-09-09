import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Upload, Video, FileText, Trash2, Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function CourseManager() {
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const { toast } = useToast();

  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    category: '',
    difficulty: '',
    duration: ''
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching courses",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { error } = await supabase
        .from('courses')
        .insert([{
          ...courseForm,
          created_by: profile?.id
        }]);

      if (error) throw error;

      toast({
        title: "Course created successfully",
        description: "Your new course has been added to the system.",
      });

      setCourseForm({
        title: '',
        description: '',
        category: '',
        difficulty: '',
        duration: ''
      });
      setShowCreateCourse(false);
      fetchCourses(); // Refresh the course list
    } catch (error: any) {
      toast({
        title: "Error creating course",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, type: 'video' | 'resource') => {
    if (!selectedCourse) {
      toast({
        title: "No course selected",
        description: "Please select a course first to upload files.",
        variant: "destructive",
      });
      return null;
    }

    const bucket = type === 'video' ? 'course-videos' : 'course-resources';
    const fileName = `${selectedCourse}/${Date.now()}-${file.name}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Save file metadata to database
      const { error: dbError } = await supabase
        .from('resources')
        .insert([{
          title: file.name,
          file_url: fileName,
          file_type: file.type,
          course_id: selectedCourse
        }]);

      if (dbError) throw dbError;

      toast({
        title: "File uploaded successfully",
        description: `${file.name} has been uploaded to ${courses.find(c => c.id === selectedCourse)?.title || 'course'}.`,
      });

      return fileName;
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteCourse = async (courseId: string) => {
    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) throw error;

      toast({
        title: "Course deleted successfully",
        description: "The course has been removed from the system.",
      });

      fetchCourses();
    } catch (error: any) {
      toast({
        title: "Error deleting course",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Course Management</h2>
          <p className="text-muted-foreground">Create and manage your courses</p>
        </div>
        <Dialog open={showCreateCourse} onOpenChange={setShowCreateCourse}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Course
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Course</DialogTitle>
              <DialogDescription>
                Add a new course to your curriculum
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Course Title</Label>
                <Input
                  id="title"
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select onValueChange={(value) => setCourseForm({ ...courseForm, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="programming">Programming</SelectItem>
                      <SelectItem value="design">Design</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="science">Science</SelectItem>
                      <SelectItem value="mathematics">Mathematics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select onValueChange={(value) => setCourseForm({ ...courseForm, difficulty: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Input
                  id="duration"
                  placeholder="e.g., 4 weeks, 20 hours"
                  value={courseForm.duration}
                  onChange={(e) => setCourseForm({ ...courseForm, duration: e.target.value })}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateCourse(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Course'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Existing Courses */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Courses</CardTitle>
          <CardDescription>Manage your courses and upload files</CardDescription>
        </CardHeader>
        <CardContent>
          {courses.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No courses created yet. Create your first course above!</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="font-medium">{course.title}</TableCell>
                    <TableCell>{course.category}</TableCell>
                    <TableCell>{course.difficulty}</TableCell>
                    <TableCell>{course.duration}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={selectedCourse === course.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedCourse(course.id)}
                        >
                          {selectedCourse === course.id ? "Selected" : "Select"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteCourse(course.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* File Upload Section - Only show when course is selected */}
      {selectedCourse && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold">Upload Files to: {courses.find(c => c.id === selectedCourse)?.title}</h3>
            <Button
              variant="outline"
              onClick={() => setSelectedCourse(null)}
            >
              Deselect Course
            </Button>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Video className="h-5 w-5 mr-2" />
                  Upload Video Content
                </CardTitle>
                <CardDescription>
                  Upload video lessons for the selected course
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Drag and drop video files or click to browse
                  </p>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'video');
                    }}
                    className="hidden"
                    id="video-upload"
                  />
                  <Button asChild variant="outline">
                    <label htmlFor="video-upload" className="cursor-pointer">
                      Choose Video File
                    </label>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Upload Resources
                </CardTitle>
                <CardDescription>
                  Upload documents, PDFs, and other learning materials
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Drag and drop resource files or click to browse
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.ppt,.pptx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'resource');
                    }}
                    className="hidden"
                    id="resource-upload"
                  />
                  <Button asChild variant="outline">
                    <label htmlFor="resource-upload" className="cursor-pointer">
                      Choose Resource File
                    </label>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
