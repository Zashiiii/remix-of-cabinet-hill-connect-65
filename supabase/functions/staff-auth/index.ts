import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LoginRequest {
  username: string;
  password: string;
}

interface LogoutRequest {
  token: string;
}

serve(async (req) => {
  console.log('=== Staff Auth Function Started ===');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);

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
      console.error('SUPABASE_URL present:', !!supabaseUrl);
      console.error('SUPABASE_SERVICE_ROLE_KEY present:', !!supabaseServiceKey);
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Environment variables loaded successfully');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse body first to check for action
    let body: any = {};
    try {
      const text = await req.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch (e) {
      console.log('Could not parse body:', e);
    }

    // Get action from URL params or body
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || body.action || 'login';
    
    console.log('Action requested:', action);
    console.log('Body received:', JSON.stringify(body));

    if (action === 'login') {
      const { username, password } = body;
      
      console.log('Login attempt - username:', username);

      if (!username || !password) {
        console.log('Missing credentials - username:', !!username, 'password:', !!password);
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

      if (userError) {
        console.error('Database error finding user:', userError.message);
      }

      if (userError || !user) {
        console.log('User not found:', username);
        return new Response(
          JSON.stringify({ error: 'Invalid username or password' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('User found:', user.username, 'Active:', user.is_active);

      if (!user.is_active) {
        console.log('Account deactivated:', username);
        return new Response(
          JSON.stringify({ error: 'Account is deactivated' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Simple password verification
      if (user.password_hash !== password) {
        console.log('Invalid password for user:', username);
        return new Response(
          JSON.stringify({ error: 'Invalid username or password' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate session token
      const token = crypto.randomUUID() + '-' + crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours from now

      console.log('Creating session for user:', user.id);

      // Create session
      const { error: sessionError } = await supabase
        .from('sessions')
        .insert({
          staff_id: user.id,
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

      // Update last login
      await supabase
        .from('staff_users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);

      console.log('Login successful for user:', username);

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
    }

    if (action === 'logout') {
      const { token } = body;

      console.log('Logout attempt');

      if (!token) {
        return new Response(
          JSON.stringify({ error: 'Token is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete session
      await supabase
        .from('sessions')
        .delete()
        .eq('token', token);

      console.log('Logout successful');

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'validate') {
      // Check for token in body or header
      const authHeader = req.headers.get('Authorization');
      const token = body.token || authHeader?.replace('Bearer ', '');

      console.log('Validate attempt - token present:', !!token);

      if (!token) {
        return new Response(
          JSON.stringify({ valid: false, error: 'No token provided' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate session using the database function
      const { data, error } = await supabase.rpc('validate_session', { p_token: token });

      if (error) {
        console.error('Validation RPC error:', error.message);
      }

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
            id: session.staff_id,
            username: session.username,
            fullName: session.full_name,
            role: session.role,
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Invalid action:', action);
    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Staff auth error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
