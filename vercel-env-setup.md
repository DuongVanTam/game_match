# Vercel Environment Variables Setup

## 🚀 Project Deployed Successfully!

**Production URL**: https://gamematch-753v134gj-tamdvs-projects.vercel.app
**Vercel Dashboard**: https://vercel.com/tamdvs-projects/game_match

## 📋 Environment Variables to Add

You need to add these environment variables in your Vercel dashboard:

### 1. Go to Vercel Dashboard

- Visit: https://vercel.com/tamdvs-projects/game_match/settings/environment-variables

### 2. Add the following variables:

#### Supabase Configuration

```
NEXT_PUBLIC_SUPABASE_URL = https://kxcydvdvxvibcivabwpo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4Y3lkdmR2eHZpYmNpdmFid3BvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNjg4MjMsImV4cCI6MjA3Njg0NDgyM30.bzdz9cjkWxwPrRAyUfYLQoF_ukKWizQqXs_R93V1g8A
SUPABASE_SERVICE_ROLE_KEY = [Get from Supabase Dashboard > Settings > API]
```

#### App Configuration

```
NEXT_PUBLIC_APP_URL = https://gamematch-753v134gj-tamdvs-projects.vercel.app
NEXTAUTH_SECRET = [Generate a random secret key]
NEXTAUTH_URL = https://gamematch-753v134gj-tamdvs-projects.vercel.app
```

#### PayOS Configuration (Optional for MVP)

```
PAYOS_CLIENT_ID = [Your PayOS Client ID]
PAYOS_API_KEY = [Your PayOS API Key]
PAYOS_CHECKSUM_KEY = [Your PayOS Checksum Key]
```

### 3. Environment Types

- Set all variables for: **Production**, **Preview**, and **Development**

### 4. Redeploy

After adding environment variables, redeploy the project:

```bash
vercel --prod
```

## 🔑 How to Get Supabase Service Role Key

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/kxcydvdvxvibcivabwpo)
2. Navigate to **Settings** > **API**
3. Copy the **service_role** key (not the anon key)
4. Add it as `SUPABASE_SERVICE_ROLE_KEY` in Vercel

## 🔐 Generate NEXTAUTH_SECRET

You can generate a secure secret using:

```bash
openssl rand -base64 32
```

Or use an online generator: https://generate-secret.vercel.app/32

## ✅ Verification

After setting up environment variables:

1. Redeploy the project
2. Check the deployment logs for any errors
3. Test the application functionality

## 📞 Support

If you encounter any issues:

- Check Vercel deployment logs
- Verify environment variables are set correctly
- Ensure Supabase project is accessible
