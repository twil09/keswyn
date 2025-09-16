import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, UserCheck, Shield, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
}

export function UserManager() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      // Get all profiles using a secure approach that respects RLS and doesn't expose sensitive data
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, role, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // For each profile, get safe data using the secure function
      const profilesWithSafeData = await Promise.all(
        (data || []).map(async (profile) => {
          try {
            const { data: safeProfile } = await supabase
              .rpc('get_safe_profile', { target_user_id: profile.user_id })
              .single();
            
            return {
              id: profile.id,
              user_id: profile.user_id,
              full_name: safeProfile?.full_name || 'Protected',
              email: safeProfile?.email || 'Protected',
              role: profile.role,
              created_at: profile.created_at
            };
          } catch {
            // If we can't access the safe profile data, return protected info
            return {
              id: profile.id,
              user_id: profile.user_id,
              full_name: 'Protected',
              email: 'Protected', 
              role: profile.role,
              created_at: profile.created_at
            };
          }
        })
      );
      
      setProfiles(profilesWithSafeData);
    } catch (error: any) {
      toast({
        title: "Error fetching users", 
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const requestRoleChange = async (userId: string, newRole: 'admin' | 'teacher' | 'student') => {
    try {
      // Get current user to identify the requester
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Request the role change using the secure function
      const { data: requestId, error } = await supabase
        .rpc('request_role_change', {
          _target_user_id: userId,
          _new_role: newRole,
          _requested_by: user.id
        });

      if (error) throw error;

      // Send the email notification
      const { error: emailError } = await supabase.functions.invoke('send-role-change-email', {
        body: { requestId }
      });

      if (emailError) {
        // Don't fail the whole request if email fails, just warn
        console.warn('Email notification failed:', emailError);
        toast({
          title: "Role change requested",
          description: `Role change request submitted (email notification failed: ${emailError.message})`,
          variant: "default",
        });
      } else {
        toast({
          title: "Role change requested",
          description: `Role change request has been submitted and verification emails have been sent to authorized approvers.`,
        });
      }

      setSelectedUser(null);
    } catch (error: any) {
      toast({
        title: "Error requesting role change",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const sendTestEmail = async () => {
    setSendingTestEmail(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke('send-test-role-email', {
        headers: {
          Authorization: `Bearer ${await supabase.auth.getSession().then(({ data }) => data.session?.access_token)}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Test email sent",
        description: "A test role change email has been sent to your email address.",
      });
    } catch (error: any) {
      toast({
        title: "Error sending test email",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSendingTestEmail(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'teacher':
        return 'secondary';
      case 'student':
        return 'default';
      default:
        return 'outline';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'teacher':
        return <UserCheck className="h-4 w-4" />;
      case 'student':
        return <Users className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-muted-foreground">Manage user roles and permissions</p>
        </div>
        <Button
          onClick={sendTestEmail}
          disabled={sendingTestEmail}
          variant="outline"
          size="sm"
        >
          <Mail className="w-4 h-4 mr-2" />
          {sendingTestEmail ? 'Sending...' : 'Send Test Email'}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profiles.length}</div>
            <p className="text-xs text-muted-foreground">Registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {profiles.filter(p => p.role === 'admin').length}
            </div>
            <p className="text-xs text-muted-foreground">Administrator accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teachers</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {profiles.filter(p => p.role === 'teacher').length}
            </div>
            <p className="text-xs text-muted-foreground">Teacher accounts</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Manage user roles and permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell className="font-medium">
                    {profile.full_name || 'Unknown'}
                  </TableCell>
                  <TableCell>{profile.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleColor(profile.role) as any} className="flex items-center gap-1 w-fit">
                      {getRoleIcon(profile.role)}
                      {profile.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(profile.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedUser(profile)}
                        >
                          Edit Role
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Request Role Change</DialogTitle>
                          <DialogDescription>
                            Request a role change for {profile.full_name || profile.email}. This will send a verification email to authorized approvers.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-medium mb-2">Current Role:</p>
                            <Badge variant={getRoleColor(profile.role) as any} className="flex items-center gap-1 w-fit">
                              {getRoleIcon(profile.role)}
                              {profile.role}
                            </Badge>
                          </div>

                          <div className="space-y-2">
                            <p className="text-sm font-medium">New Role:</p>
                            <Select onValueChange={(value) => requestRoleChange(profile.user_id, value as 'admin' | 'teacher' | 'student')}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select new role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="free_student">Free Student</SelectItem>
                                <SelectItem value="premium_student">Premium Student</SelectItem>
                                <SelectItem value="free_teacher">Free Teacher</SelectItem>
                                <SelectItem value="premium_teacher">Premium Teacher</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="super_admin">Super Admin</SelectItem>
                                <SelectItem value="owner">Owner</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}