'use client';

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Camera, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateMember } from '@/hooks/use-api';
import { useUploadImage } from '@/hooks/use-upload';
import { getApiErrorMessage } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddMemberDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const createMember = useCreateMember();
  const uploadImage = useUploadImage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    gender: '' as '' | 'male' | 'female',
    birthDate: '',
    notes: '',
  });

  const reset = () => {
    setForm({ fullName: '', phone: '', gender: '', birthDate: '', notes: '' });
    setPhotoUrl('');
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadImage.mutate(file, {
      onSuccess: (url) => setPhotoUrl(url),
      onError: (err) => toast.error(getApiErrorMessage(err)),
    });
  };

  const close = () => {
    reset();
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      fullName: form.fullName,
      phone: form.phone,
    };
    if (form.gender) payload.gender = form.gender;
    if (form.birthDate) payload.birthDate = form.birthDate;
    if (form.notes) payload.notes = form.notes;
    if (photoUrl) payload.photoUrl = photoUrl;

    createMember.mutate(payload, {
      onSuccess: () => {
        toast.success(t('members.createSuccess'));
        close();
      },
      onError: (err) => toast.error(getApiErrorMessage(err)),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('members.addMember')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo upload */}
          <div className="flex flex-col items-center gap-3">
            <Avatar className="h-24 w-24 border-2 border-dashed border-muted-foreground/30">
              {photoUrl && <AvatarImage src={photoUrl} />}
              <AvatarFallback className="bg-muted">
                <Camera className="h-8 w-8 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelect}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={uploadImage.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadImage.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {t('members.addMember')}
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">{t('members.fullName')}</Label>
            <Input
              id="fullName"
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t('members.phone')}</Label>
            <Input
              id="phone"
              dir="ltr"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="01XXXXXXXXX"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('members.gender')}</Label>
              <Select
                value={form.gender}
                onValueChange={(v) => setForm((f) => ({ ...f, gender: v as 'male' | 'female' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('members.gender')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t('members.male')}</SelectItem>
                  <SelectItem value="female">{t('members.female')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthDate">{t('members.birthDate')}</Label>
              <Input
                id="birthDate"
                type="date"
                value={form.birthDate}
                onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">{t('members.notes')}</Label>
            <Input
              id="notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={createMember.isPending}>
              {createMember.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
