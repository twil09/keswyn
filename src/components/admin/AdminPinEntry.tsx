import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, Lock } from 'lucide-react';

interface AdminPinEntryProps {
  onPinVerified: () => void;
}

export function AdminPinEntry({ onPinVerified }: AdminPinEntryProps) {
  const { user } = useAuth();
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const checkExistingPin = async () => {
    if (!user?.id) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('admin_pin')
      .eq('user_id', user.id)
      .single();
    
    setIsFirstTime(!data?.admin_pin);
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isFirstTime) {
        // Setting up new pin with secure server-side bcrypt hashing
        if (newPin !== confirmPin) {
          setError('Pins do not match');
          setLoading(false);
          return;
        }
        
        if (newPin.length < 6) {
          setError('Pin must be at least 6 characters');
          setLoading(false);
          return;
        }

        // Use secure server-side PIN setting function
        const { data, error: rpcError } = await supabase.rpc('set_admin_pin_secure', {
          pin_text: newPin
        });

        if (rpcError) throw rpcError;
        onPinVerified();
      } else {
        // Verifying existing pin using secure server-side verification
        const { data } = await supabase
          .from('profiles')
          .select('admin_pin')
          .eq('user_id', user?.id)
          .single();

        if (!data?.admin_pin) {
          setError('No PIN set');
          setLoading(false);
          return;
        }

        // Use secure server-side PIN verification
        const { data: isValid, error: verifyError } = await supabase.rpc('verify_admin_pin_secure', {
          pin_text: pin,
          hashed_pin: data.admin_pin
        });

        if (verifyError) throw verifyError;

        if (isValid) {
          onPinVerified();
        } else {
          setError('Incorrect pin');
        }
      }
    } catch (error: any) {
      setError(error.message || 'Failed to process pin');
      console.error('Pin error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check for existing pin on component mount
  useEffect(() => {
    checkExistingPin();
  }, [user?.id]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Admin Access</CardTitle>
          <CardDescription>
            {isFirstTime 
              ? 'Set up your admin pin for future access'
              : 'Enter your admin pin to continue'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePinSubmit} className="space-y-4">
            {isFirstTime ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Create Admin Pin</label>
                  <Input
                    type="password"
                    placeholder="Enter 6+ character pin"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirm Pin</label>
                  <Input
                    type="password"
                    placeholder="Confirm your pin"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">Enter Admin Pin</label>
                <Input
                  type="password"
                  placeholder="Enter your pin"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  required
                />
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Processing...' : isFirstTime ? 'Set Pin' : 'Access Admin Panel'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}