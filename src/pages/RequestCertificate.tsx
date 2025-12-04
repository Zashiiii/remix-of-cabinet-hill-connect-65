import { useState, useCallback } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import CertificateRequestForm from "@/components/CertificateRequestForm";
import SuccessModal from "@/components/SuccessModal";
import { Card, CardContent } from "@/components/ui/card";

const RequestCertificate = () => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [controlNumber, setControlNumber] = useState("");
  const [formKey, setFormKey] = useState(0);

  const handleSuccess = (generatedControlNumber: string) => {
    setControlNumber(generatedControlNumber);
    setShowSuccess(true);
  };

  const handleFormReset = useCallback(() => {
    setFormKey(prev => prev + 1);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-secondary/30 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumb 
            items={[
              { label: "Home", href: "/" },
              { label: "Request Certificate" },
            ]}
          />
          
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
                Request a Barangay Certificate
              </h1>
              <p className="text-lg text-muted-foreground">
                Fill out the form below. You will receive a control number to track your request.
              </p>
            </div>

            <Card className="shadow-medium">
              <CardContent className="p-6 sm:p-8">
                <CertificateRequestForm key={formKey} onSuccess={handleSuccess} />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
      
      <SuccessModal 
        open={showSuccess}
        onOpenChange={setShowSuccess}
        controlNumber={controlNumber}
        onReset={handleFormReset}
      />
    </div>
  );
};

export default RequestCertificate;