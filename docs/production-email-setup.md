# Production Email Setup Guide

## Overview

Trong development, Supabase sử dụng email mặc định của họ để gửi email xác nhận. Tuy nhiên, trên **production**, bạn cần cấu hình custom email provider để:

1. ✅ Đảm bảo email không bị vào spam
2. ✅ Branding email theo thương hiệu của bạn
3. ✅ Tăng delivery rate
4. ✅ Tuân thủ best practices

## Current Setup (Development)

**Project:** game-match-platform  
**Project ID:** kxcydvdvxvibcivabwpo  
**Region:** ap-southeast-1 (Singapore)

### Development Flow (Working ✅)

```
User đăng ký → Supabase gửi email confirm (từ email mặc định) → User click link → Account activated
```

## Production Setup Requirements

### 1. Email Provider Options

Bạn có thể chọn một trong các options sau:

#### Option A: Custom SMTP (Recommended)

Sử dụng SMTP server của bạn hoặc email service provider:

**Popular Providers:**

- **SendGrid** (12,000 emails/month miễn phí)
- **Mailgun** (5,000 emails/month miễn phí)
- **Amazon SES** (62,000 emails/month free tier)
- **Postmark** (100 emails/month free)
- **Resend** (3,000 emails/month free)

#### Option B: Supabase Email (Paid)

- Supabase cung cấp email service tích hợp
- Phải subscribe plan Pro trở lên ($25/month)

### 2. Configure SMTP in Supabase

**Step 1: Vào Supabase Dashboard**

```
https://supabase.com/dashboard/project/kxcydvdvxvibcivabwpo/settings/auth
```

**Step 2: Scroll xuống "SMTP Settings"**

**Step 3: Điền thông tin SMTP:**

```
Enable Custom SMTP: ✅

Host: smtp.sendgrid.net (hoặc provider khác)
Port: 587 (TLS) hoặc 465 (SSL)
Username: apikey (với SendGrid) hoặc username của provider
Password: your-api-key hoặc password
Sender Email: noreply@yourdomain.com
Sender Name: TFT Match Platform
```

**Example với SendGrid:**

```
Host: smtp.sendgrid.net
Port: 587
Username: apikey
Password: SG.xxxxxxxxxxxxxxxxxxxx
Sender Email: noreply@tftmatch.com
Sender Name: TFT Match
```

### 3. Setup Domain & Email Authentication

#### A. SPF Record

Thêm SPF record vào DNS của domain:

```dns
TXT @ "v=spf1 include:sendgrid.net ~all"
```

Hoặc với provider khác:

```dns
TXT @ "v=spf1 include:_spf.your-provider.com ~all"
```

#### B. DKIM Record

Provider sẽ cung cấp DKIM keys. Ví dụ:

```dns
TXT em1234._domainkey "k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC..."
```

#### C. DMARC Record (Optional but recommended)

```dns
TXT _dmarc "v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com"
```

### 4. Configure Redirect URLs

Trong Supabase Auth settings, thêm production URLs:

**Location:**

```
Project Settings → Authentication → URL Configuration
```

**Redirect URLs to add:**

```
https://yourdomain.com/auth/callback
https://www.yourdomain.com/auth/callback
```

**Site URL:**

```
https://yourdomain.com
```

### 5. Customize Email Templates

**Step 1: Vào Email Templates**

```
Auth → Email Templates
```

**Step 2: Customize cho từng loại email:**

#### Confirm Signup Email

```html
<h2>Xác nhận tài khoản TFT Match</h2>
<p>Chào mừng bạn đến với TFT Match Platform!</p>
<p>Click vào link dưới đây để xác nhận email và kích hoạt tài khoản:</p>
<p><a href="{{ .ConfirmationURL }}">Xác nhận tài khoản</a></p>
<p>Link này sẽ hết hạn sau 24 giờ.</p>
```

#### Magic Link Email (if using)

```html
<h2>Đăng nhập TFT Match</h2>
<p>Click vào link dưới đây để đăng nhập:</p>
<p><a href="{{ .ConfirmationURL }}">Đăng nhập ngay</a></p>
<p>Link này sẽ hết hạn sau 1 giờ.</p>
```

#### Reset Password Email

```html
<h2>Đặt lại mật khẩu</h2>
<p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản TFT Match.</p>
<p>Click vào link dưới đây để đặt lại mật khẩu:</p>
<p><a href="{{ .ConfirmationURL }}">Đặt lại mật khẩu</a></p>
<p>Nếu bạn không yêu cầu điều này, hãy bỏ qua email này.</p>
```

### 6. Environment Variables for Production

Update trong Vercel hoặc hosting provider:

```bash
# Production URLs
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Supabase (production project nếu khác)
NEXT_PUBLIC_SUPABASE_URL=https://kxcydvdvxvibcivabwpo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key
```

## Testing Email in Production

### Step 1: Test SMTP Connection

```bash
# Sử dụng tool test SMTP
curl -X POST https://kxcydvdvxvibcivabwpo.supabase.co/auth/v1/signup \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@yourdomain.com",
    "password": "test123456"
  }'
```

### Step 2: Check Email Delivery

- Kiểm tra inbox
- Kiểm tra spam folder
- Verify link hoạt động
- Check email formatting

### Step 3: Monitor Delivery Rates

Sử dụng provider dashboard để xem:

- Delivery rate
- Bounce rate
- Spam complaints
- Open rate

## Recommended Provider: SendGrid Setup

### 1. Create SendGrid Account

```
https://signup.sendgrid.com/
```

### 2. Verify Sender Identity

```
Settings → Sender Authentication → Verify Single Sender
```

Hoặc verify domain (recommended cho production):

```
Settings → Sender Authentication → Authenticate Your Domain
```

### 3. Create API Key

```
Settings → API Keys → Create API Key
- Name: TFT Match Production
- Permissions: Full Access (hoặc Mail Send only)
```

### 4. Get SMTP Credentials

```
Host: smtp.sendgrid.net
Port: 587
Username: apikey
Password: [Your API Key từ step 3]
```

### 5. Configure in Supabase

Paste credentials vào SMTP settings như hướng dẫn ở trên.

## Alternative: Using Resend (Modern Option)

**Resend** là option modern, developer-friendly:

### Setup Resend

1. **Sign up:** https://resend.com/
2. **Verify domain**
3. **Get API Key**
4. **Configure SMTP:**
   ```
   Host: smtp.resend.com
   Port: 587
   Username: resend
   Password: re_xxxxxxxxxxxx (API key)
   ```

### Advantages

- ✅ Simple setup
- ✅ Better deliverability
- ✅ Modern dashboard
- ✅ React email templates support
- ✅ 3,000 emails/month free

## Monitoring & Troubleshooting

### Check Email Logs in Supabase

```
Project → Logs → Auth Logs
```

### Common Issues

#### Emails go to spam

**Solution:**

- Setup SPF, DKIM, DMARC
- Use verified domain
- Avoid spam trigger words
- Warm up IP gradually

#### Email not received

**Solution:**

- Check SMTP credentials
- Verify sender email
- Check bounce logs in provider
- Verify recipient email exists

#### Link expired/invalid

**Solution:**

- Check redirect URLs match production domain
- Verify token expiry settings
- Check URL encoding

## Production Checklist

Before going live:

- [ ] SMTP provider account created and verified
- [ ] Domain verified with email provider
- [ ] SPF record added to DNS
- [ ] DKIM record added to DNS
- [ ] DMARC record added (optional)
- [ ] SMTP configured in Supabase
- [ ] Email templates customized
- [ ] Redirect URLs updated for production
- [ ] Test email delivery end-to-end
- [ ] Monitor initial email sending
- [ ] Check spam score with mail-tester.com

## Cost Estimate

### SendGrid (Recommended for starting)

```
Free Tier: 12,000 emails/month
Essentials: $19.95/month (50,000 emails)
Pro: $89.95/month (100,000 emails)
```

### Resend (Modern alternative)

```
Free Tier: 3,000 emails/month
Pro: $20/month (50,000 emails)
Business: $120/month (500,000 emails)
```

### Amazon SES (Most economical at scale)

```
Free Tier: 62,000 emails/month (first 12 months)
After: $0.10 per 1,000 emails
```

## Next Steps

1. **Choose email provider** based on budget and scale
2. **Create account** and verify domain
3. **Configure SMTP** in Supabase dashboard
4. **Update DNS records** (SPF, DKIM, DMARC)
5. **Customize email templates**
6. **Test thoroughly** before announcing launch
7. **Monitor email delivery rates**

## Support Resources

- **Supabase Email Docs:** https://supabase.com/docs/guides/auth/auth-smtp
- **SendGrid Docs:** https://docs.sendgrid.com/
- **Resend Docs:** https://resend.com/docs
- **Email Testing Tool:** https://www.mail-tester.com/
