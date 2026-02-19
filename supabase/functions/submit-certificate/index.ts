import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Version 6.0 - Uses persistent database rate limiting and UUID-based control numbers

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CertificateRequestData {
  certificateType: string;
  customCertificateName?: string;
  fullName: string;
  contactNumber: string;
  email?: string;
  householdNumber: string;
  purpose: string;
  priority: string;
  preferredPickupDate: string;
}

function getClientIP(req: Request): string {
  // Try to get the real IP from various headers
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // Fallback to a default if no IP found
  return 'unknown';
}

// Generate cryptographically secure control number (UUID-based)
function generateSecureControlNumber(): string {
  const uuid = crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase();
  return `CERT-${uuid}`;
}

serve(async (req) => {
  const startTime = Date.now();
  console.log('=== Submit Certificate Function v6.0 Started ===');
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

    // Check persistent rate limit using database
    const clientIP = getClientIP(req);
    console.log('Client IP:', clientIP);
    
    const { data: rateLimit, error: rateLimitError } = await supabase
      .rpc('check_certificate_rate_limit', { p_ip_address: clientIP });
    
    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
      // Don't block on rate limit errors - log and continue
    } else if (rateLimit && rateLimit.length > 0 && !rateLimit[0].allowed) {
      console.warn('Rate limit exceeded for IP:', clientIP);
      return new Response(
        JSON.stringify({ 
          error: 'Too many requests. Please try again later.', 
          success: false,
          retryAfterSeconds: rateLimit[0].retry_after_seconds
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimit[0].retry_after_seconds)
          } 
        }
      );
    }
    
    console.log('Rate limit check passed:', { ip: clientIP, remaining: rateLimit?.[0]?.remaining_requests });

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

    // Input length validation to prevent DoS and database bloat
    const validationErrors: string[] = [];
    
    if (data.fullName.length > 200) {
      validationErrors.push('Full name must be 200 characters or less');
    }
    if (data.purpose.length > 500) {
      validationErrors.push('Purpose must be 500 characters or less');
    }
    if (data.email && data.email.length > 254) {
      validationErrors.push('Email must be 254 characters or less');
    }
    if (data.householdNumber && data.householdNumber.length > 50) {
      validationErrors.push('Household number must be 50 characters or less');
    }
    if (data.certificateType.length > 100) {
      validationErrors.push('Certificate type must be 100 characters or less');
    }
    
    // Validate certificate type against allowed values
    const allowedCertificateTypes = [
      'Barangay Clearance',
      'Certificate of Residency', 
      'Certificate of Indigency',
      'Business Clearance',
      'Solo Parent Certification',
      'Good Moral',
      'Others'
    ];
    if (!allowedCertificateTypes.includes(data.certificateType)) {
      validationErrors.push('Invalid certificate type');
    }
    
    // Validate custom certificate name when "Others" is selected
    if (data.certificateType === 'Others') {
      if (!data.customCertificateName || data.customCertificateName.trim() === '') {
        validationErrors.push('Please specify the certificate type');
      } else if (data.customCertificateName.length > 200) {
        validationErrors.push('Custom certificate name must be 200 characters or less');
      }
    }

    if (validationErrors.length > 0) {
      console.error('Input validation errors:', validationErrors);
      return new Response(
        JSON.stringify({ error: validationErrors.join('. '), success: false }),
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

    // Generate secure UUID-based control number (not guessable)
    const controlNumber = generateSecureControlNumber();
    console.log('Generated secure control number:', controlNumber);

    // Capitalize priority
    const normalizedPriority = data.priority 
      ? data.priority.charAt(0).toUpperCase() + data.priority.slice(1).toLowerCase()
      : 'Regular';

    // Store additional info (household number) in notes if needed
    const additionalInfo = [];
    if (data.householdNumber) {
      additionalInfo.push(`Household: ${data.householdNumber}`);
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
        custom_certificate_name: data.certificateType === 'Others' ? (data.customCertificateName?.trim() || null) : null,
        full_name: data.fullName,
        contact_number: data.contactNumber,
        email: data.email || null,
        purpose: data.purpose,
        priority: normalizedPriority,
        status: 'Pending',
        preferred_pickup_date: data.preferredPickupDate || null,
        household_number: data.householdNumber || null,
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