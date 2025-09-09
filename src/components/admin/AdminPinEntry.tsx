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

  // Simple hash function for PIN security
  const hashPin = async (pin: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + "salt_key_" + pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isFirstTime) {
        // Setting up new pin
        if (newPin !== confirmPin) {
          setError('Pins do not match');
          setLoading(false);
          return;
        }
        
        if (newPin.length < 4) {
          setError('Pin must be at least 4 digits');
          setLoading(false);
          return;
        }

        const hashedPin = await hashPin(newPin);
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            admin_pin: hashedPin,
            pin_set_at: new Date().toISOString()
          })
          .eq('user_id', user?.id);

        if (updateError) throw updateError;
        onPinVerified();
      } else {
        // Verifying existing pin
        const { data } = await supabase
          .from('profiles')
          .select('admin_pin')
          .eq('user_id', user?.id)
          .single();

        const hashedInputPin = await hashPin(pin);
        if (data?.admin_pin === hashedInputPin) {
          onPinVerified();
        } else {
          setError('Incorrect pin');
        }
      }
    } catch (error) {
      setError('Failed to process pin');
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
                    placeholder="Enter 4+ digit pin"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    required
                    minLength={4}
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
                    minLength={4}
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