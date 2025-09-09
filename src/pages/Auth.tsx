import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { GraduationCap, BookOpen, Zap, User, Users } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, signIn, signUp } = useAuth();

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      await signIn(email, password);
    } else {
      await signUp(email, password, fullName);
    }

    setLoading(false);
  };

  const handleDemoLogin = async (role: 'student' | 'teacher') => {
    setLoading(true);
    // Demo accounts - in a real app, these would be pre-created accounts
    const demoEmail = role === 'student' ? 'student@demo.com' : 'teacher@demo.com';
    const demoPassword = 'demo123';
    await signIn(demoEmail, demoPassword);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-800 flex flex-col items-center justify-center p-4">
      {/* Header with logo and title */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <GraduationCap className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">EduPlatform</h1>
        <p className="text-gray-300">Transform your learning journey</p>
      </div>

      {/* Main auth card */}
      <Card className="w-full max-w-md bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl text-white">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </CardTitle>
          <CardDescription className="text-gray-300">
            {isLogin 
              ? 'Sign in to continue your learning'
              : 'Enter your details to create a new account'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-white">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-gray-900/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-primary"
                  required
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-gray-900/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-primary"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-gray-900/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-primary"
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors" 
              disabled={loading}
            >
              {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Sign Up')}
            </Button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
            >
              {isLogin 
                ? "Need an account? Sign up" 
                : 'Already have an account? Sign in'
              }
            </button>
          </div>

          {isLogin && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-gray-800/50 px-2 text-gray-400">Quick Demo:</span>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-transparent border-gray-600 text-white hover:bg-gray-700/50"
                  onClick={() => handleDemoLogin('student')}
                  disabled={loading}
                >
                  <User className="w-4 h-4 mr-2" />
                  Try as Student
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-transparent border-gray-600 text-white hover:bg-gray-700/50"
                  onClick={() => handleDemoLogin('teacher')}
                  disabled={loading}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Try as Teacher
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Features section */}
      <div className="mt-12 grid grid-cols-2 gap-8 max-w-md w-full">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-6 h-6 text-blue-400" />
          </div>
          <h3 className="text-white font-medium mb-1">Rich Content</h3>
          <p className="text-gray-400 text-sm">Interactive lessons and tutorials</p>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Zap className="w-6 h-6 text-blue-400" />
          </div>
          <h3 className="text-white font-medium mb-1">AI-Powered</h3>
          <p className="text-gray-400 text-sm">Personalized learning paths</p>
        </div>
      </div>
    </div>
  );
}