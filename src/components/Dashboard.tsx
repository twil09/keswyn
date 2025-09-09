import { useState, useEffect } from "react";
import { CourseBlock } from "./CourseBlock";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { SettingsMenu } from "./SettingsMenu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  BookOpen, 
  Brain, 
  Shield, 
  Palette, 
  Briefcase, 
  Settings, 
  User,
  Crown,
  GraduationCap,
  UserCheck,
  Plus
} from "lucide-react";

interface DashboardProps {
  userRole: "student" | "teacher";
  userName: string;
  subscriptionTier: "free" | "student" | "teacher" | "personal";
}

// This will be replaced with real courses from the database

const subscriptionBadges = {
  free: { label: "Free", color: "bg-muted text-muted-foreground" },
  student: { label: "Student", color: "bg-student-accent text-white" },
  teacher: { label: "Teacher", color: "bg-teacher-accent text-white" },
  personal: { label: "Personal", color: "bg-primary text-primary-foreground" }
};

export function Dashboard({ userRole, userName, subscriptionTier }: DashboardProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin, userRole: authUserRole, subscriptionTier: userSubscriptionTier } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Course fetch error:', error);
        // If access is denied due to RLS, show empty courses for non-authenticated users
        if (error.code === 'PGRST301') {
          setCourses([]);
          setLoading(false);
          return;
        }
        throw error;
      }
      
      // Transform database courses to match the expected format
      const transformedCourses = (data || []).map(course => ({
        id: course.id,
        title: course.title,
        description: course.description || "",
        duration: course.duration || "Not specified",
        difficulty: course.difficulty || "Beginner",
        category: course.category || "general",
        students: Math.floor(Math.random() * 10000) + 1000, // Mock data
        rating: (Math.random() * 0.5 + 4.5).toFixed(1), // Mock rating between 4.5-5.0
        progress: Math.floor(Math.random() * 100), // Mock progress
        isLocked: course.is_premium && userSubscriptionTier !== 'premium' && userSubscriptionTier !== 'teacher'
      }));
      
      setCourses(transformedCourses);
    } catch (error: any) {
      console.error('Error fetching courses:', error);
      setCourses([]);
      toast({
        title: "Error fetching courses",
        description: "Unable to load courses. Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: "programming", name: "Programming", icon: BookOpen, color: "text-blue-400" },
    { id: "design", name: "Design", icon: Palette, color: "text-green-400" },
    { id: "marketing", name: "Marketing", icon: Brain, color: "text-purple-400" },
    { id: "business", name: "Business", icon: Briefcase, color: "text-orange-400" },
    { id: "science", name: "Science", icon: Shield, color: "text-red-400" },
    { id: "mathematics", name: "Mathematics", icon: BookOpen, color: "text-cyan-400" }
  ];

  const filteredCourses = selectedCategory 
    ? courses.filter(course => course.category === selectedCategory)
    : courses;

  const getRoleIcon = () => {
    if (authUserRole === 'super_admin' || authUserRole === 'admin') return Shield;
    if (authUserRole === 'premium_teacher' || authUserRole === 'free_teacher') return UserCheck;
    return GraduationCap;
  };
  const RoleIcon = getRoleIcon();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`w-10 h-10 rounded-full bg-primary/20 hover:bg-primary/30 transition-colors ${isAdmin ? 'cursor-pointer ring-2 ring-primary/50' : 'cursor-default'}`}
                  onClick={() => {
                    if (isAdmin) {
                      navigate('/admin');
                    }
                  }}
                  disabled={!isAdmin}
                >
                  <RoleIcon className="w-5 h-5 text-primary" />
                </Button>
                <div>
                  <h1 className="text-xl font-bold">Welcome back, {userName}</h1>
                  <div className="flex items-center gap-2">
                    <Badge className={subscriptionBadges[subscriptionTier].color}>
                      {subscriptionBadges[subscriptionTier].label}
                    </Badge>
                    <Badge variant="outline" className={userRole === "student" ? "border-student-accent text-student-accent" : "border-teacher-accent text-teacher-accent"}>
                      {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                    </Badge>
                    {isAdmin && (
                      <Badge variant="outline" className="border-red-500 text-red-500 text-xs">
                        Admin Access
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  onClick={() => navigate('/admin')}
                >
                  <Plus className="w-5 h-5" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="w-5 h-5" />
              </Button>
              <Button 
                variant="premium" 
                className="gap-2"
                onClick={() => navigate('/subscription')}
              >
                <Crown className="w-4 h-4" />
                Upgrade
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Courses in Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-sm text-muted-foreground">+2 from last week</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Study Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">47h</div>
              <p className="text-sm text-muted-foreground">This month</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Certificates Earned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2</div>
              <p className="text-sm text-muted-foreground">Python & Machine Learning</p>
            </CardContent>
          </Card>
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Explore Subjects</h2>
          <div className="flex flex-wrap gap-3">
            <Button
              variant={selectedCategory === null ? "default" : "ghost"}
              onClick={() => setSelectedCategory(null)}
              className="gap-2"
            >
              All Subjects
            </Button>
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "ghost"}
                  onClick={() => setSelectedCategory(category.id)}
                  className="gap-2"
                >
                  <Icon className={`w-4 h-4 ${category.color}`} />
                  {category.name}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Course Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-full mb-4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <Card className="p-8 text-center">
            <CardContent>
              <p className="text-muted-foreground">No courses available yet. {isAdmin && "Create your first course in the admin panel!"}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course, index) => (
              <CourseBlock
                key={course.id}
                {...course}
              />
            ))}
          </div>
        )}

        {subscriptionTier === "free" && (
          <Card className="mt-8 border-primary/20 bg-premium-gradient/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Unlock Full Access</h3>
                  <p className="text-muted-foreground">Get unlimited access to all courses and premium features</p>
                </div>
                <Button 
                  variant="premium" 
                  size="lg" 
                  className="gap-2"
                  onClick={() => navigate('/subscription')}
                >
                  <Crown className="w-4 h-4" />
                  Upgrade Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      <SettingsMenu 
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}