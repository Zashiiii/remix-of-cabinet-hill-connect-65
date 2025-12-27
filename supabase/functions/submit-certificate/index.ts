import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Version 5.0 - Added rate limiting for certificate requests

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
  purpose: string;
  priority: string;
  preferredPickupDate: string;
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MINUTES = 60; // 1 hour window
const MAX_REQUESTS_PER_WINDOW = 5; // 5 requests per hour per IP

// In-memory rate limit store (resets on function cold start)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

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

function checkRateLimit(ip: string): { allowed: boolean; remainingRequests: number; retryAfterSeconds?: number } {
  const now = Date.now();
  const windowMs = RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;
  
  const record = rateLimitStore.get(ip);
  
  if (!record || now > record.resetTime) {
    // First request or window expired
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remainingRequests: MAX_REQUESTS_PER_WINDOW - 1 };
  }
  
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, remainingRequests: 0, retryAfterSeconds };
  }
  
  record.count++;
  return { allowed: true, remainingRequests: MAX_REQUESTS_PER_WINDOW - record.count };
}

serve(async (req) => {
  const startTime = Date.now();
  console.log('=== Submit Certificate Function v5.0 Started ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check rate limit before processing
    const clientIP = getClientIP(req);
    console.log('Client IP:', clientIP);
    
    const rateLimit = checkRateLimit(clientIP);
    console.log('Rate limit check:', { ip: clientIP, allowed: rateLimit.allowed, remaining: rateLimit.remainingRequests });
    
    if (!rateLimit.allowed) {
      console.warn('Rate limit exceeded for IP:', clientIP);
      return new Response(
        JSON.stringify({ 
          error: 'Too many requests. Please try again later.', 
          success: false,
          retryAfterSeconds: rateLimit.retryAfterSeconds
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimit.retryAfterSeconds)
          } 
        }
      );
    }

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
      'Business Permit',
      'Barangay ID',
      'Other'
    ];
    if (!allowedCertificateTypes.includes(data.certificateType)) {
      validationErrors.push('Invalid certificate type');
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
