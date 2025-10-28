# Production Deployment Checklist

## Quick Start: Deploy to Production

### Phase 1: Pre-Deployment (1-2 giờ)

#### ✅ Email Configuration (REQUIRED)

**Option 1: SendGrid (Recommended)**

1. Đăng ký SendGrid: https://signup.sendgrid.com/
2. Verify domain hoặc single sender email
3. Tạo API Key
4. Configure SMTP trong Supabase:
   - Host: `smtp.sendgrid.net`
   - Port: `587`
   - Username: `apikey`
   - Password: `[Your SendGrid API Key]`
   - Sender: `noreply@yourdomain.com`

**Option 2: Resend (Developer-friendly)**

1. Đăng ký Resend: https://resend.com/
2. Verify domain
3. Get API key
4. Configure SMTP trong Supabase:
   - Host: `smtp.resend.com`
   - Port: `587`
   - Username: `resend`
   - Password: `[Your Resend API Key]`

#### ✅ DNS Records (Để email không vào spam)

```dns
# SPF Record
TXT @ "v=spf1 include:sendgrid.net ~all"

# DKIM (SendGrid sẽ cung cấp)
TXT em1234._domainkey "[key từ provider]"

# DMARC (optional)
TXT _dmarc "v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com"
```

#### ✅ Supabase Auth Settings

**Redirect URLs:**

```
https://yourdomain.com/auth/callback
https://www.yourdomain.com/auth/callback
```

**Site URL:**

```
https://yourdomain.com
```

**Disable Confirm Email (Optional - NOT recommended)**
Nếu muốn skip email confirmation trong development:

```
Auth → Providers → Email → Enable email confirmations: OFF
```

⚠️ **Chỉ làm trong development, KHÔNG tắt trên production!**

### Phase 2: Vercel Deployment

#### ✅ Environment Variables

Trong Vercel dashboard, thêm:

```bash
# App URLs
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://kxcydvdvxvibcivabwpo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# PayOS (when ready)
PAYOS_CLIENT_ID=your-client-id
PAYOS_API_KEY=your-api-key
PAYOS_CHECKSUM_KEY=your-checksum-key

# Rate Limiting (Production - Stricter)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50
```

#### ✅ Deploy Command

```bash
# Từ local
vercel --prod

# Hoặc push to main branch (nếu đã setup auto-deploy)
git push origin main
```

### Phase 3: Post-Deployment Testing

#### Test 1: Registration Flow

```
1. Vào https://yourdomain.com/auth/register
2. Đăng ký với email thật
3. Check email (inbox và spam)
4. Click confirmation link
5. Verify redirect về homepage
6. Check user được tạo trong Supabase database
7. Check wallet được tạo với balance = 0
```

#### Test 2: Login Flow

```
1. Logout (nếu đang login)
2. Vào /auth/login
3. Login với account vừa tạo
4. Verify redirect thành công
5. Check session persistence (refresh page)
```

#### Test 3: Email Deliverability

```
1. Test với nhiều email providers:
   - Gmail
   - Outlook/Hotmail
   - Yahoo Mail
   - Domain email của bạn
2. Check:
   - Email có vào inbox không?
   - Có bị spam không?
   - Link có hoạt động không?
   - Formatting có đúng không?
```

#### Test 4: API Routes

```bash
# Test wallet balance
curl https://yourdomain.com/api/wallet/balance \
  -H "Cookie: sb-access-token=..."

# Test topup init
curl https://yourdomain.com/api/topup/init \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"amount": 100000}'
```

### Phase 4: Monitoring Setup

#### ✅ Supabase Monitoring

**Check Auth Logs:**

```
Project → Logs → Auth Logs
```

**Set up Alerts:**

- Auth failures spike
- Database errors
- High API usage

#### ✅ Vercel Monitoring

**Enable:**

- Error tracking
- Performance monitoring
- Analytics

**Check:**

- Function logs
- Build logs
- Runtime logs

#### ✅ Email Provider Monitoring

**SendGrid Dashboard:**

- Delivery rate > 95%
- Bounce rate < 2%
- Spam complaints < 0.1%

### Phase 5: Security Hardening

#### ✅ Rate Limiting Verification

```bash
# Test rate limit bằng cách spam requests
for i in {1..60}; do
  curl https://yourdomain.com/api/wallet/balance
done
# Should return 429 after 50 requests
```

#### ✅ RLS Policy Check

```sql
-- Verify user chỉ thấy data của mình
SELECT * FROM users; -- Should only see own user
SELECT * FROM wallets; -- Should only see own wallet
```

#### ✅ Security Headers

Check với: https://securityheaders.com/

Should have:

- Content-Security-Policy
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy

## Production vs Development Differences

| Feature            | Development      | Production                             |
| ------------------ | ---------------- | -------------------------------------- |
| Email Sender       | Supabase default | Custom domain (noreply@yourdomain.com) |
| SMTP               | Supabase's       | SendGrid/Resend/SES                    |
| Rate Limit         | 1000 req/15min   | 50 req/15min                           |
| Error Logging      | Console only     | Webhook to Discord/Slack               |
| Domain             | localhost:3000   | yourdomain.com                         |
| Email Confirmation | Required         | Required ✅                            |
| Analytics          | None             | Vercel Analytics                       |

## Common Production Issues

### Issue 1: Email không đến

**Debug:**

```
1. Check SMTP logs in Supabase
2. Check email provider dashboard (SendGrid/Resend)
3. Verify DNS records (SPF, DKIM)
4. Test email with mail-tester.com
```

**Fix:**

- Re-verify domain in email provider
- Check SMTP credentials
- Warm up IP address (send emails gradually)

### Issue 2: Link trong email không work

**Debug:**

```
1. Check redirect URLs in Supabase Auth settings
2. Verify NEXT_PUBLIC_APP_URL env var
3. Test link manually
```

**Fix:**

- Update redirect URLs to match production domain
- Clear browser cache
- Check for URL encoding issues

### Issue 3: User record không được tạo

**Debug:**

```
1. Check /api/auth/initialize-user logs in Vercel
2. Check Supabase database logs
3. Verify RLS policies
```

**Fix:**

- Check service role key có đúng không
- Verify database schema (users & wallets tables exist)
- Check migration status

## Rollback Plan

Nếu có vấn đề nghiêm trọng:

### Option 1: Quick Rollback on Vercel

```bash
# Trong Vercel dashboard
Deployments → Previous deployment → Promote to Production
```

### Option 2: Redeploy Previous Commit

```bash
git revert HEAD
git push origin main
```

### Option 3: Maintenance Mode

Tạo file `src/app/maintenance/page.tsx`:

```tsx
export default function Maintenance() {
  return <div>Đang bảo trì, vui lòng quay lại sau...</div>;
}
```

Redirect tất cả routes về `/maintenance` trong `middleware.ts`.

## Post-Launch Monitoring (First 24h)

### Hour 1-4: Critical Monitoring

- [ ] Check error rate < 1%
- [ ] Verify user registrations working
- [ ] Monitor email delivery rate > 95%
- [ ] Check database performance

### Hour 4-12: Active Monitoring

- [ ] Monitor user feedback
- [ ] Check for any reported bugs
- [ ] Verify payment flow (when activated)
- [ ] Monitor API response times

### Hour 12-24: Stability Check

- [ ] Review all logs
- [ ] Check system performance
- [ ] Analyze user behavior
- [ ] Plan hot fixes if needed

## Success Metrics

### Day 1

- [ ] 0 critical bugs
- [ ] Email delivery rate > 95%
- [ ] All core features working
- [ ] User registrations successful

### Week 1

- [ ] User retention > 60%
- [ ] No security incidents
- [ ] Performance stable
- [ ] Email reputation good

### Month 1

- [ ] Scale to 100+ users
- [ ] All systems stable
- [ ] Positive user feedback
- [ ] Revenue goals on track

## Support Contacts

**Emergency Contacts:**

- Supabase Support: support@supabase.com
- Vercel Support: support@vercel.com
- SendGrid Support: support@sendgrid.com

**Helpful Communities:**

- Supabase Discord: https://discord.supabase.com
- Next.js Discord: https://discord.gg/nextjs
- Vietnamese Developers: [Add your community]

## Next Steps After Launch

1. **Week 1:** Monitor closely, fix critical bugs
2. **Week 2:** Gather user feedback, plan improvements
3. **Week 3:** Implement PayOS payment integration
4. **Month 2:** Scale infrastructure, optimize performance
5. **Month 3:** Add advanced features (KYC, tournaments, etc.)

---

**Remember:** Launch MVP first, iterate based on real user feedback! 🚀
