# Social Login Setup Guide

Complete guide for setting up Google and Apple OAuth authentication.

## ✅ Implementation Complete

The following has been implemented:
- ✅ Google and Apple login buttons on login page
- ✅ Icon components (GoogleIcon, AppleIcon)
- ✅ OAuth callback handler (`/app/auth/callback/route.ts`)
- ✅ User profile creation for new social users
- ✅ Styling and UX (loading states, error handling)

## 🔧 Supabase Configuration

### 1. Enable Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure consent screen:
   - User Type: External
   - App name: Wheel of Founders
   - Support email: your email
   - Authorized domains: your domain
6. Create OAuth Client:
   - Application type: Web application
   - Authorized redirect URIs:
     - `https://[your-project].supabase.co/auth/v1/callback`
     - `http://localhost:3000/auth/callback` (for local dev)
7. Copy **Client ID** and **Client Secret**

### 2. Enable Apple OAuth

1. Go to [Apple Developer Console](https://developer.apple.com/)
2. Create a **Services ID**:
   - Identifier: `com.yourcompany.wheeloffounders`
   - Enable "Sign in with Apple"
   - Configure domains and redirect URLs:
     - Domains: `your-domain.com`
     - Redirect URLs: `https://[your-project].supabase.co/auth/v1/callback`
3. Create a **Key**:
   - Key Name: Wheel of Founders OAuth Key
   - Enable "Sign in with Apple"
   - Download `.p8` key file
   - Note the **Key ID**
4. Note your **Team ID** (from Apple Developer account)

### 3. Configure in Supabase Dashboard

1. Go to **Authentication** → **Providers**
2. **Enable Google:**
   - Toggle ON
   - Client ID: [from Google Cloud Console]
   - Client Secret: [from Google Cloud Console]
   - Save
3. **Enable Apple:**
   - Toggle ON
   - Services ID: [from Apple Developer]
   - Team ID: [from Apple Developer]
   - Key ID: [from Apple Developer]
   - Private Key: [paste contents of .p8 file]
   - Save

## 📝 Environment Variables

No additional environment variables needed! Supabase handles OAuth configuration server-side.

However, if you want to use custom redirect URLs, you can add:

```bash
# .env.local (optional)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🎨 UI Features

### Login Page
- Google button: White background, Google colors
- Apple button: Black background, white text
- Loading states during OAuth flow
- Error handling with clear messages
- "or" divider between social and email login

### User Experience
- New users automatically get beta tier
- Timezone auto-detected
- Profile created automatically
- Seamless redirect to dashboard after login

## 🔄 OAuth Flow

1. User clicks "Continue with Google/Apple"
2. Redirected to provider's OAuth page
3. User authorizes
4. Redirected to `/auth/callback` with code
5. Code exchanged for session
6. User profile created if new user
7. Redirected to dashboard

## 🧪 Testing

### Local Development
1. Make sure redirect URL includes `http://localhost:3000/auth/callback`
2. Test Google login
3. Test Apple login (requires Apple Developer account)
4. Verify user profile is created
5. Verify redirect works

### Production
1. Update redirect URLs to production domain
2. Test both providers
3. Verify user creation works
4. Check error handling

## 🐛 Troubleshooting

### "Redirect URI mismatch"
- Check redirect URLs in Google Cloud Console match Supabase callback URL
- Format: `https://[project].supabase.co/auth/v1/callback`

### "Invalid client"
- Verify Client ID and Secret are correct in Supabase
- Check Google Cloud Console project is active

### "User profile not created"
- Check Supabase RLS policies allow inserts
- Verify `user_profiles` table exists
- Check browser console for errors

### Apple login not working
- Verify Services ID is configured correctly
- Check Key ID and Team ID match
- Ensure Private Key is correctly formatted (no extra spaces)

## 📚 Resources

- [Supabase OAuth Docs](https://supabase.com/docs/guides/auth/social-login)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [Apple Sign In Setup](https://developer.apple.com/sign-in-with-apple/)

## ✨ Next Steps

1. Configure OAuth providers in Supabase Dashboard
2. Test social login flows
3. Update production redirect URLs
4. Monitor user creation in Supabase logs

Social login is ready to use! 🚀
