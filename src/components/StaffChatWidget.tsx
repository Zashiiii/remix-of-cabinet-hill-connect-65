import { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Loader2, Inbox, ArrowLeft, Mail, MailOpen, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
  replies?: Message[];
}

interface Resident {
  user_id: string;
  full_name: string;
  email: string;
}

const StaffChatWidget = () => {
  const { user, isAuthenticated } = useStaffAuthContext();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [replyContent, setReplyContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState("unread");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Compose state
  const [isComposing, setIsComposing] = useState(false);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isLoadingResidents, setIsLoadingResidents] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadMessages();

      const channel = supabase
        .channel("staff-chat-messages")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages",
          },
          () => {
            loadMessages();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (messagesEndRef.current && selectedConversation) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedConversation?.replies]);

  const loadResidents = async () => {
    if (!user?.id) return;
    setIsLoadingResidents(true);
    try {
      const { data, error } = await supabase.rpc("get_residents_for_messaging_staff", {
        p_staff_id: user.id,
      });
      if (error) throw error;
      setResidents(data || []);
    } catch (error) {
      console.error("Error loading residents:", error);
      toast.error("Failed to load residents");
    } finally {
      setIsLoadingResidents(false);
    }
  };

  const handleOpenCompose = () => {
    setIsComposing(true);
    setSelectedRecipient("");
    setNewSubject("");
    setNewContent("");
    loadResidents();
  };

  const handleSendNewMessage = async () => {
    if (!selectedRecipient || !newSubject.trim() || !newContent.trim() || !user?.id) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSending(true);
    try {
      const { error } = await supabase.rpc("staff_send_new_message", {
        p_staff_id: user.id,
        p_recipient_user_id: selectedRecipient,
        p_subject: newSubject.trim(),
        p_content: newContent.trim(),
      });

      if (error) throw error;

      toast.success("Message sent successfully");
      setIsComposing(false);
      setSelectedRecipient("");
      setNewSubject("");
      setNewContent("");
      loadMessages();
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const loadMessages = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_staff_messages", {
        p_staff_id: user.id,
      });

      if (error) throw error;

      if (data) {
        // Get resident names using RPC that bypasses RLS
        const residentUserIds = [
          ...new Set(
            data.filter((m: any) => m.sender_type === "resident").map((m: any) => m.sender_id)
          ),
        ];
        let residentMap: Record<string, string> = {};

        if (residentUserIds.length > 0) {
          const { data: residentData } = await supabase.rpc("get_resident_names_by_user_ids", {
            p_user_ids: residentUserIds,
          });

          if (residentData) {
            residentMap = Object.fromEntries(
              residentData.map((r: any) => [r.user_id, r.full_name])
            );
          }
        }

        // Group messages into conversations
        const allMessages: Message[] = data.map((m: any) => ({
          id: m.id,
          subject: m.subject || "No Subject",
          content: m.content,
          senderType: m.sender_type,
          senderId: m.sender_id,
          senderName:
            m.sender_type === "resident"
              ? residentMap[m.sender_id] || "Resident"
              : "You",
          isRead: m.is_read || false,
          createdAt: new Date(m.created_at || "").toLocaleString(),
          parentMessageId: m.parent_message_id || undefined,
        }));

        // Separate parent messages and replies
        const parentMessages = allMessages.filter((m) => !m.parentMessageId);
        const replies = allMessages.filter((m) => m.parentMessageId);

        // Attach replies to parent messages
        const conversationsWithReplies = parentMessages.map((parent) => ({
          ...parent,
          replies: replies.filter((r) => r.parentMessageId === parent.id),
        }));

        setMessages(conversationsWithReplies);
        setUnreadCount(allMessages.filter((m) => !m.isRead).length);

        // Update selected conversation if open
        if (selectedConversation) {
          const updated = conversationsWithReplies.find(
            (m) => m.id === selectedConversation.id
          );
          if (updated) setSelectedConversation(updated);
        }
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenConversation = async (message: Message) => {
    setSelectedConversation(message);
    setReplyContent("");

    if (!message.isRead) {
      try {
        await supabase.rpc("staff_mark_message_read", { p_message_id: message.id });
        setMessages((prev) =>
          prev.map((m) => (m.id === message.id ? { ...m, isRead: true } : m))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error("Error marking as read:", error);
      }
    }
  };

  const handleReply = async () => {
    if (!replyContent.trim() || !selectedConversation || !user?.id) {
      toast.error("Please enter a reply message");
      return;
    }

    setIsSending(true);
    try {
      const { error } = await supabase.rpc("staff_send_reply", {
        p_staff_id: user.id,
        p_recipient_id: selectedConversation.senderId,
        p_subject: `Re: ${selectedConversation.subject}`,
        p_content: replyContent,
        p_parent_message_id: selectedConversation.id,
      });

      if (error) throw error;

      toast.success("Reply sent");
      setReplyContent("");
      loadMessages();
    } catch (error) {
      console.error("Error sending reply:", error);
      toast.error("Failed to send reply");
    } finally {
      setIsSending(false);
    }
  };

  const filteredMessages =
    activeTab === "unread" ? messages.filter((m) => !m.isRead) : messages;

  if (!isAuthenticated) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chat Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all"
          size="icon"
        >
          <MessageSquare className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="bg-card border rounded-lg shadow-2xl w-[380px] h-[500px] flex flex-col animate-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between bg-primary text-primary-foreground rounded-t-lg">
            {isComposing ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                  onClick={() => setIsComposing(false)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h3 className="font-semibold text-sm">New Message</h3>
                  <p className="text-xs opacity-80">Send to resident</p>
                </div>
              </div>
            ) : selectedConversation ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                  onClick={() => setSelectedConversation(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h3 className="font-semibold text-sm truncate max-w-[200px]">
                    {selectedConversation.subject}
                  </h3>
                  <p className="text-xs opacity-80">{selectedConversation.senderName}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                <h3 className="font-semibold">Staff Inbox</h3>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => {
                setIsOpen(false);
                setSelectedConversation(null);
                setIsComposing(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          {isComposing ? (
            <div className="flex-1 flex flex-col p-4">
              <div className="space-y-4 flex-1">
                <div className="space-y-2">
                  <Label htmlFor="recipient" className="text-sm font-medium">
                    To
                  </Label>
                  <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                    <SelectTrigger id="recipient">
                      <SelectValue placeholder={isLoadingResidents ? "Loading..." : "Select resident"} />
                    </SelectTrigger>
                    <SelectContent>
                      {residents.map((resident) => (
                        <SelectItem key={resident.user_id} value={resident.user_id}>
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3" />
                            <span>{resident.full_name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-sm font-medium">
                    Subject
                  </Label>
                  <Input
                    id="subject"
                    placeholder="Enter subject..."
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2 flex-1">
                  <Label htmlFor="content" className="text-sm font-medium">
                    Message
                  </Label>
                  <Textarea
                    id="content"
                    placeholder="Type your message..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="min-h-[120px] resize-none"
                    maxLength={1000}
                  />
                </div>
              </div>

              <Button
                onClick={handleSendNewMessage}
                disabled={isSending || !selectedRecipient || !newSubject.trim() || !newContent.trim()}
                className="w-full mt-4"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </div>
          ) : selectedConversation ? (
            <div className="flex-1 flex flex-col">
              <ScrollArea className="flex-1 p-4">
                {/* Original Message */}
                <div className="mb-4">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-medium text-primary">
                        {selectedConversation.senderName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {selectedConversation.createdAt}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedConversation.content}
                    </p>
                  </div>
                </div>

                {/* Replies */}
                {selectedConversation.replies?.map((reply) => (
                  <div key={reply.id} className="mb-3">
                    <div
                      className={`rounded-lg p-3 ${
                        reply.senderType === "staff"
                          ? "bg-primary/10 ml-4"
                          : "bg-muted/50 mr-4"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-medium text-primary">
                          {reply.senderName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {reply.createdAt}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </ScrollArea>

              {/* Reply Input */}
              <div className="p-3 border-t">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your reply..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    className="min-h-[60px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleReply();
                      }
                    }}
                  />
                  <Button
                    onClick={handleReply}
                    disabled={isSending || !replyContent.trim()}
                    size="icon"
                    className="h-[60px]"
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              {/* Tabs */}
              <div className="p-2 border-b">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full">
                    <TabsTrigger value="unread" className="flex-1 text-xs">
                      <Mail className="h-3 w-3 mr-1" />
                      Unread ({messages.filter((m) => !m.isRead).length})
                    </TabsTrigger>
                    <TabsTrigger value="all" className="flex-1 text-xs">
                      <MailOpen className="h-3 w-3 mr-1" />
                      All
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Messages List */}
              <ScrollArea className="flex-1">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : filteredMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
                    <Inbox className="h-12 w-12 mb-3 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">
                      {activeTab === "unread" ? "No unread messages" : "No messages yet"}
                    </p>
                  </div>
                ) : (
                  <div className="p-2 space-y-2">
                    {filteredMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                          !message.isRead
                            ? "bg-primary/5 border border-primary/20"
                            : "border"
                        }`}
                        onClick={() => handleOpenConversation(message)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4
                                className={`text-sm truncate ${
                                  !message.isRead ? "font-semibold" : "font-medium"
                                }`}
                              >
                                {message.subject}
                              </h4>
                              {!message.isRead && (
                                <Badge className="text-[10px] px-1.5 py-0">New</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {message.senderName}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                              {message.content}
                            </p>
                          </div>
                          {message.replies && message.replies.length > 0 && (
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {message.replies.length} replies
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Compose Button */}
              <div className="p-3 border-t">
                <Button onClick={handleOpenCompose} className="w-full" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  New Message
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StaffChatWidget;
