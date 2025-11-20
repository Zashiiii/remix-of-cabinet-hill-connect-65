// Placeholder API functions for certificate requests
// These will be replaced with n8n webhook calls in Phase 2

export interface CertificateRequestData {
  certificateType: string;
  fullName: string;
  contactNumber: string;
  email?: string;
  householdNumber: string;
  birthDate: Date;
  purpose: string;
  priority: string;
}

export interface RequestStatus {
  controlNumber: string;
  certificateType: string;
  residentName: string;
  dateRequested: Date;
  status: "pending" | "for_review" | "approved" | "ready_for_pickup" | "released" | "rejected";
  purpose: string;
  remarks?: string;
}

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Submit a certificate request
 * @param data - Certificate request form data
 * @returns Control number for tracking
 */
export const submitCertificateRequest = async (data: CertificateRequestData): Promise<string> => {
  // Simulate API call delay
  await delay(1500);
  
  // Simulate occasional failures (10% chance)
  if (Math.random() < 0.1) {
    throw new Error("Network error");
  }
  
  // Generate mock control number
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  const randomNum = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  const controlNumber = `CERT-${dateStr}-${randomNum}`;
  
  // Store in localStorage for demo purposes
  const requests = JSON.parse(localStorage.getItem('certificateRequests') || '{}');
  requests[controlNumber] = {
    controlNumber,
    certificateType: data.certificateType,
    residentName: data.fullName,
    dateRequested: new Date(),
    status: 'pending',
    purpose: data.purpose,
  };
  localStorage.setItem('certificateRequests', JSON.stringify(requests));
  
  return controlNumber;
};

/**
 * Track a certificate request by control number
 * @param controlNumber - The control number to track
 * @returns Request status information
 */
export const trackRequest = async (controlNumber: string): Promise<RequestStatus | null> => {
  // Simulate API call delay
  await delay(800);
  
  // Simulate occasional failures (5% chance)
  if (Math.random() < 0.05) {
    throw new Error("Network error");
  }
  
  // Check localStorage first
  const requests = JSON.parse(localStorage.getItem('certificateRequests') || '{}');
  if (requests[controlNumber]) {
    return requests[controlNumber];
  }
  
  // Mock data for demo
  const mockRequests: Record<string, RequestStatus> = {
    "CERT-20251001-0001": {
      controlNumber: "CERT-20251001-0001",
      certificateType: "Barangay Clearance",
      residentName: "Juan Dela Cruz",
      dateRequested: new Date("2025-10-01"),
      status: "ready_for_pickup",
      purpose: "Employment requirement for job application at ABC Company",
      remarks: "Certificate is ready for pickup at the barangay hall during office hours (8:00 AM - 5:00 PM, Monday-Friday). Please bring a valid ID.",
    },
    "CERT-20251002-0023": {
      controlNumber: "CERT-20251002-0023",
      certificateType: "Certificate of Indigency",
      residentName: "Maria Santos",
      dateRequested: new Date("2025-10-02"),
      status: "for_review",
      purpose: "Medical assistance for hospital bills",
    },
    "CERT-20251003-0045": {
      controlNumber: "CERT-20251003-0045",
      certificateType: "Certificate of Residency",
      residentName: "Pedro Reyes",
      dateRequested: new Date("2025-10-03"),
      status: "approved",
      purpose: "Proof of residency for school enrollment",
      remarks: "Document is being prepared and will be ready for pickup soon.",
    },
    "CERT-20251004-0067": {
      controlNumber: "CERT-20251004-0067",
      certificateType: "Business Permit Clearance",
      residentName: "Ana Garcia",
      dateRequested: new Date("2025-10-04"),
      status: "pending",
      purpose: "Starting a sari-sari store in the barangay",
    },
    "CERT-20251005-0089": {
      controlNumber: "CERT-20251005-0089",
      certificateType: "Certificate of Good Moral Character",
      residentName: "Jose Mendoza",
      dateRequested: new Date("2025-10-05"),
      status: "rejected",
      purpose: "Application for scholarship program",
      remarks: "Unable to verify residency. Please visit the barangay hall to update your records.",
    },
  };
  
  return mockRequests[controlNumber] || null;
};
