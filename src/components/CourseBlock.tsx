import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Clock, Star, Users } from "lucide-react";

interface CourseBlockProps {
  id: string;
  title: string;
  description: string;
  progress?: number;
  duration?: string;
  difficulty?: "Beginner" | "Intermediate" | "Advanced";
  students?: number;
  rating?: number;
  category: "coding" | "ai" | "cybersecurity" | "design" | "business";
  isLocked?: boolean;
  onClick?: () => void;
}

const categoryColors = {
  coding: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  ai: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  cybersecurity: "bg-red-500/10 text-red-400 border-red-500/20",
  design: "bg-green-500/10 text-green-400 border-green-500/20",
  business: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

export function CourseBlock({
  id,
  title,
  description,
  progress,
  duration,
  difficulty,
  students,
  rating,
  category,
  isLocked = false,
  onClick
}: CourseBlockProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/course/${id}`);
    }
  };
  return (
    <Card 
      className={`group cursor-pointer transition-all duration-300 hover:shadow-course hover:scale-105 bg-course-block border-border/50 ${
        isLocked ? "opacity-60" : ""
      }`}
      onClick={isLocked ? undefined : handleClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Badge className={categoryColors[category]} variant="outline">
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Badge>
            <CardTitle className="text-lg group-hover:text-primary transition-colors">
              {title}
            </CardTitle>
          </div>
          {rating && (
            <div className="flex items-center gap-1 text-yellow-400">
              <Star className="w-4 h-4 fill-current" />
              <span className="text-sm">{rating}</span>
            </div>
          )}
        </div>
        <CardDescription className="text-muted-foreground">
          {description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {progress !== undefined && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {duration && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{duration}</span>
            </div>
          )}
          
          {students && (
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{students.toLocaleString()}</span>
            </div>
          )}
          
          {difficulty && (
            <Badge 
              variant="outline" 
              className={`text-xs ${
                difficulty === "Beginner" ? "border-green-500/30 text-green-400" :
                difficulty === "Intermediate" ? "border-yellow-500/30 text-yellow-400" :
                "border-red-500/30 text-red-400"
              }`}
            >
              {difficulty}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="w-4 h-4" />
          <span>
            {isLocked ? "Unlock with subscription" : "Start Learning"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}