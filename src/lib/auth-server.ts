import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';

export async function getServerSession() {
  const supabase = createServerComponentClient<Database>({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export async function getCurrentUser() {
  const session = await getServerSession();
  if (!session) return null;

  const supabase = createServerComponentClient<Database>({ cookies });
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single();

  return user;
}

export async function isAdmin(userId: string): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === 'admin';
}

export async function requireAuth() {
  const session = await getServerSession();
  if (!session) {
    throw new Error('Authentication required');
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  const isUserAdmin = await isAdmin(session.user.id);

  if (!isUserAdmin) {
    throw new Error('Admin access required');
  }

  return session;
}
