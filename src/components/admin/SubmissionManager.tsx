import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, CheckCircle, XCircle, FileText, Download, Star } from 'lucide-react';
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
  reviewed_at: string | null;
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
  const [reviewData, setReviewData] = useState({ grade: 'U', feedback: '' });
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

      // Convert grade to number (U = null, 1-9 = number)
      const gradeValue = reviewData.grade === 'U' ? null : parseInt(reviewData.grade);

      const { error } = await supabase
        .from('submissions')
        .update({
          status,
          grade: gradeValue,
          feedback: reviewData.feedback,
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', submissionId);

      if (error) throw error;

      // Send email notification
      if (selectedSubmission) {
        try {
          await supabase.functions.invoke('send-submission-feedback', {
            body: {
              studentEmail: selectedSubmission.student.email,
              studentName: selectedSubmission.student.full_name,
              stepTitle: selectedSubmission.step.title,
              courseTitle: selectedSubmission.step.module.course.title,
              grade: reviewData.grade,
              feedback: reviewData.feedback,
              status: status
            }
          });
        } catch (emailError) {
          console.error('Error sending email:', emailError);
          // Don't fail the whole operation if email fails
        }
      }

      toast({
        title: "Submission reviewed",
        description: `Submission has been ${status} with grade ${reviewData.grade}. Email notification sent.`,
      });

      setSelectedSubmission(null);
      setReviewData({ grade: 'U', feedback: '' });
      fetchSubmissions();
    } catch (error: any) {
      toast({
        title: "Error reviewing submission",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const downloadFile = async (fileUrl: string, fileName: string) => {
    try {
      // Extract the full file path from the storage URL
      // The URL format is: https://[project].supabase.co/storage/v1/object/public/submissions/[full_path]
      // or https://[project].supabase.co/storage/v1/object/sign/submissions/[full_path]?token=...
      const url = new URL(fileUrl);
      const pathParts = url.pathname.split('/');
      
      // Find the index where 'submissions' appears and get everything after it
      const submissionsIndex = pathParts.findIndex(part => part === 'submissions');
      if (submissionsIndex === -1) {
        throw new Error('Invalid file URL format');
      }
      
      // Get the full path after 'submissions/'
      const filePath = pathParts.slice(submissionsIndex + 1).join('/');
      
      const { data, error } = await supabase.storage
        .from('submissions')
        .download(filePath);

      if (error) throw error;

      // Create download link
      const url2 = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url2;
      a.download = fileName || 'submission-file';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url2);
      document.body.removeChild(a);

      toast({
        title: "File downloaded",
        description: "The submission file has been downloaded.",
      });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatGrade = (grade: number | null) => {
    if (grade === null) return 'U';
    return grade.toString();
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
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-1 flex items-center gap-2"
                        onClick={() => downloadFile(submission.file_url!, `submission-${submission.id}`)}
                      >
                        <Download className="h-3 w-3" />
                        Download File
                      </Button>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {submission.status === 'approved' && submission.reviewed_at ? (
                        <>Reviewed on {new Date(submission.reviewed_at).toLocaleDateString()}</>
                      ) : (
                        <>Submitted on {new Date(submission.submitted_at).toLocaleDateString()}</>
                      )}
                    </p>
                    {submission.status === 'pending' && (
                      <Button
                        onClick={() => {
                          setSelectedSubmission(submission);
                          setReviewData({ 
                            grade: formatGrade(submission.grade), 
                            feedback: submission.feedback || '' 
                          });
                        }}
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Star className="h-3 w-3" />
                        Grade & Review
                      </Button>
                    )}
                  </div>

                  {submission.feedback && (
                    <div className="border-t pt-4">
                      <Label className="text-sm font-medium">Feedback:</Label>
                      <p className="mt-1 text-sm">{submission.feedback}</p>
                      {submission.grade !== null && (
                        <p className="text-sm font-medium mt-2 flex items-center gap-2">
                          <Star className="h-3 w-3" />
                          Grade: {formatGrade(submission.grade)}/9
                        </p>                      
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
            <DialogTitle>Grade & Review Submission</DialogTitle>
            <DialogDescription>
              Provide feedback and grade for this submission (U = Ungraded, 1-9 scale)
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
                {selectedSubmission.file_url && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2 flex items-center gap-2"
                    onClick={() => downloadFile(selectedSubmission.file_url!, `submission-${selectedSubmission.id}`)}
                  >
                    <Download className="h-3 w-3" />
                    Download Attached File
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="grade">Grade</Label>
                <Select value={reviewData.grade} onValueChange={(value) => setReviewData({ ...reviewData, grade: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="U">U (Ungraded)</SelectItem>
                    <SelectItem value="1">1 (Lowest)</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="6">6</SelectItem>
                    <SelectItem value="7">7</SelectItem>
                    <SelectItem value="8">8</SelectItem>
                    <SelectItem value="9">9 (Highest)</SelectItem>
                  </SelectContent>
                </Select>
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