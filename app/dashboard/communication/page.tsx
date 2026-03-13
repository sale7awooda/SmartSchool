'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Notice, MOCK_USERS, MOCK_PARENTS, MOCK_NOTICES } from '@/lib/mock-db';
import { Bell, Plus, AlertCircle, Calendar, User as UserIcon, Loader2, MessageSquare, CheckCircle2, Send, Search, Smartphone, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

const MOCK_CHATS = [
  { id: 'c1', name: 'Edna Krabappel', role: 'Teacher', lastMessage: 'Bart is doing much better in math this week.', time: '10:30 AM', unread: 2 },
  { id: 'c2', name: 'Principal Skinner', role: 'Admin', lastMessage: 'Please review the updated school policies.', time: 'Yesterday', unread: 0 },
  { id: 'c3', name: 'Elizabeth Hoover', role: 'Teacher', lastMessage: 'Don\'t forget the permission slip for the field trip.', time: 'Monday', unread: 0 },
];

const MOCK_MESSAGES = [
  { id: 'm1', sender: 'Edna Krabappel', text: 'Hello! I wanted to give you a quick update on Bart.', time: '10:15 AM', isMe: false },
  { id: 'm2', sender: 'Me', text: 'Hi Edna, thanks for reaching out. How is he doing?', time: '10:20 AM', isMe: true },
  { id: 'm3', sender: 'Edna Krabappel', text: 'Bart is doing much better in math this week. He really focused during the fractions lesson.', time: '10:30 AM', isMe: false },
];

export default function CommunicationPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'notices' | 'messages' | 'broadcasts'>('notices');
  
  // Notices State
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Messages State
  const [activeChat, setActiveChat] = useState(MOCK_CHATS[0]);
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState(MOCK_MESSAGES);

  // Broadcast State
  const [broadcastType, setBroadcastType] = useState<'whatsapp' | 'push' | 'email'>('whatsapp');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [whatsappTemplate, setWhatsappTemplate] = useState('urgent_alert');
  const [pushPriority, setPushPriority] = useState('high');
  const [emailSubject, setEmailSubject] = useState('');

  if (!user) return null;

  const isAdmin = ['superadmin', 'schoolAdmin'].includes(user.role);
  const canCreateNotice = ['superadmin', 'schoolAdmin', 'accountant'].includes(user.role);

  const visibleNotices = MOCK_NOTICES.filter(notice => {
    if (notice.targetAudience === 'all') return true;
    if (notice.targetAudience === 'staff' && ['superadmin', 'schoolAdmin', 'accountant', 'teacher', 'staff'].includes(user.role)) return true;
    if (notice.targetAudience === 'parents' && ['superadmin', 'schoolAdmin', 'accountant', 'parent'].includes(user.role)) return true;
    return false;
  });

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsSubmitting(false);
    setIsCreating(false);
    toast.success('Notice posted successfully');
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;
    
    const newMsg = {
      id: `m${Date.now()}`,
      sender: 'Me',
      text: messageInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true
    };
    
    setMessages([...messages, newMsg]);
    setMessageInput('');
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;
    
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    setBroadcastMessage('');
    toast.success(`Urgent ${broadcastType.toUpperCase()} broadcast sent successfully to all selected recipients.`);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Communication</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Connect with the school community.</p>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('notices')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'notices' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            Notice Board
          </button>
          <button 
            onClick={() => setActiveTab('messages')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'messages' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            Direct Messages
          </button>
          {isAdmin && (
            <button 
              onClick={() => setActiveTab('broadcasts')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'broadcasts' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            >
              Broadcasts
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
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all active:scale-[0.98] shadow-md shadow-indigo-600/20"
              >
                <Plus size={18} />
                New Notice
              </button>
            )}
          </div>
          {visibleNotices.map((notice, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              key={notice.id} 
              className={`bg-white dark:bg-slate-900 rounded-[1.5rem] border shadow-sm overflow-hidden transition-all hover:shadow-md ${
                notice.isImportant ? 'border-amber-200 dark:border-amber-500/30 ring-1 ring-amber-100 dark:ring-amber-500/10' : 'border-slate-100 dark:border-slate-800'
              }`}
            >
              {notice.isImportant && (
                <div className="bg-amber-50 dark:bg-amber-500/10 px-6 py-3 border-b border-amber-100 dark:border-amber-500/20 flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
                  <AlertCircle size={16} />
                  Important Announcement
                </div>
              )}
              
              <div className="p-6 sm:p-8">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{notice.title}</h2>
                <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed mb-6 font-medium">{notice.content}</p>
                
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <UserIcon size={16} className="text-slate-400 dark:text-slate-500" />
                    {notice.author} <span className="text-slate-300 dark:text-slate-700">•</span> {notice.authorRole}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-slate-400 dark:text-slate-500" />
                    {new Date(notice.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <MessageSquare size={16} className="text-slate-400 dark:text-slate-500" />
                    Audience: <span className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded-md">{notice.targetAudience}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex h-full min-h-[500px]">
          {/* Chat List */}
          <div className="w-1/3 border-r border-slate-100 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-800/50">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Search messages..." 
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {MOCK_CHATS.map(chat => (
                <button 
                  key={chat.id}
                  onClick={() => setActiveChat(chat)}
                  className={`w-full text-left p-4 border-b border-slate-100 dark:border-slate-800 transition-colors flex items-start gap-3 ${activeChat.id === chat.id ? 'bg-indigo-50/50 dark:bg-indigo-500/10' : 'hover:bg-white dark:hover:bg-slate-800'}`}
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-lg shrink-0">
                      {chat.name.charAt(0)}
                    </div>
                    {chat.unread > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                        {chat.unread}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-bold text-slate-900 dark:text-white truncate">{chat.name}</h3>
                      <span className="text-xs font-medium text-slate-400 dark:text-slate-500 shrink-0">{chat.time}</span>
                    </div>
                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">{chat.role}</p>
                    <p className={`text-sm truncate ${chat.unread > 0 ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 font-medium'}`}>
                      {chat.lastMessage}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Window */}
          <div className="flex-1 flex flex-col bg-white dark:bg-slate-900">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-white dark:bg-slate-900">
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold">
                {activeChat.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">{activeChat.name}</h3>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{activeChat.role}</p>
              </div>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-6 bg-slate-50/30 dark:bg-slate-800/20">
              {messages.map(msg => (
                <div key={msg.id} className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl ${
                    msg.isMe 
                      ? 'bg-indigo-600 text-white rounded-tr-sm' 
                      : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-tl-sm shadow-sm'
                  }`}>
                    <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1.5 px-1">{msg.time}</span>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                <input 
                  type="text" 
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type your message..." 
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
                <button 
                  type="submit"
                  disabled={!messageInput.trim()}
                  className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Broadcasts Tab (Admin Only) */}
      {activeTab === 'broadcasts' && isAdmin && (
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8 max-w-3xl mx-auto w-full">
          <div className="mb-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Urgent Broadcast</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Send immediate notifications to parents and staff.</p>
          </div>

          <form onSubmit={handleSendBroadcast} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Delivery Method</label>
              <div className="grid grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setBroadcastType('whatsapp')}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                    broadcastType === 'whatsapp' ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                >
                  <MessageSquare size={24} />
                  <span className="font-bold text-sm">WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBroadcastType('push')}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                    broadcastType === 'push' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                >
                  <Bell size={24} />
                  <span className="font-bold text-sm">App Push</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBroadcastType('email')}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                    broadcastType === 'email' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                >
                  <Mail size={24} />
                  <span className="font-bold text-sm">Email Alert</span>
                </button>
              </div>
            </div>

            {/* Method Specific Options */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
              {broadcastType === 'whatsapp' && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Message Template</label>
                  <select 
                    value={whatsappTemplate}
                    onChange={(e) => setWhatsappTemplate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-medium text-slate-900 dark:text-white"
                  >
                    <option value="urgent_alert">Urgent Alert (Pre-approved)</option>
                    <option value="school_closure">School Closure (Pre-approved)</option>
                    <option value="event_reminder">Event Reminder</option>
                    <option value="custom">Custom Message (May be delayed)</option>
                  </select>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">WhatsApp requires pre-approved templates for immediate delivery outside the 24-hour window.</p>
                </div>
              )}

              {broadcastType === 'push' && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Notification Priority</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="pushPriority" 
                        value="high"
                        checked={pushPriority === 'high'}
                        onChange={(e) => setPushPriority(e.target.value)}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700" 
                      />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">High (Bypasses Do Not Disturb)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="pushPriority" 
                        value="normal"
                        checked={pushPriority === 'normal'}
                        onChange={(e) => setPushPriority(e.target.value)}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700" 
                      />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Normal</span>
                    </label>
                  </div>
                </div>
              )}

              {broadcastType === 'email' && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Email Subject</label>
                  <input 
                    type="text" 
                    required
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="e.g., URGENT: School Closure Tomorrow" 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-slate-900 dark:text-white" 
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Target Audience</label>
              <select className="w-full px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-slate-900 dark:text-white">
                <option value="all">Entire School (Parents & Staff)</option>
                <option value="parents">All Parents</option>
                <option value="staff">All Staff</option>
                <option value="grade4">Grade 4 Parents Only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Message Content</label>
              <textarea 
                required
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                rows={4}
                placeholder="Type your urgent message here..." 
                className="w-full px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none" 
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500">
                  {broadcastType === 'whatsapp' ? 'Keep it concise for WhatsApp.' : 'Message length limit.'}
                </p>
                <p className={`text-xs font-bold ${broadcastMessage.length > (broadcastType === 'whatsapp' ? 1024 : 500) ? 'text-red-500' : 'text-slate-400 dark:text-slate-500'}`}>
                  {broadcastMessage.length} / {broadcastType === 'whatsapp' ? '1024' : '500'} chars
                </p>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isSubmitting || !broadcastMessage.trim()}
              className="w-full py-4 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-all active:scale-[0.98] shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : (
                <>
                  <AlertCircle size={20} />
                  Send Broadcast Now
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Create Notice Modal */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-slate-100 dark:border-slate-800"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-800/50">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Post New Notice</h2>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2">Broadcast a message to the school community.</p>
              </div>
              
              <div className="overflow-y-auto p-8">
                <form id="notice-form" onSubmit={handleCreateNotice} className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Title</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Sports Day Rescheduled" 
                      className="w-full px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Message Content</label>
                    <textarea 
                      required
                      rows={5}
                      placeholder="Write your announcement here..." 
                      className="w-full px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Target Audience</label>
                      <select className="w-full px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-slate-900 dark:text-white">
                        <option value="all">Everyone</option>
                        <option value="parents">Parents Only</option>
                        <option value="staff">Staff Only</option>
                      </select>
                    </div>
                    
                    <div className="flex flex-col justify-end pb-3.5">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center">
                          <input type="checkbox" className="peer w-6 h-6 rounded-lg border-2 border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500/20 transition-all cursor-pointer appearance-none checked:bg-indigo-600 checked:border-indigo-600" />
                          <CheckCircle2 size={16} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                        </div>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Mark as Important</span>
                      </label>
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 shrink-0 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 px-4 py-4 rounded-xl font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  form="notice-form"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all active:scale-[0.98] shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : 'Post Notice'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
