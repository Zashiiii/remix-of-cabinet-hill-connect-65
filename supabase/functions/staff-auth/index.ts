import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// Use hashSync and compareSync to avoid Worker dependency issue in Supabase Edge Runtime
import { hashSync, compareSync } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

// Version 8.0 - Security: httpOnly cookie-based session management
// Tokens are now stored in secure httpOnly cookies instead of being returned to client

const COOKIE_NAME = 'bris_staff_session';
const SESSION_DURATION_HOURS = 8;

// Get allowed origins for CORS - environment-aware configuration
function getAllowedOrigins(): string[] {
  // Check for custom origins from environment
  const customOrigins = Deno.env.get('ALLOWED_ORIGINS');
  if (customOrigins) {
    return customOrigins.split(',').map(o => o.trim()).filter(Boolean);
  }
  
  // Default allowed origins (production + Lovable preview domains)
  return [
    'https://xzyqcnapqfiawjmgfxws.lovableproject.com',
    // Add any custom production domains here
  ];
}

// Check if origin matches allowed patterns (including Lovable preview UUIDs)
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  
  const allowedOrigins = getAllowedOrigins();
  
  // Check exact match first
  if (allowedOrigins.includes(origin)) return true;
  
  // Allow any Lovable preview origin (UUID-based subdomains)
  const lovablePreviewPattern = /^https:\/\/[a-f0-9-]+\.lovableproject\.com$/;
  if (lovablePreviewPattern.test(origin)) return true;
  
  return false;
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  // Use the origin if it's allowed, otherwise fall back to primary production origin
  const corsOrigin = isAllowedOrigin(origin) && origin ? origin : 'https://xzyqcnapqfiawjmgfxws.lovableproject.com';
  
  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function createSessionCookie(token: string, expiresAt: Date, isSecure: boolean): string {
  const cookieOptions = [
    `${COOKIE_NAME}=${token}`,
    `Path=/`,
    `HttpOnly`,
    // SameSite=None is required for cross-origin requests with credentials
    // Secure is required when using SameSite=None
    `SameSite=None`,
    `Secure`,
    `Expires=${expiresAt.toUTCString()}`,
  ];
  
  return cookieOptions.join('; ');
}

function createLogoutCookie(isSecure: boolean): string {
  const cookieOptions = [
    `${COOKIE_NAME}=`,
    `Path=/`,
    `HttpOnly`,
    // SameSite=None is required for cross-origin requests with credentials
    // Secure is required when using SameSite=None
    `SameSite=None`,
    `Secure`,
    `Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
    `Max-Age=0`,
  ];
  
  return cookieOptions.join('; ');
}

function getTokenFromCookie(req: Request): string | null {
  const cookieHeader = req.headers.get('cookie');
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';').map(c => c.trim());
  for (const cookie of cookies) {
    if (cookie.startsWith(`${COOKIE_NAME}=`)) {
      return cookie.substring(COOKIE_NAME.length + 1);
    }
  }
  return null;
}

function isSecureRequest(req: Request): boolean {
  const proto = req.headers.get('x-forwarded-proto');
  return proto === 'https' || req.url.startsWith('https://');
}

serve(async (req) => {
  const startTime = Date.now();
  console.log('=== Staff Auth Function v8.0 (httpOnly cookies) ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Request method:', req.method);

  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  const isSecure = isSecureRequest(req);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse body - read as text first, then parse JSON
    let body: any = {};
    try {
      const rawBody = await req.text();
      console.log('Raw body received:', rawBody ? 'present' : 'empty');
      if (rawBody && rawBody.trim().length > 0) {
        body = JSON.parse(rawBody);
        console.log('Parsed body action:', body?.action || 'login');
      }
    } catch (e) {
      console.error('Body parse error:', e);
      body = {};
    }

    // Get action - check body first, then URL params
    const url = new URL(req.url);
    const action = body?.action || url.searchParams.get('action') || 'login';
    
    console.log('Action detected:', action);

    // ========== LOGOUT ==========
    if (action === 'logout') {
      const token = getTokenFromCookie(req) || body?.token;
      console.log('Processing LOGOUT - token present:', !!token);

      if (token) {
        // Delete session from database
        const { error: deleteError } = await supabase
          .from('sessions')
          .delete()
          .eq('token', token);

        if (deleteError) {
          console.log('Session delete warning:', deleteError.message);
        }
      }

      console.log('Logout successful');
      return new Response(
        JSON.stringify({ success: true }),
        { 
          status: 200, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Set-Cookie': createLogoutCookie(isSecure),
          } 
        }
      );
    }

    // ========== EXTEND SESSION ==========
    if (action === 'extend') {
      const token = getTokenFromCookie(req) || body?.token;
      console.log('Processing EXTEND - token present:', !!token);

      if (!token) {
        return new Response(
          JSON.stringify({ success: false, error: 'No session found' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate current session first
      const { data: sessionData, error: sessionError } = await supabase.rpc('validate_session', { session_token: token });

      if (sessionError || !sessionData || sessionData.length === 0) {
        console.log('Invalid session for extension');
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid or expired session' }),
          { 
            status: 401, 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'Set-Cookie': createLogoutCookie(isSecure),
            } 
          }
        );
      }

      // Extend session by 8 hours
      const newExpiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);
      
      const { error: updateError } = await supabase
        .from('sessions')
        .update({ expires_at: newExpiresAt.toISOString() })
        .eq('token', token);

      if (updateError) {
        console.error('Session extension error:', updateError.message);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to extend session' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Session extended successfully until:', newExpiresAt.toISOString());
      return new Response(
        JSON.stringify({
          success: true,
          expiresAt: newExpiresAt.toISOString(),
        }),
        { 
          status: 200, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Set-Cookie': createSessionCookie(token, newExpiresAt, isSecure),
          } 
        }
      );
    }

    // ========== VALIDATE ==========
    if (action === 'validate') {
      // Priority: cookie > body > auth header
      const authHeader = req.headers.get('Authorization');
      const token = getTokenFromCookie(req) || body?.token || authHeader?.replace('Bearer ', '');

      console.log('Processing VALIDATE - token source:', 
        getTokenFromCookie(req) ? 'cookie' : (body?.token ? 'body' : (authHeader ? 'header' : 'none'))
      );

      if (!token) {
        return new Response(
          JSON.stringify({ valid: false, error: 'No session found' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase.rpc('validate_session', { session_token: token });

      if (error || !data || data.length === 0) {
        console.log('Invalid or expired session');
        return new Response(
          JSON.stringify({ valid: false, error: 'Invalid or expired session' }),
          { 
            status: 401, 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'Set-Cookie': createLogoutCookie(isSecure),
            } 
          }
        );
      }

      const session = data[0];
      console.log('Session valid for user:', session.username);
      
      return new Response(
        JSON.stringify({
          valid: true,
          user: {
            id: session.staff_user_id,
            username: session.username,
            fullName: session.full_name,
            role: session.role,
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== GET SESSION (for client to get current user info) ==========
    if (action === 'get-session') {
      // Accept token from body (localStorage) or cookie
      const token = body?.token || getTokenFromCookie(req);
      console.log('Processing GET-SESSION - token source:', body?.token ? 'body' : (getTokenFromCookie(req) ? 'cookie' : 'none'));

      if (!token) {
        return new Response(
          JSON.stringify({ authenticated: false }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase.rpc('validate_session', { session_token: token });

      if (error || !data || data.length === 0) {
        console.log('Session expired or invalid');
        return new Response(
          JSON.stringify({ authenticated: false }),
          { 
            status: 200, 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'Set-Cookie': createLogoutCookie(isSecure),
            } 
          }
        );
      }

      // Get session expiry
      const { data: sessionRecord } = await supabase
        .from('sessions')
        .select('expires_at')
        .eq('token', token)
        .single();

      const session = data[0];
      console.log('Session retrieved for user:', session.username);
      
      return new Response(
        JSON.stringify({
          authenticated: true,
          user: {
            id: session.staff_user_id,
            username: session.username,
            fullName: session.full_name,
            role: session.role,
          },
          expiresAt: sessionRecord?.expires_at,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== BOOTSTRAP ADMIN (one-time setup) ==========
    // Security hardening: requires bootstrap secret, rate-limited, logs attempts
    if (action === 'bootstrap-admin') {
      const username = body?.username;
      const bootstrapSecret = body?.bootstrapSecret;
      const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
      console.log('Processing BOOTSTRAP-ADMIN request from IP:', clientIp);

      // Require bootstrap secret for additional security
      const expectedBootstrapSecret = Deno.env.get('ADMIN_INITIAL_PASSWORD');
      if (!expectedBootstrapSecret) {
        console.log('Bootstrap not configured - ADMIN_INITIAL_PASSWORD not set');
        return new Response(
          JSON.stringify({ error: 'Bootstrap not configured' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify bootstrap secret matches
      if (!bootstrapSecret || bootstrapSecret !== expectedBootstrapSecret) {
        console.log('Bootstrap attempt with invalid secret from IP:', clientIp);
        return new Response(
          JSON.stringify({ error: 'Invalid bootstrap credentials' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if any admin users already exist
      const { data: existingAdmins, error: checkError } = await supabase
        .from('staff_users')
        .select('id')
        .eq('role', 'admin')
        .eq('is_active', true)
        .limit(1);

      if (checkError) {
        console.log('Error checking existing admins:', checkError.message);
        return new Response(
          JSON.stringify({ error: 'Failed to verify admin status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (existingAdmins && existingAdmins.length > 0) {
        console.log('Admin user already exists, bootstrap denied - IP:', clientIp);
        return new Response(
          JSON.stringify({ error: 'Admin user already exists. Use the staff management panel to create additional users.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate username
      if (!username || typeof username !== 'string' || username.length < 3 || username.length > 50) {
        return new Response(
          JSON.stringify({ error: 'Username must be between 3 and 50 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate username format (alphanumeric and underscores only)
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return new Response(
          JSON.stringify({ error: 'Username can only contain letters, numbers, and underscores' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Hash the password with bcrypt
      const hashedPassword = hashSync(expectedBootstrapSecret);
      console.log('Password hashed successfully for bootstrap admin');

      // Insert the admin user
      const { data: newAdmin, error: insertError } = await supabase
        .from('staff_users')
        .insert({
          username: username.toLowerCase().trim(),
          password_hash: hashedPassword,
          full_name: 'System Administrator',
          role: 'admin',
          is_active: true
        })
        .select('id, username, role')
        .single();

      if (insertError) {
        console.log('Error creating admin user:', insertError.message, 'IP:', clientIp);
        if (insertError.code === '23505') {
          return new Response(
            JSON.stringify({ error: 'Username already exists' }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        return new Response(
          JSON.stringify({ error: 'Failed to create admin user' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Bootstrap admin created successfully:', newAdmin.username, 'IP:', clientIp);
      console.log('SECURITY REMINDER: Delete ADMIN_INITIAL_PASSWORD secret after confirming login works');
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Admin user created successfully. Please delete the ADMIN_INITIAL_PASSWORD secret for security.',
          username: newAdmin.username 
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== HASH PASSWORD ==========
    if (action === 'hash-password') {
      const token = getTokenFromCookie(req) || body?.token;
      const password = body?.password;
      console.log('Processing HASH-PASSWORD');

      // Require admin authentication
      if (!token) {
        return new Response(
          JSON.stringify({ error: 'Admin authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate the session token and check for admin role
      const { data: sessionData, error: sessionError } = await supabase.rpc('validate_session', { session_token: token });

      if (sessionError || !sessionData || sessionData.length === 0) {
        console.log('Invalid session for hash-password');
        return new Response(
          JSON.stringify({ error: 'Invalid or expired session' }),
          { 
            status: 401, 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'Set-Cookie': createLogoutCookie(isSecure),
            } 
          }
        );
      }

      const session = sessionData[0];
      if (session.role !== 'admin') {
        console.log('Non-admin attempted hash-password:', session.username);
        return new Response(
          JSON.stringify({ error: 'Admin access required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!password) {
        return new Response(
          JSON.stringify({ error: 'Password is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Use hashSync instead of async hash to avoid Worker dependency
      const hashedPassword = hashSync(password);
      console.log('Password hashed successfully by admin:', session.username);

      return new Response(
        JSON.stringify({ hashedPassword }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== CHANGE PASSWORD ==========
    if (action === 'change-password') {
      const token = getTokenFromCookie(req) || body?.token;
      const userId = body?.userId;
      const newPassword = body?.newPassword;
      console.log('Processing CHANGE-PASSWORD for user:', userId);

      // Validate required fields
      if (!token || !userId || !newPassword) {
        return new Response(
          JSON.stringify({ error: 'Session, user ID, and new password are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate the session token
      const { data: sessionData, error: sessionError } = await supabase.rpc('validate_session', { session_token: token });

      if (sessionError || !sessionData || sessionData.length === 0) {
        console.log('Invalid session for password change');
        return new Response(
          JSON.stringify({ error: 'Unauthorized - invalid or expired session' }),
          { 
            status: 401, 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'Set-Cookie': createLogoutCookie(isSecure),
            } 
          }
        );
      }

      const caller = sessionData[0];
      console.log('Password change requested by:', caller.username, 'role:', caller.role);

      // Authorization check: user can only change their own password, unless they're admin
      if (userId !== caller.staff_user_id && caller.role !== 'admin') {
        console.log('Unauthorized: user', caller.staff_user_id, 'tried to change password for', userId);
        return new Response(
          JSON.stringify({ error: 'You can only change your own password' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Hash the new password using hashSync
      const hashedPassword = hashSync(newPassword);

      // Update the password in the database
      const { error: updateError } = await supabase
        .from('staff_users')
        .update({ 
          password_hash: hashedPassword,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Password update error:', updateError.message);
        return new Response(
          JSON.stringify({ error: 'Failed to update password' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // SECURITY: Invalidate all other sessions for this user after password change
      // This ensures compromised sessions are immediately revoked
      const { error: sessionDeleteError } = await supabase
        .from('sessions')
        .delete()
        .eq('staff_user_id', userId)
        .neq('token', token); // Keep current session active

      if (sessionDeleteError) {
        console.log('Warning: Failed to invalidate other sessions:', sessionDeleteError.message);
        // Continue anyway - password was changed successfully
      } else {
        console.log('Other sessions invalidated for user:', userId);
      }

      console.log('Password changed successfully for user:', userId, 'by:', caller.username);
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== LOGIN (default) ==========
    console.log('Processing LOGIN action');
    const username = body?.username;
    const password = body?.password;
    
    // Get client IP for rate limiting
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('cf-connecting-ip') || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    console.log('Login attempt - username:', username, 'password present:', !!password, 'IP:', clientIp);

    if (!username || !password) {
      console.log('Missing credentials for login');
      return new Response(
        JSON.stringify({ error: 'Username and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== RATE LIMITING ==========
    // Check if IP is rate limited (5 failed attempts in 15 minutes = blocked)
    const { data: rateLimitData, error: rateLimitError } = await supabase
      .rpc('check_login_rate_limit', { p_ip_address: clientIp });

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError.message);
      // Continue without rate limiting if there's an error
    } else if (rateLimitData === -1) {
      console.log('Rate limit exceeded for IP:', clientIp);
      return new Response(
        JSON.stringify({ 
          error: 'Too many failed login attempts. Please try again in 15 minutes.',
          code: 'RATE_LIMITED',
          retryAfter: 900 // 15 minutes in seconds
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': '900'
          } 
        }
      );
    } else {
      console.log('Rate limit check passed. Remaining attempts:', rateLimitData);
    }

    // Find user by username
    const { data: user, error: userError } = await supabase
      .from('staff_users')
      .select('id, username, password_hash, full_name, role, is_active')
      .eq('username', username)
      .single();

    if (userError || !user) {
      console.log('User not found:', username);
      // Record failed attempt
      await supabase.rpc('record_login_attempt', { 
        p_ip_address: clientIp, 
        p_username: username, 
        p_success: false 
      });
      return new Response(
        JSON.stringify({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User found:', user.username, 'Active:', user.is_active);

    if (!user.is_active) {
      console.log('Account deactivated:', username);
      // Record failed attempt for inactive account
      await supabase.rpc('record_login_attempt', { 
        p_ip_address: clientIp, 
        p_username: username, 
        p_success: false 
      });
      return new Response(
        JSON.stringify({ error: 'Account is deactivated', code: 'ACCOUNT_INACTIVE' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify password using bcrypt only (legacy plain-text support removed)
    console.log('Verifying bcrypt hashed password');
    const passwordValid = compareSync(password, user.password_hash);
    if (!passwordValid) {
      console.log('Invalid password for user:', username);
      // Record failed attempt
      await supabase.rpc('record_login_attempt', { 
        p_ip_address: clientIp, 
        p_username: username, 
        p_success: false 
      });
      return new Response(
        JSON.stringify({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Record successful login attempt (clears the rate limit counter effectively)
    await supabase.rpc('record_login_attempt', { 
      p_ip_address: clientIp, 
      p_username: username, 
      p_success: true 
    });

    // Generate session token
    const token = crypto.randomUUID() + '-' + crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);

    console.log('Creating session for user:', user.id);

    // Create session
    const { error: sessionError } = await supabase
      .from('sessions')
      .insert({
        staff_user_id: user.id,
        token: token,
        expires_at: expiresAt.toISOString(),
      });

    if (sessionError) {
      console.error('Session creation error:', sessionError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to create session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const duration = Date.now() - startTime;
    console.log('Login successful for user:', username, 'Duration:', duration, 'ms');

    // Return success with token in body (for localStorage storage) AND httpOnly cookie as backup
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          role: user.role,
        },
        expiresAt: expiresAt.toISOString(),
        token: token, // Return token for client-side storage
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Set-Cookie': createSessionCookie(token, expiresAt, isSecure),
        } 
      }
    );

  } catch (error) {
    console.error('Staff auth error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
