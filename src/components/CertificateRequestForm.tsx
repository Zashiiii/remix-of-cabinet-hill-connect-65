import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState, useEffect, useCallback } from "react";
import { useCertificateTypes } from "@/hooks/useCertificateTypes";
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
import { CalendarIcon, Loader2, Search, User, XCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { submitCertificateRequest } from "@/utils/api";
import { toast } from "sonner";
import { logResidentCertificateRequest } from "@/utils/auditLog";
import { supabase } from "@/integrations/supabase/client";

interface ResidentResult {
  id: string;
  fullName: string;
  email: string;
  contactNumber: string;
  householdNumber: string | null;
}

const formSchema = z.object({
  residentId: z.string().min(1, "Please select a resident"),
  certificateType: z.string().min(1, "Please select a certificate type"),
  customCertificateName: z.string().trim().max(200, "Custom certificate name is too long").optional(),
  purpose: z.string().trim().min(10, "Please provide more details about the purpose (at least 10 characters)").max(500, "Purpose is too long"),
  priority: z.enum(["normal", "urgent"], {
    required_error: "Please select a priority level",
  }),
  urgencyReason: z.string().trim().max(500, "Urgency reason is too long").optional(),
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
}).refine((data) => {
  if (data.priority === "urgent" && (!data.urgencyReason || data.urgencyReason.trim() === "")) {
    return false;
  }
  return true;
}, {
  message: "Please provide a reason for urgency",
  path: ["urgencyReason"],
});

type FormValues = z.infer<typeof formSchema>;

interface CertificateRequestFormProps {
  onSuccess: (controlNumber: string) => void;
}

const CertificateRequestForm = ({ onSuccess }: CertificateRequestFormProps) => {
  const { types: certificateTypeOptions } = useCertificateTypes();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ResidentResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedResident, setSelectedResident] = useState<ResidentResult | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      residentId: "",
      certificateType: "",
      customCertificateName: "",
      purpose: "",
      priority: "normal",
      urgencyReason: "",
    },
  });

  const selectedCertificateType = form.watch("certificateType");
  const selectedPriority = form.watch("priority");

  const searchResidents = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from("residents")
        .select(`
          id, first_name, middle_name, last_name, suffix,
          email, contact_number, household_id,
          households ( household_number )
        `)
        .eq("approval_status", "approved")
        .is("deleted_at", null)
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;

      const results: ResidentResult[] = (data || []).map((r: any) => ({
        id: r.id,
        fullName: `${r.first_name} ${r.middle_name ? r.middle_name + ' ' : ''}${r.last_name}${r.suffix ? ' ' + r.suffix : ''}`.trim(),
        email: r.email || "",
        contactNumber: r.contact_number || "",
        householdNumber: r.households?.household_number || null,
      }));

      setSearchResults(results);
      setShowDropdown(results.length > 0);
    } catch (err) {
      console.error("Error searching residents:", err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery && !selectedResident) {
        searchResidents(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchResidents, selectedResident]);

  const handleSelectResident = (resident: ResidentResult) => {
    setSelectedResident(resident);
    setSearchQuery(resident.fullName);
    setShowDropdown(false);
    form.setValue("residentId", resident.id);
  };

  const handleClearResident = () => {
    setSelectedResident(null);
    setSearchQuery("");
    setSearchResults([]);
    form.setValue("residentId", "");
  };

  const onSubmit = async (data: FormValues) => {
    if (!selectedResident) {
      toast.error("Please select a resident.");
      return;
    }

    if (!selectedResident.householdNumber) {
      toast.error("Selected resident has no household assigned. Cannot create certificate.");
      return;
    }

    try {
      setIsSubmitting(true);

      const controlNumber = await submitCertificateRequest({
        certificateType: data.certificateType,
        customCertificateName: data.certificateType === "Others" ? data.customCertificateName : undefined,
        fullName: selectedResident.fullName,
        contactNumber: selectedResident.contactNumber,
        email: selectedResident.email,
        householdNumber: selectedResident.householdNumber,
        purpose: data.purpose,
        priority: data.priority,
        preferredPickupDate: data.preferredPickupDate,
      });

      await logResidentCertificateRequest(controlNumber, selectedResident.fullName, data.certificateType);

      onSuccess(controlNumber);
      form.reset();
      handleClearResident();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Something went wrong";
      console.error("Form submission error:", errorMessage);
      toast.error(errorMessage, {
        description: "Please try again or visit the barangay hall.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const noHousehold = selectedResident && !selectedResident.householdNumber;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Resident Search */}
        <div className="space-y-2">
          <FormField
            control={form.control}
            name="residentId"
            render={() => (
              <FormItem>
                <FormLabel>Search Resident / Hanapin ang Residente *</FormLabel>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Type resident name or email..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (selectedResident) {
                        handleClearResident();
                      }
                    }}
                    className="pl-9 pr-9"
                    disabled={!!selectedResident}
                  />
                  {(searchQuery || selectedResident) && (
                    <button
                      type="button"
                      onClick={handleClearResident}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}
                  {isSearching && (
                    <Loader2 className="absolute right-9 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}

                  {showDropdown && !selectedResident && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-60 overflow-auto">
                      {searchResults.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          className="w-full text-left px-3 py-2.5 hover:bg-accent hover:text-accent-foreground text-sm flex items-start gap-2 border-b border-border last:border-b-0"
                          onClick={() => handleSelectResident(r)}
                        >
                          <User className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{r.fullName}</p>
                            <p className="text-xs text-muted-foreground">
                              {r.email || "No email"} · HH: {r.householdNumber || "None"}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <FormDescription>Search by name or email to find the resident</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Selected Resident Info */}
        {selectedResident && (
          <div className="p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 mb-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Selected Resident</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Full Name:</span>
                <p className="font-medium">{selectedResident.fullName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>
                <p className="font-medium">{selectedResident.email || "Not set"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Contact Number:</span>
                <p className="font-medium">{selectedResident.contactNumber || "Not set"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Household Number:</span>
                <p className="font-medium">{selectedResident.householdNumber || "Not assigned"}</p>
              </div>
            </div>
          </div>
        )}

        {/* No household warning */}
        {noHousehold && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>This resident has no household assigned. Certificate cannot be created until a household is linked.</p>
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
                  {certificateTypeOptions.map((type) => (
                    <SelectItem key={type.id} value={type.name}>
                      {type.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="Others">Others (Specify)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

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
                        <FormLabel className="font-normal cursor-pointer">Normal</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="urgent" />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">Urgent</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedPriority === "urgent" && (
              <FormField
                control={form.control}
                name="urgencyReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Urgency / Dahilan ng Pagmamadali *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Please explain why this request is urgent..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
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
                          return date < today || dayOfWeek === 0 || dayOfWeek === 6;
                        }}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>Select when the resident would like to pick up the certificate</FormDescription>
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
          disabled={isSubmitting || !!noHousehold}
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
