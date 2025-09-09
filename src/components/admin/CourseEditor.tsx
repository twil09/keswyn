import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Edit, 
  Video, 
  FileText, 
  ChevronUp, 
  ChevronDown, 
  Save,
  Eye,
  Settings
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  duration: string;
  is_premium: boolean;
  student_count: number;
}

interface Module {
  id: string;
  title: string;
  description: string;
  order_index: number;
  steps: Step[];
}

interface Step {
  id: string;
  title: string;
  content: string;
  step_type: string; // Changed from union type to string to match database
  video_url?: string;
  order_index: number;
  requires_submission: boolean;
}

export function CourseEditor() {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(false);
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    category: '',
    difficulty: '',
    duration: '',
    is_premium: false
  });
  const [moduleForm, setModuleForm] = useState({
    title: '',
    description: ''
  });
  const [stepForm, setStepForm] = useState({
    title: '',
    content: '',
    step_type: 'lesson' as string,
    video_url: '',
    requires_submission: false
  });
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchCourseModules(selectedCourse.id);
    }
  }, [selectedCourse]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseModules = async (courseId: string) => {
    try {
      const { data: moduleData, error: moduleError } = await supabase
        .from('modules')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index');

      if (moduleError) throw moduleError;

      const modulesWithSteps = await Promise.all(
        (moduleData || []).map(async (module) => {
          const { data: stepData, error: stepError } = await supabase
            .from('steps')
            .select('*')
            .eq('module_id', module.id)
            .order('order_index');

          if (stepError) throw stepError;

          return {
            ...module,
            steps: (stepData || []).map(step => ({
              ...step,
              content: step.content || '',
              video_url: step.video_url || '',
              requires_submission: step.requires_submission || false
            }))
          };
        })
      );

      setModules(modulesWithSteps);
    } catch (error: any) {
      toast({
        title: "Error fetching course content",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const createCourse = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .insert([courseForm])
        .select()
        .single();

      if (error) throw error;

      setCourses([data, ...courses]);
      setCourseForm({
        title: '',
        description: '',
        category: '',
        difficulty: '',
        duration: '',
        is_premium: false
      });

      toast({
        title: "Course created",
        description: "Course has been created successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error creating course",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const createModule = async () => {
    if (!selectedCourse) return;

    try {
      const { data, error } = await supabase
        .from('modules')
        .insert([{
          ...moduleForm,
          course_id: selectedCourse.id,
          order_index: modules.length
        }])
        .select()
        .single();

      if (error) throw error;

      const newModule = { ...data, steps: [] };
      setModules([...modules, newModule]);
      setModuleForm({ title: '', description: '' });

      toast({
        title: "Module created",
        description: "Module has been added to the course.",
      });
    } catch (error: any) {
      toast({
        title: "Error creating module",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const createStep = async (moduleId: string) => {
    try {
      const module = modules.find(m => m.id === moduleId);
      if (!module) return;

      const { data, error } = await supabase
        .from('steps')
        .insert([{
          ...stepForm,
          module_id: moduleId,
          order_index: module.steps.length
        }])
        .select()
        .single();

      if (error) throw error;

      setModules(modules.map(m => 
        m.id === moduleId 
          ? { 
              ...m, 
              steps: [...m.steps, {
                ...data,
                content: data.content || '',
                video_url: data.video_url || '',
                requires_submission: data.requires_submission || false
              }] 
            }
          : m
      ));

      setStepForm({
        title: '',
        content: '',
        step_type: 'lesson',
        video_url: '',
        requires_submission: false
      });

      toast({
        title: "Step created",
        description: "Step has been added to the module.",
      });
    } catch (error: any) {
      toast({
        title: "Error creating step",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteModule = async (moduleId: string) => {
    try {
      const { error } = await supabase
        .from('modules')
        .delete()
        .eq('id', moduleId);

      if (error) throw error;

      setModules(modules.filter(m => m.id !== moduleId));
      toast({
        title: "Module deleted",
        description: "Module has been removed from the course.",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting module",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteStep = async (stepId: string, moduleId: string) => {
    try {
      const { error } = await supabase
        .from('steps')
        .delete()
        .eq('id', stepId);

      if (error) throw error;

      setModules(modules.map(m => 
        m.id === moduleId 
          ? { ...m, steps: m.steps.filter(s => s.id !== stepId) }
          : m
      ));

      toast({
        title: "Step deleted",
        description: "Step has been removed from the module.",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting step",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStepIcon = (stepType: string) => {
    switch (stepType) {
      case 'video': return Video;
      case 'quiz': return Settings;
      case 'assignment': return FileText;
      default: return BookOpen;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Course Editor
          </CardTitle>
          <CardDescription>
            Create and manage course content, modules, and lessons
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="courses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="content" disabled={!selectedCourse}>
            Course Content
          </TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="space-y-4">
          {/* Course Creation Form */}
          <Card>
            <CardHeader>
              <CardTitle>Create New Course</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Course Title</Label>
                  <Input
                    id="title"
                    value={courseForm.title}
                    onChange={(e) => setCourseForm({...courseForm, title: e.target.value})}
                    placeholder="Enter course title"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={courseForm.category} onValueChange={(value) => setCourseForm({...courseForm, category: value})}>
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
                <div>
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select value={courseForm.difficulty} onValueChange={(value) => setCourseForm({...courseForm, difficulty: value})}>
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
                <div>
                  <Label htmlFor="duration">Duration</Label>
                  <Input
                    id="duration"
                    value={courseForm.duration}
                    onChange={(e) => setCourseForm({...courseForm, duration: e.target.value})}
                    placeholder="e.g., 4 weeks, 20 hours"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({...courseForm, description: e.target.value})}
                  placeholder="Enter course description"
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_premium"
                  checked={courseForm.is_premium}
                  onChange={(e) => setCourseForm({...courseForm, is_premium: e.target.checked})}
                />
                <Label htmlFor="is_premium">Premium Course</Label>
              </div>
              <Button onClick={createCourse} className="w-full">
                Create Course
              </Button>
            </CardContent>
          </Card>

          {/* Course List */}
          <Card>
            <CardHeader>
              <CardTitle>Existing Courses</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading courses...</p>
              ) : courses.length === 0 ? (
                <p className="text-muted-foreground">No courses created yet.</p>
              ) : (
                <div className="space-y-2">
                  {courses.map((course) => (
                    <div key={course.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium">{course.title}</h3>
                        <p className="text-sm text-muted-foreground">{course.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">{course.category}</Badge>
                          <Badge variant="outline">{course.difficulty}</Badge>
                          {course.is_premium && <Badge variant="secondary">Premium</Badge>}
                          <Badge>{course.student_count} students</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedCourse(course)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Content
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          {selectedCourse && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Editing: {selectedCourse.title}</span>
                    <Button variant="outline" onClick={() => setSelectedCourse(null)}>
                      <Eye className="w-4 h-4 mr-2" />
                      Back to Courses
                    </Button>
                  </CardTitle>
                </CardHeader>
              </Card>

              {/* Module Creation */}
              <Card>
                <CardHeader>
                  <CardTitle>Add New Module</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="moduleTitle">Module Title</Label>
                    <Input
                      id="moduleTitle"
                      value={moduleForm.title}
                      onChange={(e) => setModuleForm({...moduleForm, title: e.target.value})}
                      placeholder="Enter module title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="moduleDescription">Module Description</Label>
                    <Textarea
                      id="moduleDescription"
                      value={moduleForm.description}
                      onChange={(e) => setModuleForm({...moduleForm, description: e.target.value})}
                      placeholder="Enter module description"
                      rows={2}
                    />
                  </div>
                  <Button onClick={createModule}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Module
                  </Button>
                </CardContent>
              </Card>

              {/* Course Modules */}
              <Card>
                <CardHeader>
                  <CardTitle>Course Modules</CardTitle>
                </CardHeader>
                <CardContent>
                  {modules.length === 0 ? (
                    <p className="text-muted-foreground">No modules created yet.</p>
                  ) : (
                    <Accordion type="single" collapsible className="space-y-2">
                      {modules.map((module) => (
                        <AccordionItem key={module.id} value={module.id} className="border rounded-lg">
                          <AccordionTrigger className="px-4">
                            <div className="flex items-center justify-between w-full mr-4">
                              <span className="font-medium">{module.title}</span>
                              <div className="flex items-center gap-2">
                                <Badge>{module.steps.length} steps</Badge>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteModule(module.id);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            <p className="text-sm text-muted-foreground mb-4">{module.description}</p>
                            
                            {/* Add Step Form */}
                            <Card className="mb-4">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-sm">Add New Step</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label htmlFor="stepTitle">Step Title</Label>
                                    <Input
                                      id="stepTitle"
                                      value={stepForm.title}
                                      onChange={(e) => setStepForm({...stepForm, title: e.target.value})}
                                      placeholder="Enter step title"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="stepType">Step Type</Label>
                                    <Select value={stepForm.step_type} onValueChange={(value: any) => setStepForm({...stepForm, step_type: value})}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="lesson">Lesson</SelectItem>
                                        <SelectItem value="video">Video</SelectItem>
                                        <SelectItem value="quiz">Quiz</SelectItem>
                                        <SelectItem value="assignment">Assignment</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div>
                                  <Label htmlFor="stepContent">Content</Label>
                                  <Textarea
                                    id="stepContent"
                                    value={stepForm.content}
                                    onChange={(e) => setStepForm({...stepForm, content: e.target.value})}
                                    placeholder="Enter step content"
                                    rows={3}
                                  />
                                </div>
                                {stepForm.step_type === 'video' && (
                                  <div>
                                    <Label htmlFor="videoUrl">Video URL</Label>
                                    <Input
                                      id="videoUrl"
                                      value={stepForm.video_url}
                                      onChange={(e) => setStepForm({...stepForm, video_url: e.target.value})}
                                      placeholder="Enter video URL"
                                    />
                                  </div>
                                )}
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id="requiresSubmission"
                                    checked={stepForm.requires_submission}
                                    onChange={(e) => setStepForm({...stepForm, requires_submission: e.target.checked})}
                                  />
                                  <Label htmlFor="requiresSubmission">Requires Submission</Label>
                                </div>
                                <Button onClick={() => createStep(module.id)} size="sm">
                                  <Plus className="w-4 h-4 mr-2" />
                                  Add Step
                                </Button>
                              </CardContent>
                            </Card>

                            {/* Module Steps */}
                            <div className="space-y-2">
                              {module.steps.map((step) => {
                                const StepIcon = getStepIcon(step.step_type);
                                return (
                                  <div key={step.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                    <div className="flex items-center gap-3">
                                      <StepIcon className="w-4 h-4 text-muted-foreground" />
                                      <div>
                                        <h4 className="font-medium">{step.title}</h4>
                                        <p className="text-sm text-muted-foreground">{step.step_type}</p>
                                      </div>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => deleteStep(step.id, module.id)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}