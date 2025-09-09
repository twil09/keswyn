import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, 
  LogOut, 
  User, 
  CreditCard, 
  Accessibility, 
  Volume2,
  Eye,
  Type,
  X
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsMenu({ isOpen, onClose }: SettingsMenuProps) {
  const { signOut, userRole, subscriptionTier } = useAuth();
  const navigate = useNavigate();
  const [fontSize, setFontSize] = useState([16]);
  const [highContrast, setHighContrast] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
    onClose();
  };

  const handleManageAccount = () => {
    navigate('/subscription');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Settings Panel */}
      <Card className="relative w-full max-w-md mx-4 bg-card border shadow-glow animate-scale-in">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Settings
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Account Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Account</h3>
            
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-auto p-3"
              onClick={handleManageAccount}
            >
              <CreditCard className="w-4 h-4" />
              <div className="flex-1 text-left">
                <div className="font-medium">Manage Subscription</div>
                <div className="text-sm text-muted-foreground">
                  Current: {subscriptionTier || 'Free'}
                </div>
              </div>
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-auto p-3"
            >
              <User className="w-4 h-4" />
              <div className="flex-1 text-left">
                <div className="font-medium">Profile Settings</div>
                <div className="text-sm text-muted-foreground">
                  {userRole?.charAt(0).toUpperCase() + userRole?.slice(1)}
                </div>
              </div>
            </Button>
          </div>

          {/* Accessibility Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Accessibility className="w-4 h-4" />
              Accessibility
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">High Contrast</span>
                </div>
                <Switch
                  checked={highContrast}
                  onCheckedChange={setHighContrast}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  <span className="text-sm">Font Size</span>
                </div>
                <Slider
                  value={fontSize}
                  onValueChange={setFontSize}
                  min={12}
                  max={24}
                  step={1}
                  className="w-full"
                />
                <div className="text-xs text-muted-foreground text-center">
                  {fontSize[0]}px
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  <span className="text-sm">Sound Effects</span>
                </div>
                <Switch
                  checked={soundEnabled}
                  onCheckedChange={setSoundEnabled}
                />
              </div>
            </div>
          </div>

          {/* Sign Out */}
          <div className="pt-4 border-t">
            <Button
              variant="destructive"
              className="w-full gap-2"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}