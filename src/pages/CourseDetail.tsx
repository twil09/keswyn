import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Play, CheckCircle, Lock, Clock, Users, Star, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface CourseStep {
  id: string;
  title: string;
  description: string;
  duration: string;
  type: "video" | "reading" | "practice" | "quiz";
  isCompleted: boolean;
  isLocked: boolean;
}

interface CourseModule {
  id: string;
  title: string;
  description: string;
  duration: string;
  steps: CourseStep[];
}

const courseData: Record<string, any> = {
  "python-fundamentals": {
    title: "Python Fundamentals",
    description: "Master the basics of Python programming with hands-on exercises and real-world projects.",
    category: "coding",
    difficulty: "Beginner",
    duration: "8 weeks",
    students: 15420,
    rating: 4.8,
    progress: 0,
    modules: [
      {
        id: "intro",
        title: "Introduction to Python",
        description: "Get started with Python syntax and basic concepts",
        duration: "2 hours",
        steps: [
          {
            id: "setup",
            title: "Setting up Python Environment",
            description: "Install Python and set up your development environment",
            duration: "15 min",
            type: "video",
            isCompleted: false,
            isLocked: false
          },
          {
            id: "syntax",
            title: "Python Syntax Basics",
            description: "Learn about variables, data types, and basic operations",
            duration: "30 min",
            type: "reading",
            isCompleted: false,
            isLocked: false
          },
          {
            id: "practice1",
            title: "First Python Program",
            description: "Write and run your first Python program",
            duration: "45 min",
            type: "practice",
            isCompleted: false,
            isLocked: false
          }
        ]
      },
      {
        id: "control",
        title: "Control Structures",
        description: "Master if statements, loops, and conditional logic",
        duration: "3 hours",
        steps: [
          {
            id: "conditions",
            title: "If Statements and Conditions",
            description: "Learn how to make decisions in your code",
            duration: "45 min",
            type: "video",
            isCompleted: false,
            isLocked: true
          },
          {
            id: "loops",
            title: "For and While Loops",
            description: "Understand iteration and repetition in Python",
            duration: "60 min",
            type: "video",
            isCompleted: false,
            isLocked: true
          }
        ]
      }
    ]
  },
  "ethical-hacking": {
    title: "Ethical Hacking Foundations",
    description: "Learn cybersecurity fundamentals through hands-on penetration testing scenarios.",
    category: "cybersecurity",
    difficulty: "Intermediate",
    duration: "12 weeks",
    students: 8934,
    rating: 4.9,
    progress: 0,
    modules: [
      {
        id: "recon",
        title: "Reconnaissance & Information Gathering",
        description: "Learn how to gather information about targets legally and ethically",
        duration: "4 hours",
        steps: [
          {
            id: "passive-recon",
            title: "Passive Reconnaissance",
            description: "Gather information without directly interacting with the target",
            duration: "90 min",
            type: "video",
            isCompleted: false,
            isLocked: false
          },
          {
            id: "active-recon",
            title: "Active Reconnaissance",
            description: "Direct information gathering techniques",
            duration: "120 min",
            type: "practice",
            isCompleted: false,
            isLocked: false
          }
        ]
      }
    ]
  }
};

const CourseDetail = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  
  const course = courseData[courseId || ""];
  
  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Course not found</h1>
          <Button onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const totalSteps = course.modules.reduce((acc: number, module: CourseModule) => acc + module.steps.length, 0);
  const completedSteps = course.modules.reduce(
    (acc: number, module: CourseModule) => acc + module.steps.filter((step: CourseStep) => step.isCompleted).length,
    0
  );
  const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const getCategoryColor = (category: string) => {
    const colors = {
      coding: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      cybersecurity: "bg-red-500/20 text-red-400 border-red-500/30",
      ai: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      design: "bg-pink-500/20 text-pink-400 border-pink-500/30",
      business: "bg-green-500/20 text-green-400 border-green-500/30"
    };
    return colors[category as keyof typeof colors] || colors.coding;
  };

  const getStepIcon = (type: string, isCompleted: boolean, isLocked: boolean) => {
    if (isLocked) return <Lock className="h-4 w-4 text-muted-foreground" />;
    if (isCompleted) return <CheckCircle className="h-4 w-4 text-green-400" />;
    
    switch (type) {
      case "video": return <Play className="h-4 w-4 text-primary" />;
      case "practice": return <Award className="h-4 w-4 text-primary" />;
      default: return <Play className="h-4 w-4 text-primary" />;
    }
  };

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
              <span className="text-sm">{course.duration}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{course.students.toLocaleString()} students</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-400" />
              <span className="text-sm">{course.rating}/5</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{course.difficulty}</span>
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
                    <span>Prepare for professional certifications</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Course Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Basic computer literacy</li>
                  <li>• Access to a computer with internet connection</li>
                  <li>• No prior experience required</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="curriculum" className="space-y-6">
            <div className="space-y-4">
              {course.modules.map((module: CourseModule, moduleIndex: number) => (
                <Card key={module.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          Module {moduleIndex + 1}: {module.title}
                        </CardTitle>
                        <CardDescription>{module.description}</CardDescription>
                      </div>
                      <Badge variant="secondary">{module.duration}</Badge>
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
                            {module.steps.map((step: CourseStep, stepIndex: number) => (
                              <div
                                key={step.id}
                                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                  step.isLocked 
                                    ? "bg-muted/30 border-muted" 
                                    : "bg-card border-border hover:bg-muted/50 cursor-pointer"
                                }`}
                              >
                                {getStepIcon(step.type, step.isCompleted, step.isLocked)}
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className={`font-medium ${step.isLocked ? "text-muted-foreground" : "text-foreground"}`}>
                                      {stepIndex + 1}. {step.title}
                                    </h4>
                                    <Badge variant="outline" className="text-xs">
                                      {step.type}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{step.description}</p>
                                </div>
                                <span className="text-sm text-muted-foreground">{step.duration}</span>
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
                    <h4 className="font-medium mb-2">Documentation</h4>
                    <p className="text-sm text-muted-foreground">Official documentation and references</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Practice Labs</h4>
                    <p className="text-sm text-muted-foreground">Interactive coding environments</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Community</h4>
                    <p className="text-sm text-muted-foreground">Connect with other learners</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Certificates</h4>
                    <p className="text-sm text-muted-foreground">Downloadable completion certificates</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CourseDetail;