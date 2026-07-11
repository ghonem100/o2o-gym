'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dumbbell, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LanguageToggle } from '@/components/layout/language-toggle';
import { useLogin } from '@/hooks/use-auth';
import { getApiErrorMessage } from '@/lib/api';
import { useGymContext } from '@/providers/slug-context';

export default function GymLoginPage() {
  const { t, i18n } = useTranslation();
  const { slug, gymName, gymNameAr } = useGymContext();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();

  const displayName = i18n.language === 'ar' ? gymNameAr || gymName : gymName;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(
      { username, password, gymSlug: slug },
      { onError: (err) => toast.error(getApiErrorMessage(err)) }
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/20 p-4">
      <div className="absolute top-4 end-4">
        <LanguageToggle />
      </div>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Dumbbell className="h-9 w-9" />
          </div>
          <CardTitle className="text-2xl">{displayName}</CardTitle>
          <CardDescription>{t('auth.login')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t('auth.username')}</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={login.isPending}>
              {login.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : t('auth.loginButton')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
