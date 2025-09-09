import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, CheckCircle, XCircle, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Submission {
  id: string;
  content: string;
  file_url: string | null;
  status: string;
  grade: number | null;
  feedback: string | null;
  submitted_at: string;
  student: {
    full_name: string;
    email: string;
  };
  step: {
    title: string;
    module: {
      title: string;
      course: {
        title: string;
      };
    };
  };
}

export function SubmissionManager() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [reviewData, setReviewData] = useState({ grade: '', feedback: '' });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          *,
          student:profiles!submissions_student_id_fkey(full_name, email),
          step:steps(
            title,
            module:modules(
              title,
              course:courses(title)
            )
          )
        `)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching submissions",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (submissionId: string, status: 'approved' | 'rejected') => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { error } = await supabase
        .from('submissions')
        .update({
          status,
          grade: reviewData.grade ? parseInt(reviewData.grade) : null,
          feedback: reviewData.feedback,
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', submissionId);

      if (error) throw error;

      toast({
        title: "Submission reviewed",
        description: `Submission has been ${status}.`,
      });

      setSelectedSubmission(null);
      setReviewData({ grade: '', feedback: '' });
      fetchSubmissions();
    } catch (error: any) {
      toast({
        title: "Error reviewing submission",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'default';
      case 'approved':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading submissions...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Submission Management</h2>
        <p className="text-muted-foreground">Review and grade student submissions</p>
      </div>

      <div className="grid gap-4">
        {submissions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No submissions yet</h3>
              <p className="text-muted-foreground">
                Student submissions will appear here when they submit their work.
              </p>
            </CardContent>
          </Card>
        ) : (
          submissions.map((submission) => (
            <Card key={submission.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {submission.step.module.course.title} - {submission.step.title}
                    </CardTitle>
                    <CardDescription>
                      Submitted by {submission.student.full_name} ({submission.student.email})
                    </CardDescription>
                  </div>
                  <Badge variant={getStatusColor(submission.status) as any} className="flex items-center gap-1">
                    {getStatusIcon(submission.status)}
                    {submission.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Submission Content:</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {submission.content || 'No text content provided'}
                    </p>
                  </div>
                  
                  {submission.file_url && (
                    <div>
                      <Label className="text-sm font-medium">Attached File:</Label>
                      <Button variant="outline" size="sm" className="mt-1">
                        View File
                      </Button>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Submitted on {new Date(submission.submitted_at).toLocaleDateString()}
                    </p>
                    {submission.status === 'pending' && (
                      <Button
                        onClick={() => setSelectedSubmission(submission)}
                        size="sm"
                      >
                        Review
                      </Button>
                    )}
                  </div>

                  {submission.feedback && (
                    <div className="border-t pt-4">
                      <Label className="text-sm font-medium">Feedback:</Label>
                      <p className="mt-1 text-sm">{submission.feedback}</p>
                      {submission.grade && (
                        <p className="text-sm font-medium mt-2">Grade: {submission.grade}/100</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Submission</DialogTitle>
            <DialogDescription>
              Provide feedback and grade for this submission
            </DialogDescription>
          </DialogHeader>
          
          {selectedSubmission && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Student:</Label>
                <p className="text-sm">{selectedSubmission.student.full_name}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Assignment:</Label>
                <p className="text-sm">{selectedSubmission.step.title}</p>
              </div>

              <div>
                <Label className="text-sm font-medium">Submission:</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedSubmission.content || 'No text content provided'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="grade">Grade (0-100)</Label>
                <Input
                  id="grade"
                  type="number"
                  min="0"
                  max="100"
                  value={reviewData.grade}
                  onChange={(e) => setReviewData({ ...reviewData, grade: e.target.value })}
                  placeholder="Enter grade"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback">Feedback</Label>
                <Textarea
                  id="feedback"
                  value={reviewData.feedback}
                  onChange={(e) => setReviewData({ ...reviewData, feedback: e.target.value })}
                  placeholder="Provide feedback for the student"
                  rows={4}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedSubmission(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleReview(selectedSubmission.id, 'rejected')}
                >
                  Reject
                </Button>
                <Button
                  onClick={() => handleReview(selectedSubmission.id, 'approved')}
                >
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}