'use client';

import { motion, AnimatePresence } from 'motion/react';
import { X, DollarSign, Download, Printer } from 'lucide-react';

interface TransactionDetailModalProps {
  transaction: any;
  onClose: () => void;
  onDownloadInvoice: (invoice: any) => void;
  onPrintInvoice: (invoice: any) => void;
  t: (key: string) => string;
}

export function TransactionDetailModal({
  transaction,
  onClose,
  onDownloadInvoice,
  onPrintInvoice,
  t
}: TransactionDetailModalProps) {
  return (
    <AnimatePresence>
      {transaction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/90 dark:bg-slate-950/80 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-card dark:bg-slate-900 border border-border dark:border-slate-800 rounded-[2rem] shadow-2xl p-6 sm:p-8 w-full max-w-md relative flex flex-col gap-6"
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 bg-muted hover:bg-muted/80 rounded-xl transition-all text-muted-foreground"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-4 border-b border-border dark:border-slate-800 pb-4">
              <div className={`p-3 rounded-2xl ${
                transaction.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' :
                transaction.status === 'partially_paid' ? 'bg-blue-500/10 text-blue-500' :
                transaction.status === 'overdue' ? 'bg-destructive/10 text-destructive' :
                'bg-amber-500/10 text-amber-500'
              }`}>
                <DollarSign size={24} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{t('transaction_details')}</p>
                <h3 className="font-bold text-lg text-foreground mt-0.5">{transaction.title || transaction.term || transaction.description || 'General Tuition Installment'}</h3>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/30 p-3 rounded-xl border border-border/40">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">{t('status')}</span>
                  <span className={`text-xs font-black uppercase inline-block mt-0.5 ${
                    transaction.status === 'paid' ? 'text-emerald-500' :
                    transaction.status === 'partially_paid' ? 'text-blue-500' :
                    transaction.status === 'overdue' ? 'text-destructive' :
                    'text-amber-500'
                  }`}>
                    {transaction.status === 'partially_paid' ? t('partial') : t(transaction.status)}
                  </span>
                </div>
                <div className="bg-muted/30 p-3 rounded-xl border border-border/40">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                    {transaction.status === 'partially_paid' ? t('balance_due') : t('amount_details')}
                  </span>
                  <span className="text-sm font-black text-foreground inline-block mt-0.5">
                    ${transaction.status === 'partially_paid'
                      ? (transaction.balance_due !== undefined ? transaction.balance_due : transaction.amount)
                      : transaction.amount}
                  </span>
                </div>
              </div>

              <div className="bg-muted/20 p-4 rounded-xl border border-border/40 space-y-2 text-xs">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>{t('invoice_id')}:</span>
                  <span className="font-mono text-[11px] text-foreground font-bold">{transaction.id}</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>{t('due_date')}:</span>
                  <span className="text-foreground font-bold">
                    {new Date(transaction.due_date || transaction.dueDate).toLocaleDateString()}
                  </span>
                </div>
                {transaction.status === 'partially_paid' && (
                  <>
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>{t('original_amount')}:</span>
                      <span className="text-foreground font-bold">${transaction.amount}</span>
                    </div>
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>{t('paid_so_far')}:</span>
                      <span className="text-emerald-500 font-bold">${transaction.amount - (transaction.balance_due ?? 0)}</span>
                    </div>
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>{t('remaining_balance')}:</span>
                      <span className="text-primary font-bold">${transaction.balance_due ?? 0}</span>
                    </div>
                  </>
                )}
                {transaction.status === 'paid' && (
                  <>
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>{t('paid_on')}:</span>
                      <span className="text-emerald-500 font-bold">
                        {new Date(transaction.paid_at || transaction.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {transaction.payment_method && (
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>{t('payment_method')}:</span>
                        <span className="text-foreground font-bold">{transaction.payment_method}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-between gap-3 border-t border-border dark:border-slate-800 pt-6 mt-2">
              <button
                onClick={() => onDownloadInvoice(transaction)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-muted hover:bg-muted/80 text-foreground text-sm font-bold rounded-xl transition-all active:scale-[0.98]"
              >
                <Download size={16} />
                Download
              </button>
              <button
                onClick={() => onPrintInvoice(transaction)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary/95 text-primary-foreground text-sm font-bold rounded-xl transition-all active:scale-[0.98] shadow-md shadow-primary/10"
              >
                <Printer size={16} />
                Print Receipt
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
