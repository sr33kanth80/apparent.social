import * as React from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, Mail, Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const GoogleIcon = (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
  <img src="https://svgl.app/library/google.svg" alt="" aria-hidden="true" {...props} />
);

const MicrosoftIcon = (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
  <img src="https://svgl.app/library/microsoft.svg" alt="" aria-hidden="true" {...props} />
);

const AppleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M17.05 12.31c-.03-2.82 2.3-4.17 2.4-4.24-1.31-1.91-3.34-2.17-4.06-2.2-1.73-.17-3.38 1.02-4.26 1.02-.88 0-2.24-.99-3.68-.96-1.9.03-3.64 1.1-4.62 2.8-1.97 3.42-.5 8.48 1.42 11.25.94 1.36 2.06 2.89 3.53 2.83 1.42-.06 1.96-.92 3.67-.92 1.72 0 2.2.92 3.7.89 1.53-.03 2.5-1.39 3.43-2.75 1.08-1.58 1.52-3.11 1.55-3.19-.03-.01-2.98-1.14-3.08-4.53ZM14.27 4.05c.78-.95 1.31-2.26 1.16-3.57-1.12.04-2.48.75-3.29 1.69-.72.83-1.36 2.17-1.18 3.45 1.24.1 2.52-.63 3.31-1.57Z" />
  </svg>
);

interface AuthFormProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  contextLabel?: string;
  contextItems?: string[];
  emailPlaceholder?: string;
  emailLinkLabel?: string;
  socialLabel?: string;
  submitLabel?: string;
  bypassLabel?: string;
  onEmailSubmit?: (data: { email: string; password?: string }) => void;
  onSocialSignIn?: (provider: 'google' | 'microsoft' | 'apple' | 'sso') => void;
  onEmailLink?: () => void;
  onBypass?: () => void;
}

const AuthForm = React.forwardRef<HTMLDivElement, AuthFormProps>(
  (
    {
      className,
      title = 'Sign in with email',
      description = 'Sign in to build your profile, publish launches, discover builders, and follow investor activity.',
      contextLabel,
      contextItems = [],
      emailPlaceholder = 'you@app.com',
      emailLinkLabel = 'Or email me a link',
      socialLabel = 'Sign in with',
      submitLabel = 'Sign In',
      bypassLabel,
      onEmailSubmit,
      onSocialSignIn,
      onEmailLink,
      onBypass,
      ...props
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);

    const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      onEmailSubmit?.({ email, password });
    };

    return (
      <Card
        ref={ref}
        className={cn('w-full max-w-md mx-auto border-0 bg-white/80 shadow-[0_18px_60px_rgba(0,0,0,0.06)]', className)}
        {...props}
      >
        <CardHeader className="text-left">
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {contextItems.length > 0 && (
              <div className="rounded-[18px] bg-muted/50 p-4">
                {contextLabel && (
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {contextLabel}
                  </p>
                )}
                <div className="space-y-2">
                  {contextItems.map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm text-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{socialLabel}</Label>
              <div className="grid grid-cols-4 gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="bg-muted/70 shadow-none hover:bg-muted"
                  onClick={() => onSocialSignIn?.('google')}
                >
                  <GoogleIcon className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="bg-muted/70 shadow-none hover:bg-muted"
                  onClick={() => onSocialSignIn?.('microsoft')}
                >
                  <MicrosoftIcon className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="bg-muted/70 shadow-none hover:bg-muted"
                  onClick={() => onSocialSignIn?.('apple')}
                >
                  <AppleIcon className="size-5" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="bg-muted/70 shadow-none hover:bg-muted"
                  onClick={() => onSocialSignIn?.('sso')}
                >
                  <KeyRound className="h-5 w-5" />
                  <span className="ml-1.5">SSO</span>
                </Button>
              </div>
            </div>

            <div className="flex justify-center text-xs uppercase">
              <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">or</span>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder={emailPlaceholder}
                    className="border-0 bg-muted/50 pl-9 shadow-none focus-visible:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a href="#" className="text-sm font-medium text-primary hover:underline">
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    className="border-0 bg-muted/50 pl-9 pr-10 shadow-none focus-visible:border-transparent"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full">
                {submitLabel}
              </Button>
              {onBypass && bypassLabel && (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full bg-amber-100 text-amber-950 shadow-none hover:bg-amber-200"
                  onClick={onBypass}
                >
                  <span className="mr-2 rounded-full bg-amber-950 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-100">
                    Test
                  </span>
                  <span>{bypassLabel}</span>
                </Button>
              )}
            </form>
          </div>
        </CardContent>
        <CardFooter className="flex-col items-start space-y-4">
          <Button
            type="button"
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => onEmailLink?.()}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {emailLinkLabel}
          </Button>
          <p className="w-full text-center text-xs text-muted-foreground">
            By logging in, you agree to our{' '}
            <Link to="/terms" className="underline hover:text-primary">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="underline hover:text-primary">
              Privacy Policy
            </Link>
            .
          </p>
        </CardFooter>
      </Card>
    );
  },
);
AuthForm.displayName = 'AuthForm';

export { AuthForm };
