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

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'login';

    if (action === 'login') {
      const { username, password }: LoginRequest = await req.json();

      if (!username || !password) {
        return new Response(
          JSON.stringify({ error: 'Username and password are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Login attempt for user: ${username}`);

      // Find user by username
      const { data: user, error: userError } = await supabase
        .from('staff_users')
        .select('id, username, password_hash, full_name, role, is_active')
        .eq('username', username)
        .single();

      if (userError || !user) {
        console.log(`User not found: ${username}`);
        return new Response(
          JSON.stringify({ error: 'Invalid username or password' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!user.is_active) {
        return new Response(
          JSON.stringify({ error: 'Account is deactivated' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Simple password verification (in production, use bcrypt)
      // For now, we'll do a simple comparison - the password_hash should store the plain password
      // In a real system, you'd hash the incoming password and compare
      if (user.password_hash !== password) {
        console.log(`Invalid password for user: ${username}`);
        return new Response(
          JSON.stringify({ error: 'Invalid username or password' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate session token
      const token = crypto.randomUUID() + '-' + crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours from now

      // Create session
      const { error: sessionError } = await supabase
        .from('sessions')
        .insert({
          staff_id: user.id,
          token: token,
          expires_at: expiresAt.toISOString(),
        });

      if (sessionError) {
        console.error('Session creation error:', sessionError);
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

      console.log(`Login successful for user: ${username}`);

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
      const { token }: LogoutRequest = await req.json();

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

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'validate') {
      const authHeader = req.headers.get('Authorization');
      const token = authHeader?.replace('Bearer ', '');

      if (!token) {
        return new Response(
          JSON.stringify({ valid: false, error: 'No token provided' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate session using the database function
      const { data, error } = await supabase.rpc('validate_session', { p_token: token });

      if (error || !data || data.length === 0) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Invalid or expired session' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const session = data[0];
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

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Staff auth error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
