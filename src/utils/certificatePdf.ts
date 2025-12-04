import { supabase } from "@/integrations/supabase/client";

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
