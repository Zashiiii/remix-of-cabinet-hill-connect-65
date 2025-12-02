import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Version 3.0 - Fixed schema mismatch, removed invalid columns

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
  console.log('=== Submit Certificate Function v3.0 Started ===');
  console.log('Request method:', req.method);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight');
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

    // Parse request body safely
    let data: CertificateRequestData;
    try {
      const text = await req.text();
      console.log('Request body received, length:', text.length);
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Received certificate request:', {
      type: data.certificateType,
      name: data.fullName,
      contact: data.contactNumber,
    });

    // Validate required fields
    if (!data.fullName || !data.contactNumber || !data.certificateType || !data.purpose) {
      console.error('Missing required fields');
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

    // Generate control number
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    const controlNumber = `CERT-${dateStr}-${randomNum}`;

    // Capitalize priority
    const normalizedPriority = data.priority 
      ? data.priority.charAt(0).toUpperCase() + data.priority.slice(1).toLowerCase()
      : 'Regular';

    // Store additional info (household number, birth date) in resident_notes
    const additionalInfo = [];
    if (data.householdNumber) {
      additionalInfo.push(`Household: ${data.householdNumber}`);
    }
    if (data.birthDate) {
      additionalInfo.push(`Birth Date: ${data.birthDate}`);
    }
    const residentNotes = additionalInfo.length > 0 ? additionalInfo.join(' | ') : null;

    console.log('Inserting certificate request with control number:', controlNumber);

    // Insert only valid columns that exist in the schema
    const { data: insertedData, error } = await supabase
      .from('certificate_requests')
      .insert({
        control_number: controlNumber,
        certificate_type: data.certificateType,
        resident_name: data.fullName,
        resident_contact: data.contactNumber,
        resident_email: data.email || null,
        purpose: data.purpose,
        priority: normalizedPriority,
        status: 'Pending',
        requested_date: now.toISOString(),
        ready_date: data.preferredPickupDate,
        resident_notes: residentNotes,
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
