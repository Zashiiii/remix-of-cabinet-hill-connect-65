import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Shield, FileText, Users, Lock, Clock, Scale, Mail, Phone, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-8">
        <div className="container mx-auto px-4">
          <Button
            variant="ghost"
            className="mb-4 text-primary-foreground hover:text-primary-foreground/80 hover:bg-primary-foreground/10"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary-foreground/10 flex items-center justify-center">
              <Shield className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Data Privacy Policy</h1>
              <p className="opacity-90">Barangay Resident Information System (BRIS)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="p-6 md:p-8 space-y-8">
            {/* Table of Contents */}
            <nav className="bg-muted/50 p-4 rounded-lg">
              <h2 className="font-semibold mb-3">Table of Contents</h2>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <li><a href="#introduction" className="text-primary hover:underline">1. Introduction</a></li>
                <li><a href="#scope" className="text-primary hover:underline">2. Scope</a></li>
                <li><a href="#data-collected" className="text-primary hover:underline">3. Data Collected</a></li>
                <li><a href="#purpose" className="text-primary hover:underline">4. Purpose of Collection</a></li>
                <li><a href="#access" className="text-primary hover:underline">5. Data Access</a></li>
                <li><a href="#security" className="text-primary hover:underline">6. Data Security</a></li>
                <li><a href="#retention" className="text-primary hover:underline">7. Data Retention</a></li>
                <li><a href="#rights" className="text-primary hover:underline">8. Your Rights</a></li>
                <li><a href="#consent" className="text-primary hover:underline">9. Consent Withdrawal</a></li>
                <li><a href="#contact" className="text-primary hover:underline">10. Contact Information</a></li>
              </ul>
            </nav>

            {/* Introduction */}
            <section id="introduction">
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-3">
                <Shield className="h-5 w-5 text-primary" />
                1. Introduction
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                The Barangay, through its Barangay Resident Information System (BRIS), is committed to 
                protecting the privacy of its residents and ensuring the security of personal information 
                collected and processed through this system. This Data Privacy Policy outlines our practices 
                concerning the collection, use, storage, and protection of your personal data in compliance 
                with Republic Act No. 10173, also known as the "Data Privacy Act of 2012" (DPA), and its 
                Implementing Rules and Regulations (IRR).
              </p>
            </section>

            {/* Scope */}
            <section id="scope">
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-primary" />
                2. Scope
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                This policy applies to all residents who register and use the BRIS platform, including but 
                not limited to those who:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground ml-4">
                <li>Create an account on the resident portal</li>
                <li>Request barangay certificates and clearances</li>
                <li>Participate in barangay census and surveys</li>
                <li>Communicate with barangay officials through the system</li>
                <li>Access any services provided through BRIS</li>
              </ul>
            </section>

            {/* Data Collected */}
            <section id="data-collected">
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-primary" />
                3. Data Collected
              </h2>
              <p className="text-muted-foreground mb-3">
                The following types of personal information may be collected through BRIS:
              </p>
              
              <div className="space-y-4">
                <div className="bg-muted/30 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Personal Identification Information</h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Full name (first name, middle name, last name, suffix)</li>
                    <li>Date of birth, gender, civil status</li>
                    <li>Contact number and email address</li>
                    <li>Valid ID documents (for verification purposes)</li>
                  </ul>
                </div>

                <div className="bg-muted/30 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Household and Census Data</h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Complete address (house number, street, purok, barangay)</li>
                    <li>Household composition and family members</li>
                    <li>Housing type and ownership status</li>
                    <li>Utilities and amenities information</li>
                  </ul>
                </div>

                <div className="bg-muted/30 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Socioeconomic Information</h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Educational attainment</li>
                    <li>Employment status and occupation</li>
                    <li>Monthly income bracket</li>
                    <li>Religion and ethnic affiliation (optional)</li>
                  </ul>
                </div>

                <div className="bg-muted/30 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Transaction and Communication Records</h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Certificate request history and status</li>
                    <li>Incident reports and complaints</li>
                    <li>Messages sent to and from barangay officials</li>
                    <li>System activity logs</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Purpose */}
            <section id="purpose">
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-3">
                <Lock className="h-5 w-5 text-primary" />
                4. Purpose of Data Collection
              </h2>
              <p className="text-muted-foreground mb-3">
                Your personal data is collected and processed for the following legitimate purposes:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li><strong>Service Delivery:</strong> Processing requests for barangay certificates, clearances, and other documents</li>
                <li><strong>Census Management:</strong> Maintaining accurate demographic and household records for planning and resource allocation</li>
                <li><strong>Emergency Response:</strong> Facilitating disaster preparedness and emergency communication</li>
                <li><strong>Government Compliance:</strong> Fulfilling legal obligations and reporting requirements to government agencies</li>
                <li><strong>Program Implementation:</strong> Identifying beneficiaries for barangay programs and services</li>
                <li><strong>Communication:</strong> Enabling correspondence between residents and barangay officials</li>
                <li><strong>Record-Keeping:</strong> Maintaining historical records for reference and audit purposes</li>
              </ul>
            </section>

            {/* Access */}
            <section id="access">
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-3">
                <Users className="h-5 w-5 text-primary" />
                5. Data Access
              </h2>
              <p className="text-muted-foreground mb-3">
                Access to your personal data is strictly limited to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li><strong>Authorized Barangay Staff:</strong> Personnel directly involved in processing your requests and maintaining records</li>
                <li><strong>Barangay Officials:</strong> Elected and appointed officials (Punong Barangay, Kagawad, SK Chairman) with official duties requiring data access</li>
                <li><strong>System Administrators:</strong> Technical personnel for system maintenance, with access logged and monitored</li>
              </ul>
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm font-medium text-destructive">
                  Your data will NOT be:
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                  <li>Sold or rented to any third party</li>
                  <li>Shared with commercial entities for marketing purposes</li>
                  <li>Disclosed to unauthorized individuals or organizations</li>
                  <li>Used for purposes other than those stated in this policy</li>
                </ul>
              </div>
            </section>

            {/* Security */}
            <section id="security">
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-3">
                <Shield className="h-5 w-5 text-primary" />
                6. Data Security
              </h2>
              <p className="text-muted-foreground mb-3">
                We implement appropriate technical and organizational measures to protect your personal data:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">Technical Measures</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• SSL/TLS encryption for data transmission</li>
                    <li>• Encrypted database storage</li>
                    <li>• Secure authentication protocols</li>
                    <li>• Regular security updates and patches</li>
                  </ul>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">Organizational Measures</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Role-based access control</li>
                    <li>• Staff training on data privacy</li>
                    <li>• Audit trails and activity logging</li>
                    <li>• Incident response procedures</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Retention */}
            <section id="retention">
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-3">
                <Clock className="h-5 w-5 text-primary" />
                7. Data Retention
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Your personal data will be retained for a period of <strong>five (5) years</strong> from 
                the date of collection or last update, whichever is later. This retention period aligns 
                with barangay record-keeping requirements and applicable government regulations.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-3">
                After the retention period, personal data will be securely disposed of through appropriate 
                methods (secure deletion for digital records, shredding for physical documents) unless:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground ml-4">
                <li>Longer retention is required by law</li>
                <li>Data is needed for ongoing legal proceedings</li>
                <li>You request continued retention of your records</li>
              </ul>
            </section>

            {/* Rights */}
            <section id="rights">
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-3">
                <Scale className="h-5 w-5 text-primary" />
                8. Your Rights Under the Data Privacy Act
              </h2>
              <p className="text-muted-foreground mb-4">
                As a data subject under RA 10173, you are entitled to the following rights:
              </p>
              <div className="space-y-3">
                {[
                  { title: "Right to Be Informed", desc: "You have the right to be informed whether your personal data is being, or has been, processed." },
                  { title: "Right to Access", desc: "You have the right to reasonable access to your personal data being processed." },
                  { title: "Right to Object", desc: "You have the right to object to the processing of your personal data, including processing for direct marketing, automated processing, or profiling." },
                  { title: "Right to Erasure or Blocking", desc: "You have the right to suspend, withdraw, or order the blocking, removal, or destruction of your personal data." },
                  { title: "Right to Rectification", desc: "You have the right to dispute and have corrected any inaccuracy or error in your personal data." },
                  { title: "Right to Data Portability", desc: "You have the right to obtain your personal data in an electronic or structured format." },
                  { title: "Right to File a Complaint", desc: "You have the right to lodge a complaint before the National Privacy Commission if you believe your data privacy rights have been violated." },
                  { title: "Right to Damages", desc: "You have the right to be indemnified for any damages sustained due to inaccurate, incomplete, outdated, false, unlawfully obtained, or unauthorized use of personal data." },
                ].map((right, index) => (
                  <div key={index} className="p-3 bg-muted/30 rounded-lg">
                    <h3 className="font-medium text-sm">{right.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{right.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Consent */}
            <section id="consent">
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-primary" />
                9. Consent and Withdrawal
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                By creating an account and using BRIS, you consent to the collection and processing of your 
                personal data as described in this policy. You may withdraw your consent at any time by:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground ml-4">
                <li>Submitting a written request to the Barangay Data Protection Officer</li>
                <li>Visiting the Barangay Hall in person with valid identification</li>
                <li>Sending a request through the BRIS messaging system</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Please note that withdrawal of consent may affect your ability to access certain barangay 
                services that require personal data processing.
              </p>
            </section>

            {/* Contact */}
            <section id="contact">
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-3">
                <Mail className="h-5 w-5 text-primary" />
                10. Contact Information
              </h2>
              <p className="text-muted-foreground mb-4">
                For questions, concerns, or to exercise your data privacy rights, please contact:
              </p>
              <div className="bg-primary/5 p-6 rounded-lg border border-primary/20">
                <h3 className="font-semibold text-lg mb-3">Barangay Data Protection Officer</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Barangay Hall, Barangay Salud Mitra
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Office Hours: Monday - Friday, 8:00 AM - 5:00 PM
                  </p>
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Or through the BRIS Messaging System
                  </p>
                </div>
              </div>
            </section>

            {/* Footer */}
            <div className="pt-6 border-t text-center">
              <p className="text-sm text-muted-foreground">
                <strong>Policy Version:</strong> 1.0 | <strong>Effective Date:</strong> December 2024
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                This policy may be updated from time to time. Users will be notified of significant changes 
                through the BRIS platform.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Back Button */}
        <div className="text-center mt-8">
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Previous Page
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
