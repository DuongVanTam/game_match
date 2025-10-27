# Environment Configuration for TFT Match Platform

## Development Environment (.env.local)

NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase Configuration

NEXT_PUBLIC_SUPABASE_URL=your_supabase_dev_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_dev_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_dev_service_role_key

# PayOS Configuration (Development)

PAYOS_CLIENT_ID=your_payos_dev_client_id
PAYOS_API_KEY=your_payos_dev_api_key
PAYOS_CHECKSUM_KEY=your_payos_dev_checksum_key

# Riot API Configuration

RIOT_API_KEY=your_riot_api_key
RIOT_API_BASE_URL=https://vn2.api.riotgames.com

# Monitoring & Logging (Development)

MONITORING_WEBHOOK_URL=
ERROR_WEBHOOK_URL=
DISCORD_WEBHOOK_URL=

# Rate Limiting (Development - More lenient)

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Security (Development)

JWT_SECRET=your_jwt_secret_dev
ENCRYPTION_KEY=your_encryption_key_dev

## Staging Environment (.env.staging)

NODE_ENV=staging
NEXT_PUBLIC_APP_URL=https://tft-match-staging.vercel.app

# Supabase Configuration

NEXT_PUBLIC_SUPABASE_URL=your_supabase_staging_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_staging_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_staging_service_role_key

# PayOS Configuration (Staging)

PAYOS_CLIENT_ID=your_payos_staging_client_id
PAYOS_API_KEY=your_payos_staging_api_key
PAYOS_CHECKSUM_KEY=your_payos_staging_checksum_key

# Riot API Configuration

RIOT_API_KEY=your_riot_api_key
RIOT_API_BASE_URL=https://vn2.api.riotgames.com

# Monitoring & Logging (Staging)

MONITORING_WEBHOOK_URL=https://hooks.slack.com/services/staging/webhook
ERROR_WEBHOOK_URL=https://hooks.slack.com/services/staging/error-webhook
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/staging/webhook

# Rate Limiting (Staging - Moderate)

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security (Staging)

JWT_SECRET=your_jwt_secret_staging
ENCRYPTION_KEY=your_encryption_key_staging

## Production Environment (.env.production)

NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://tftmatch.com

# Supabase Configuration

NEXT_PUBLIC_SUPABASE_URL=your_supabase_prod_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_prod_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_prod_service_role_key

# PayOS Configuration (Production)

PAYOS_CLIENT_ID=your_payos_prod_client_id
PAYOS_API_KEY=your_payos_prod_api_key
PAYOS_CHECKSUM_KEY=your_payos_prod_checksum_key

# Riot API Configuration

RIOT_API_KEY=your_riot_api_key
RIOT_API_BASE_URL=https://vn2.api.riotgames.com

# Monitoring & Logging (Production)

MONITORING_WEBHOOK_URL=https://hooks.slack.com/services/prod/webhook
ERROR_WEBHOOK_URL=https://hooks.slack.com/services/prod/error-webhook
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/prod/webhook

# Rate Limiting (Production - Strict)

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50

# Security (Production)

JWT_SECRET=your_jwt_secret_prod
ENCRYPTION_KEY=your_encryption_key_prod

# Additional Production Settings

ENABLE_ANALYTICS=true
ENABLE_ERROR_TRACKING=true
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_AUDIT_LOGGING=true

# Database Connection Pool (Production)

DATABASE_POOL_SIZE=20
DATABASE_CONNECTION_TIMEOUT=30000
DATABASE_IDLE_TIMEOUT=300000

# Cache Configuration (Production)

REDIS_URL=your_redis_prod_url
CACHE_TTL_SECONDS=3600

# File Upload Limits (Production)

MAX_FILE_SIZE_MB=10
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp

# Business Logic (Production)

SERVICE_FEE_PERCENTAGE=15
MIN_ENTRY_FEE=10000
MAX_ENTRY_FEE=1000000
MIN_WITHDRAWAL_AMOUNT=50000
MAX_WITHDRAWAL_AMOUNT=10000000
AUTO_REFUND_DAYS=30
