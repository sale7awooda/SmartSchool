const fs = require('fs');

function fixFile(file, replacements) {
    let content = fs.readFileSync(file, 'utf8');
    for (const [find, replace] of replacements) {
        if (typeof find === 'string') {
            content = content.replace(find, replace);
        } else {
            content = content.replace(find, replace);
        }
    }
    fs.writeFileSync(file, content);
}

fixFile('components/dashboard/fees/ParentFees.tsx', [
    ["import { useLanguage } from '@/lib/language-context';", "import { useLanguage } from '@/lib/language-context';\nimport { useSettings, formatAmount } from '@/lib/settings-context';"],
    ["const { t } = useLanguage();", "const { t } = useLanguage();\n  const { settings } = useSettings();"],
    [/\$\{pendingTotal\}/g, "{formatAmount(pendingTotal, settings?.currency)}"],
    [/\$\{studentDetails\.total_due \|\| 0\}/g, "{formatAmount(studentDetails.total_due || 0, settings?.currency)}"],
    [/\$\{studentDetails\.total_paid \|\| 0\}/g, "{formatAmount(studentDetails.total_paid || 0, settings?.currency)}"],
    [/\$\{invoice\.amount\}/g, "{formatAmount(invoice.amount, settings?.currency)}"],
    [/\$\{invoice\.balanceDue\}/g, "{formatAmount(invoice.balanceDue, settings?.currency)}"],
    [/\$\{invoice\.amount - \(invoice\.balanceDue \?\? 0\)\}/g, "{formatAmount(invoice.amount - (invoice.balanceDue ?? 0), settings?.currency)}"],
    [/\$\{invoice\.balanceDue !== undefined \? invoice\.balanceDue : invoice\.amount\}/g, "{formatAmount(invoice.balanceDue !== undefined ? invoice.balanceDue : invoice.amount, settings?.currency)}"],
    [/\$\{selectedInvoiceToPay \? \(selectedInvoiceToPay\.balanceDue \?\? selectedInvoiceToPay\.amount\) : pendingTotal\}/g, "{formatAmount(selectedInvoiceToPay ? (selectedInvoiceToPay.balanceDue ?? selectedInvoiceToPay.amount) : pendingTotal, settings?.currency)}"],
    [/\$\{selectedDetailInvoice\.amount\}/g, "{formatAmount(selectedDetailInvoice.amount, settings?.currency)}"],
    [/\$\{selectedDetailInvoice\.amount - \(selectedDetailInvoice\.balanceDue \?\? 0\)\}/g, "{formatAmount(selectedDetailInvoice.amount - (selectedDetailInvoice.balanceDue ?? 0), settings?.currency)}"],
    [/\$\{selectedDetailInvoice\.balanceDue\}/g, "{formatAmount(selectedDetailInvoice.balanceDue, settings?.currency)}"],
    [/\+\$\{payment\.amount\}/g, "+{formatAmount(payment.amount, settings?.currency)}"]
]);

fixFile('components/dashboard/fees/InvoicesTab.tsx', [
    ["import { useLanguage } from '@/lib/language-context';", "import { useLanguage } from '@/lib/language-context';\nimport { useSettings, formatAmount } from '@/lib/settings-context';"],
    ["const { t } = useLanguage();", "const { t } = useLanguage();\n  const { settings } = useSettings();"],
    [/\$\{invoice\.amount\}/g, "{formatAmount(invoice.amount, settings?.currency)}"],
    [/\$\{invoice\.balanceDue\}/g, "{formatAmount(invoice.balanceDue, settings?.currency)}"],
    [/\$\{invoice\.amount - \(invoice\.balanceDue \?\? 0\)\}/g, "{formatAmount(invoice.amount - (invoice.balanceDue ?? 0), settings?.currency)}"],
    [/\$\{invoice\.balanceDue !== undefined \? invoice\.balanceDue : invoice\.amount\}/g, "{formatAmount(invoice.balanceDue !== undefined ? invoice.balanceDue : invoice.amount, settings?.currency)}"],
    [/\$\{studentTotalDue\}/g, "{formatAmount(studentTotalDue, settings?.currency)}"],
    [/\$\{studentInvoices\.filter\(inv => inv\.status === 'paid'\)\.reduce\(\(sum, inv\) => sum \+ inv\.amount, 0\)\}/g, "{formatAmount(studentInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0), settings?.currency)}"],
    [/\$\{inv\.amount\}/g, "{formatAmount(inv.amount, settings?.currency)}"],
    [/\$\{selectedInvoice\.balanceDue !== undefined \? selectedInvoice\.balanceDue : selectedInvoice\.amount\}/g, "{formatAmount(selectedInvoice.balanceDue !== undefined ? selectedInvoice.balanceDue : selectedInvoice.amount, settings?.currency)}"],
    [/\$\{selectedDetailInvoice\.amount\}/g, "{formatAmount(selectedDetailInvoice.amount, settings?.currency)}"],
    [/\$\{selectedDetailInvoice\.amount - \(selectedDetailInvoice\.balanceDue \?\? 0\)\}/g, "{formatAmount(selectedDetailInvoice.amount - (selectedDetailInvoice.balanceDue ?? 0), settings?.currency)}"],
    [/\$\{selectedDetailInvoice\.balanceDue\}/g, "{formatAmount(selectedDetailInvoice.balanceDue, settings?.currency)}"],
    [/\+\$\{payment\.amount\}/g, "+{formatAmount(payment.amount, settings?.currency)}"]
]);

fixFile('components/dashboard/fees/FeeStructureTab.tsx', [
    ["import { useLanguage } from '@/lib/language-context';", "import { useLanguage } from '@/lib/language-context';\nimport { useSettings, formatAmount } from '@/lib/settings-context';"],
    ["const { t } = useLanguage();", "const { t } = useLanguage();\n  const { settings } = useSettings();"],
    [/\$\{item\.amount\}/g, "{formatAmount(item.amount, settings?.currency)}"]
]);
