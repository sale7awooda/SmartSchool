'use client';

import { FileText, Plus, Trash2, Download, Loader2 } from 'lucide-react';

interface DocumentsTabProps {
  documents: any[] | undefined;
  isUploading: boolean;
  isRole: (roles: string[]) => boolean;
  handleUploadDocument: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDeleteDocument: (id: string) => void;
  t: (key: string) => string;
}

export function DocumentsTab({ documents, isUploading, isRole, handleUploadDocument, handleDeleteDocument, t }: DocumentsTabProps) {
  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      <div className="flex justify-between items-center bg-muted/10 p-3 rounded-lg border border-border/40">
        <h3 className="font-bold text-foreground">{t('file_attachment_library')}</h3>
        {(isRole(['admin', 'staff', 'teacher'])) && (
          <label className="cursor-pointer bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-primary/95 transition-all active:scale-95 flex items-center gap-2">
            {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {t('upload_document')}
            <input type="file" className="hidden" onChange={handleUploadDocument} disabled={isUploading} />
          </label>
        )}
      </div>

      {documents && documents.length > 0 ? (
        <div className="grid grid-cols-1 gap-3">
          {documents.map((doc: any) => (
            <div key={doc.id} className="p-4 bg-card dark:bg-slate-900 border border-border rounded-xl flex items-center justify-between group">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center text-muted-foreground shrink-0">
                  <FileText size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{doc.name}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-2">
                    <span className="bg-primary/5 text-primary px-1.5 py-0.5 rounded uppercase font-bold">{doc.type}</span>
                    • {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                  title={t('download')}
                >
                  <Download size={18} />
                </a>
                {isRole(['admin']) && (
                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                    title={t('delete')}
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-[2rem] text-muted-foreground opacity-50">
          <FileText size={48} className="mb-4" />
          <p className="font-bold">{t('registry_empty')}</p>
          <p className="text-xs">{t('registry_empty_desc')}</p>
        </div>
      )}
    </div>
  );
}
