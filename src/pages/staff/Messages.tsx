import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, Send, Loader2, Inbox, Mail, MailOpen, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useStaffAuthContext } from "@/context/StaffAuthContext";
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
}

const StaffMessages = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useStaffAuthContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState("unread");

  useEffect(() => {
    if (isAuthenticated && user) {
      loadMessages();
      
      // Set up realtime subscription
      const channel = supabase
        .channel('staff-messages')
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

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      // Fetch messages using RPC (bypasses RLS for staff)
      const { data, error } = await supabase
        .rpc('get_staff_messages', { p_staff_id: user?.id });

      if (error) throw error;

      if (data) {
        // Fetch resident names for senders
        const residentIds = [...new Set(data.filter(m => m.sender_type === "resident").map(m => m.sender_id))];
        let residentMap: Record<string, string> = {};
        
        if (residentIds.length > 0) {
          const { data: residentData } = await supabase
            .from("residents")
            .select("user_id, first_name, last_name")
            .in("user_id", residentIds);
          
          if (residentData) {
            residentMap = Object.fromEntries(
              residentData.map(r => [r.user_id, `${r.first_name} ${r.last_name}`])
            );
          }
        }

        setMessages(data.map(m => ({
          id: m.id,
          subject: m.subject || "No Subject",
          content: m.content,
          senderType: m.sender_type,
          senderId: m.sender_id,
          senderName: m.sender_type === "resident" ? residentMap[m.sender_id] || "Resident" : "Staff",
          isRead: m.is_read || false,
          createdAt: new Date(m.created_at || "").toLocaleString(),
          parentMessageId: m.parent_message_id,
        })));
      }
    } catch (error) {
      console.error("Error loading messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReadMessage = async (message: Message) => {
    setSelectedMessage(message);
    setReplyContent("");
    
    if (!message.isRead) {
      try {
        // Use RPC to mark as read (bypasses RLS)
        await supabase.rpc('staff_mark_message_read', { p_message_id: message.id });
        
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

    setIsSending(true);
    try {
      // Use RPC to send reply (bypasses RLS)
      const { error } = await supabase.rpc('staff_send_reply', {
        p_staff_id: user?.id,
        p_recipient_id: selectedMessage.senderId,
        p_subject: `Re: ${selectedMessage.subject}`,
        p_content: replyContent,
        p_parent_message_id: selectedMessage.id,
      });

      if (error) throw error;

      toast.success("Reply sent successfully");
      setReplyContent("");
      setSelectedMessage(null);
    } catch (error: any) {
      console.error("Error sending reply:", error);
      toast.error("Failed to send reply");
    } finally {
      setIsSending(false);
    }
  };

  const unreadCount = messages.filter(m => !m.isRead).length;
  const filteredMessages = activeTab === "unread" 
    ? messages.filter(m => !m.isRead)
    : messages;

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
        <Button variant="ghost" className="mb-4" onClick={() => navigate("/staff-dashboard")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <MessageSquare className="h-6 w-6" />
                  Staff Inbox
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-2">{unreadCount}</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  View and respond to resident messages
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
              <TabsList>
                <TabsTrigger value="unread" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Unread ({unreadCount})
                </TabsTrigger>
                <TabsTrigger value="all" className="flex items-center gap-2">
                  <MailOpen className="h-4 w-4" />
                  All Messages
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center py-12">
                <Inbox className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="font-medium text-lg mb-2">
                  {activeTab === "unread" ? "No Unread Messages" : "No Messages"}
                </h3>
                <p className="text-muted-foreground">
                  {activeTab === "unread" 
                    ? "You're all caught up!" 
                    : "No messages from residents yet."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                      !message.isRead ? "bg-primary/5 border-primary/20" : "bg-card"
                    }`}
                    onClick={() => handleReadMessage(message)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`font-medium ${!message.isRead ? "font-semibold" : ""}`}>
                            {message.subject}
                          </h3>
                          <Badge variant="secondary">
                            From: {message.senderName}
                          </Badge>
                          {!message.isRead && (
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

        {/* View & Reply Dialog */}
        <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedMessage?.subject}</DialogTitle>
              <DialogDescription>
                From: {selectedMessage?.senderName} • {selectedMessage?.createdAt}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="bg-muted/50 p-4 rounded-lg mb-4">
                <p className="whitespace-pre-wrap">{selectedMessage?.content}</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reply">Reply</Label>
                <Textarea
                  id="reply"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Type your reply..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedMessage(null)}>
                Close
              </Button>
              <Button onClick={handleReply} disabled={isSending}>
                {isSending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Reply className="h-4 w-4 mr-2" />
                )}
                Send Reply
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default StaffMessages;