import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FileUpload } from './FileUpload';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Send } from 'lucide-react';

interface SubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stepId: string;
  stepTitle: string;
  onSubmissionComplete: () => void;
}

export function SubmissionDialog({ 
  open, 
  onOpenChange, 
  stepId, 
  stepTitle, 
  onSubmissionComplete 
}: SubmissionDialogProps) {
  const [content, setContent] = useState('');
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleFileUploaded = (fileUrl: string, fileName: string) => {
    setFileUrls(prev => [...prev, fileUrl]);
    setFileNames(prev => [...prev, fileName]);
  };

  const handleSubmit = async () => {
    if (!content.trim() && fileUrls.length === 0) {
      toast({
        title: "Submission required",
        description: "Please provide either text content or upload a file.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Create submission record
      const submissionData = {
        step_id: stepId,
        student_id: profile.id,
        content: content.trim() || null,
        file_url: fileUrls.length > 0 ? fileUrls[0] : null, // For now, store first file
        status: 'pending'
      };

      const { error } = await supabase
        .from('submissions')
        .insert([submissionData]);

      if (error) throw error;

      toast({
        title: "Submission successful",
        description: "Your work has been submitted for review.",
      });

      // Reset form and close dialog
      setContent('');
      setFileUrls([]);
      setFileNames([]);
      onOpenChange(false);
      onSubmissionComplete();

    } catch (error: any) {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit Assignment</DialogTitle>
          <DialogDescription>
            Submit your work for: {stepTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="content">Written Response (Optional)</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Provide any written explanation, notes, or answers here..."
              rows={6}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>File Upload</Label>
            <FileUpload
              onFileUploaded={handleFileUploaded}
              stepId={stepId}
              maxFiles={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || (!content.trim() && fileUrls.length === 0)}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Assignment
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}