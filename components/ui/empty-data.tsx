import { ReactNode } from 'react';
import { Database } from 'lucide-react';

export function EmptyData({ 
  icon: Icon = Database, 
  title = "No data found", 
  description = "Not enough data has been collected yet.", 
  height = "320px" 
}: { 
  icon?: React.ElementType, 
  title?: string, 
  description?: string, 
  height?: string 
}) {
  return (
    <div 
      className="flex flex-col items-center justify-center p-8 text-center border border-border/50 border-dashed rounded-[2.5rem] bg-card/30"
      style={{ height }}
    >
      <div className="w-20 h-20 bg-muted rounded-[2rem] flex items-center justify-center mb-6">
        <Icon className="text-muted-foreground opacity-50 relative z-10" size={32} />
      </div>
      <h3 className="text-xl font-black text-foreground">{title}</h3>
      <p className="text-muted-foreground mt-2 max-w-sm text-sm font-medium">
        {description}
      </p>
    </div>
  );
}
