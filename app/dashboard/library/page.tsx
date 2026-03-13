'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
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
  BookMarked
} from 'lucide-react';
import Image from 'next/image';

// Mock Data
const MOCK_BOOKS = [
  { id: 'B1', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', isbn: '978-0743273565', status: 'Available', category: 'Fiction', cover: 'https://picsum.photos/seed/gatsby/200/300' },
  { id: 'B2', title: 'To Kill a Mockingbird', author: 'Harper Lee', isbn: '978-0060935467', status: 'Checked Out', category: 'Fiction', cover: 'https://picsum.photos/seed/mockingbird/200/300' },
  { id: 'B3', title: 'A Brief History of Time', author: 'Stephen Hawking', isbn: '978-0553380163', status: 'Available', category: 'Science', cover: 'https://picsum.photos/seed/hawking/200/300' },
  { id: 'B4', title: '1984', author: 'George Orwell', isbn: '978-0451524935', status: 'Available', category: 'Fiction', cover: 'https://picsum.photos/seed/1984/200/300' },
  { id: 'B5', title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', isbn: '978-0262033848', status: 'Checked Out', category: 'Computer Science', cover: 'https://picsum.photos/seed/algorithms/200/300' },
];

const MOCK_LOANS = [
  { id: 'L1', bookId: 'B2', bookTitle: 'To Kill a Mockingbird', borrower: 'Bart Simpson', issueDate: '2023-10-15', dueDate: '2023-10-29', status: 'Overdue', fine: '$2.50' },
  { id: 'L2', bookId: 'B5', bookTitle: 'Introduction to Algorithms', borrower: 'Lisa Simpson', issueDate: '2023-10-20', dueDate: '2023-11-03', status: 'Active', fine: '$0.00' },
];

export default function LibraryPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'catalog' | 'loans' | 'fines'>('catalog');

  if (!user) return null;

  const isAdmin = ['superadmin', 'schoolAdmin', 'staff'].includes(user.role);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Library Management</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Browse catalog, manage check-outs, and track fines.</p>
        </div>
        {isAdmin && (
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm whitespace-nowrap">
            <Plus size={16} />
            Add Book
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto scrollbar-hide bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
        <button 
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'catalog' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        >
          <BookOpen size={18} />
          Catalog
        </button>
        <button 
          onClick={() => setActiveTab('loans')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'loans' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        >
          <BookMarked size={18} />
          Active Loans
        </button>
        {isAdmin && (
          <button 
            onClick={() => setActiveTab('fines')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'fines' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            <AlertCircle size={18} />
            Overdue & Fines
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        <AnimatePresence mode="wait">
          {activeTab === 'catalog' && <CatalogTab key="catalog" isAdmin={isAdmin} />}
          {activeTab === 'loans' && <LoansTab key="loans" isAdmin={isAdmin} />}
          {activeTab === 'fines' && isAdmin && <FinesTab key="fines" />}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function CatalogTab({ isAdmin }: { isAdmin: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input 
            type="text" 
            placeholder="Search by title, author, or ISBN..." 
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>
        <button className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm">
          <Filter size={16} />
          Filters
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-6 gap-4">
        {MOCK_BOOKS.map(book => (
          <div key={book.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-md transition-all group">
            <div className="aspect-[3/4] relative bg-slate-100 dark:bg-slate-800">
              <Image 
                src={book.cover} 
                alt={book.title} 
                fill 
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-3 right-3">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm backdrop-blur-md ${
                  book.status === 'Available' ? 'bg-emerald-500/90 text-white' : 'bg-amber-500/90 text-white'
                }`}>
                  {book.status}
                </span>
              </div>
            </div>
            <div className="p-4">
              <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1 uppercase tracking-wider">{book.category}</p>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight mb-1 line-clamp-1" title={book.title}>{book.title}</h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">{book.author}</p>
              
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500">ISBN: {book.isbn}</span>
                {isAdmin ? (
                  <button className="text-indigo-600 dark:text-indigo-400 text-sm font-bold hover:underline">Manage</button>
                ) : (
                  <button 
                    disabled={book.status !== 'Available'}
                    className={`text-sm font-bold ${book.status === 'Available' ? 'text-indigo-600 dark:text-indigo-400 hover:underline' : 'text-slate-400 dark:text-slate-500 cursor-not-allowed'}`}
                  >
                    Reserve
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function LoansTab({ isAdmin }: { isAdmin: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Active Loans</h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Currently checked out books</p>
          </div>
          {isAdmin && (
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input 
                type="text" 
                placeholder="Search borrower or book..." 
                className="pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full sm:w-64 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Book Details</th>
                <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Borrower</th>
                <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Issue Date</th>
                <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Due Date</th>
                <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                {isAdmin && <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {MOCK_LOANS.map((loan) => (
                <tr key={loan.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                        <BookOpen size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-sm">{loan.bookTitle}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">ID: {loan.bookId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{loan.borrower}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{loan.issueDate}</p>
                  </td>
                  <td className="p-4">
                    <p className={`text-sm font-bold ${loan.status === 'Overdue' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      {loan.dueDate}
                    </p>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 w-fit ${
                      loan.status === 'Active' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400'
                    }`}>
                      {loan.status === 'Active' ? <Clock size={12} /> : <AlertCircle size={12} />}
                      {loan.status}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="p-4 text-right">
                      <button className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        Mark Returned
                      </button>
                    </td>
                  )}
                </tr>
              ))}
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
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-rose-50/30 dark:bg-rose-500/5">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Overdue & Fines</h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Manage overdue books and collect fines.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Borrower</th>
                <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Book</th>
                <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Due Date</th>
                <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fine Amount</th>
                <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {overdueLoans.map((loan) => (
                <tr key={loan.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="p-4">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{loan.borrower}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{loan.bookTitle}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{loan.dueDate}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-black text-slate-900 dark:text-white">{loan.fine}</p>
                  </td>
                  <td className="p-4 text-right">
                    <button className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 rounded-lg text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
                      Collect Fine & Return
                    </button>
                  </td>
                </tr>
              ))}
              {overdueLoans.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 dark:text-slate-400 font-medium">
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
