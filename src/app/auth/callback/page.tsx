'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/database';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function AuthCallbackPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const router = useRouter();
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          setError('Authentication failed');
          return;
        }

        if (data.session) {
          // Initialize user via API endpoint (creates user + wallet if needed)
          const initResponse = await fetch('/api/auth/initialize-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!initResponse.ok) {
            console.error('Failed to initialize user');
            setError('Failed to initialize user account');
            return;
          }

          // User authenticated successfully, redirect to home
          router.push('/');
        } else {
          setError('No session found');
        }
      } catch (err) {
        console.error('Error in auth callback:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Authenticating...</CardTitle>
            <CardDescription>
              Please wait while we verify your account
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Authentication Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <button
              onClick={() => router.push('/auth/login')}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Try again
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
