import { Navigate } from "react-router-dom";
import { Dashboard } from "@/components/Dashboard";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <Dashboard 
      userRole={(userRole?.includes('student') ? 'student' : 'teacher')}
      userName={user.email || 'User'}
      subscriptionTier={userRole?.includes('premium') ? 'teacher' : 'free'}
    />
  );
};

export default Index;
