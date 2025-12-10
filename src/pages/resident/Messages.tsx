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
  senderId: string;
  senderName?: string;
  isRead: boolean;
  createdAt: string;
  parentMessageId?: string;
  replies?: Message[];
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
  const [replyContent, setReplyContent] = useState("");
  const [isReplying, setIsReplying] = useState(false);

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
      // Use RPC function to get staff users (bypasses RLS)
      const { data, error } = await supabase.rpc("get_staff_for_messaging");

      if (error) throw error;
      if (data) {
        setStaffUsers(data);
        // Default to first admin if available
        const defaultAdmin = data.find((s: StaffUser) => s.role === "admin");
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
          const { data: staffData } = await supabase.rpc("get_staff_for_messaging");
          
          if (staffData) {
            staffMap = Object.fromEntries(staffData.map((s: StaffUser) => [s.id, s.full_name]));
          }
        }

        // Map all messages
        const allMessages = data.map(m => ({
          id: m.id,
          subject: m.subject || "No Subject",
          content: m.content,
          senderType: m.sender_type,
          senderId: m.sender_id,
          senderName: m.sender_type === "staff" ? staffMap[m.sender_id] : undefined,
          isRead: m.is_read || false,
          createdAt: new Date(m.created_at || "").toLocaleString(),
          parentMessageId: m.parent_message_id || undefined,
        }));

        // Group messages by thread (parent messages with their replies)
        const parentMessages = allMessages.filter(m => !m.parentMessageId);
        const replies = allMessages.filter(m => m.parentMessageId);

        // Attach replies to parent messages
        const threaded = parentMessages.map(parent => ({
          ...parent,
          replies: replies
            .filter(r => r.parentMessageId === parent.id)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
        }));

        setMessages(threaded);
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
    setReplyContent("");
    
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

  const handleReply = async () => {
    if (!replyContent.trim() || !selectedMessage) {
      toast.error("Please enter a reply message");
      return;
    }

    // Find the recipient - if original message was from staff, reply to them
    // If it was from resident (us), we need to find the staff recipient
    let recipientId = "";
    if (selectedMessage.senderType === "staff") {
      recipientId = selectedMessage.senderId;
    } else {
      // Find the last staff member in the thread
      const staffReply = selectedMessage.replies?.find(r => r.senderType === "staff");
      if (staffReply) {
        recipientId = staffReply.senderId;
      } else {
        // No staff in thread, use selected recipient from compose
        const defaultStaff = staffUsers.find(s => s.role === "admin") || staffUsers[0];
        if (defaultStaff) {
          recipientId = defaultStaff.id;
        }
      }
    }

    if (!recipientId) {
      toast.error("Unable to determine recipient");
      return;
    }

    setIsReplying(true);
    try {
      const { error } = await supabase.from("messages").insert({
        sender_type: "resident",
        sender_id: user?.id,
        recipient_type: "staff",
        recipient_id: recipientId,
        subject: `Re: ${selectedMessage.subject.replace(/^Re: /, "")}`,
        content: replyContent,
        parent_message_id: selectedMessage.id,
      });

      if (error) throw error;

      toast.success("Reply sent successfully");
      setReplyContent("");
      loadMessages();
      
      // Update the selected message with the new reply
      const updatedMessage = {
        ...selectedMessage,
        replies: [
          ...(selectedMessage.replies || []),
          {
            id: "temp-" + Date.now(),
            subject: `Re: ${selectedMessage.subject}`,
            content: replyContent,
            senderType: "resident",
            senderId: user?.id || "",
            isRead: true,
            createdAt: new Date().toLocaleString(),
          }
        ]
      };
      setSelectedMessage(updatedMessage);
    } catch (error: any) {
      console.error("Error sending reply:", error);
      toast.error("Failed to send reply");
    } finally {
      setIsReplying(false);
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
                        {message.replies && message.replies.length > 0 && (
                          <p className="text-xs text-primary mt-1">
                            {message.replies.length} {message.replies.length === 1 ? "reply" : "replies"}
                          </p>
                        )}
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

        {/* View Message Dialog with Thread */}
        <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{selectedMessage?.subject}</DialogTitle>
              <DialogDescription>
                {selectedMessage?.senderType === "resident" ? "Sent by you" : `From ${selectedMessage?.senderName || "Staff"}`} • {selectedMessage?.createdAt}
              </DialogDescription>
            </DialogHeader>
            
            {/* Message Thread */}
            <div className="flex-1 overflow-y-auto space-y-4 py-4">
              {/* Original Message */}
              <div className={`p-3 rounded-lg ${selectedMessage?.senderType === "resident" ? "bg-primary/10 ml-8" : "bg-muted mr-8"}`}>
                <p className="text-xs text-muted-foreground mb-1">
                  {selectedMessage?.senderType === "resident" ? "You" : selectedMessage?.senderName || "Staff"}
                </p>
                <p className="whitespace-pre-wrap text-sm">{selectedMessage?.content}</p>
                <p className="text-xs text-muted-foreground mt-2">{selectedMessage?.createdAt}</p>
              </div>

              {/* Replies */}
              {selectedMessage?.replies && selectedMessage.replies.length > 0 && (
                <>
                  {selectedMessage.replies.map((reply) => (
                    <div 
                      key={reply.id} 
                      className={`p-3 rounded-lg ${reply.senderType === "resident" ? "bg-primary/10 ml-8" : "bg-muted mr-8"}`}
                    >
                      <p className="text-xs text-muted-foreground mb-1">
                        {reply.senderType === "resident" ? "You" : reply.senderName || "Staff"}
                      </p>
                      <p className="whitespace-pre-wrap text-sm">{reply.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">{reply.createdAt}</p>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Reply Input */}
            <div className="border-t pt-4 space-y-3">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Type your reply..."
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedMessage(null)}>
                  Close
                </Button>
                <Button onClick={handleReply} disabled={isReplying || !replyContent.trim()}>
                  {isReplying ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Reply
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ResidentMessages;
