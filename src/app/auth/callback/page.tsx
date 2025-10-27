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
          // Check if user exists in our users table
          const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.session.user.id)
            .single();

          // If user doesn't exist, create user record
          if (!existingUser) {
            const { error: insertError } = await supabase
              .from('users')
              .insert({
                id: data.session.user.id,
                email: data.session.user.email!,
                full_name: data.session.user.user_metadata?.full_name || null,
                role: 'user',
                email_verified: data.session.user.email_confirmed_at ? true : false,
              });

            if (insertError) {
              console.error('Error creating user:', insertError);
            }

            // Create wallet for new user
            const { error: walletError } = await supabase
              .from('wallets')
              .insert({
                user_id: data.session.user.id,
                balance: 0,
              });

            if (walletError) {
              console.error('Error creating wallet:', walletError);
            }
          }

          // User authenticated successfully, redirect to home
          router.push('/');
        } else {
          setError('No session found');
        }
      } catch {
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
