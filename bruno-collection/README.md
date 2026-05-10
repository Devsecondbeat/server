# SecondBeat API - Bruno Collection

API collection for the SecondBeat used instruments marketplace.

## Setup

1. Install [Bruno](https://www.usebruno.com/) (free & open-source)
2. Open Bruno → **Open Collection** → select `bruno-collection` folder
3. Select environment: **local** or **production**
4. Update environment variables:
   - `authToken` - Your JWT token (auto-saved after Supabase sign in)
   - `supabaseUrl` - Your Supabase project URL
   - `supabaseAnonKey` - Your Supabase anon/public key

## Environments

| Variable | Description |
|----------|-------------|
| baseUrl | Your API server URL |
| authToken | JWT access token |
| supabaseUrl | https://your-project-id.supabase.co |
| supabaseAnonKey | Supabase anon key (from Project Settings → API) |

## API Endpoints

### Health

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/` | GET | No | Root endpoint |
| `/health/database` | GET | No | Database health check |

### Instruments

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/instruments/getinstrumentMakes` | GET | Yes | Get all instrument makes |

### Ads

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/instruments/getinstrumentAds` | GET | Yes | Get all ads |
| `/api/v1/instruments/getinstrumentAdsbyUser/:id` | GET | Yes | Get ads by user |
| `/api/v1/instruments/createinstrumentAds` | POST | Yes | Create ad |
| `/api/v1/instruments/updateinstrumentAds/:id` | PUT | Yes | Update ad |
| `/api/v1/instruments/deleteinstrumentAds/:id` | DELETE | Yes | Delete ad |

### Images

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/instruments/images/upload-urls` | POST | Yes | Get Cloudflare upload URLs |
| `/api/v1/instruments/ads/:adId/images` | GET | Yes | Get images for ad |
| `/api/v1/instruments/ads/:adId/images/can-add` | GET | Yes | Check image limit |
| `/api/v1/instruments/ads/:adId/images/:imageId` | DELETE | Yes | Delete image |

### Supabase Auth

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/v1/signup` | POST | Create new account |
| `/auth/v1/token?grant_type=password` | POST | Sign in with email/password |
| `/auth/v1/token?grant_type=refresh_token` | POST | Refresh access token |
| `/auth/v1/otp` | POST | Send magic link |
| `/auth/v1/user` | GET | Get current user |
| `/auth/v1/user` | PUT | Update current user |
| `/auth/v1/logout` | POST | Sign out |
| `/auth/v1/recover` | POST | Send password reset email |
| `/auth/v1/verify` | POST | Verify OTP token |
| `/auth/v1/resend` | POST | Resend confirmation email |

## Authentication

All `/api/v1/instruments/*` endpoints require a JWT token:

```
Authorization: Bearer <your_jwt_token>
```

## Image Upload Flow

```
1. POST /instruments/images/upload-urls { count: N }
   → Get signed Cloudflare upload URLs

2. Upload images directly to Cloudflare (frontend)
   → Receive image IDs

3. POST /instruments/createinstrumentAds { ...data, imageIds: [...] }
   → Create ad with images
```

## Supabase Auth Flow

```
1. Sign Up
   POST /auth/v1/signup { email, password }
   → User created, confirmation email sent

2. Sign In
   POST /auth/v1/token?grant_type=password { email, password }
   → access_token + refresh_token (auto-saved to env)

3. Use API
   All /api/v1/* requests use saved authToken

4. Refresh Token (when expired)
   POST /auth/v1/token?grant_type=refresh_token
   → New tokens (auto-saved to env)
```

## Collection Structure

```
bruno-collection/
├── bruno.json
├── collection.bru
├── README.md
├── environments/
│   ├── local.bru
│   └── production.bru
├── Health/
│   ├── Root.bru
│   └── Database Health.bru
├── Instruments/
│   └── Get Instrument Makes.bru
├── Ads/
│   ├── Get All Ads.bru
│   ├── Get Ads by User.bru
│   ├── Create Ad.bru
│   ├── Update Ad.bru
│   └── Delete Ad.bru
├── Images/
│   ├── Get Upload URLs.bru
│   ├── Get Ad Images.bru
│   ├── Check Can Add Images.bru
│   └── Delete Ad Image.bru
└── Supabase Auth/
    ├── Sign Up.bru
    ├── Sign In with Password.bru
    ├── Sign In with Magic Link.bru
    ├── Refresh Token.bru
    ├── Get Current User.bru
    ├── Update User.bru
    ├── Sign Out.bru
    ├── Password Recovery.bru
    ├── Verify OTP.bru
    └── Resend Confirmation.bru
```

