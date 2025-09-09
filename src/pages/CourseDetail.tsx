import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProgressTracker } from '@/components/ProgressTracker';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Users,
  Star,
  Play,
  CheckCircle,
  Lock,
  FileText,
  Video,
  Award
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  duration: string;
  student_count: number;
  rating?: string;
  progress?: number;
  modules: CourseModule[];
}

interface CourseModule {
  id: string;
  title: string;
  description: string;
  order_index: number;
  steps: CourseStep[];
}

interface CourseStep {
  id: string;
  title: string;
  content: string;
  step_type: string;
  video_url?: string;
  order_index: number;
  requires_submission: boolean;
  isCompleted: boolean;
  isLocked: boolean;
}

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { markStepComplete, getUserProgress } = useProgressTracker();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [course, setCourse] = useState<Course | null>(null);
  const [userProgress, setUserProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (courseId) {
      fetchCourseData(courseId);
      if (user) {
        fetchUserProgress(courseId);
      }
    }
  }, [courseId, user]);

  const fetchCourseData = async (id: string) => {
    try {
      setLoading(true);
      
      // Fetch course data
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();

      if (courseError) throw courseError;

      // Fetch modules for this course
      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select('*')
        .eq('course_id', id)
        .order('order_index');

      if (modulesError) throw modulesError;

      // Fetch steps for each module
      const modulesWithSteps = await Promise.all(
        (modulesData || []).map(async (module) => {
          const { data: stepsData, error: stepsError } = await supabase
            .from('steps')
            .select('*')
            .eq('module_id', module.id)
            .order('order_index');

          if (stepsError) throw stepsError;

          return {
            ...module,
            steps: (stepsData || []).map(step => ({
              ...step,
              content: step.content || '',
              video_url: step.video_url || '',
              requires_submission: step.requires_submission || false,
              isCompleted: false, // Will be updated with actual progress
              isLocked: false // Will be calculated based on progress
            }))
          };
        })
      );

      setCourse({
        ...courseData,
        rating: "4.8", // Mock rating for now
        progress: 0, // Will be calculated based on user progress
        modules: modulesWithSteps
      });
    } catch (error: any) {
      toast({
        title: "Error loading course",
        description: error.message,
        variant: "destructive",
      });
      console.error('Error fetching course:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProgress = async (courseId: string) => {
    try {
      const progress = await getUserProgress(courseId);
      setUserProgress(progress || []);
      
      // Update course and step completion status based on progress
      if (course && progress) {
        const completedStepIds = new Set(progress.filter(p => p.completed).map(p => p.step_id));
        
        const updatedModules = course.modules.map(module => ({
          ...module,
          steps: module.steps.map(step => ({
            ...step,
            isCompleted: completedStepIds.has(step.id)
          }))
        }));
        
        const totalSteps = updatedModules.reduce((acc, module) => acc + module.steps.length, 0);
        const completedSteps = progress.filter(p => p.completed).length;
        const progressPercentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
        
        setCourse(prev => prev ? { 
          ...prev, 
          progress: progressPercentage,
          modules: updatedModules
        } : null);
      }
    } catch (error: any) {
      console.error('Error fetching user progress:', error);
    }
  };

  const handleStepComplete = async (stepId: string) => {
    if (!courseId) return;
    
    const success = await markStepComplete(stepId, courseId);
    if (success) {
      // Refresh progress data
      await fetchUserProgress(courseId);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      programming: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      design: "bg-pink-500/20 text-pink-400 border-pink-500/30",
      marketing: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      business: "bg-green-500/20 text-green-400 border-green-500/30",
      science: "bg-red-500/20 text-red-400 border-red-500/30",
      mathematics: "bg-orange-500/20 text-orange-400 border-orange-500/30"
    };
    return colors[category as keyof typeof colors] || colors.programming;
  };

  const getStepIcon = (type: string, isCompleted: boolean, isLocked: boolean) => {
    if (isLocked) return <Lock className="h-4 w-4 text-muted-foreground" />;
    if (isCompleted) return <CheckCircle className="h-4 w-4 text-green-400" />;
    
    switch (type) {
      case "video": return <Video className="h-4 w-4 text-primary" />;
      case "quiz": return <Award className="h-4 w-4 text-primary" />;
      case "assignment": return <FileText className="h-4 w-4 text-primary" />;
      default: return <BookOpen className="h-4 w-4 text-primary" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-64 mx-auto"></div>
            <div className="h-4 bg-muted rounded w-96 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-4">
        <h1 className="text-2xl font-bold mb-4">Course not found</h1>
        <p className="text-muted-foreground mb-6">The course you're looking for doesn't exist or has been removed.</p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const totalSteps = course.modules.reduce((acc, module) => acc + module.steps.length, 0);
  const completedSteps = course.modules.reduce(
    (acc, module) => acc + module.steps.filter(step => step.isCompleted).length,
    0
  );
  const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" onClick={() => navigate("/")} className="p-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-foreground">{course.title}</h1>
                <Badge className={getCategoryColor(course.category)}>
                  {course.category}
                </Badge>
              </div>
              <p className="text-muted-foreground max-w-2xl">{course.description}</p>
            </div>
          </div>

          {/* Course Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{course.duration || 'Self-paced'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{course.student_count} students</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-400" />
              <span className="text-sm">{course.rating || '4.8'}/5</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm capitalize">{course.difficulty}</span>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{completedSteps}/{totalSteps} steps completed</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>About this course</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {course.description}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>What you'll learn</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span>Master the fundamentals and advanced concepts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span>Build real-world projects and portfolios</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span>Hands-on practice with industry tools</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span>Prepare for professional applications</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="curriculum" className="space-y-6">
            <div className="space-y-4">
              {course.modules.map((module, moduleIndex) => (
                <Card key={module.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          Module {moduleIndex + 1}: {module.title}
                        </CardTitle>
                        <CardDescription>{module.description}</CardDescription>
                      </div>
                      <Badge variant="secondary">{module.steps.length} steps</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value={`module-${module.id}`}>
                        <AccordionTrigger className="text-left">
                          {module.steps.length} lessons
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 pt-4">
                            {module.steps.map((step, stepIndex) => (
                              <div
                                key={step.id}
                                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                  step.isLocked 
                                    ? "bg-muted/30 border-muted" 
                                    : "bg-card border-border hover:bg-muted/50 cursor-pointer"
                                }`}
                                onClick={() => {
                                  if (!step.isLocked && !step.isCompleted && user) {
                                    handleStepComplete(step.id);
                                  }
                                }}
                              >
                                {getStepIcon(step.step_type, step.isCompleted, step.isLocked)}
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className={`font-medium ${step.isLocked ? "text-muted-foreground" : "text-foreground"}`}>
                                      {stepIndex + 1}. {step.title}
                                    </h4>
                                    <Badge variant="outline" className="text-xs capitalize">
                                      {step.step_type}
                                    </Badge>
                                    {step.requires_submission && (
                                      <Badge variant="secondary" className="text-xs">
                                        Submission Required
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {step.content || 'No description available'}
                                  </p>
                                </div>
                                {!step.isCompleted && !step.isLocked && user && (
                                  <Button size="sm" variant="outline">
                                    Mark Complete
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="resources" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Additional Resources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Course Materials</h4>
                    <p className="text-sm text-muted-foreground">Downloadable resources and references</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Practice Exercises</h4>
                    <p className="text-sm text-muted-foreground">Interactive coding and practical exercises</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Discussion Forum</h4>
                    <p className="text-sm text-muted-foreground">Connect with instructors and other students</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Certificates</h4>
                    <p className="text-sm text-muted-foreground">Completion certificates upon finishing</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}