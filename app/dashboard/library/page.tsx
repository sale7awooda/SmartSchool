'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { getPaginatedBooks } from '@/lib/supabase-db';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Library, 
  BookOpen, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  BookMarked,
  History,
  X
} from 'lucide-react';
import Image from 'next/image';

// Mock Data
const MOCK_BOOKS = [
  { id: 'B1', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', isbn: '978-0743273565', status: 'Available', category: 'Fiction', subject: 'English', grade: 'Grade 11', cover: 'https://picsum.photos/seed/gatsby/200/300' },
  { id: 'B2', title: 'To Kill a Mockingbird', author: 'Harper Lee', isbn: '978-0060935467', status: 'Checked Out', category: 'Fiction', subject: 'English', grade: 'Grade 10', cover: 'https://picsum.photos/seed/mockingbird/200/300' },
  { id: 'B3', title: 'A Brief History of Time', author: 'Stephen Hawking', isbn: '978-0553380163', status: 'Available', category: 'Science', subject: 'Physics', grade: 'Grade 12', cover: 'https://picsum.photos/seed/hawking/200/300' },
  { id: 'B4', title: '1984', author: 'George Orwell', isbn: '978-0451524935', status: 'Available', category: 'Fiction', subject: 'English', grade: 'Grade 12', cover: 'https://picsum.photos/seed/1984/200/300' },
  { id: 'B5', title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', isbn: '978-0262033848', status: 'Checked Out', category: 'Computer Science', subject: 'Computer Science', grade: 'Grade 12', cover: 'https://picsum.photos/seed/algorithms/200/300' },
  { id: 'B6', title: 'Calculus: Early Transcendentals', author: 'James Stewart', isbn: '978-1285741550', status: 'Available', category: 'Mathematics', subject: 'Mathematics', grade: 'Grade 12', cover: 'https://picsum.photos/seed/calculus/200/300' },
  { id: 'B7', title: 'Biology', author: 'Neil Campbell', isbn: '978-0321543257', status: 'Available', category: 'Science', subject: 'Biology', grade: 'Grade 11', cover: 'https://picsum.photos/seed/biology/200/300' },
];

const MOCK_LOANS = [
  { id: 'L1', bookId: 'B2', bookTitle: 'To Kill a Mockingbird', borrower: 'Bart Simpson', issueDate: '2023-10-15', dueDate: '2023-10-29', status: 'Overdue', fine: '$2.50' },
  { id: 'L2', bookId: 'B5', bookTitle: 'Introduction to Algorithms', borrower: 'Lisa Simpson', issueDate: '2023-10-20', dueDate: '2023-11-03', status: 'Active', fine: '$0.00' },
];

const MOCK_HISTORY = [
  { id: 'H1', action: 'Returned', bookTitle: 'The Great Gatsby', user: 'Lisa Simpson', date: '2023-10-25', note: 'Returned on time' },
  { id: 'H2', action: 'Checked Out', bookTitle: '1984', user: 'Bart Simpson', date: '2023-10-24', note: 'Due in 14 days' },
  { id: 'H3', action: 'Added', bookTitle: 'Introduction to Algorithms', user: 'Admin', date: '2023-10-20', note: 'New copy added to catalog' },
  { id: 'H4', action: 'Fine Paid', bookTitle: 'To Kill a Mockingbird', user: 'Milhouse Van Houten', date: '2023-10-18', note: '$2.50 paid' },
];

export default function LibraryPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useState<'catalog' | 'loans' | 'fines' | 'history'>('catalog');
  const [selectedBook, setSelectedBook] = useState<typeof MOCK_BOOKS[0] | null>(null);

  if (!user) return null;

  if (!can('view', 'library')) {
    return <div className="p-4">You do not have permission to view this page.</div>;
  }

  const isAdmin = can('manage', 'library') || can('create', 'library');

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-white tracking-tight">Library Management</h1>
          <p className="text-muted-foreground dark:text-muted-foreground mt-2 font-medium">Browse catalog, manage check-outs, and track fines.</p>
        </div>
        {isAdmin && (
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap">
            <Plus size={16} />
            Add Book
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto scrollbar-hide bg-card dark:bg-slate-900 p-1.5 rounded-2xl border border-border dark:border-slate-800 shadow-sm shrink-0">
        <button 
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'catalog' ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
        >
          <BookOpen size={18} />
          Catalog
        </button>
        <button 
          onClick={() => setActiveTab('loans')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'loans' ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
        >
          <BookMarked size={18} />
          Active Loans
        </button>
        {isAdmin && (
          <button 
            onClick={() => setActiveTab('fines')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'fines' ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
          >
            <AlertCircle size={18} />
            Overdue & Fines
          </button>
        )}
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'history' ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
        >
          <History size={18} />
          History
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        <AnimatePresence mode="wait">
          {activeTab === 'catalog' && <CatalogTab key="catalog" isAdmin={isAdmin} onSelectBook={setSelectedBook} />}
          {activeTab === 'loans' && <LoansTab key="loans" isAdmin={isAdmin} />}
          {activeTab === 'fines' && isAdmin && <FinesTab key="fines" />}
          {activeTab === 'history' && <HistoryTab key="history" />}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {selectedBook && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-border flex flex-col max-h-[90vh]"
            >
              <div className="relative aspect-[4/3] w-full bg-muted shrink-0">
                <Image
                  src={selectedBook.cover}
                  alt={selectedBook.title}
                  fill
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 right-4 flex gap-2">
                  <span className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-md backdrop-blur-md ${
                    selectedBook.status === 'Available' ? 'bg-emerald-500/90 text-white' : 'bg-amber-500/90 text-white'
                  }`}>
                    {selectedBook.status}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedBook(null)}
                  className="absolute top-4 left-4 p-2 bg-background/50 hover:bg-background/80 backdrop-blur-md rounded-full text-foreground transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 sm:p-8 overflow-y-auto">
                <p className="text-xs font-bold text-primary mb-2 uppercase tracking-wider">{selectedBook.category}</p>
                <h2 className="text-2xl font-bold text-foreground leading-tight mb-2">{selectedBook.title}</h2>
                <p className="text-muted-foreground font-medium mb-6">By {selectedBook.author}</p>

                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 rounded-xl bg-muted/50 border border-border">
                    <span className="text-sm font-bold text-muted-foreground">ISBN</span>
                    <span className="text-sm font-bold text-foreground">{selectedBook.isbn}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 rounded-xl bg-muted/50 border border-border">
                    <span className="text-sm font-bold text-muted-foreground">Status</span>
                    <span className={`text-sm font-bold ${selectedBook.status === 'Available' ? 'text-emerald-500' : 'text-amber-500'}`}>{selectedBook.status}</span>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-border bg-muted/30 shrink-0">
                {isAdmin ? (
                  <button className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-sm flex items-center justify-center gap-2">
                    Manage Book
                  </button>
                ) : (
                  <button
                    disabled={selectedBook.status !== 'Available'}
                    className={`w-full py-3.5 rounded-xl font-bold transition-colors shadow-sm flex items-center justify-center gap-2 ${
                      selectedBook.status === 'Available'
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'bg-muted text-muted-foreground cursor-not-allowed'
                    }`}
                  >
                    {selectedBook.status === 'Available' ? 'Reserve Book' : 'Currently Unavailable'}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CatalogTab({ isAdmin, onSelectBook }: { isAdmin: boolean, onSelectBook: (book: any) => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 12;
  const [filters, setFilters] = useState({
    grade: 'All',
    subject: 'All',
    availability: 'All'
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: response, isLoading } = useSWR(
    ['books', page, debouncedSearch],
    ([_, p, s]) => getPaginatedBooks(p, limit, s)
  );

  const books = response?.data || [];
  const totalPages = response?.totalPages || 1;
  const totalCount = response?.count || 0;

  const grades = ['All', ...Array.from(new Set(MOCK_BOOKS.map(b => b.grade)))];
  const subjects = ['All', ...Array.from(new Set(MOCK_BOOKS.map(b => b.subject)))];
  const availabilities = ['All', 'Available', 'Checked Out'];

  const filteredBooks = books.filter((book: any) => {
    const matchesGrade = filters.grade === 'All' || book.grade === filters.grade;
    const matchesSubject = filters.subject === 'All' || book.subject === filters.subject;
    const matchesAvailability = filters.availability === 'All' || book.status === filters.availability;

    return matchesGrade && matchesSubject && matchesAvailability;
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search by title, author, or ISBN..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center justify-center gap-2 px-4 py-3 border rounded-xl font-bold text-sm transition-all shadow-sm ${showFilters ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground hover:bg-muted'}`}
          >
            <Filter size={16} />
            Filters
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-2xl border border-border">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Grade</label>
                  <select 
                    value={filters.grade}
                    onChange={(e) => setFilters({ ...filters, grade: e.target.value })}
                    className="w-full p-2.5 bg-card border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                  >
                    {grades.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Subject</label>
                  <select 
                    value={filters.subject}
                    onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                    className="w-full p-2.5 bg-card border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                  >
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Availability</label>
                  <select 
                    value={filters.availability}
                    onChange={(e) => setFilters({ ...filters, availability: e.target.value })}
                    className="w-full p-2.5 bg-card border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                  >
                    {availabilities.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 sm:gap-4">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-muted-foreground font-medium">
            Loading books...
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground font-medium">
            No books found matching your criteria.
          </div>
        ) : filteredBooks.map((book: any) => (
          <div key={book.id} onClick={() => onSelectBook(book)} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden hover:shadow-md transition-all group cursor-pointer">
            <div className="aspect-[3/4] relative bg-muted">
              <Image 
                src={book.cover || `https://picsum.photos/seed/${book.id}/200/300`} 
                alt={book.title} 
                fill 
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-2 right-2">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold shadow-sm backdrop-blur-md ${
                  book.status === 'Available' ? 'bg-emerald-500/90 text-white' : 'bg-amber-500/90 text-white'
                }`}>
                  {book.status}
                </span>
              </div>
            </div>
            <div className="p-2 sm:p-3">
              <p className="text-[9px] font-bold text-primary mb-0.5 uppercase tracking-wider truncate">{book.subject} • {book.grade}</p>
              <h3 className="font-bold text-foreground text-xs sm:text-sm leading-tight mb-0.5 line-clamp-2" title={book.title}>{book.title}</h3>
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">{book.author}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 0 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20 shrink-0 rounded-2xl">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm font-bold text-foreground bg-card border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
          >
            Previous
          </button>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground">
              Page <span className="text-foreground font-bold">{page}</span> of <span className="text-foreground font-bold">{totalPages}</span>
            </span>
            <span className="text-sm font-medium text-muted-foreground border-l border-border pl-4">
              Total: <span className="text-foreground font-bold">{totalCount}</span>
            </span>
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm font-bold text-foreground bg-card border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </motion.div>
  );
}

function LoansTab({ isAdmin }: { isAdmin: boolean }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLoans = MOCK_LOANS.filter(loan => 
    loan.bookTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loan.borrower.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loan.bookId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="bg-card rounded-[2rem] border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/50">
          <div>
            <h2 className="text-xl font-bold text-foreground">Active Loans</h2>
            <p className="text-sm font-medium text-muted-foreground mt-1">Currently checked out books</p>
          </div>
          {isAdmin && (
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search borrower or book..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-card border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 w-full sm:w-64 text-foreground placeholder:text-muted-foreground"
              />
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-card border-b border-border">
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Book Details</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Borrower</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Issue Date</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Due Date</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                {isAdmin && <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLoans.map((loan) => (
                <tr key={loan.id} className="hover:bg-muted/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <BookOpen size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-sm">{loan.bookTitle}</p>
                        <p className="text-xs text-muted-foreground font-medium">ID: {loan.bookId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-bold text-foreground">{loan.borrower}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-medium text-foreground">{loan.issueDate}</p>
                  </td>
                  <td className="p-4">
                    <p className={`text-sm font-bold ${loan.status === 'Overdue' ? 'text-destructive dark:text-rose-400' : 'text-foreground'}`}>
                      {loan.dueDate}
                    </p>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 w-fit ${
                      loan.status === 'Active' ? 'bg-emerald-500/20 dark:bg-emerald-500/100/10 text-emerald-500 dark:text-emerald-500' : 'bg-destructive/20 dark:bg-destructive/100/10 text-destructive dark:text-rose-400'
                    }`}>
                      {loan.status === 'Active' ? <Clock size={12} /> : <AlertCircle size={12} />}
                      {loan.status}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="p-4 text-right">
                      <button className="px-3 py-1.5 bg-muted text-foreground rounded-lg text-xs font-bold hover:bg-muted/80 transition-colors">
                        Mark Returned
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filteredLoans.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="p-8 text-center text-muted-foreground font-medium">
                    No matching loans found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

function FinesTab() {
  const overdueLoans = MOCK_LOANS.filter(l => l.status === 'Overdue');

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="bg-card rounded-[2rem] border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border bg-destructive/10/30 dark:bg-destructive/100/5">
          <h2 className="text-xl font-bold text-foreground">Overdue & Fines</h2>
          <p className="text-sm font-medium text-muted-foreground mt-1">Manage overdue books and collect fines.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-card border-b border-border">
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Borrower</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Book</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Due Date</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Fine Amount</th>
                <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {overdueLoans.map((loan) => (
                <tr key={loan.id} className="hover:bg-muted/50 transition-colors">
                  <td className="p-4">
                    <p className="text-sm font-bold text-foreground">{loan.borrower}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-bold text-foreground">{loan.bookTitle}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-bold text-destructive dark:text-rose-400">{loan.dueDate}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-black text-foreground">{loan.fine}</p>
                  </td>
                  <td className="p-4 text-right">
                    <button className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-colors">
                      Collect Fine & Return
                    </button>
                  </td>
                </tr>
              ))}
              {overdueLoans.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground font-medium">
                    No overdue books or fines.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

function HistoryTab() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHistory = MOCK_HISTORY.filter(record => 
    record.bookTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.note.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="bg-card rounded-[2rem] border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border bg-muted/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Library History</h2>
            <p className="text-sm font-medium text-muted-foreground mt-1">Recent activity and transactions.</p>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search history..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-card border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 w-full sm:w-64 text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div className="divide-y divide-border">
          {filteredHistory.map((record) => (
            <div key={record.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  record.action === 'Returned' ? 'bg-emerald-500/10 text-emerald-500' :
                  record.action === 'Checked Out' ? 'bg-amber-500/10 text-amber-500' :
                  record.action === 'Added' ? 'bg-primary/10 text-primary' :
                  'bg-destructive/10 text-destructive'
                }`}>
                  {record.action === 'Returned' ? <CheckCircle2 size={20} /> :
                   record.action === 'Checked Out' ? <BookOpen size={20} /> :
                   record.action === 'Added' ? <Plus size={20} /> :
                   <AlertCircle size={20} />}
                </div>
                <div>
                  <p className="font-bold text-foreground">{record.bookTitle}</p>
                  <p className="text-sm font-medium text-muted-foreground mt-0.5">
                    <span className="text-foreground font-bold">{record.action}</span> by {record.user}
                  </p>
                </div>
              </div>
              <div className="sm:text-right">
                <p className="text-sm font-bold text-foreground">{record.date}</p>
                <p className="text-xs font-medium text-muted-foreground mt-0.5">{record.note}</p>
              </div>
            </div>
          ))}
          {filteredHistory.length === 0 && (
            <div className="p-12 text-center text-muted-foreground font-medium">
              No history records found.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
