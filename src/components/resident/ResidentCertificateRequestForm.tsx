import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Loader2, User } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logResidentCertificateRequest } from "@/utils/auditLog";

const formSchema = z.object({
  certificateType: z.string().min(1, "Please select a certificate type"),
  customCertificateName: z.string().trim().max(200, "Custom certificate name is too long").optional(),
  purpose: z.string().trim().min(10, "Please provide more details about the purpose (at least 10 characters)").max(500, "Purpose is too long"),
  priority: z.enum(["normal", "urgent"], {
    required_error: "Please select a priority level",
  }),
  preferredPickupDate: z.date({
    required_error: "Please select your preferred pickup date",
  }).refine((date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  }, "Pickup date must be today or a future date"),
}).refine((data) => {
  if (data.certificateType === "Others" && (!data.customCertificateName || data.customCertificateName.trim() === "")) {
    return false;
  }
  return true;
}, {
  message: "Please specify the certificate type",
  path: ["customCertificateName"],
});

type FormValues = z.infer<typeof formSchema>;

interface ResidentProfile {
  id: string;
  fullName: string;
  email: string;
  contactNumber?: string;
  householdId?: string;
}

interface ResidentCertificateRequestFormProps {
  profile: ResidentProfile;
  onSuccess: (controlNumber: string) => void;
}

const certificateTypes = [
  "Certificate of Indigency",
  "Certificate of Residency",
  "Barangay Clearance",
  "Business Clearance",
  "Solo Parent Certification",
  "Good Moral",
  "Others",
];

const ResidentCertificateRequestForm = ({ profile, onSuccess }: ResidentCertificateRequestFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [householdNumber, setHouseholdNumber] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchHouseholdNumber = async () => {
      if (profile.householdId) {
        const { data } = await supabase
          .from("households")
          .select("household_number")
          .eq("id", profile.householdId)
          .maybeSingle();
        
        if (data) {
          setHouseholdNumber(data.household_number);
        }
      }
    };
    
    fetchHouseholdNumber();
  }, [profile.householdId]);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      certificateType: "",
      customCertificateName: "",
      purpose: "",
      priority: "normal",
    },
  });

  const selectedCertificateType = form.watch("certificateType");

  const generateControlNumber = (): string => {
    const prefix = "BRG";
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  };

  const onSubmit = async (data: FormValues) => {
    if (!householdNumber) {
      toast.error("Your household number is not set. Please update your profile first.");
      return;
    }

    try {
      setIsSubmitting(true);
      
      const controlNumber = generateControlNumber();
      
      // Insert the certificate request
      const { error } = await supabase
        .from("certificate_requests")
        .insert({
          control_number: controlNumber,
          certificate_type: data.certificateType,
          custom_certificate_name: data.certificateType === "Others" ? (data.customCertificateName?.trim() || null) : null,
          full_name: profile.fullName,
          contact_number: profile.contactNumber || "",
          email: profile.email,
          household_number: householdNumber,
          purpose: data.purpose,
          priority: data.priority,
          preferred_pickup_date: format(data.preferredPickupDate, "yyyy-MM-dd"),
          status: "pending",
          resident_id: profile.id,
        });

      if (error) throw error;
      
      // Log the certificate request in audit log
      await logResidentCertificateRequest(controlNumber, profile.fullName, data.certificateType);
      
      // Show success
      onSuccess(controlNumber);
      
      // Reset the form
      form.reset();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Something went wrong";
      console.error('Form submission error:', errorMessage);
      toast.error(errorMessage, {
        description: "Please try again or visit the barangay hall."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Pre-filled Profile Info */}
        <div className="p-4 rounded-lg bg-muted/50 border">
          <div className="flex items-center gap-2 mb-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Your Information (from profile)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Full Name:</span>
              <p className="font-medium">{profile.fullName}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Email:</span>
              <p className="font-medium">{profile.email}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Contact Number:</span>
              <p className="font-medium">{profile.contactNumber || "Not set"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Household Number:</span>
              <p className="font-medium">{householdNumber || "Not assigned"}</p>
            </div>
          </div>
        </div>

        {!householdNumber && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            ⚠️ You need to be assigned to a household before requesting certificates. Please contact the Barangay office.
          </div>
        )}

        {/* Certificate Type */}
        <FormField
          control={form.control}
          name="certificateType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Certificate Type / Uri ng Sertipiko *</FormLabel>
              <Select onValueChange={(value) => {
                field.onChange(value);
                if (value !== "Others") {
                  form.setValue("customCertificateName", "");
                }
              }} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select certificate type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-popover z-50">
                  {certificateTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type === "Others" ? "Others (Specify)" : type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Custom Certificate Name - shown when "Others" is selected */}
        {selectedCertificateType === "Others" && (
          <FormField
            control={form.control}
            name="customCertificateName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Specify Certificate Type *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter the certificate type you need" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Request Details Section */}
        <div className="pt-4 border-t border-border">
          <h3 className="text-lg font-semibold mb-4">
            Request Details / Detalye ng Kahilingan
          </h3>
          
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purpose / Layunin *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Please describe the purpose of your certificate request..."
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Priority / Priyoridad</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-2"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="normal" />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          Normal
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="urgent" />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          Urgent
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preferredPickupDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Preferred Pickup Date / Gustong Petsa ng Pagkuha *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal bg-background",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-popover z-50" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const dayOfWeek = date.getDay();
                          // Disable past dates and weekends (0 = Sunday, 6 = Saturday)
                          return date < today || dayOfWeek === 0 || dayOfWeek === 6;
                        }}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Select when you would like to pick up your certificate
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Button 
          type="submit" 
          size="lg" 
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
          disabled={isSubmitting || !householdNumber}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting / Isinusumite...
            </>
          ) : (
            "Submit Request / Magsumite ng Kahilingan"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default ResidentCertificateRequestForm;
