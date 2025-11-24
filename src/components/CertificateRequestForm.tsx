import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState } from "react";
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
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { submitCertificateRequest } from "@/utils/api";
import { toast } from "sonner";

const formSchema = z.object({
  certificateType: z.string().min(1, "Please select a certificate type"),
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(100, "Full name is too long"),
  contactNumber: z.string().trim().regex(/^[0-9+\-() ]+$/, "Please enter a valid contact number").min(7, "Contact number is too short"),
  email: z.string().trim().email("Please enter a valid email address").optional().or(z.literal("")),
  householdNumber: z.string().trim().regex(/^\d{11}$/, "Household number must be exactly 11 digits"),
  birthDate: z.date({
    required_error: "Birth date is required",
  }).refine((date) => date <= new Date(), "Birth date cannot be in the future"),
  purpose: z.string().trim().min(10, "Please provide more details about the purpose (at least 10 characters)").max(500, "Purpose is too long"),
  priority: z.enum(["normal", "urgent"], {
    required_error: "Please select a priority level",
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface CertificateRequestFormProps {
  onSuccess: (controlNumber: string) => void;
}

const certificateTypes = [
  "Barangay Clearance",
  "Certificate of Indigency",
  "Certificate of Residency",
  "Certificate of Good Moral Character",
  "Business Permit Clearance",
  "First Time Job Seeker Certificate",
  "Certificate for Senior Citizen/PWD ID",
];

const CertificateRequestForm = ({ onSuccess }: CertificateRequestFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      certificateType: "",
      fullName: "",
      contactNumber: "",
      email: "",
      householdNumber: "",
      purpose: "",
      priority: "normal",
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);
      
      // Call the API placeholder function
      const controlNumber = await submitCertificateRequest({
        certificateType: data.certificateType,
        fullName: data.fullName,
        contactNumber: data.contactNumber,
        email: data.email,
        householdNumber: data.householdNumber,
        birthDate: data.birthDate,
        purpose: data.purpose,
        priority: data.priority,
      });
      
      // Show success
      onSuccess(controlNumber);
      
      // Reset the form
      form.reset();
    } catch (error) {
      toast.error("Something went wrong. Please try again or visit the barangay hall.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Certificate Type */}
        <FormField
          control={form.control}
          name="certificateType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Certificate Type / Uri ng Sertipiko *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select certificate type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-popover z-50">
                  {certificateTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Personal Information Section */}
        <div className="pt-4 border-t border-border">
          <h3 className="text-lg font-semibold mb-4">
            Personal Information / Pansariling Impormasyon
          </h3>
          
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name / Buong Pangalan *</FormLabel>
                  <FormControl>
                    <Input placeholder="Juan Dela Cruz" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Number / Numero ng Telepono *</FormLabel>
                  <FormControl>
                    <Input placeholder="09123456789" type="tel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address / Email Address</FormLabel>
                  <FormControl>
                    <Input placeholder="juan@example.com" type="email" {...field} />
                  </FormControl>
                  <FormDescription>Optional - for email notifications</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Verification Section */}
        <div className="pt-4 border-t border-border">
          <h3 className="text-lg font-semibold mb-4">
            Verification / Pagpapatunay
          </h3>
          
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="householdNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Household Number / Numero ng Sambahayan *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="09171234567" 
                      maxLength={11}
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter exactly 11 digits - This will be verified against our records
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="birthDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Birth Date / Petsa ng Kapanganakan *</FormLabel>
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
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    This information will be verified against our records
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

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
                          Normal (3-5 business days)
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="urgent" />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          Urgent (1-2 business days - for medical/emergency cases)
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
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
          disabled={isSubmitting}
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

export default CertificateRequestForm;
