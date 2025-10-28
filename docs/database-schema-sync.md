# Database Schema Synchronization

## Overview

This document tracks differences between TypeScript types and actual database schema to prevent runtime errors.

## Users Table Schema

### Current Database Columns (as of 2024-12-28)

| Column         | Type        | Nullable | Default | Status              |
| -------------- | ----------- | -------- | ------- | ------------------- |
| id             | uuid        | NO       | -       | ✅                  |
| email          | text        | NO       | -       | ✅                  |
| full_name      | text        | YES      | null    | ✅                  |
| avatar_url     | text        | YES      | null    | ✅                  |
| phone          | text        | YES      | null    | ✅                  |
| created_at     | timestamptz | YES      | now()   | ✅                  |
| updated_at     | timestamptz | YES      | now()   | ✅                  |
| email_verified | boolean     | NO       | false   | ✅ Added 2024-12-28 |
| role           | user_role   | NO       | 'user'  | ✅ Added 2024-12-28 |

### Enums

**user_role**: `'user'`, `'admin'`

### Indexes

- Primary Key: `id`
- Unique: `email`
- Index: `idx_users_role` on `role`

### Foreign Keys

- `users.id` → `auth.users.id` (Supabase Auth)

## Common Issues & Solutions

### Issue: Column Missing in Database

**Symptoms:**

```
Error 400: Could not find the 'column_name' column of 'table_name' in the schema cache
Error 500: column "column_name" does not exist
```

**Solution:**

1. Create migration file in `supabase/migrations/`
2. Use simple SQL (avoid complex DO blocks with migrations API)
3. Apply migration using Supabase CLI or API

**Example:**

```sql
-- Good: Simple, clear SQL
ALTER TABLE users ADD COLUMN new_column text;

-- Bad: Complex DO blocks may not work with migration API
DO $$
BEGIN
  IF NOT EXISTS (...) THEN
    ALTER TABLE users ADD COLUMN new_column text;
  END IF;
END $$;
```

### Issue: TypeScript Types Out of Sync

**Symptoms:**

- TypeScript types have columns that don't exist in database
- Or vice versa

**Solution:**

1. Generate fresh types from database:

```bash
npx supabase gen types typescript --project-id kxcydvdvxvibcivabwpo > src/types/database.ts
```

2. Or manually sync `src/types/database.ts` with actual schema

## Verification Checklist

Before deploying:

- [ ] Run database migrations
- [ ] Verify schema changes applied:
  ```sql
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'users';
  ```
- [ ] Regenerate TypeScript types if needed
- [ ] Test authentication flow
- [ ] Test CRUD operations on affected tables

## Migration History

| Date       | Migration                   | Description                          |
| ---------- | --------------------------- | ------------------------------------ |
| 2024-12-20 | settle_match_function       | Added settle_match stored procedure  |
| 2024-12-28 | add_email_verified_to_users | Added email_verified column          |
| 2024-12-28 | add_role_to_users           | Added role column and user_role enum |

## Best Practices

1. **Always create migrations for schema changes** - Don't modify schema directly in production
2. **Keep TypeScript types in sync** - Regenerate after schema changes
3. **Test migrations locally first** - Before applying to production
4. **Use simple SQL in migrations** - Avoid complex PL/pgSQL when possible
5. **Document all schema changes** - Update this file when making changes

## Troubleshooting

### If you see "schema cache" errors:

1. Check actual database schema:

```sql
\d+ users  -- in psql
-- or
SELECT * FROM information_schema.columns WHERE table_name = 'users';
```

2. Compare with TypeScript types in `src/types/database.ts`

3. Create migration to sync or update types

### If migrations fail to apply:

1. Try applying SQL directly using `execute_sql`
2. Simplify migration SQL (remove DO blocks, conditional logic)
3. Check for naming conflicts (tables, columns, enums already exist)

## Related Files

- `src/types/database.ts` - TypeScript type definitions
- `supabase/migrations/*.sql` - Database migrations
- `docs/auth-callback-fixes.md` - Authentication flow fixes
