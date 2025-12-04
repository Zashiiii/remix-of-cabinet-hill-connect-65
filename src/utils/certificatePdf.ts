import { supabase } from "@/integrations/supabase/client";
import JSZip from "jszip";

interface CertificateData {
  fullName: string;
  address?: string;
  civilStatus?: string;
  age?: number;
  birthDate?: string;
  purpose?: string;
  controlNumber: string;
  yearsOfResidency?: number;
}

interface TemplateData {
  id: string;
  name: string;
  certificateType: string;
  templateContent: string;
  placeholders: string[];
}

export interface CertificateRequestForBulk {
  id: string;
  controlNumber: string;
  fullName: string;
  certificateType: string;
  birthDate?: string;
  purpose?: string;
  residentId?: string;
}

// System settings (would typically come from database)
const SYSTEM_SETTINGS = {
  barangay_name: "Salud Mitra",
  city: "Baguio City",
  province: "Benguet",
  punong_barangay: "Hon. Juan Dela Cruz",
};

export const fetchTemplateByType = async (certificateType: string): Promise<TemplateData | null> => {
  try {
    const { data, error } = await supabase
      .from("certificate_templates")
      .select("*")
      .eq("certificate_type", certificateType)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name,
      certificateType: data.certificate_type,
      templateContent: data.template_content,
      placeholders: Array.isArray(data.placeholders) 
        ? (data.placeholders as unknown as string[]) 
        : [],
    };
  } catch (error) {
    console.error("Error fetching template:", error);
    return null;
  }
};

export const generateCertificateHtml = (
  template: TemplateData,
  data: CertificateData
): string => {
  let html = template.templateContent;

  const replacements: Record<string, string> = {
    full_name: data.fullName,
    address: data.address || "N/A",
    civil_status: data.civilStatus || "N/A",
    age: data.age?.toString() || "N/A",
    birth_date: data.birthDate || "N/A",
    purpose: data.purpose || "N/A",
    control_number: data.controlNumber,
    date_issued: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    years_of_residency: data.yearsOfResidency?.toString() || "N/A",
    ...SYSTEM_SETTINGS,
  };

  Object.entries(replacements).forEach(([key, value]) => {
    html = html.replace(new RegExp(`{{${key}}}`, "g"), value);
  });

  return html;
};

export const downloadCertificatePdf = async (
  certificateType: string,
  data: CertificateData
): Promise<boolean> => {
  try {
    // Map user-friendly names to template types
    const typeMap: Record<string, string> = {
      "Barangay Clearance": "barangay-clearance",
      "Certificate of Indigency": "certificate-of-indigency",
      "Certificate of Residency": "certificate-of-residency",
    };

    const templateType = typeMap[certificateType] || certificateType.toLowerCase().replace(/ /g, "-");
    const template = await fetchTemplateByType(templateType);

    if (!template) {
      console.error("Template not found for type:", templateType);
      return false;
    }

    const html = generateCertificateHtml(template, data);

    // Create a printable window
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      console.error("Could not open print window");
      return false;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${template.name} - ${data.controlNumber}</title>
          <style>
            @media print {
              body { margin: 0; padding: 20mm; }
              @page { size: A4; margin: 20mm; }
            }
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            h1, h2, h3 { margin: 0.5em 0; }
            hr { border: none; border-top: 2px solid #333; margin: 1em 0; }
            .no-print { display: none; }
            @media screen {
              body { padding: 40px; max-width: 800px; margin: 0 auto; }
              .print-btn {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 10px 20px;
                background: #1a56db;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
              }
              .print-btn:hover { background: #1e40af; }
            }
          </style>
        </head>
        <body>
          <button class="print-btn no-print" onclick="window.print()">Print / Save as PDF</button>
          ${html}
        </body>
      </html>
    `);

    printWindow.document.close();
    return true;
  } catch (error) {
    console.error("Error generating certificate:", error);
    return false;
  }
};

// Generate certificate HTML for bulk download (returns full HTML string)
export const generateCertificateFullHtml = async (
  certificateType: string,
  data: CertificateData
): Promise<{ html: string; filename: string } | null> => {
  try {
    const typeMap: Record<string, string> = {
      "Barangay Clearance": "barangay-clearance",
      "Certificate of Indigency": "certificate-of-indigency",
      "Certificate of Residency": "certificate-of-residency",
    };

    const templateType = typeMap[certificateType] || certificateType.toLowerCase().replace(/ /g, "-");
    const template = await fetchTemplateByType(templateType);

    if (!template) {
      console.error("Template not found for type:", templateType);
      return null;
    }

    const html = generateCertificateHtml(template, data);
    const filename = `${data.controlNumber}_${certificateType.replace(/ /g, "_")}.html`;

    const fullHtml = `<!DOCTYPE html>
<html>
  <head>
    <title>${template.name} - ${data.controlNumber}</title>
    <style>
      @media print {
        body { margin: 0; padding: 20mm; }
        @page { size: A4; margin: 20mm; }
      }
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        color: #333;
      }
      h1, h2, h3 { margin: 0.5em 0; }
      hr { border: none; border-top: 2px solid #333; margin: 1em 0; }
    </style>
  </head>
  <body>
    ${html}
  </body>
</html>`;

    return { html: fullHtml, filename };
  } catch (error) {
    console.error("Error generating certificate HTML:", error);
    return null;
  }
};

// Fetch certificate data for bulk download
export const fetchCertificateDataForBulk = async (
  controlNumber: string
): Promise<CertificateData | null> => {
  try {
    const { data: requestData, error } = await supabase
      .from('certificate_requests')
      .select(`
        *,
        residents (
          *,
          households (*)
        )
      `)
      .eq('control_number', controlNumber)
      .single();

    if (error || !requestData) {
      console.error("Failed to fetch certificate data:", error);
      return null;
    }

    // Calculate age from birth_date
    let age: number | undefined;
    if (requestData.birth_date) {
      const today = new Date();
      const birth = new Date(requestData.birth_date);
      age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
    }

    // Build address from resident data
    let address = "";
    if (requestData.residents?.households) {
      const h = requestData.residents.households;
      address = [h.address, h.barangay, h.city, h.province]
        .filter(Boolean)
        .join(", ");
    }

    // Get civil status and years of residency
    const civilStatus = requestData.residents?.civil_status || undefined;
    const yearsOfResidency = requestData.residents?.households?.years_staying || undefined;

    return {
      fullName: requestData.full_name,
      address,
      civilStatus,
      age,
      birthDate: requestData.birth_date ? new Date(requestData.birth_date).toLocaleDateString() : undefined,
      purpose: requestData.purpose || undefined,
      controlNumber: requestData.control_number,
      yearsOfResidency,
    };
  } catch (error) {
    console.error("Error fetching certificate data for bulk:", error);
    return null;
  }
};

// Bulk download certificates as ZIP
export const bulkDownloadCertificates = async (
  controlNumbers: string[],
  certificateTypes: Record<string, string>,
  onProgress?: (current: number, total: number) => void
): Promise<boolean> => {
  try {
    const zip = new JSZip();
    const total = controlNumbers.length;
    let current = 0;
    let successCount = 0;

    for (const controlNumber of controlNumbers) {
      current++;
      onProgress?.(current, total);

      // Fetch certificate data
      const certData = await fetchCertificateDataForBulk(controlNumber);
      if (!certData) {
        console.warn(`Skipping ${controlNumber}: Could not fetch data`);
        continue;
      }

      const certificateType = certificateTypes[controlNumber];
      const result = await generateCertificateFullHtml(certificateType, certData);

      if (result) {
        zip.file(result.filename, result.html);
        successCount++;
      }
    }

    if (successCount === 0) {
      console.error("No certificates were generated");
      return false;
    }

    // Generate and download ZIP
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const filename = `certificates_${new Date().toISOString().split('T')[0]}_${Date.now()}.zip`;

    // Trigger download
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error("Error in bulk download:", error);
    return false;
  }
};

// Log audit trail for certificate generation
export const logCertificateGeneration = async (
  controlNumber: string,
  certificateType: string,
  generatedBy: string
) => {
  try {
    await supabase.from("audit_logs").insert({
      action: "generate_certificate",
      entity_type: "certificate_request",
      entity_id: controlNumber,
      performed_by: generatedBy,
      performed_by_type: "staff",
      details: {
        certificate_type: certificateType,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error logging certificate generation:", error);
  }
};

// Log bulk download audit trail
export const logBulkCertificateDownload = async (
  controlNumbers: string[],
  downloadedBy: string
) => {
  try {
    await supabase.from("audit_logs").insert({
      action: "bulk_download_certificates",
      entity_type: "certificate_request",
      entity_id: null,
      performed_by: downloadedBy,
      performed_by_type: "staff",
      details: {
        control_numbers: controlNumbers,
        count: controlNumbers.length,
        downloaded_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error logging bulk certificate download:", error);
  }
};

// Log batch status update audit trail
export const logBatchStatusUpdate = async (
  controlNumbers: string[],
  newStatus: string,
  updatedBy: string
) => {
  try {
    await supabase.from("audit_logs").insert({
      action: "batch_status_update",
      entity_type: "certificate_request",
      entity_id: null,
      performed_by: updatedBy,
      performed_by_type: "staff",
      details: {
        control_numbers: controlNumbers,
        count: controlNumbers.length,
        new_status: newStatus,
        updated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error logging batch status update:", error);
  }
};
