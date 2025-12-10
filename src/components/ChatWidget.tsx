import { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Loader2, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useResidentAuth } from "@/hooks/useResidentAuth";

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

const ChatWidget = () => {
  const { user, isAuthenticated } = useResidentAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [isComposing, setIsComposing] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newContent, setNewContent] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadMessages();
      loadStaffUsers();

      // Set up realtime subscription
      const channel = supabase
        .channel('chat-widget-messages')
        .on('postgres_changes', {
          event: '*',
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

  useEffect(() => {
    // Scroll to bottom when viewing a conversation
    if (selectedConversation && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedConversation, selectedConversation?.replies]);

  const loadStaffUsers = async () => {
    try {
      const { data, error } = await supabase.rpc("get_staff_for_messaging");
      if (error) throw error;
      if (data) {
        setStaffUsers(data);
        if (data.length > 0) {
          const defaultAdmin = data.find((s: StaffUser) => s.role === "admin");
          setSelectedRecipient(defaultAdmin?.id || data[0].id);
        }
      }
    } catch (error) {
      console.error("Error loading staff:", error);
    }
  };

  const loadMessages = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        // Get staff names
        const { data: staffData } = await supabase.rpc("get_staff_for_messaging");
        const staffMap: Record<string, string> = {};
        if (staffData) {
          staffData.forEach((s: StaffUser) => {
            staffMap[s.id] = s.full_name;
          });
        }

        const allMessages = data.map(m => ({
          id: m.id,
          subject: m.subject || "No Subject",
          content: m.content,
          senderType: m.sender_type,
          senderId: m.sender_id,
          senderName: m.sender_type === "staff" ? staffMap[m.sender_id] : "You",
          isRead: m.is_read || false,
          createdAt: new Date(m.created_at || "").toLocaleString(),
          parentMessageId: m.parent_message_id || undefined,
        }));

        // Group into threads
        const parentMessages = allMessages.filter(m => !m.parentMessageId);
        const replies = allMessages.filter(m => m.parentMessageId);

        const threaded = parentMessages.map(parent => ({
          ...parent,
          replies: replies
            .filter(r => r.parentMessageId === parent.id)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
        }));

        setMessages(threaded);

        // Count unread
        const unread = allMessages.filter(m => !m.isRead && m.senderType === "staff").length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendNewMessage = async () => {
    if (!newSubject.trim() || !newContent.trim() || !selectedRecipient) {
      toast.error("Please fill in all fields");
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

      toast.success("Message sent!");
      setIsComposing(false);
      setNewSubject("");
      setNewContent("");
      loadMessages();
    } catch (error) {
      console.error("Error sending:", error);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleReply = async () => {
    if (!replyContent.trim() || !selectedConversation) return;

    // Determine recipient
    let recipientId = "";
    if (selectedConversation.senderType === "staff") {
      recipientId = selectedConversation.senderId;
    } else {
      const staffReply = selectedConversation.replies?.find(r => r.senderType === "staff");
      recipientId = staffReply?.senderId || staffUsers[0]?.id || "";
    }

    if (!recipientId) {
      toast.error("No recipient found");
      return;
    }

    setIsSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        sender_type: "resident",
        sender_id: user?.id,
        recipient_type: "staff",
        recipient_id: recipientId,
        subject: `Re: ${selectedConversation.subject.replace(/^Re: /, "")}`,
        content: replyContent,
        parent_message_id: selectedConversation.id,
      });

      if (error) throw error;

      toast.success("Reply sent!");
      setReplyContent("");
      loadMessages();
    } catch (error) {
      console.error("Error replying:", error);
      toast.error("Failed to send reply");
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenConversation = async (message: Message) => {
    setSelectedConversation(message);
    setReplyContent("");

    // Mark as read
    if (!message.isRead && message.senderType === "staff") {
      await supabase.from("messages").update({ is_read: true }).eq("id", message.id);
      loadMessages();
    }
  };

  if (!isAuthenticated) return null;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all duration-200 flex items-center justify-center hover:scale-105"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <>
            <MessageSquare className="h-6 w-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] h-[500px] bg-background border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
            {selectedConversation ? (
              <>
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="flex items-center gap-2 hover:opacity-80"
                >
                  <ChevronLeft className="h-5 w-5" />
                  <span className="font-medium truncate">{selectedConversation.subject}</span>
                </button>
              </>
            ) : isComposing ? (
              <>
                <button
                  onClick={() => setIsComposing(false)}
                  className="flex items-center gap-2 hover:opacity-80"
                >
                  <ChevronLeft className="h-5 w-5" />
                  <span className="font-medium">New Message</span>
                </button>
              </>
            ) : (
              <>
                <span className="font-semibold">Messages</span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setIsComposing(true)}
                  className="h-8"
                >
                  New
                </Button>
              </>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : selectedConversation ? (
              /* Conversation View */
              <>
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {/* Original message */}
                    <div className={`p-3 rounded-lg text-sm ${
                      selectedConversation.senderType === "resident" 
                        ? "bg-primary/10 ml-6" 
                        : "bg-muted mr-6"
                    }`}>
                      <p className="text-xs text-muted-foreground mb-1">
                        {selectedConversation.senderName}
                      </p>
                      <p className="whitespace-pre-wrap">{selectedConversation.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {selectedConversation.createdAt}
                      </p>
                    </div>

                    {/* Replies */}
                    {selectedConversation.replies?.map((reply) => (
                      <div
                        key={reply.id}
                        className={`p-3 rounded-lg text-sm ${
                          reply.senderType === "resident" 
                            ? "bg-primary/10 ml-6" 
                            : "bg-muted mr-6"
                        }`}
                      >
                        <p className="text-xs text-muted-foreground mb-1">
                          {reply.senderName}
                        </p>
                        <p className="whitespace-pre-wrap">{reply.content}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {reply.createdAt}
                        </p>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Reply Input */}
                <div className="p-3 border-t flex gap-2">
                  <Input
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Type a reply..."
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleReply()}
                    className="flex-1"
                  />
                  <Button
                    size="icon"
                    onClick={handleReply}
                    disabled={isSending || !replyContent.trim()}
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </>
            ) : isComposing ? (
              /* Compose View */
              <div className="flex-1 p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">To</label>
                  <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select recipient" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-[60]">
                      {staffUsers.map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>
                          {staff.full_name} ({staff.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subject</label>
                  <Input
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="Enter subject"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Message</label>
                  <Textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Type your message..."
                    rows={5}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleSendNewMessage}
                  disabled={isSending}
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send Message
                </Button>
              </div>
            ) : (
              /* Messages List */
              <ScrollArea className="flex-1">
                {messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground mb-4">No messages yet</p>
                    <Button size="sm" onClick={() => setIsComposing(true)}>
                      Send a Message
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y">
                    {messages.map((message) => (
                      <button
                        key={message.id}
                        onClick={() => handleOpenConversation(message)}
                        className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${
                          !message.isRead && message.senderType === "staff" ? "bg-primary/5" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm truncate ${
                                !message.isRead && message.senderType === "staff" 
                                  ? "font-semibold" 
                                  : "font-medium"
                              }`}>
                                {message.subject}
                              </p>
                              {!message.isRead && message.senderType === "staff" && (
                                <Badge variant="default" className="h-5 text-[10px]">New</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {message.senderType === "resident" ? "You" : message.senderName}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                              {message.content}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {new Date(message.createdAt).toLocaleDateString()}
                            </span>
                            {message.replies && message.replies.length > 0 && (
                              <span className="text-[10px] text-primary">
                                {message.replies.length} replies
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;