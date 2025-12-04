import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, FileText, Users, Lock, Clock, Scale } from "lucide-react";

interface DataPrivacyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

const DataPrivacyModal = ({ 
  open, 
  onOpenChange, 
  onAccept,
  showAcceptButton = false 
}: DataPrivacyModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">Data Privacy Statement</DialogTitle>
              <DialogDescription>
                Barangay Resident Information System (BRIS)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6 text-sm">
            {/* Introduction */}
            <section>
              <p className="text-muted-foreground leading-relaxed">
                In compliance with Republic Act No. 10173, also known as the Data Privacy Act of 2012, 
                and its Implementing Rules and Regulations, the Barangay is committed to protecting your 
                personal information and respecting your privacy rights.
              </p>
            </section>

            {/* What Data We Collect */}
            <section>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-foreground">What Data We Collect</h3>
              </div>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                <li><strong>Personal Information:</strong> Name, birth date, gender, civil status, contact details, email address</li>
                <li><strong>Household Data:</strong> Address, household composition, family members, dwelling information</li>
                <li><strong>Census Information:</strong> Employment status, education, income bracket, health records</li>
                <li><strong>Transaction Records:</strong> Certificate requests, barangay clearances, incident reports</li>
                <li><strong>Communication Records:</strong> Messages sent to barangay officials</li>
              </ul>
            </section>

            {/* Who Can Access */}
            <section>
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-foreground">Who Can Access Your Data</h3>
              </div>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                <li>Authorized Barangay Staff members</li>
                <li>Barangay Officials (Kapitan, Kagawad, SK Chairman)</li>
                <li>System Administrators for technical maintenance only</li>
              </ul>
              <p className="mt-2 text-muted-foreground">
                <strong>Your data will NOT be shared</strong> with third parties, commercial entities, or 
                external organizations without your explicit consent or unless required by law.
              </p>
            </section>

            {/* Purpose of Collection */}
            <section>
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-foreground">Purpose of Data Collection</h3>
              </div>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                <li>Processing of barangay certificates and clearances</li>
                <li>Maintaining accurate census and demographic records</li>
                <li>Delivering barangay services and programs</li>
                <li>Emergency response and disaster preparedness</li>
                <li>Communication between residents and barangay officials</li>
                <li>Statistical reporting to government agencies as required by law</li>
              </ul>
            </section>

            {/* Data Retention */}
            <section>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-foreground">Data Retention Policy</h3>
              </div>
              <p className="text-muted-foreground">
                Your personal data will be retained for a period of <strong>five (5) years</strong> from 
                the date of collection or as required by barangay regulations and applicable laws. After 
                this period, data will be securely disposed of unless retention is required for legal 
                purposes.
              </p>
            </section>

            {/* Your Rights */}
            <section>
              <div className="flex items-center gap-2 mb-2">
                <Scale className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-foreground">Your Rights Under RA 10173</h3>
              </div>
              <p className="text-muted-foreground mb-2">As a data subject, you have the right to:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                <li><strong>Right to Be Informed:</strong> Know what personal data is being collected and how it will be used</li>
                <li><strong>Right to Access:</strong> Request access to your personal data held by the barangay</li>
                <li><strong>Right to Object:</strong> Object to the processing of your personal data</li>
                <li><strong>Right to Erasure/Blocking:</strong> Request deletion or blocking of personal data under certain conditions</li>
                <li><strong>Right to Rectification:</strong> Correct inaccurate or incomplete personal data</li>
                <li><strong>Right to Data Portability:</strong> Obtain a copy of your data in a commonly used format</li>
                <li><strong>Right to Lodge Complaints:</strong> File a complaint with the National Privacy Commission</li>
              </ul>
            </section>

            {/* Security Measures */}
            <section>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-foreground">Security Measures</h3>
              </div>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                <li>Encrypted data storage and transmission</li>
                <li>Role-based access control for authorized personnel only</li>
                <li>Regular security audits and monitoring</li>
                <li>Secure backup and recovery procedures</li>
              </ul>
            </section>

            {/* Contact */}
            <section className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold text-foreground mb-2">Data Protection Officer</h3>
              <p className="text-muted-foreground text-xs">
                For questions, concerns, or to exercise your data privacy rights, please contact the 
                Barangay Data Protection Officer at the Barangay Hall during office hours, or send a 
                message through the BRIS messaging system.
              </p>
            </section>

            {/* Last Updated */}
            <p className="text-xs text-muted-foreground text-center pt-4 border-t">
              Last Updated: December 2024
            </p>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <a href="/privacy" target="_blank">View Full Policy</a>
          </Button>
          {showAcceptButton ? (
            <Button onClick={onAccept} className="w-full sm:w-auto">
              I Understand and Agree
            </Button>
          ) : (
            <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              I Understand
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DataPrivacyModal;
