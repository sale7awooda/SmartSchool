'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { Notice, User } from '@/types';
import { useLanguage } from '@/lib/language-context';
import { Bell, Plus, AlertCircle, Calendar, User as UserIcon, Loader2, MessageSquare, CheckCircle2, Send, Search, Smartphone, Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { getNotices, createNotice, getMessages, sendMessage, getUsersForChat } from '@/lib/supabase-db';
import { processCreateNoticeAction, processSendMessageAction } from '@/app/actions/communication';

export default function CommunicationPage() {
  const { user } = useAuth();
  const { can, isAdmin } = usePermissions();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'notices' | 'messages' | 'broadcasts'>('notices');
  
  // Notices State
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newNotice, setNewNotice] = useState({ title: '', content: '', targetAudience: 'all', isImportant: false });

  // Messages State
  const [chatUsers, setChatUsers] = useState<User[]>([]);
  const [activeChatUser, setActiveChatUser] = useState<User | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);

  // Broadcast State
  const [broadcastType, setBroadcastType] = useState<'whatsapp' | 'push' | 'email'>('whatsapp');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [whatsappTemplate, setWhatsappTemplate] = useState('urgent_alert');
  const [pushPriority, setPushPriority] = useState('high');
  const [emailSubject, setEmailSubject] = useState('');
  const [broadcastAudience, setBroadcastAudience] = useState('all');

  useEffect(() => {
    if (!user) return;

    const fetchInitialData = async () => {
      const fetchedNotices = await getNotices();
      setNotices(fetchedNotices);

      const users = await getUsersForChat();
      setChatUsers(users.filter((u: any) => u.id !== user.id));
    };

    fetchInitialData();

    // Realtime subscriptions
    const noticesChannel = supabase
      .channel('public:notices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setNotices(prev => [payload.new as Notice, ...prev]);
        }
      })
      .subscribe();

    const messagesChannel = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMessage = payload.new;
        if (newMessage.receiver_id === user.id || newMessage.sender_id === user.id) {
          setMessages(prev => [...prev, newMessage]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(noticesChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [user]);

  useEffect(() => {
    if (activeChatUser && user) {
      const loadMessages = async () => {
        const msgs = await getMessages(user.id, activeChatUser.id);
        setMessages(msgs);
      };
      loadMessages();
    }
  }, [activeChatUser, user]);

  if (!user) return null;

  if (!can('view', 'communication')) {
    return <div className="p-4">{t('no_permission')}</div>;
  }

  const canCreateNotice = can('create', 'communication');

  const visibleNotices = notices.filter(notice => {
    if (notice.targetAudience === 'all') return true;
    if (notice.targetAudience === 'staff' && ['admin', 'accountant', 'teacher', 'staff'].includes(user.role)) return true;
    if (notice.targetAudience === 'parents' && ['admin', 'accountant', 'parent'].includes(user.role)) return true;
    return false;
  });

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotice.title || !newNotice.content || !user) return;
    
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', newNotice.title);
      formData.append('content', newNotice.content);
      formData.append('target_audience', newNotice.targetAudience);
      formData.append('is_important', newNotice.isImportant.toString());
      formData.append('createdBy', user.id);

      const result = await processCreateNoticeAction({ success: false, message: '' }, formData);
      if (!result.success) {
        if (result.errors) {
          const firstError = Object.values(result.errors)[0][0] as string;
          toast.error("Validation Error", { description: firstError });
        } else {
          toast.error("Error", { description: result.message });
        }
        return;
      }

      setIsCreating(false);
      setNewNotice({ title: '', content: '', targetAudience: 'all', isImportant: false });
      toast.success(t('notice_posted_success'));
    } catch (error) {
      toast.error(t('failed_to_post_notice'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeChatUser || !user) return;
    
    const text = messageInput;
    setMessageInput('');
    
    try {
      const formData = new FormData();
      formData.append('receiver_id', activeChatUser.id);
      formData.append('content', text);
      formData.append('senderBy', user.id);

      const result = await processSendMessageAction({ success: false, message: '' }, formData);
      
      if (!result.success) {
        toast.error(t('failed_to_send_message'));
      }
    } catch (error) {
      toast.error(t('failed_to_send_message'));
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;
    
    setIsSubmitting(true);
    try {
      await supabase.from('broadcasts').insert([{
        title: emailSubject || 'Urgent Broadcast',
        content: broadcastMessage,
        type: broadcastType,
        target_audience: broadcastAudience,
        sent_by: user.id
      }]);
      setBroadcastMessage('');
      setEmailSubject('');
      toast.success(`${t('urgent')} ${broadcastType.toUpperCase()} ${t('broadcast_sent_success')}`);
    } catch (error) {
      toast.error(t('failed_to_send_broadcast'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">{t('communication')}</h1>
          <p className="text-muted-foreground mt-2 font-medium">{t('communication_desc')}</p>
        </div>
        
        <div className="flex bg-muted p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('notices')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'notices' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {t('notice_board')}
          </button>
          <button 
            onClick={() => setActiveTab('messages')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'messages' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {t('direct_messages')}
          </button>
          {isAdmin() && (
            <button 
              onClick={() => setActiveTab('broadcasts')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'broadcasts' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {t('broadcasts')}
            </button>
          )}
        </div>
      </div>

      {/* Notices Tab */}
      {activeTab === 'notices' && (
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-5">
          <div className="flex justify-end mb-4">
            {canCreateNotice && (
              <button 
                onClick={() => setIsCreating(true)}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20"
              >
                <Plus size={18} />
                {t('new_notice')}
              </button>
            )}
          </div>
          {visibleNotices.map((notice, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              key={notice.id} 
              className={`bg-card rounded-[1.5rem] border shadow-sm overflow-hidden transition-all hover:shadow-md ${
                notice.isImportant ? 'border-amber-500/30 ring-1 ring-amber-500/10' : 'border-border'
              }`}
            >
              {notice.isImportant && (
                <div className="bg-amber-500/10 px-6 py-3 border-b border-amber-500/20 flex items-center gap-2 text-amber-500 text-xs font-bold uppercase tracking-wider">
                  <AlertCircle size={16} />
                  {t('important_announcement')}
                </div>
              )}
              
              <div className="p-6 sm:p-8">
                <h2 className="text-xl font-bold text-foreground mb-3">{notice.title}</h2>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-6 font-medium">{notice.content}</p>
                
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-5 border-t border-border text-xs text-muted-foreground font-bold uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <UserIcon size={16} className="text-muted-foreground" />
                    {notice.authorName} <span className="text-muted-foreground/50">•</span> {notice.authorRole}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-muted-foreground" />
                    {new Date(notice.createdAt).toLocaleDateString(t('locale'), { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div className="flex items-center gap-2 ml-auto rtl:ml-0 rtl:mr-auto">
                    <MessageSquare size={16} className="text-muted-foreground" />
                    {t('audience')}: <span className="text-primary bg-primary/10 px-2 py-1 rounded-md">{t(notice.targetAudience)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <div className="flex-1 bg-card rounded-[2rem] border border-border shadow-sm overflow-hidden flex h-full min-h-[500px]">
          {/* Chat List */}
          <div className="w-1/3 border-r border-border flex flex-col bg-muted/30 rtl:border-r-0 rtl:border-l">
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3" />
                <input 
                  type="text" 
                  placeholder={t('search_messages')} 
                  className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground rtl:pl-4 rtl:pr-10"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {chatUsers.map(chatUser => (
                <button 
                  key={chatUser.id}
                  onClick={() => setActiveChatUser(chatUser)}
                  className={`w-full text-left p-5 border-b border-border transition-colors flex items-start gap-4 rtl:text-right ${activeChatUser?.id === chatUser.id ? 'bg-primary/10' : 'hover:bg-muted/50'}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1.5">
                      <h3 className="font-bold text-foreground text-base truncate">{chatUser.name}</h3>
                    </div>
                    <p className="text-xs font-bold text-primary">{t(chatUser.role)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Window */}
          <div className="flex-1 flex flex-col bg-card">
            {activeChatUser ? (
              <>
                <div className="p-4 border-b border-border flex items-center gap-3 bg-card">
                  <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                    {activeChatUser.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{activeChatUser.name}</h3>
                    <p className="text-xs font-medium text-muted-foreground">{t(activeChatUser.role)}</p>
                  </div>
                </div>
                
                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-6 bg-muted/20">
                  {messages.map(msg => {
                    const isMe = msg.sender_id === user.id;
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] px-5 py-3.5 rounded-2xl ${
                          isMe 
                            ? 'bg-primary text-primary-foreground rounded-br-sm rtl:rounded-br-2xl rtl:rounded-bl-sm' 
                            : 'bg-muted text-foreground rounded-bl-sm rtl:rounded-bl-2xl rtl:rounded-br-sm'
                        }`}>
                          <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground mt-1.5 px-1">
                          {new Date(msg.created_at).toLocaleTimeString(t('locale'), { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="p-4 border-t border-border bg-card">
                  <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                    <input 
                      type="text" 
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder={t('type_message_placeholder')} 
                      className="flex-1 bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground"
                    />
                    <button 
                      type="submit"
                      disabled={!messageInput.trim()}
                      className="p-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary/20 rtl:rotate-180"
                    >
                      <Send size={20} />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center flex-col text-muted-foreground">
                <MessageSquare size={48} className="mb-4 opacity-20" />
                <p>{t('select_user_to_chat')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Broadcasts Tab (Admin Only) */}
      {activeTab === 'broadcasts' && isAdmin() && (
        <div className="flex-1 bg-card rounded-[2rem] border border-border shadow-sm p-8 max-w-3xl mx-auto w-full">
          <div className="mb-8 text-center">
            <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-foreground">{t('urgent_broadcast')}</h2>
            <p className="text-muted-foreground mt-2 font-medium">{t('urgent_broadcast_desc')}</p>
          </div>

          <form onSubmit={handleSendBroadcast} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-foreground mb-3">{t('delivery_method')}</label>
              <div className="grid grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setBroadcastType('whatsapp')}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                    broadcastType === 'whatsapp' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' : 'border-border bg-card text-muted-foreground hover:border-border/80'
                  }`}
                >
                  <MessageSquare size={24} />
                  <span className="font-bold text-sm">{t('whatsapp')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBroadcastType('push')}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                    broadcastType === 'push' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:border-border/80'
                  }`}
                >
                  <Bell size={24} />
                  <span className="font-bold text-sm">{t('app_push')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBroadcastType('email')}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                    broadcastType === 'email' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:border-border/80'
                  }`}
                >
                  <Mail size={24} />
                  <span className="font-bold text-sm">{t('email_alert')}</span>
                </button>
              </div>
            </div>

            {/* Method Specific Options */}
            <div className="p-4 bg-muted/50 rounded-xl border border-border">
              {broadcastType === 'whatsapp' && (
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">{t('message_template')}</label>
                  <select 
                    value={whatsappTemplate}
                    onChange={(e) => setWhatsappTemplate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-card focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-medium text-foreground"
                  >
                    <option value="urgent_alert">{t('urgent_alert_template')}</option>
                    <option value="school_closure">{t('school_closure_template')}</option>
                    <option value="event_reminder">{t('event_reminder_template')}</option>
                    <option value="custom">{t('custom_message_template')}</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-2 font-medium">{t('whatsapp_template_notice')}</p>
                </div>
              )}

              {broadcastType === 'push' && (
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">{t('notification_priority')}</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="pushPriority" 
                        value="high"
                        checked={pushPriority === 'high'}
                        onChange={(e) => setPushPriority(e.target.value)}
                        className="w-4 h-4 text-primary focus:ring-primary border-border" 
                      />
                      <span className="text-sm font-medium text-foreground">{t('high_priority_desc')}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="pushPriority" 
                        value="normal"
                        checked={pushPriority === 'normal'}
                        onChange={(e) => setPushPriority(e.target.value)}
                        className="w-4 h-4 text-primary focus:ring-primary border-border" 
                      />
                      <span className="text-sm font-medium text-foreground">{t('normal')}</span>
                    </label>
                  </div>
                </div>
              )}

              {broadcastType === 'email' && (
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">{t('email_subject')}</label>
                  <input 
                    type="text" 
                    required
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder={t('email_subject_placeholder')} 
                    className="w-full px-4 py-3 rounded-xl border border-border bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium text-foreground" 
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-foreground mb-2">{t('target_audience')}</label>
              <select 
                value={broadcastAudience}
                onChange={(e) => setBroadcastAudience(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/30 focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium text-foreground"
              >
                <option value="all">{t('entire_school')}</option>
                <option value="parents">{t('all_parents')}</option>
                <option value="staff">{t('all_staff')}</option>
                <option value="grade4">{t('grade_4_parents')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-foreground mb-2">{t('message_content')}</label>
              <textarea 
                required
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                rows={4}
                placeholder={t('urgent_message_placeholder')} 
                className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/30 focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground resize-none" 
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs font-bold text-muted-foreground">
                  {broadcastType === 'whatsapp' ? t('whatsapp_concise') : t('message_length_limit')}
                </p>
                <p className={`text-xs font-bold ${broadcastMessage.length > (broadcastType === 'whatsapp' ? 1024 : 500) ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {broadcastMessage.length} / {broadcastType === 'whatsapp' ? '1024' : '500'} {t('chars')}
                </p>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isSubmitting || !broadcastMessage.trim()}
              className="w-full py-4 rounded-xl font-bold text-destructive-foreground bg-destructive hover:bg-destructive/90 transition-all active:scale-[0.98] shadow-lg shadow-destructive/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : (
                <>
                  <AlertCircle size={20} />
                  {t('send_broadcast_now')}
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Create Notice Modal */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-border"
            >
              <div className="p-8 border-b border-border shrink-0 bg-muted/30">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">{t('post_new_notice')}</h2>
                <p className="text-sm font-medium text-muted-foreground mt-2">{t('post_new_notice_desc')}</p>
              </div>
              
              <div className="overflow-y-auto p-8">
                <form id="notice-form" onSubmit={handleCreateNotice} className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">{t('title')}</label>
                    <input 
                      type="text" 
                      required
                      value={newNotice.title}
                      onChange={(e) => setNewNotice({ ...newNotice, title: e.target.value })}
                      placeholder={t('notice_title_placeholder')} 
                      className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/30 focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">{t('message_content')}</label>
                    <textarea 
                      required
                      value={newNotice.content}
                      onChange={(e) => setNewNotice({ ...newNotice, content: e.target.value })}
                      rows={5}
                      placeholder={t('notice_content_placeholder')} 
                      className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/30 focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium text-foreground placeholder:text-muted-foreground resize-none" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-bold text-foreground mb-2">{t('target_audience')}</label>
                      <select 
                        value={newNotice.targetAudience}
                        onChange={(e) => setNewNotice({ ...newNotice, targetAudience: e.target.value })}
                        className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/30 focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium text-foreground"
                      >
                        <option value="all">{t('everyone')}</option>
                        <option value="parents">{t('parents_only')}</option>
                        <option value="staff">{t('staff_only')}</option>
                      </select>
                    </div>
                    
                    <div className="flex flex-col justify-end pb-3.5">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center">
                          <input 
                            type="checkbox" 
                            checked={newNotice.isImportant}
                            onChange={(e) => setNewNotice({ ...newNotice, isImportant: e.target.checked })}
                            className="peer w-6 h-6 rounded-lg border-2 border-border text-primary focus:ring-primary/20 transition-all cursor-pointer appearance-none checked:bg-primary checked:border-primary" 
                          />
                          <CheckCircle2 size={16} className="absolute text-primary-foreground opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                        </div>
                        <span className="text-sm font-bold text-foreground transition-colors">{t('mark_as_important')}</span>
                      </label>
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-border bg-muted/30 shrink-0 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 px-4 py-4 rounded-xl font-bold text-muted-foreground bg-card border border-border hover:bg-muted/50 transition-all active:scale-[0.98]"
                >
                  {t('cancel')}
                </button>
                <button 
                  type="submit"
                  form="notice-form"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-4 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : t('post_notice')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
