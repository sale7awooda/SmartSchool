'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { useLanguage } from '@/lib/language-context';
import { 
  Plus, 
  AlertCircle, 
  Calendar, 
  User as UserIcon, 
  Loader2, 
  MessageSquare, 
  CheckCircle2, 
  Trash2, 
  RotateCcw, 
  Bell, 
  Volume2, 
  Eye, 
  Sparkles, 
  BookOpen, 
  HeartHandshake
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { getNotices, getBroadcasts } from '@/lib/api/communication';

export default function CommunicationPage() {
  const { user } = useAuth();
  const { can, isAdmin } = usePermissions();
  const { t, isRTL } = useLanguage();

  // Unified communication items useSWR keys
  const { data: noticesData, isLoading: isNoticesLoading, mutate: mutateNotices } = useSWR('notices', getNotices);
  const { data: broadcastsData, isLoading: isBroadcastsLoading, mutate: mutateBroadcasts } = useSWR('broadcasts', getBroadcasts);

  const notices = noticesData || [];
  const broadcasts = broadcastsData || [];
  const isLoading = isNoticesLoading || isBroadcastsLoading;

  // Modal / Dialog states
  const [isCreatingNotice, setIsCreatingNotice] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newNotice, setNewNotice] = useState({ 
    title: '', 
    content: '', 
    targetAudience: 'all', 
    isImportant: false 
  });
  const [newBroadcast, setNewBroadcast] = useState({ 
    message: '', 
    template: 'general_notice', 
    priority: 'high', 
    targetAudience: 'all' 
  });
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);

  useEffect(() => {
    if (!user) return;

    // Listen reactively to database events on notices and broadcasts
    const noticesChannel = supabase
      .channel('communication-notices-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, () => {
        mutateNotices();
      })
      .subscribe();

    const broadcastsChannel = supabase
      .channel('communication-broadcasts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'broadcasts' }, () => {
        mutateBroadcasts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(noticesChannel);
      supabase.removeChannel(broadcastsChannel);
    };
  }, [user, mutateNotices, mutateBroadcasts]);

  if (!user) return null;

  if (!can('view', 'communication')) {
    return (
      <div className="p-6 text-center text-muted-foreground font-semibold">
        {t('no_permission') || 'You do not have permission to view communication board.'}
      </div>
    );
  }

  // Combine lists of notices & broadcasts
  const allItems = [
    ...notices.map(n => ({ ...n, itemType: 'notice' as const })),
    ...broadcasts.map(b => ({ ...b, itemType: 'broadcast' as const }))
  ];

  // Sort chronologically (newest first)
  allItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Filter out deleted posts for non-admins
  const filteredItems = isAdmin() 
    ? allItems 
    : allItems.filter(item => !item.isDeleted);

  // Soft delete notice or broadcast
  const handleSoftDelete = async (item: any) => {
    try {
      const isNotice = item.itemType === 'notice';
      const targetColumn = isNotice ? 'role_target' : 'target_audience';
      const currentTarget = isNotice ? item.role_target || [] : item.role_target || [];
      const newTarget = [...currentTarget.filter((t: string) => t !== 'deleted'), 'deleted'];

      const table = isNotice ? 'notices' : 'broadcasts';
      const { error } = await supabase
        .from(table)
        .update({ [targetColumn]: newTarget })
        .eq('id', item.id);

      if (error) throw error;
      toast.success(t('soft_deleted_success') || 'Item soft-deleted. Admin can restore or erase.');
      mutateNotices();
      mutateBroadcasts();
    } catch (e: any) {
      console.error(e);
      toast.error(t('failed_to_delete') || 'Failed to soft delete item.');
    }
  };

  // Restore notice or broadcast
  const handleRestore = async (item: any) => {
    try {
      const isNotice = item.itemType === 'notice';
      const targetColumn = isNotice ? 'role_target' : 'target_audience';
      const currentTarget = isNotice ? item.role_target || [] : item.role_target || [];
      const newTarget = currentTarget.filter((t: string) => t !== 'deleted');
      if (newTarget.length === 0) newTarget.push('all');

      const table = isNotice ? 'notices' : 'broadcasts';
      const { error } = await supabase
        .from(table)
        .update({ [targetColumn]: newTarget })
        .eq('id', item.id);

      if (error) throw error;
      toast.success(t('restored_success') || 'Notice/broadcast restored successfully!');
      mutateNotices();
      mutateBroadcasts();
    } catch (e: any) {
      console.error(e);
      toast.error(t('failed_to_restore') || 'Failed to restore item.');
    }
  };

  // Permanent Delete
  const handlePermanentDelete = (item: any) => {
    setItemToDelete(item);
  };

  const confirmPermanentDelete = async () => {
    if (!itemToDelete) return;
    try {
      const table = itemToDelete.itemType === 'notice' ? 'notices' : 'broadcasts';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', itemToDelete.id);

      if (error) throw error;
      toast.success(t('permanent_delete_success') || 'Item permanently erased from record.');
      mutateNotices();
      mutateBroadcasts();
    } catch (e: any) {
      console.error(e);
      toast.error(t('failed_to_delete') || 'Failed to permanently erase item.');
    } finally {
      setItemToDelete(null);
    }
  };

  // Create Notice handleSubmit
  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotice.title.trim() || !newNotice.content.trim()) return;

    setIsSubmitting(true);
    try {
      const noticePayload = {
        title: newNotice.title,
        content: newNotice.content,
        school_id: user.school_id,
        created_by: user.id,
        role_target: newNotice.isImportant 
          ? [newNotice.targetAudience, 'important'] 
          : [newNotice.targetAudience],
        is_important: newNotice.isImportant
      };

      const { error } = await supabase
        .from('notices')
        .insert([noticePayload]);

      if (error) throw error;

      // Dispatch real Web Push notifications to active subscribers if it is important
      if (newNotice.isImportant) {
        try {
          await fetch('/api/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: `Notice: ${newNotice.title}`,
              content: newNotice.content,
              url: '/dashboard/communication',
              targetAudience: newNotice.targetAudience
            })
          });
        } catch (pushErr) {
          console.error('Failed to trigger push notifications dispatch:', pushErr);
        }
      }

      setIsCreatingNotice(false);
      setNewNotice({ title: '', content: '', targetAudience: 'all', isImportant: false });
      toast.success(t('notice_posted_success') || 'Notice successfully posted on board!');
      mutateNotices();
      mutateBroadcasts();
    } catch (err: any) {
      console.error(err);
      toast.error(t('failed_to_post_notice') || 'Failed to publish notice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dispatch Broadcast handleSubmit
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBroadcast.message.trim()) return;

    setIsSubmitting(true);
    let title = 'General Notice';
    if (newBroadcast.template === 'school_break') title = 'School Break Announcement';
    else if (newBroadcast.template === 'emergency') title = 'EMERGENCY ALERT';
    else if (newBroadcast.template === 'payments_update') title = 'Payments / Fees Update';
    else if (newBroadcast.template === 'event_reminder') title = 'Event Reminder Alert';
    else if (newBroadcast.template === 'urgent_notice') title = 'Urgent Notice';
    else if (newBroadcast.template === 'general_notice') title = 'General Notice';
    else if (newBroadcast.template === 'custom') title = 'Custom Broadcast Announcement';

    try {
      const { error } = await supabase.from('broadcasts').insert([{
        title: title,
        message: newBroadcast.message,
        target_audience: [newBroadcast.targetAudience],
        created_by: user.id,
        school_id: user.school_id
      }]);

      if (error) throw error;

      // Broadcast real-time push chime
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-84.wav');
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch (ae) {}

      // Dispatch Web Push notification
      try {
        await fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title,
            content: newBroadcast.message,
            url: '/dashboard/communication',
            targetAudience: newBroadcast.targetAudience
          })
        });
      } catch (pushErr) {
        console.error('Failed to trigger broadcast push:', pushErr);
      }

      setIsBroadcasting(false);
      setNewBroadcast({ message: '', template: 'general_notice', priority: 'high', targetAudience: 'all' });
      toast.success(t('broadcast_sent_success') || 'Broadcast alert dispatched to lockscreens!');
      mutateNotices();
      mutateBroadcasts();
    } catch (err: any) {
      console.error(err);
      toast.error(t('failed_to_send_broadcast') || 'Failed to send broadcast.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-8 h-full flex flex-col"
    >
      {/* Header and Action Triggers */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0 pb-1 border-b border-border">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Bell className="text-primary" size={28} />
            {t('notice_board') || 'Notice & Communication Board'}
          </h1>
          <p className="text-muted-foreground mt-2 font-medium">
            {t('communication_desc') || 'School-wide announcements, bulletins, and real-time push broadcasts.'}
          </p>
        </div>

        {isAdmin() && (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setIsCreatingNotice(true)}
              className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground font-bold rounded-2xl hover:bg-primary/95 transition-all shadow-md hover:shadow-primary/10 active:scale-[0.98] cursor-pointer text-sm"
            >
              <Plus size={18} />
              {t('new_notice') || 'Post Notice'}
            </button>
            <button
              onClick={() => setIsBroadcasting(true)}
              className="flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl transition-all shadow-md hover:shadow-amber-500/10 active:scale-[0.98] cursor-pointer text-sm"
            >
              <Volume2 size={18} />
              {t('broadcast_short') || 'Broadcast Alert'}
            </button>
          </div>
        )}
      </div>

      {/* Main Notice Grid */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
          <Loader2 size={36} className="animate-spin text-primary" />
          <p className="font-bold text-sm tracking-wide">Syncing message boards...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-24 text-center bg-card/40 rounded-[2rem] border-2 border-dashed border-border p-8">
          <Bell size={48} className="text-muted-foreground/40 mb-4 animate-bounce" />
          <h3 className="text-lg font-bold text-foreground">
            {t('no_recent_notices') || 'Notice board is currently clear.'}
          </h3>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm font-medium">
            Check back later for school events, schedule notices, and administrative letters.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-1 pb-8 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item, i) => {
              const isNotice = item.itemType === 'notice';
              const isDeleted = item.isDeleted;
              
              return (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.05, 0.4) }}
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`bg-card rounded-[2rem] border overflow-hidden p-6 sm:p-7 flex flex-col justify-between transition-all hover:scale-[1.01] hover:shadow-md cursor-pointer relative ${
                    isDeleted 
                      ? 'opacity-60 border-dashed border-destructive/40 bg-muted/20 relative' 
                      : item.isImportant || !isNotice
                        ? 'border-amber-500/30 shadow-sm ring-1 ring-amber-500/5' 
                        : 'border-border shadow-sm'
                  }`}
                >
                  {/* Faded Strike-Through line if soft deleted */}
                  {isDeleted && (
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-destructive/30 z-10 pointer-events-none" />
                  )}

                  <div className="space-y-4">
                    {/* Badget & Category */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${
                        isDeleted 
                          ? 'bg-destructive/10 text-destructive'
                          : !isNotice 
                            ? 'bg-amber-500/10 text-amber-500' 
                            : item.isImportant 
                              ? 'bg-rose-500/10 text-rose-500' 
                              : 'bg-primary/10 text-primary'
                      }`}>
                        {isDeleted 
                          ? 'Trash Bin / Deleted' 
                          : !isNotice 
                            ? 'Broadcast Alert' 
                            : item.isImportant 
                              ? 'Important Notice' 
                              : 'Notice Board'
                        }
                      </span>

                      <span className="text-[10px] font-semibold text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString(t('locale'), { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className={`text-base font-bold text-foreground leading-snug line-clamp-2 ${isDeleted ? 'line-through text-muted-foreground' : ''}`}>
                      {item.title}
                    </h3>

                    {/* Message teaser */}
                    <p className={`text-muted-foreground text-sm leading-relaxed line-clamp-4 font-medium ${isDeleted ? 'line-through' : ''}`}>
                      {item.content || (item.itemType === 'broadcast' ? item.message : '')}
                    </p>
                  </div>

                  {/* Metadata and Control Buttons */}
                  <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs font-bold text-muted-foreground shrink-0 select-none">
                    <div className="flex items-center gap-1.5 truncate pr-2">
                      <UserIcon size={14} className="text-muted-foreground shrink-0" />
                      <span className="truncate">{item.authorName || 'System Admin'}</span>
                    </div>

                    {/* Admin Actions */}
                    {isAdmin() ? (
                      <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                        {isDeleted ? (
                          <>
                            <button
                              onClick={() => handleRestore(item)}
                              title="Restore bulletin"
                              className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                            >
                              <RotateCcw size={15} />
                            </button>
                            <button
                              onClick={() => handlePermanentDelete(item)}
                              title="Erase permanently"
                              className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleSoftDelete(item)}
                            title="Soft Delete"
                            className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="bg-muted px-2 py-0.5 rounded text-[10px] shrink-0 font-extrabold uppercase">
                        {t(item.targetAudience) || item.targetAudience}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detail Dialog Popup */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <div className="absolute inset-0 bg-transparent" onClick={() => setSelectedItem(null)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-card text-foreground rounded-[2rem] border border-border shadow-2xl p-6 sm:p-8 w-full max-w-xl z-10 relative space-y-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    itemTypeColor(selectedItem)
                  }`}>
                    {selectedItem.itemType === 'broadcast' ? <Volume2 size={24} /> : <Bell size={24} />}
                  </div>
                  <div>
                    <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-md ${
                      itemTypeBadges(selectedItem)
                    }`}>
                      {selectedItem.itemType === 'broadcast' ? 'Urgent Lockscreen Notification' : 'Notice Board'}
                    </span>
                    <p className="text-xs font-semibold text-muted-foreground mt-1.5 flex items-center gap-1">
                      <Calendar size={13} />
                      {new Date(selectedItem.created_at).toLocaleDateString(t('locale'), { 
                        weekday: 'long', 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted font-mono font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-snug">
                  {selectedItem.title}
                </h2>
                <p className="text-muted-foreground font-medium text-sm sm:text-base leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                  {selectedItem.content || selectedItem.message}
                </p>
              </div>

              <div className="pt-6 border-t border-border flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-muted-foreground">
                <div className="flex items-center gap-2">
                  <UserIcon size={16} />
                  <span>
                    {t('author') || 'Publisher'}: <span className="text-foreground">{selectedItem.authorName || 'System Admin'} ({selectedItem.authorRole || 'admin'})</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare size={16} />
                  <span>
                    {t('audience') || 'Audience'}: <span className="bg-primary/5 text-primary px-2 py-0.5 rounded border border-primary/10 font-bold uppercase">{t(selectedItem.targetAudience) || selectedItem.targetAudience}</span>
                  </span>
                </div>
              </div>

              {selectedItem.isDeleted && (
                <div className="p-3.5 bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold rounded-xl text-center">
                  Notice is currently marked as Soft-Deleted. It is hidden from teachers, parents and students.
                </div>
              )}

              <div className="pt-2">
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="w-full py-4 text-center bg-muted text-foreground text-sm font-semibold rounded-xl active:scale-[0.98] transition-all hover:bg-muted/80"
                >
                  {t('close') || 'Close View'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Post Notice Form Dialog */}
      <AnimatePresence>
        {isCreatingNotice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <div className="absolute inset-0 bg-transparent" onClick={() => setIsCreatingNotice(false)} />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-border relative z-10"
            >
              <div className="p-8 border-b border-border bg-muted/20 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
                    <Sparkles className="text-primary" size={22} />
                    {t('post_new_notice') || 'Publish New Notice'}
                  </h2>
                  <p className="text-xs font-semibold text-muted-foreground mt-1">
                    Adds a static bulletin or event notice to the board.
                  </p>
                </div>
                <button 
                  onClick={() => setIsCreatingNotice(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground font-mono font-bold"
                >
                  ✕
                </button>
              </div>
              
              <div className="overflow-y-auto p-8 space-y-6">
                <form id="notice-form" onSubmit={handleCreateNotice} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <BookOpen size={14} />
                      {t('title') || 'Notice Title'}
                    </label>
                    <input 
                      type="text" 
                      required
                      value={newNotice.title}
                      onChange={(e) => setNewNotice({ ...newNotice, title: e.target.value })}
                      placeholder={t('notice_title_placeholder') || 'E.g., End of Term Schedule Revision'} 
                      className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/40 focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium text-foreground text-sm" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <MessageSquare size={14} />
                      {t('message_content') || 'Notice Description'}
                    </label>
                    <textarea 
                      required
                      value={newNotice.content}
                      onChange={(e) => setNewNotice({ ...newNotice, content: e.target.value })}
                      rows={5}
                      placeholder={t('notice_content_placeholder') || 'E.g., Please note that the final assessment periods have been slightly shifted...'} 
                      className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/40 focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium text-foreground text-sm placeholder:text-muted-foreground resize-none" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-5 pt-1">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                        <HeartHandshake size={14} />
                        {t('target_audience') || 'Audience'}
                      </label>
                      <select 
                        value={newNotice.targetAudience}
                        onChange={(e) => setNewNotice({ ...newNotice, targetAudience: e.target.value })}
                        className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/40 focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold text-foreground text-sm"
                      >
                        <option value="all">{t('everyone') || 'Everyone'}</option>
                        <option value="parents">{t('parents_only') || 'Parents Only'}</option>
                        <option value="staff">{t('staff_only') || 'Staff Only'}</option>
                      </select>
                    </div>
                    
                    <div className="flex flex-col justify-end pb-1.5">
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
                        <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                          {t('mark_as_important') || 'High Priority'}
                        </span>
                      </label>
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-border bg-muted/30 shrink-0 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsCreatingNotice(false)}
                  className="flex-1 px-4 py-4 rounded-xl font-bold text-muted-foreground bg-card border border-border hover:bg-muted/50 transition-all active:scale-[0.98] text-sm"
                >
                  {t('cancel')}
                </button>
                <button 
                  type="submit"
                  form="notice-form"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-4 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary/95 transition-all active:scale-[0.98] shadow-md shadow-primary/20 flex items-center justify-center gap-2 text-sm"
                >
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : t('post_notice') || 'Publish Bulletin'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dispatch Broadcast Form Dialog */}
      <AnimatePresence>
        {isBroadcasting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <div className="absolute inset-0 bg-transparent" onClick={() => setIsBroadcasting(false)} />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-border relative z-10"
            >
              <div className="p-8 border-b border-border bg-muted/20 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
                    <Volume2 className="text-amber-500" size={22} />
                    {t('urgent_broadcast') || 'Emergency Lockscreen Broadcast'}
                  </h2>
                  <p className="text-xs font-semibold text-muted-foreground mt-1">
                    Triggers browser push alerts instantly to current devices.
                  </p>
                </div>
                <button 
                  onClick={() => setIsBroadcasting(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground font-mono font-bold"
                >
                  ✕
                </button>
              </div>
              
              <div className="overflow-y-auto p-8 space-y-6">
                <form id="broadcast-form" onSubmit={handleSendBroadcast} className="space-y-4">
                  <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex gap-3 text-xs text-amber-600 dark:text-amber-400 font-medium leading-relaxed mb-1">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <p>
                      This action dispatches critical web-sockets & lockscreen banners. Always ensure brevity and absolute correctness.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        {t('message_template') || 'Alert Template'}
                      </label>
                      <select 
                        value={newBroadcast.template}
                        onChange={(e) => {
                          const temp = e.target.value;
                          let defaultMsg = '';
                          if (temp === 'school_break') defaultMsg = 'Dear Parents and Staff, Please be informed that the school will be closed for school break starting from [Date] to [Date]. Classes will resume on [Date]. Enjoy the break!';
                          else if (temp === 'emergency') defaultMsg = 'EMERGENCY NOTICE: Please be aware of [Emergency Detail]. We urge all staff, parents and students to follow safety instructions immediately. Further updates will be published live.';
                          else if (temp === 'payments_update') defaultMsg = 'Dear Parents, This is a reminder that tuition fees and payment balances for the current term should be processed by [Date] to avoid invoice penalties or services interruption.';
                          else if (temp === 'event_reminder') defaultMsg = 'Event Reminder: We are excited to announce our upcoming [Event Name] scheduled on [Date] at [Time]. We look forward to seeing everyone join.';
                          else if (temp === 'urgent_notice') defaultMsg = 'URGENT NOTICE: All parents and staff, please read: many key updates of school protocol change. Action needed by [Date].';
                          else if (temp === 'general_notice') defaultMsg = 'General Notice: We would like to inform everyone that [Annoucement description]. Thank you for your continued support.';
                          else if (temp === 'custom') defaultMsg = '';
                          
                          setNewBroadcast({ ...newBroadcast, template: temp, message: defaultMsg });
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-muted/40 focus:bg-card focus:border-primary outline-none transition-all font-bold text-foreground text-sm"
                      >
                        <option value="general_notice">General Notice</option>
                        <option value="school_break">School Break</option>
                        <option value="emergency">Emergency</option>
                        <option value="payments_update">Payments Update</option>
                        <option value="event_reminder">Event Reminder</option>
                        <option value="urgent_notice">Urgent Notice</option>
                        <option value="custom">Custom Message (Write Own)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        {t('target_audience') || 'Audience Scoop'}
                      </label>
                      <select 
                        value={newBroadcast.targetAudience}
                        onChange={(e) => setNewBroadcast({ ...newBroadcast, targetAudience: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-muted/40 focus:bg-card focus:border-primary outline-none transition-all font-bold text-foreground text-sm"
                      >
                        <option value="all">{t('entire_school') || 'Entire School'}</option>
                        <option value="parents">{t('all_parents') || 'All Parents'}</option>
                        <option value="staff">{t('all_staff') || 'All Staff'}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center justify-between">
                      <span>{t('message_content') || 'Broadcast Payload'}</span>
                      <span className={`text-[10px] font-bold ${newBroadcast.message.length > 500 ? 'text-destructive' : 'text-primary'}`}>
                        {newBroadcast.message.length}/500 {t('chars') || 'chars'}
                      </span>
                    </label>
                    <textarea 
                      required
                      value={newBroadcast.message}
                      onChange={(e) => setNewBroadcast({ ...newBroadcast, message: e.target.value.substring(0, 500) })}
                      rows={4}
                      placeholder={t('urgent_message_placeholder') || 'E.g., Due to inclement weather conditions, morning bus schedules are pushed forward 45 minutes.'} 
                      className="w-full px-4 py-3.5 rounded-xl border border-border bg-muted/40 focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium text-foreground text-sm placeholder:text-muted-foreground resize-none" 
                    />
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-border bg-muted/30 shrink-0 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsBroadcasting(false)}
                  className="flex-1 px-4 py-4 rounded-xl font-bold text-muted-foreground bg-card border border-border hover:bg-muted/50 transition-all active:scale-[0.98] text-sm"
                >
                  {t('close') || 'Dismiss'}
                </button>
                <button 
                  type="submit"
                  form="broadcast-form"
                  disabled={isSubmitting || !newBroadcast.message.trim()}
                  className="flex-1 px-4 py-4 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all active:scale-[0.98] shadow-md shadow-amber-500/10 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : (
                    <>
                      <Volume2 size={18} />
                      {t('send_broadcast_now') || 'Broadcast Lockscreen'}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Item Delete confirmation popup - no window.confirm */}
      <AnimatePresence>
        {itemToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/85 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card text-foreground rounded-[2rem] border border-border shadow-2xl p-6 sm:p-7 w-full max-w-sm relative space-y-5"
            >
              <div className="flex items-center justify-center w-12 h-12 bg-red-500/10 text-red-500 rounded-full mx-auto">
                <Trash2 size={22} className="text-red-500" />
              </div>
              
              <div className="space-y-2 text-center">
                <h3 className="text-lg font-bold text-foreground">Erase Permanently?</h3>
                <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                  Are you absolutely sure you want to permanently delete this broadcast/notice? This will remove all trace history from student logs and is completely irreversible.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setItemToDelete(null)}
                  className="flex-1 py-3 text-xs bg-muted text-muted-foreground font-bold rounded-xl active:scale-[0.98] transition-all hover:bg-muted/80"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmPermanentDelete}
                  className="flex-1 py-3 text-xs bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                >
                  Permanently Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}

// Utility styling helpers
function itemTypeColor(item: any) {
  if (item.isDeleted) return 'bg-destructive/10 text-destructive';
  if (item.itemType === 'broadcast') return 'bg-amber-500/10 text-amber-500';
  if (item.isImportant) return 'bg-rose-500/10 text-rose-500';
  return 'bg-primary/10 text-primary';
}

function itemTypeBadges(item: any) {
  if (item.isDeleted) return 'bg-destructive/10 text-destructive';
  if (item.itemType === 'broadcast') return 'bg-amber-500/10 text-amber-500';
  if (item.isImportant) return 'bg-rose-500/10 text-rose-500';
  return 'bg-primary/10 text-primary';
}
