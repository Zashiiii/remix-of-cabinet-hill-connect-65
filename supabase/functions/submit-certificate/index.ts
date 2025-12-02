import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CertificateRequestData {
  certificateType: string;
  fullName: string;
  contactNumber: string;
  email?: string;
  householdNumber: string;
  birthDate: string;
  purpose: string;
  priority: string;
  preferredPickupDate: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
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

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const data: CertificateRequestData = await req.json();
    console.log('Received certificate request:', {
      type: data.certificateType,
      name: data.fullName,
      contact: data.contactNumber,
    });

    // Validate required fields
    if (!data.fullName || !data.contactNumber || !data.certificateType || !data.purpose) {
      return new Response(
        JSON.stringify({ error: 'Please fill in all required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate contact number format (11 digits starting with 09)
    if (!/^09\d{9}$/.test(data.contactNumber)) {
      return new Response(
        JSON.stringify({ error: 'Contact number must be 11 digits starting with 09' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate household number (3-5 chars)
    if (!data.householdNumber || data.householdNumber.length < 3 || data.householdNumber.length > 5) {
      return new Response(
        JSON.stringify({ error: 'Household number must be 3-5 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate control number
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    const controlNumber = `CERT-${dateStr}-${randomNum}`;

    // Capitalize priority
    const normalizedPriority = data.priority.charAt(0).toUpperCase() + data.priority.slice(1).toLowerCase();

    console.log('Inserting certificate request with control number:', controlNumber);

    const { data: insertedData, error } = await supabase
      .from('certificate_requests')
      .insert({
        control_number: controlNumber,
        certificate_type: data.certificateType,
        resident_name: data.fullName,
        resident_contact: data.contactNumber,
        resident_email: data.email || null,
        household_code: data.householdNumber,
        birth_date: data.birthDate,
        purpose: data.purpose,
        priority: normalizedPriority,
        status: 'Pending',
        requested_date: now.toISOString(),
        ready_date: data.preferredPickupDate,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: error.message || 'Failed to submit request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Certificate request submitted successfully:', insertedData?.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        controlNumber,
        message: 'Certificate request submitted successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
