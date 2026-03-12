# Microsoft SSO Implementation Guide for Resource Manager

Follow these steps to implement Microsoft SSO (Entra ID) using Supabase.

## 1. Azure Portal Configuration (Entra ID)
1. Go to the [Azure Portal](https://portal.azure.com/) > **Microsoft Entra ID** > **App registrations** > **New registration**.
2. **Name**: `Resource Manager` (or your preferred name).
3. **Supported account types**: Select "Accounts in this organizational directory only" (Single Tenant) or "Any organizational directory" (Multi-tenant).
4. **Redirect URI**: Select **Web** and enter:
   `https://tjakrmasxhcdxdkulpsy.supabase.co/auth/v1/callback`
5. Click **Register**.
6. **Save these values**:
   - **Application (client) ID**
   - **Directory (tenant) ID**
7. Go to **Certificates & secrets** > **New client secret**.
8. Add a description and expiration, then click **Add**.
9. **CRITICAL**: Copy the **Value** of the secret immediately (it will be hidden later).
10. **Fix for AADSTS900561 Error**:
    - Go to the **Authentication** tab.
    - Under **Implicit grant and hybrid flows**, ensure **BOTH** "Access tokens" and "ID tokens" are **UNCHECKED**. 
    - Supabase uses the PKCE flow which does not require these. If they are checked, you may receive a "POST requests only" error.
    - Click **Save**.

## 2. Supabase Dashboard Configuration
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to **Authentication** > **Providers** > **Azure**.
3. Toggle **Enable Azure Primary**.
4. Paste the **Client ID** and **Client Secret** from Step 1.
5. **Azure Tenant URL**: Enter `https://login.microsoftonline.com/<your-tenant-id>/v2.0`
   - **IMPORTANT**: You must include `https://login.microsoftonline.com/` at the beginning.
   - Replace `<your-tenant-id>` with your actual Directory (tenant) ID (e.g., `6df5d9b1-2807-4c12-a223-63909d98a6f2`).
   - The final URL should look like: `https://login.microsoftonline.com/6df5d9b1-2807-4c12-a223-63909d98a6f2/v2.0`
6. Click **Save**.

## 3. Database Trigger (SQL Editor)
Run this SQL in the Supabase SQL Editor to automatically create a record in your `public.users` table when a user signs in via SSO for the first time.

```sql
-- Function to handle new user registration from SSO
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, must_change_password)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'New User'),
    'user', -- Default role
    FALSE   -- SSO users don't need to change password
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute the function after a new user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

## 4. Troubleshooting AADSTS900561 (POST requests only)
If you see this error, it means Microsoft is receiving a GET request when it expects a POST. This is usually caused by one of the following:

1.  **Implicit Grant Enabled**: 
    - Go to **Azure Portal** > **Authentication**.
    - Scroll down to **Implicit grant and hybrid flows**.
    - **UNCHECK** both "Access tokens" and "ID tokens".
    - Click **Save**.
2.  **Incorrect Azure Tenant URL in Supabase**:
    - Ensure it is exactly: `https://login.microsoftonline.com/6df5d9b1-2807-4c12-a223-63909d98a6f2/v2.0`
    - Do **NOT** use `https://login.microsoftonline.com/common/v2.0` if your app is "Single Tenant".
    - Do **NOT** include `/oauth2/v2.0/authorize` at the end.
3.  **Third-Party Cookies Blocked**:
    - Browsers (especially in iframes like the Orchids preview) may block cookies for `login.microsoftonline.com`.
    - **Fix**: Open your application in a **new browser tab** instead of using the small preview window.
4.  **Redirect URI Mismatch**:
    - Ensure your Redirect URI in Azure is exactly: `https://tjakrmasxhcdxdkulpsy.supabase.co/auth/v1/callback`
    - Do **NOT** use your application's URL (e.g., `https://...orchids.app/auth/callback`) as the Redirect URI in the **Azure Portal**. It must be the **Supabase** callback URL.
5.  **Clean State**:
    - Clear your browser cookies or try using an **Incognito/Private window**.

## 5. Code Implementation (Next.js 15)

### A. Create Callback Route (`src/app/auth/callback/route.ts`)
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = await cookies() // Await cookies in Next.js 15
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
```
