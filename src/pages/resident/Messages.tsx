import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, Send, Loader2, Inbox, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useResidentAuth } from "@/hooks/useResidentAuth";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  subject: string;
  content: string;
  senderType: string;
  senderName?: string;
  isRead: boolean;
  createdAt: string;
}

interface StaffUser {
  id: string;
  full_name: string;
  role: string;
}

const ResidentMessages = () => {
  const navigate = useNavigate();
  const { user, profile, isAuthenticated, isLoading: authLoading } = useResidentAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [newSubject, setNewSubject] = useState("");
  const [newContent, setNewContent] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<string>("");
  const [isSending, setIsSending] = useState(false);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadMessages();
      loadStaffUsers();
      
      // Set up realtime subscription
      const channel = supabase
        .channel('resident-messages')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        }, (payload) => {
          console.log('New message received:', payload);
          loadMessages();
          toast.info("New message received");
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages'
        }, () => {
          loadMessages();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAuthenticated, user]);

  const loadStaffUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("staff_users")
        .select("id, full_name, role")
        .eq("is_active", true)
        .in("role", ["admin", "secretary"]);

      if (error) throw error;
      if (data) {
        setStaffUsers(data);
        // Default to first admin if available
        const defaultAdmin = data.find(s => s.role === "admin");
        if (defaultAdmin) {
          setSelectedRecipient(defaultAdmin.id);
        } else if (data.length > 0) {
          setSelectedRecipient(data[0].id);
        }
      }
    } catch (error) {
      console.error("Error loading staff users:", error);
    }
  };

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user?.id},recipient_id.eq.${user?.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        // Fetch staff names for messages from staff
        const staffIds = [...new Set(data.filter(m => m.sender_type === "staff").map(m => m.sender_id))];
        let staffMap: Record<string, string> = {};
        
        if (staffIds.length > 0) {
          const { data: staffData } = await supabase
            .from("staff_users")
            .select("id, full_name")
            .in("id", staffIds);
          
          if (staffData) {
            staffMap = Object.fromEntries(staffData.map(s => [s.id, s.full_name]));
          }
        }

        setMessages(data.map(m => ({
          id: m.id,
          subject: m.subject || "No Subject",
          content: m.content,
          senderType: m.sender_type,
          senderName: m.sender_type === "staff" ? staffMap[m.sender_id] : undefined,
          isRead: m.is_read || false,
          createdAt: new Date(m.created_at || "").toLocaleDateString(),
        })));
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newSubject.trim() || !newContent.trim()) {
      toast.error("Please enter subject and message");
      return;
    }

    if (!selectedRecipient) {
      toast.error("Please select a recipient");
      return;
    }

    setIsSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        sender_type: "resident",
        sender_id: user?.id,
        recipient_type: "staff",
        recipient_id: selectedRecipient,
        subject: newSubject,
        content: newContent,
      });

      if (error) throw error;

      toast.success("Message sent successfully");
      setShowCompose(false);
      setNewSubject("");
      setNewContent("");
      loadMessages();
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleReadMessage = async (message: Message) => {
    setSelectedMessage(message);
    
    if (!message.isRead && message.senderType !== "resident") {
      try {
        await supabase
          .from("messages")
          .update({ is_read: true })
          .eq("id", message.id);
        
        setMessages(prev => prev.map(m => 
          m.id === message.id ? { ...m, isRead: true } : m
        ));
      } catch (error) {
        console.error("Error marking as read:", error);
      }
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-6 px-4">
        <Button variant="ghost" className="mb-4" onClick={() => navigate("/resident/dashboard")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <MessageSquare className="h-6 w-6" />
                  Messages
                </CardTitle>
                <CardDescription>
                  Communicate with barangay staff
                </CardDescription>
              </div>
              <Button onClick={() => setShowCompose(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Message
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12">
                <Inbox className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="font-medium text-lg mb-2">No Messages</h3>
                <p className="text-muted-foreground mb-4">
                  Start a conversation with the barangay staff.
                </p>
                <Button onClick={() => setShowCompose(true)}>
                  Send a Message
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                      !message.isRead && message.senderType !== "resident" ? "bg-primary/5 border-primary/20" : "bg-card"
                    }`}
                    onClick={() => handleReadMessage(message)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`font-medium ${!message.isRead && message.senderType !== "resident" ? "font-semibold" : ""}`}>
                            {message.subject}
                          </h3>
                        <Badge variant={message.senderType === "resident" ? "outline" : "secondary"}>
                            {message.senderType === "resident" ? "Sent" : `From ${message.senderName || "Staff"}`}
                          </Badge>
                          {!message.isRead && message.senderType !== "resident" && (
                            <Badge variant="default" className="bg-primary">New</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {message.content}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {message.createdAt}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Compose Dialog */}
        <Dialog open={showCompose} onOpenChange={setShowCompose}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Message</DialogTitle>
              <DialogDescription>
                Send a message to barangay staff
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="recipient">Send To</Label>
                <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipient" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffUsers.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.full_name} ({staff.role === "admin" ? "Admin" : "Secretary"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="Enter subject"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Type your message here..."
                  rows={5}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCompose(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendMessage} disabled={isSending}>
                {isSending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Message Dialog */}
        <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedMessage?.subject}</DialogTitle>
            <DialogDescription>
              {selectedMessage?.senderType === "resident" ? "Sent" : `From ${selectedMessage?.senderName || "Staff"}`} • {selectedMessage?.createdAt}
            </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="whitespace-pre-wrap">{selectedMessage?.content}</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ResidentMessages;
