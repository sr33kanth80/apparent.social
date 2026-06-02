import * as React from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, Mail } from 'lucide-react';

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


interface AuthFormProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  contextLabel?: string;
  contextItems?: string[];
  emailPlaceholder?: string;
  submitLabel?: string;
  onEmailSubmit?: (data: { email: string; password?: string }) => void;
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
      submitLabel = 'Sign In',
      onEmailSubmit,
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
            </form>
          </div>
        </CardContent>
        <CardFooter className="flex-col items-start space-y-4">
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
