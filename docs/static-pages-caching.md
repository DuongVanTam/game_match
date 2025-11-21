# Static Pages Caching Configuration

## Tổng quan

Để cải thiện performance và giảm tải server, chúng ta đã cấu hình cache cho các trang tĩnh (static pages) trên Vercel.

## Các trang tĩnh được cache

1. **Privacy Policy** (`/privacy`)
2. **Terms of Service** (`/terms`)
3. **FAQ** (`/faq`)
4. **How It Works** (`/how-it-works`)
5. **Contact** (`/contact`)
6. **Homepage** (`/`) - Cache nhẹ hơn vì có thể có dynamic content

## Cấu hình đã triển khai

### 1. **Revalidate trong Page Components** (Next.js ISR)

Mỗi static page có `export const revalidate = 604800` (7 ngày):

```typescript
// src/app/privacy/page.tsx
export const revalidate = 604800; // 7 days
```

**Kết quả:**

- Pages được regenerate tối đa 1 lần mỗi 7 ngày
- Next.js tự động cache pages tại build time
- Stale-while-revalidate: serve cached content trong khi revalidate ở background

### 2. **Cache Headers trong Middleware**

Cache-Control headers được set trong `src/middleware.ts`:

```typescript
// Static pages: 1 week CDN cache, 1 day browser cache
'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=86400, max-age=86400'

// Homepage: 6 hours CDN cache, 1 hour browser cache
'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=3600, max-age=3600'
```

**Giải thích:**

- `public`: Có thể cache ở CDN và browser
- `s-maxage=604800`: CDN (Vercel Edge) cache 7 ngày
- `stale-while-revalidate=86400`: Cho phép serve stale content trong 1 ngày khi đang revalidate
- `max-age=86400`: Browser cache 1 ngày

### 3. **Next.js Config Optimization**

Trong `next.config.ts`:

- **Image optimization**: Cache 7 ngày cho images
- **Compression**: Bật gzip/brotli compression
- **Static assets**: Cache 1 năm cho CSS/JS/fonts (immutable)

## Lợi ích

### 1. **Performance**

- ⚡ Giảm thời gian load page từ CDN
- ⚡ Giảm tải server (fewer requests)
- ⚡ Better Core Web Vitals scores

### 2. **Cost Reduction**

- 💰 Ít serverless function invocations
- 💰 Ít database queries
- 💰 Tiết kiệm bandwidth

### 3. **User Experience**

- ✨ Pages load nhanh hơn
- ✨ Ít latency từ CDN
- ✨ Consistent experience

## Cache Strategy

### Static Pages (Privacy, Terms, FAQ, etc.)

- **Cache Time**: 7 ngày
- **Revalidate**: Automatic sau 7 ngày
- **Strategy**: Long-term cache với stale-while-revalidate

### Homepage

- **Cache Time**: 6 giờ (CDN), 1 giờ (browser)
- **Revalidate**: More frequent vì có thể có dynamic content
- **Strategy**: Short-term cache với frequent revalidation

### Dynamic Pages (Matches, Wallet, etc.)

- **No cache**: Always fresh
- **Strategy**: Server-side rendering với auth check

## Invalidate Cache

Khi cần update static pages ngay lập tức:

### Option 1: Revalidate từ Code

```typescript
import { revalidatePath } from 'next/cache';

// Revalidate specific page
revalidatePath('/privacy');
```

### Option 2: Vercel Dashboard

1. Go to Vercel Dashboard
2. Navigate to your deployment
3. Click "Redeploy" để force rebuild

### Option 3: API Route

Tạo API route để manually revalidate:

```typescript
// src/app/api/revalidate/route.ts
export async function POST(request: Request) {
  const { path } = await request.json();
  revalidatePath(path);
  return Response.json({ revalidated: true });
}
```

## Monitoring

### Check Cache Headers

```bash
curl -I https://your-domain.com/privacy
```

Look for `Cache-Control` header in response.

### Vercel Analytics

- Monitor cache hit rates trong Vercel Analytics
- Check edge network performance
- Track page load times

## Best Practices

1. **Update Frequency**:
   - Static pages nên ít thay đổi → cache lâu
   - Dynamic pages không cache → always fresh

2. **Cache Invalidation**:
   - Chỉ invalidate khi thực sự cần update
   - Sử dụng stale-while-revalidate để balance freshness và performance

3. **Testing**:
   - Test cache headers sau mỗi deploy
   - Verify pages được serve từ CDN
   - Check revalidation works correctly

## Future Improvements

1. **Edge Caching**:
   - Consider Vercel Edge Config cho global settings
   - Cache API responses với appropriate headers

2. **Preview Mode**:
   - Bypass cache khi previewing trong development
   - Ensure production cache không ảnh hưởng preview

3. **Cache Warming**:
   - Warm up cache cho popular pages sau deploy
   - Pre-render critical paths

## References

- [Next.js Caching](https://nextjs.org/docs/app/building-your-application/caching)
- [Vercel Edge Network](https://vercel.com/docs/edge-network/overview)
- [HTTP Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control)
