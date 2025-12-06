import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// Use hashSync and compareSync to avoid Worker dependency issue in Supabase Edge Runtime
import { hashSync, compareSync } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

// Version 7.0 - Fixed bcrypt Worker issue by using sync methods

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  const startTime = Date.now();
  console.log('=== Staff Auth Function v7.0 Started ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Request method:', req.method);

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
      const token = body?.token;
      console.log('Processing LOGOUT - token present:', !!token);

      if (!token) {
        return new Response(
          JSON.stringify({ success: true, message: 'No token provided, already logged out' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete session
      const { error: deleteError } = await supabase
        .from('sessions')
        .delete()
        .eq('token', token);

      if (deleteError) {
        console.log('Session delete warning:', deleteError.message);
      }

      console.log('Logout successful');
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== EXTEND SESSION ==========
    if (action === 'extend') {
      const token = body?.token;
      console.log('Processing EXTEND - token present:', !!token);

      if (!token) {
        return new Response(
          JSON.stringify({ success: false, error: 'No token provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate current session first
      const { data: sessionData, error: sessionError } = await supabase.rpc('validate_session', { session_token: token });

      if (sessionError || !sessionData || sessionData.length === 0) {
        console.log('Invalid session for extension');
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid or expired session' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Extend session by 8 hours
      const newExpiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
      
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
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== VALIDATE ==========
    if (action === 'validate') {
      const authHeader = req.headers.get('Authorization');
      const token = body?.token || authHeader?.replace('Bearer ', '');

      console.log('Processing VALIDATE - token present:', !!token);

      if (!token) {
        return new Response(
          JSON.stringify({ valid: false, error: 'No token provided' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase.rpc('validate_session', { session_token: token });

      if (error || !data || data.length === 0) {
        console.log('Invalid or expired session');
        return new Response(
          JSON.stringify({ valid: false, error: 'Invalid or expired session' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // ========== HASH PASSWORD ==========
    if (action === 'hash-password') {
      const token = body?.token;
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
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      const token = body?.token;
      const userId = body?.userId;
      const newPassword = body?.newPassword;
      console.log('Processing CHANGE-PASSWORD for user:', userId);

      // Validate required fields
      if (!token || !userId || !newPassword) {
        return new Response(
          JSON.stringify({ error: 'Token, user ID, and new password are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate the session token
      const { data: sessionData, error: sessionError } = await supabase.rpc('validate_session', { session_token: token });

      if (sessionError || !sessionData || sessionData.length === 0) {
        console.log('Invalid session for password change');
        return new Response(
          JSON.stringify({ error: 'Unauthorized - invalid or expired session' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    
    console.log('Login attempt - username:', username, 'password present:', !!password);

    if (!username || !password) {
      console.log('Missing credentials for login');
      return new Response(
        JSON.stringify({ error: 'Username and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find user by username
    const { data: user, error: userError } = await supabase
      .from('staff_users')
      .select('id, username, password_hash, full_name, role, is_active')
      .eq('username', username)
      .single();

    if (userError || !user) {
      console.log('User not found:', username);
      return new Response(
        JSON.stringify({ error: 'User not found', code: 'USER_NOT_FOUND' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User found:', user.username, 'Active:', user.is_active);

    if (!user.is_active) {
      console.log('Account deactivated:', username);
      return new Response(
        JSON.stringify({ error: 'Account is deactivated', code: 'ACCOUNT_INACTIVE' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify password using bcrypt sync methods
    // Support both legacy plain-text and new hashed passwords during migration
    let passwordValid = false;
    
    if (user.password_hash.startsWith('$2')) {
      // Password is hashed (bcrypt hash starts with $2a$, $2b$, or $2y$)
      console.log('Verifying bcrypt hashed password using compareSync');
      passwordValid = compareSync(password, user.password_hash);
    } else {
      // Legacy plain-text password - verify and upgrade to hash
      console.log('Verifying legacy plain-text password');
      passwordValid = user.password_hash === password;
      
      if (passwordValid) {
        // Upgrade plain-text password to hashed password using hashSync
        console.log('Upgrading plain-text password to bcrypt hash for user:', username);
        const hashedPassword = hashSync(password);
        await supabase
          .from('staff_users')
          .update({ password_hash: hashedPassword })
          .eq('id', user.id);
        console.log('Password upgraded successfully for user:', username);
      }
    }

    if (!passwordValid) {
      console.log('Invalid password for user:', username);
      return new Response(
        JSON.stringify({ error: 'Incorrect password', code: 'INVALID_PASSWORD' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate session token
    const token = crypto.randomUUID() + '-' + crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours

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

    return new Response(
      JSON.stringify({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          role: user.role,
        },
        expiresAt: expiresAt.toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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