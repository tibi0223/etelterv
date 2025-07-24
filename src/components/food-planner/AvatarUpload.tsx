
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Camera, Upload, User } from 'lucide-react';
import { uploadAvatar } from '@/services/profileQueries';

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  userId: string;
  onAvatarUpdate: (newAvatarUrl: string) => void;
  userName?: string;
}

export function AvatarUpload({ currentAvatarUrl, userId, onAvatarUpdate, userName }: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Fájl típus ellenőrzése
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Hibás fájl típus",
        description: "Csak képfájlokat tölthetsz fel.",
        variant: "destructive"
      });
      return;
    }

    // Fájl méret ellenőrzése (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Túl nagy fájl",
        description: "A képfájl nem lehet nagyobb 5MB-nál.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      const avatarUrl = await uploadAvatar(userId, file);
      onAvatarUpdate(avatarUrl);
      toast({
        title: "Profilkép feltöltve! ✅",
        description: "A profilkép sikeresen frissítve lett.",
      });
    } catch (error) {
      console.error('Avatar feltöltési hiba:', error);
      toast({
        title: "Feltöltési hiba",
        description: "Nem sikerült feltölteni a profilképet.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative group">
        <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
          <AvatarImage src={currentAvatarUrl || undefined} alt="Profilkép" />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl font-bold">
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>
        
        <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <Camera className="w-6 h-6 text-white" />
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          {isUploading ? 'Feltöltés...' : 'Kép váltása'}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
