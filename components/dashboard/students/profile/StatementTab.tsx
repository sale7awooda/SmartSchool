'use client';

import { FileText, DollarSign, CheckCircle } from 'lucide-react';

interface StatementTabProps {
  sortedTransactions: any[];
  totalPaid: number;
  totalDue: number;
  onSelectTransaction: (t: any) => void;
  t: (key: string) => string;
}

export function StatementTab({ sortedTransactions, totalPaid, totalDue, onSelectTransaction, t }: StatementTabProps) {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-border bg-muted/30">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('total')} {t('balance_due')}</p>
          <p className="text-xl sm:text-2xl font-black text-foreground">${totalDue}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-emerald-500/10 dark:bg-emerald-500/5">
          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{t('total')} {t('collected_label')}</p>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">${totalPaid}</p>
        </div>
      </div>

      <div className="flex justify-between items-center bg-muted/10 p-3 rounded-lg border border-border/40">
        <h3 className="font-bold text-foreground">{t('transaction_ledger')}</h3>
        <p className="text-[11px] text-muted-foreground font-semibold invisible sm:visible">{t('tapped_transaction_details_desc')}</p>
      </div>

      {sortedTransactions.length > 0 ? (
        <div className="space-y-3">
          {sortedTransactions.map((invoice: any, idx: number) => (
            <div
              key={`${invoice.id || 'invoice'}-${idx}`}
              onClick={() => onSelectTransaction(invoice)}
              className="bg-card dark:bg-slate-900 p-4 rounded-xl border border-border flex flex-col sm:flex-row justify-between items-center gap-4 cursor-pointer hover:bg-muted/30 dark:hover:bg-slate-800 transition-all hover:scale-[1.01] active:scale-[0.99] group"
            >
              <div className="flex items-center gap-4 w-full">
                <div className={`p-2.5 rounded-lg shrink-0 transition-colors ${
                  invoice.status === 'paid' ? 'bg-emerald-500/20 text-emerald-500' :
                  invoice.status === 'partially_paid' ? 'bg-blue-500/20 text-blue-500' :
                  invoice.status === 'overdue' ? 'bg-destructive/20 text-destructive' :
                  'bg-amber-500/20 text-amber-500'
                }`}>
                  {invoice.status === 'paid' || invoice.status === 'partially_paid' ? <CheckCircle size={20} /> : <FileText size={20} />}
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-sm line-clamp-1 group-hover:text-primary transition-colors">{invoice.title || invoice.term || invoice.description || 'Tuition Fee Installment'}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {invoice.status === 'paid' ? t('paid_on') : t('due_by')}: {' '}
                    {new Date(invoice.paid_at || invoice.due_date || invoice.dueDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="text-right whitespace-nowrap min-w-[120px] flex items-center sm:block gap-2 justify-between w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-border/40">
                {invoice.status === 'paid' ? (
                  <p className="text-lg font-black text-emerald-500">${invoice.amount}</p>
                ) : invoice.status === 'partially_paid' ? (
                  <div>
                    <p className="text-lg font-black text-foreground">${invoice.balance_due !== undefined ? invoice.balance_due : invoice.amount}</p>
                    <p className="text-[9px] font-medium text-muted-foreground mt-0.5">
                      {t('paid_so_far')}: <span className="text-emerald-500 font-bold">${invoice.amount - (invoice.balance_due ?? 0)}</span> {t('of')} ${invoice.amount}
                    </p>
                  </div>
                ) : (
                  <p className="text-lg font-black text-foreground">${invoice.balance_due !== undefined ? invoice.balance_due : invoice.amount}</p>
                )}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  invoice.status === 'paid' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                  invoice.status === 'partially_paid' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' :
                  invoice.status === 'overdue' ? 'bg-destructive/20 text-destructive' :
                  'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                }`}>
                  {invoice.status === 'partially_paid' ? t('partial') : t(invoice.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl text-muted-foreground">
          <DollarSign size={40} className="mb-3 opacity-20" />
          <p>{t('no_payments')}</p>
        </div>
      )}
    </div>
  );
}
