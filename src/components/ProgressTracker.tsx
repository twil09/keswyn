import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ProgressTrackerProps {
  stepId: string;
  moduleId: string;
  courseId: string;
  onProgressUpdate?: () => void;
}

export function ProgressTracker({ 
  stepId, 
  moduleId, 
  courseId, 
  onProgressUpdate 
}: ProgressTrackerProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const markStepComplete = async () => {
    if (!user) return;

    try {
      // Get user's profile ID
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      // Check if progress already exists
      const { data: existingProgress } = await supabase
        .from('user_progress')
        .select('id, completed')
        .eq('user_id', profile.id)
        .eq('step_id', stepId)
        .single();

      if (existingProgress) {
        // Update existing progress
        const { error: updateError } = await supabase
          .from('user_progress')
          .update({
            completed: true,
            completed_at: new Date().toISOString()
          })
          .eq('id', existingProgress.id);

        if (updateError) throw updateError;
      } else {
        // Insert new progress record
        const { error: insertError } = await supabase
          .from('user_progress')
          .insert({
            user_id: profile.id,
            step_id: stepId,
            completed: true,
            completed_at: new Date().toISOString()
          });

        if (insertError) throw insertError;
      }

      // Check if user has completed all steps in the course
      await checkCourseCompletion(courseId, profile.id);

      onProgressUpdate?.();

      toast({
        title: "Progress saved",
        description: "Your progress has been saved successfully.",
      });
    } catch (error: any) {
      console.error('Error updating progress:', error);
      toast({
        title: "Error saving progress",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const checkCourseCompletion = async (courseId: string, userId: string) => {
    try {
      // Get total steps in course
      const { data: totalSteps, error: totalError } = await supabase
        .from('steps')
        .select('id')
        .eq('module_id', moduleId);

      if (totalError) throw totalError;

      // Get completed steps by user
      const { data: completedSteps, error: completedError } = await supabase
        .from('user_progress')
        .select('step_id')
        .eq('user_id', userId)
        .eq('completed', true);

      if (completedError) throw completedError;

      // If user completed all steps, trigger course completion update
      if (completedSteps?.length === totalSteps?.length) {
        await supabase.rpc('update_course_completion_rate', {
          _course_id: courseId
        });
      }
    } catch (error: any) {
      console.error('Error checking course completion:', error);
    }
  };

  return null; // This is a utility component, no UI
}

// Hook for tracking progress
export const useProgressTracker = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const markStepComplete = async (stepId: string, courseId?: string) => {
    if (!user) return false;

    try {
      // Get user's profile ID
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      // Check if progress already exists
      const { data: existingProgress } = await supabase
        .from('user_progress')
        .select('id, completed')
        .eq('user_id', profile.id)
        .eq('step_id', stepId)
        .single();

      if (existingProgress) {
        // Update existing progress
        const { error: updateError } = await supabase
          .from('user_progress')
          .update({
            completed: true,
            completed_at: new Date().toISOString()
          })
          .eq('id', existingProgress.id);

        if (updateError) throw updateError;
      } else {
        // Insert new progress record
        const { error: insertError } = await supabase
          .from('user_progress')
          .insert({
            user_id: profile.id,
            step_id: stepId,
            completed: true,
            completed_at: new Date().toISOString()
          });

        if (insertError) throw insertError;
      }

      // Update course completion rate if courseId provided
      if (courseId) {
        await supabase.rpc('update_course_completion_rate', {
          _course_id: courseId
        });
      }

      toast({
        title: "Progress saved",
        description: "Step marked as complete!",
      });

      return true;
    } catch (error: any) {
      console.error('Error updating progress:', error);
      toast({
        title: "Error saving progress",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const getUserProgress = async (courseId: string) => {
    if (!user) return null;

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      // Get user's progress for this course
      const { data, error } = await supabase
        .from('user_progress')
        .select(`
          step_id,
          completed,
          completed_at,
          steps (
            id,
            title,
            modules (
              course_id
            )
          )
        `)
        .eq('user_id', profile.id);

      if (error) throw error;

      // Filter progress for this specific course
      return data?.filter(progress => 
        progress.steps?.modules?.course_id === courseId
      ) || [];
    } catch (error: any) {
      console.error('Error fetching progress:', error);
      return null;
    }
  };

  return {
    markStepComplete,
    getUserProgress
  };
};