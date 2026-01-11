import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useStaffAuthContext } from "@/context/StaffAuthContext";
import { Loader2 } from "lucide-react";

interface StaffLoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Inner component that uses the context - only rendered when modal is open
const StaffLoginForm = ({ onOpenChange }: { onOpenChange: (open: boolean) => void }) => {
  const navigate = useNavigate();
  const { login } = useStaffAuthContext();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await login(username, password);
      
      if (result.success) {
        toast.success("Login successful", {
          description: "Welcome to the Staff Dashboard"
        });
        onOpenChange(false);
        setUsername("");
        setPassword("");
        navigate("/staff-dashboard");
      } else {
        let errorMessage = result.error || "Invalid credentials";
        let toastDescription = "Please check your credentials";
        
        if (result.code === 'INVALID_CREDENTIALS') {
          errorMessage = "Invalid credentials";
          toastDescription = "Username or password is incorrect";
        } else if (result.code === 'ACCOUNT_INACTIVE') {
          errorMessage = "Account is deactivated";
          toastDescription = "Please contact an administrator";
        } else if (result.code === 'RATE_LIMITED') {
          errorMessage = "Too many login attempts";
          toastDescription = "Please try again in 15 minutes";
        }
        
        setError(errorMessage);
        toast.error("Login failed", {
          description: toastDescription
        });
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An unexpected error occurred");
      toast.error("Login error", {
        description: "Please try again later"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
          {error}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          required
          disabled={isLoading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
          disabled={isLoading}
        />
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
  );
};

const StaffLoginModal = ({ open, onOpenChange }: StaffLoginModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Staff Login</DialogTitle>
          <DialogDescription>
            Enter your credentials to access the staff portal
          </DialogDescription>
        </DialogHeader>
        {open && <StaffLoginForm onOpenChange={onOpenChange} />}
      </DialogContent>
    </Dialog>
  );
};

export default StaffLoginModal;
