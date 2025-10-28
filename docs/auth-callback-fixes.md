# Auth Callback Fixes

## Issues Fixed

### 1. Error 406 Not Acceptable (PGRST116) ✅

**Problem**: Using `.single()` on a query that returns 0 rows throws an error.

**Solution**: Moved user checking logic to server-side API endpoint that uses `.maybeSingle()` instead, which returns `null` when no rows exist.

### 2. Error 400 - Missing Column `email_verified` ✅

**Problem**: TypeScript types included `email_verified` column, but it didn't exist in the actual database.

**Solution**: Created and applied migration `20241228_add_email_verified_to_users.sql` to add the column to the database.

```sql
ALTER TABLE users
ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false;
```

### 3. Error 403 - RLS Policy Violation on Wallets ✅

**Problem**: Client-side code tried to insert wallet records, but RLS policies blocked it.

**Solution**: Created server-side API endpoint `/api/auth/initialize-user` that uses service role permissions to create user records and wallets, bypassing RLS restrictions appropriately.

### 4. Error 401 Unauthorized on initialize-user ✅

**Problem**: API route couldn't read session from cookies because it was using service role client.

**Solution**:

- Created `createAuthServerClient()` helper that uses `@supabase/ssr` to read session cookies
- Updated API route to use two clients:
  - `authClient`: Reads session from cookies to verify authenticated user
  - `adminClient`: Uses service role to bypass RLS for user/wallet creation

### 5. Error 500 - Missing Column `role` ✅

**Problem**: TypeScript types included `role` column, but it didn't exist in the actual database.

**Solution**:

- Created `user_role` enum type with values: `'user'`, `'admin'`
- Added `role` column to users table with type `user_role` and default `'user'`
- Created index on role column for faster role-based queries

```sql
CREATE TYPE user_role AS ENUM ('user', 'admin');
ALTER TABLE public.users ADD COLUMN role user_role NOT NULL DEFAULT 'user';
CREATE INDEX idx_users_role ON users(role);
```

## New Authentication Flow

1. User authenticates via Supabase Auth (Google OAuth or Email OTP)
2. Auth callback page receives the session
3. Client calls `/api/auth/initialize-user` POST endpoint
4. Server-side route:
   - Verifies the authenticated user
   - Checks if user exists in database (using `.maybeSingle()`)
   - Creates user record if doesn't exist
   - Creates wallet for new user
   - Returns success response
5. Client redirects to home page

## Files Modified

- `src/app/auth/callback/page.tsx` - Simplified client logic to call server API
- `src/app/api/auth/initialize-user/route.ts` - New server-side endpoint (created)
- `src/lib/supabase.ts` - Added `createAuthServerClient()` helper for reading session cookies
- `supabase/migrations/20241228_add_email_verified_to_users.sql` - Migration to add email_verified column (created)
- `supabase/migrations/20241228_add_role_to_users.sql` - Migration to add role column (created)

## Testing

To test the authentication flow:

1. Clear browser cookies and local storage
2. Navigate to `/auth/login`
3. Sign in with Google or Email OTP
4. Should be redirected to home page without errors
5. Verify user record and wallet were created in database

## Technical Implementation

### Two-Client Approach

The API route uses a dual-client architecture:

```typescript
// 1. Auth client - reads session from cookies (anon key + cookies)
const authClient = await createAuthServerClient();
const { data: { user } } = await authClient.auth.getUser();

// 2. Admin client - bypasses RLS for user creation (service role key)
const adminClient = createServerClient();
await adminClient.from('users').insert({ ... });
```

This separation ensures:

- User authentication is verified from actual session
- Database operations can bypass RLS when necessary
- Service role key is only used for privileged operations

### Cookie Handling

The `createAuthServerClient()` uses `@supabase/ssr` to properly handle Next.js 15 cookies:

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const cookieStore = await cookies();
return createServerClient(url, anonKey, {
  cookies: {
    getAll: () => cookieStore.getAll(),
    setAll: (cookies) => {
      /* set cookies */
    },
  },
});
```

## Security Considerations

- Server-side route uses service role permissions appropriately
- User verification happens before any database operations
- Idempotent: calling initialize-user multiple times is safe
- RLS policies still protect user data access after creation
- Session cookies are read securely from Next.js cookie store
- Service role key never exposed to client
