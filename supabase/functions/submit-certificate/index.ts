import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Version 4.0 - Force redeploy with improved logging and error handling

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
  const startTime = Date.now();
  console.log('=== Submit Certificate Function v4.0 Started ===');
  console.log('Timestamp:', new Date().toISOString());
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

    console.log('Environment check - SUPABASE_URL exists:', !!supabaseUrl);
    console.log('Environment check - SUPABASE_SERVICE_ROLE_KEY exists:', !!supabaseServiceKey);

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('CRITICAL: Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error', success: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('Supabase client created successfully');

    // Parse request body safely
    let data: CertificateRequestData;
    try {
      const text = await req.text();
      console.log('Request body length:', text.length);
      data = JSON.parse(text);
      console.log('Request body parsed successfully');
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid request body', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Certificate request data:', {
      type: data.certificateType,
      name: data.fullName,
      contact: data.contactNumber?.substring(0, 4) + '****',
      purpose: data.purpose?.substring(0, 20),
      priority: data.priority,
    });

    // Validate required fields
    if (!data.fullName || !data.contactNumber || !data.certificateType || !data.purpose) {
      const missingFields = [];
      if (!data.fullName) missingFields.push('fullName');
      if (!data.contactNumber) missingFields.push('contactNumber');
      if (!data.certificateType) missingFields.push('certificateType');
      if (!data.purpose) missingFields.push('purpose');
      console.error('Missing required fields:', missingFields);
      return new Response(
        JSON.stringify({ error: 'Please fill in all required fields', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate contact number format (11 digits starting with 09)
    if (!/^09\d{9}$/.test(data.contactNumber)) {
      console.error('Invalid contact number format:', data.contactNumber?.substring(0, 4));
      return new Response(
        JSON.stringify({ error: 'Contact number must be 11 digits starting with 09', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate control number
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    const controlNumber = `CERT-${dateStr}-${randomNum}`;
    console.log('Generated control number:', controlNumber);

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

    console.log('Preparing database insert...');
    console.log('Insert data preview:', {
      control_number: controlNumber,
      certificate_type: data.certificateType,
      resident_name: data.fullName,
      priority: normalizedPriority,
      status: 'Pending',
    });

    // Insert only valid columns that exist in the schema
    const { data: insertedData, error } = await supabase
      .from('certificate_requests')
      .insert({
        control_number: controlNumber,
        certificate_type: data.certificateType,
        full_name: data.fullName,
        contact_number: data.contactNumber,
        email: data.email || null,
        purpose: data.purpose,
        priority: normalizedPriority,
        status: 'Pending',
        preferred_pickup_date: data.preferredPickupDate || null,
        household_number: data.householdNumber || null,
        birth_date: data.birthDate || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Database insert error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return new Response(
        JSON.stringify({ 
          error: error.message || 'Failed to submit request',
          success: false,
          code: error.code 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const duration = Date.now() - startTime;
    console.log('=== Certificate request submitted successfully ===');
    console.log('Inserted record ID:', insertedData?.id);
    console.log('Control number:', controlNumber);
    console.log('Duration:', duration, 'ms');

    return new Response(
      JSON.stringify({ 
        success: true, 
        controlNumber,
        message: 'Certificate request submitted successfully',
        id: insertedData?.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('=== Unexpected error in submit-certificate ===');
    console.error('Error:', error);
    console.error('Duration:', duration, 'ms');
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred', success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
