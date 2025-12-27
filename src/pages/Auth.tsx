import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { User, Mail, Lock, Loader2, Eye, EyeOff, ArrowLeft, Shield, CalendarIcon, Phone, MapPin, Info, CheckCircle, Search, Clock, XCircle } from "lucide-react";
import { z } from "zod";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import DataPrivacyModal from "@/components/DataPrivacyModal";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  middleName: z.string().optional(),
  birthDate: z.date({ required_error: "Birth date is required" }),
  contactNumber: z.string().min(10, "Valid contact number is required"),
  address: z.string().min(5, "Address is required"),
  privacyConsent: z.literal(true, {
    errorMap: () => ({ message: "You must agree to the Privacy Policy to create an account" }),
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

interface RegistrationStatus {
  status: string;
  first_name: string;
  last_name: string;
  submitted_at: string;
  approved_at: string | null;
  approved_by: string | null;
}

const Auth = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupFirstName, setSignupFirstName] = useState("");
  const [signupLastName, setSignupLastName] = useState("");
  const [signupMiddleName, setSignupMiddleName] = useState("");
  const [signupBirthDate, setSignupBirthDate] = useState<Date | undefined>();
  const [signupContactNumber, setSignupContactNumber] = useState("");
  const [signupAddress, setSignupAddress] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(false);

  // Status checker state
  const [statusEmail, setStatusEmail] = useState("");
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [statusResult, setStatusResult] = useState<RegistrationStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Check if user is already logged in and approved
  useEffect(() => {
    const checkApprovalAndRedirect = async (userId: string, email: string) => {
      // Check if resident is approved before redirecting
      const { data: resident } = await supabase
        .from("residents")
        .select("approval_status")
        .eq("user_id", userId)
        .maybeSingle();

      // If no resident found, try by email
      if (!resident) {
        const { data: residentByEmail } = await supabase
          .from("residents")
          .select("approval_status")
          .eq("email", email)
          .maybeSingle();

        if (residentByEmail?.approval_status === "approved") {
          navigate("/resident/dashboard");
        } else if (residentByEmail?.approval_status === "pending") {
          // Sign out if account is pending approval
          await supabase.auth.signOut();
          toast.info("Your account is pending approval. Please wait for admin approval before logging in.");
        }
        return;
      }

      if (resident.approval_status === "approved") {
        navigate("/resident/dashboard");
      } else if (resident.approval_status === "pending") {
        // Sign out if account is pending approval
        await supabase.auth.signOut();
        toast.info("Your account is pending approval. Please wait for admin approval before logging in.");
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && event !== "SIGNED_OUT") {
        setTimeout(() => {
          checkApprovalAndRedirect(session.user.id, session.user.email || "");
        }, 0);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        checkApprovalAndRedirect(session.user.id, session.user.email || "");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      loginSchema.parse({ email: loginEmail, password: loginPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password. Please try again.");
        } else if (error.message.includes("Email not confirmed")) {
          toast.error("Please verify your email address before logging in.");
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data.user) {
        // Check approval status before allowing access
        const { data: resident } = await supabase
          .from("residents")
          .select("approval_status")
          .eq("user_id", data.user.id)
          .maybeSingle();

        // If no resident found by user_id, try by email
        const approvalStatus = resident?.approval_status || 
          (await supabase
            .from("residents")
            .select("approval_status")
            .eq("email", data.user.email)
            .maybeSingle()
          ).data?.approval_status;

        if (approvalStatus === "pending") {
          await supabase.auth.signOut();
          toast.error("Your account is pending approval. Please wait for admin approval before logging in.", {
            duration: 5000,
          });
          return;
        }

        if (approvalStatus === "rejected") {
          await supabase.auth.signOut();
          toast.error("Your registration was rejected. Please contact the Barangay office for more information.", {
            duration: 5000,
          });
          return;
        }

        if (approvalStatus !== "approved") {
          await supabase.auth.signOut();
          toast.error("Your account status is unknown. Please contact the Barangay office.", {
            duration: 5000,
          });
          return;
        }

        toast.success("Login successful!");
        navigate("/resident/dashboard");
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      signupSchema.parse({
        email: signupEmail,
        password: signupPassword,
        confirmPassword: signupConfirmPassword,
        firstName: signupFirstName,
        lastName: signupLastName,
        middleName: signupMiddleName,
        birthDate: signupBirthDate,
        contactNumber: signupContactNumber,
        address: signupAddress,
        privacyConsent: privacyConsent,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setIsLoading(true);

    try {
      // Step 1: Register the resident (pending approval)
      const { data: residentId, error: registerError } = await supabase
        .rpc('register_new_resident', {
          p_first_name: signupFirstName.trim(),
          p_last_name: signupLastName.trim(),
          p_middle_name: signupMiddleName.trim() || null,
          p_email: signupEmail.trim(),
          p_birth_date: format(signupBirthDate!, 'yyyy-MM-dd'),
          p_contact_number: signupContactNumber.trim(),
          p_address: signupAddress.trim(),
        });

      if (registerError) {
        console.error('Registration error:', registerError);
        if (registerError.message.includes('duplicate')) {
          toast.error("An account with this email already exists.");
        } else {
          toast.error("An error occurred during registration. Please try again.");
        }
        setIsLoading(false);
        return;
      }

      // Step 2: Create auth account
      const redirectUrl = `${window.location.origin}/resident/dashboard`;

      const { data, error } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: `${signupFirstName} ${signupMiddleName ? signupMiddleName + ' ' : ''}${signupLastName}`,
            resident_id: residentId,
            birth_date: format(signupBirthDate!, 'yyyy-MM-dd'),
            privacy_consent_given_at: new Date().toISOString(),
          },
        },
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          toast.error("An account with this email already exists. Please login instead.");
          setActiveTab("login");
          setLoginEmail(signupEmail);
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data.user) {
        // Sign out immediately - user needs admin approval before login
        await supabase.auth.signOut();

        // Step 3: Send notification email to admins (non-blocking)
        try {
          const fullName = `${signupFirstName} ${signupMiddleName ? signupMiddleName + ' ' : ''}${signupLastName}`;
          await supabase.functions.invoke('send-registration-notification', {
            body: {
              residentName: fullName,
              email: signupEmail,
              contactNumber: signupContactNumber,
              address: signupAddress,
              birthDate: format(signupBirthDate!, 'MMMM d, yyyy'),
              submittedAt: format(new Date(), 'MMMM d, yyyy h:mm a'),
            },
          });
          console.log('Admin notification sent successfully');
        } catch (notificationError) {
          // Don't block registration if notification fails
          console.error('Failed to send admin notification:', notificationError);
        }

        setRegistrationSuccess(true);
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!statusEmail.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    setIsCheckingStatus(true);
    setStatusResult(null);
    setStatusError(null);

    try {
      const { data, error } = await supabase.rpc('check_registration_status', {
        p_email: statusEmail.trim(),
      });

      if (error) {
        console.error('Status check error:', error);
        setStatusError("An error occurred while checking your status. Please try again.");
        return;
      }

      if (data && data.length > 0) {
        setStatusResult(data[0]);
      } else {
        setStatusError("No registration found with this email address. Please make sure you've registered or check the email spelling.");
      }
    } catch (error) {
      console.error('Status check error:', error);
      setStatusError("An error occurred. Please try again.");
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return {
          icon: Clock,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50 border-yellow-200',
          title: 'Pending Approval',
          message: 'Your registration is awaiting approval from the Barangay admin. This usually takes 1-2 business days.',
        };
      case 'approved':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50 border-green-200',
          title: 'Approved',
          message: 'Your registration has been approved! You can now log in to your account.',
        };
      case 'rejected':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50 border-red-200',
          title: 'Rejected',
          message: 'Your registration was rejected. Please contact the Barangay office for more information.',
        };
      default:
        return {
          icon: Info,
          color: 'text-muted-foreground',
          bgColor: 'bg-muted border-border',
          title: 'Unknown',
          message: 'Status unknown. Please contact the Barangay office.',
        };
    }
  };

  // Show success message after registration
  if (registrationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
        <Card className="w-full max-w-md shadow-lg border-border/50">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Registration Submitted!
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Your account is pending approval
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-primary/20 bg-primary/5">
              <Info className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                Your registration has been submitted and is awaiting approval from the Barangay admin. 
                You will be able to log in once your account is approved.
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground text-center">
              This usually takes 1-2 business days. You may contact the Barangay office for faster processing.
            </p>
            <Button 
              className="w-full" 
              onClick={() => {
                setRegistrationSuccess(false);
                setActiveTab("login");
              }}
            >
              Back to Login
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <DataPrivacyModal 
        open={showPrivacyModal} 
        onOpenChange={setShowPrivacyModal}
        showAcceptButton={!privacyConsent}
        onAccept={() => {
          setPrivacyConsent(true);
          setShowPrivacyModal(false);
        }}
      />

      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <Card className="shadow-lg border-border/50">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Resident Portal
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Access barangay services online
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
                <TabsTrigger value="status">Check Status</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="Enter your email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="pl-10 pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      "Login"
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <Alert className="mb-4 border-primary/20 bg-primary/5">
                  <Info className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-sm">
                    Sign up for a resident account. Your registration will be reviewed and approved by the Barangay admin.
                  </AlertDescription>
                </Alert>

                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="signup-firstname">First Name</Label>
                      <Input
                        id="signup-firstname"
                        type="text"
                        placeholder="Juan"
                        value={signupFirstName}
                        onChange={(e) => setSignupFirstName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-lastname">Last Name</Label>
                      <Input
                        id="signup-lastname"
                        type="text"
                        placeholder="Dela Cruz"
                        value={signupLastName}
                        onChange={(e) => setSignupLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-middlename">Middle Name (Optional)</Label>
                    <Input
                      id="signup-middlename"
                      type="text"
                      placeholder="Santos"
                      value={signupMiddleName}
                      onChange={(e) => setSignupMiddleName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Birth Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !signupBirthDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {signupBirthDate ? format(signupBirthDate, "MMMM d, yyyy") : "Select your birth date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={signupBirthDate}
                          onSelect={setSignupBirthDate}
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                          captionLayout="dropdown-buttons"
                          fromYear={1920}
                          toYear={new Date().getFullYear()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-contact">Contact Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-contact"
                        type="tel"
                        placeholder="09XX XXX XXXX"
                        value={signupContactNumber}
                        onChange={(e) => setSignupContactNumber(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-address">Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-address"
                        type="text"
                        placeholder="House/Block/Lot, Street, Purok"
                        value={signupAddress}
                        onChange={(e) => setSignupAddress(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="Enter your email"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-confirm"
                        type={showPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={signupConfirmPassword}
                        onChange={(e) => setSignupConfirmPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  {/* Privacy Consent Checkbox */}
                  <div className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg border">
                    <Checkbox
                      id="privacy-consent"
                      checked={privacyConsent}
                      onCheckedChange={(checked) => setPrivacyConsent(checked === true)}
                      className="mt-0.5"
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="privacy-consent"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        I agree to the Privacy Policy
                      </label>
                      <p className="text-xs text-muted-foreground">
                        By checking this box, you consent to the collection and processing of your personal data.{" "}
                        <button
                          type="button"
                          onClick={() => setShowPrivacyModal(true)}
                          className="text-primary hover:underline"
                        >
                          View Privacy Policy
                        </button>
                      </p>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading || !privacyConsent}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Registration"
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="status">
                <div className="space-y-4">
                  <Alert className="border-primary/20 bg-primary/5">
                    <Search className="h-4 w-4 text-primary" />
                    <AlertDescription className="text-sm">
                      Check your registration status using the email you used during signup.
                    </AlertDescription>
                  </Alert>

                  <form onSubmit={handleCheckStatus} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="status-email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="status-email"
                          type="email"
                          placeholder="Enter your registered email"
                          value={statusEmail}
                          onChange={(e) => setStatusEmail(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={isCheckingStatus}>
                      {isCheckingStatus ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Checking...
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 h-4 w-4" />
                          Check Status
                        </>
                      )}
                    </Button>
                  </form>

                  {/* Status Result */}
                  {statusResult && (
                    <div className={cn(
                      "p-4 rounded-lg border",
                      getStatusDisplay(statusResult.status).bgColor
                    )}>
                      <div className="flex items-start gap-3">
                        {(() => {
                          const StatusIcon = getStatusDisplay(statusResult.status).icon;
                          return <StatusIcon className={cn("h-5 w-5 mt-0.5", getStatusDisplay(statusResult.status).color)} />;
                        })()}
                        <div className="flex-1">
                          <h4 className={cn("font-semibold", getStatusDisplay(statusResult.status).color)}>
                            {getStatusDisplay(statusResult.status).title}
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {getStatusDisplay(statusResult.status).message}
                          </p>
                          <div className="mt-3 text-sm space-y-1">
                            <p><span className="font-medium">Name:</span> {statusResult.first_name} {statusResult.last_name}</p>
                            <p><span className="font-medium">Submitted:</span> {statusResult.submitted_at ? format(new Date(statusResult.submitted_at), 'MMMM d, yyyy') : 'N/A'}</p>
                            {statusResult.approved_at && (
                              <p><span className="font-medium">Processed:</span> {format(new Date(statusResult.approved_at), 'MMMM d, yyyy')}</p>
                            )}
                          </div>
                          {statusResult.status?.toLowerCase() === 'approved' && (
                            <Button 
                              className="mt-3 w-full" 
                              size="sm"
                              onClick={() => setActiveTab("login")}
                            >
                              Go to Login
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {statusError && (
                    <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertDescription>{statusError}</AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-6 text-center">
              <Link
                to="/"
                className="text-sm text-muted-foreground hover:text-primary inline-flex items-center"
              >
                <Shield className="mr-1 h-4 w-4" />
                Staff Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
