import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, User, BookOpen, Brain } from "lucide-react";

interface AuthFormProps {
  onAuth: (userData: { name: string; email: string; role: "student" | "teacher" }) => void;
}

export function AuthForm({ onAuth }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [selectedRole, setSelectedRole] = useState<"student" | "teacher" | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    
    // Simulate authentication
    onAuth({
      name: formData.name || formData.email.split("@")[0],
      email: formData.email,
      role: selectedRole
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        {/* Logo/Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4">
            <Brain className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">EduPlatform</h1>
          <p className="text-muted-foreground">Transform your learning journey</p>
        </div>

        <Card className="shadow-soft">
          <CardHeader className="text-center">
            <CardTitle>{isLogin ? "Welcome Back" : "Create Account"}</CardTitle>
            <CardDescription>
              {isLogin ? "Sign in to continue your learning" : "Join thousands of learners worldwide"}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Role Selection */}
            {!isLogin && (
              <div className="space-y-3">
                <Label>I am a:</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={selectedRole === "student" ? "student" : "outline"}
                    className="h-20 flex-col gap-2"
                    onClick={() => setSelectedRole("student")}
                  >
                    <GraduationCap className="w-6 h-6" />
                    <span>Student</span>
                  </Button>
                  <Button
                    type="button"
                    variant={selectedRole === "teacher" ? "teacher" : "outline"}
                    className="h-20 flex-col gap-2"
                    onClick={() => setSelectedRole("teacher")}
                  >
                    <User className="w-6 h-6" />
                    <span>Teacher</span>
                  </Button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    required={!isLogin}
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={!isLogin && !selectedRole}
              >
                {isLogin ? "Sign In" : "Create Account"}
              </Button>
            </form>

            <div className="text-center">
              <Button
                variant="link"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setSelectedRole(null);
                }}
              >
                {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
              </Button>
            </div>

            {/* Demo Accounts */}
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm text-muted-foreground text-center">Quick Demo:</p>
              <div className="grid gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAuth({ name: "Demo Student", email: "student@demo.com", role: "student" })}
                  className="w-full justify-start gap-2"
                >
                  <GraduationCap className="w-4 h-4 text-student-accent" />
                  Try as Student
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAuth({ name: "Demo Teacher", email: "teacher@demo.com", role: "teacher" })}
                  className="w-full justify-start gap-2"
                >
                  <User className="w-4 h-4 text-teacher-accent" />
                  Try as Teacher
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features Preview */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="space-y-2">
            <BookOpen className="w-8 h-8 mx-auto text-primary" />
            <h3 className="font-semibold">Rich Content</h3>
            <p className="text-sm text-muted-foreground">Interactive lessons and tutorials</p>
          </div>
          <div className="space-y-2">
            <Brain className="w-8 h-8 mx-auto text-primary" />
            <h3 className="font-semibold">AI-Powered</h3>
            <p className="text-sm text-muted-foreground">Personalized learning paths</p>
          </div>
        </div>
      </div>
    </div>
  );
}