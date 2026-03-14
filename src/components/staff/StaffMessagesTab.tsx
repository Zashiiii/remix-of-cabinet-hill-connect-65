import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader2, Inbox, ArrowLeft, Mail, MailOpen, Plus, Users, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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

const StaffMessagesTab = () => {
  const { user } = useStaffAuthContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Compose state
  const [isComposing, setIsComposing] = useState(false);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isLoadingResidents, setIsLoadingResidents] = useState(false);

  const loadMessages = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_staff_messages", {
        p_staff_id: user.id,
      });
      if (error) throw error;

      if (data) {
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

        const allMessages: Message[] = data.map((m: any) => ({
          id: m.id,
          subject: m.subject || "No Subject",
          content: m.content,
          senderType: m.sender_type,
          senderId: m.sender_id,
          senderName: m.sender_type === "resident" ? residentMap[m.sender_id] || "Resident" : "You",
          isRead: m.is_read || false,
          createdAt: new Date(m.created_at || "").toLocaleString(),
          parentMessageId: m.parent_message_id || undefined,
        }));

        const parentMessages = allMessages.filter((m) => !m.parentMessageId);
        const replies = allMessages.filter((m) => m.parentMessageId);

        const conversationsWithReplies = parentMessages.map((parent) => ({
          ...parent,
          replies: replies.filter((r) => r.parentMessageId === parent.id),
        }));

        setMessages(conversationsWithReplies);

        if (selectedConversation) {
          const updated = conversationsWithReplies.find((m) => m.id === selectedConversation.id);
          if (updated) setSelectedConversation(updated);
        }
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, selectedConversation?.id]);

  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel("staff-messages-tab")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        loadMessages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  useEffect(() => {
    if (messagesEndRef.current && selectedConversation) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedConversation?.replies]);

  const loadResidents = async () => {
    if (!user?.id) return;
    setIsLoadingResidents(true);
    try {
      const { data, error } = await supabase.rpc("get_residents_for_messaging_staff", { p_staff_id: user.id });
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
    setSelectedConversation(null);
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
      loadMessages();
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenConversation = async (message: Message) => {
    setSelectedConversation(message);
    setIsComposing(false);
    setReplyContent("");

    const hasUnreadReplies = message.replies?.some((r) => !r.isRead) || false;
    if (!message.isRead || hasUnreadReplies) {
      try {
        await supabase.rpc("staff_mark_message_read", { p_staff_id: user?.id, p_message_id: message.id });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === message.id
              ? { ...m, isRead: true, replies: m.replies?.map((r) => ({ ...r, isRead: true })) }
              : m
          )
        );
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

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    const unreadIds: string[] = [];
    messages.forEach((m) => {
      if (!m.isRead) unreadIds.push(m.id);
      m.replies?.forEach((r) => { if (!r.isRead) unreadIds.push(r.id); });
    });
    if (unreadIds.length === 0) return;
    try {
      for (const msgId of unreadIds) {
        await supabase.rpc("staff_mark_message_read", { p_staff_id: user.id, p_message_id: msgId });
      }
      setMessages((prev) =>
        prev.map((m) => ({ ...m, isRead: true, replies: m.replies?.map((r) => ({ ...r, isRead: true })) }))
      );
      toast.success("All messages marked as read");
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Failed to mark messages as read");
    }
  };

  const unreadCount = messages.filter((m) => !m.isRead || m.replies?.some((r) => !r.isRead)).length;
  const filteredMessages = activeTab === "unread" ? messages.filter((m) => !m.isRead || m.replies?.some((r) => !r.isRead)) : messages;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Messages</h2>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread conversation${unreadCount !== 1 ? 's' : ''}` : 'No unread messages'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
          <Button onClick={handleOpenCompose} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Message
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[600px]">
        {/* Conversation List */}
        <Card className="lg:col-span-1">
          <div className="p-4 border-b">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full">
                <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
                <TabsTrigger value="unread" className="flex-1">
                  Unread
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-1.5 h-5 min-w-[20px] px-1 text-[10px]">
                      {unreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <ScrollArea className="h-[540px]">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                <Inbox className="h-10 w-10 mb-2" />
                <p className="text-sm">{activeTab === "unread" ? "No unread messages" : "No messages yet"}</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredMessages.map((message) => {
                  const hasUnread = !message.isRead || message.replies?.some((r) => !r.isRead);
                  return (
                    <button
                      key={message.id}
                      onClick={() => handleOpenConversation(message)}
                      className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${
                        selectedConversation?.id === message.id ? "bg-muted" : ""
                      } ${hasUnread ? "bg-primary/5" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {hasUnread ? (
                            <Mail className="h-4 w-4 text-primary" />
                          ) : (
                            <MailOpen className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-sm truncate ${hasUnread ? "font-semibold text-foreground" : "text-foreground"}`}>
                              {message.senderName}
                            </span>
                            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                              {message.createdAt}
                            </span>
                          </div>
                          <p className={`text-sm truncate ${hasUnread ? "font-medium" : "text-muted-foreground"}`}>
                            {message.subject}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {message.content}
                          </p>
                          {message.replies && message.replies.length > 0 && (
                            <span className="text-[11px] text-muted-foreground">
                              {message.replies.length} repl{message.replies.length === 1 ? "y" : "ies"}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* Detail / Compose Panel */}
        <Card className="lg:col-span-2">
          {isComposing ? (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">New Message</h3>
                <Button variant="ghost" size="sm" onClick={() => setIsComposing(false)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                  <SelectTrigger>
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
                <Label>Subject</Label>
                <Input placeholder="Enter subject..." value={newSubject} onChange={(e) => setNewSubject(e.target.value)} maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea placeholder="Type your message..." value={newContent} onChange={(e) => setNewContent(e.target.value)} className="min-h-[200px]" maxLength={1000} />
              </div>
              <Button onClick={handleSendNewMessage} disabled={isSending || !selectedRecipient || !newSubject.trim() || !newContent.trim()}>
                {isSending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</> : <><Send className="h-4 w-4 mr-2" />Send Message</>}
              </Button>
            </div>
          ) : selectedConversation ? (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b flex items-center gap-3">
                <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSelectedConversation(null)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h3 className="font-semibold">{selectedConversation.subject}</h3>
                  <p className="text-sm text-muted-foreground">From: {selectedConversation.senderName}</p>
                </div>
              </div>
              <ScrollArea className="flex-1 p-4 max-h-[420px]">
                {/* Original message */}
                <div className="mb-4">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-primary">{selectedConversation.senderName}</span>
                      <span className="text-xs text-muted-foreground">{selectedConversation.createdAt}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{selectedConversation.content}</p>
                  </div>
                </div>
                {/* Replies */}
                {selectedConversation.replies?.map((reply) => (
                  <div key={reply.id} className="mb-3">
                    <div className={`rounded-lg p-4 ${reply.senderType === "staff" ? "bg-primary/10 ml-8" : "bg-muted/50 mr-8"}`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium">{reply.senderName}</span>
                        <span className="text-xs text-muted-foreground">{reply.createdAt}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </ScrollArea>
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your reply..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    className="min-h-[60px] resize-none"
                    maxLength={1000}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                  />
                  <Button onClick={handleReply} disabled={isSending || !replyContent.trim()} size="icon" className="shrink-0 self-end h-10 w-10">
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-muted-foreground">
              <Inbox className="h-12 w-12 mb-3" />
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm">Choose a message from the list or compose a new one</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default StaffMessagesTab;
