import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  icon: ReactNode;
  variant?: "default" | "primary" | "success" | "info";
}

const variantStyles = {
  default: "bg-card",
  primary: "gradient-gold text-primary-foreground",
  success: "bg-success/10 border-success/20",
  info: "bg-info/10 border-info/20",
};

const iconVariantStyles = {
  default: "bg-secondary text-foreground",
  primary: "bg-primary-foreground/20 text-primary-foreground",
  success: "bg-success/20 text-success",
  info: "bg-info/20 text-info",
};

export function StatCard({ title, value, change, icon, variant = "default" }: StatCardProps) {
  const isPositive = change && change > 0;
  
  return (
    <div 
      className={cn(
        "rounded-2xl p-6 border shadow-soft transition-all duration-300",
        "hover:shadow-medium hover:-translate-y-1",
        "animate-slide-up",
        variantStyles[variant]
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center",
          iconVariantStyles[variant]
        )}>
          {icon}
        </div>
        
        {change !== undefined && (
          <div className={cn(
            "flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full",
            isPositive 
              ? "text-success bg-success/10" 
              : "text-destructive bg-destructive/10"
          )}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      
      <div className="mt-4">
        <p className={cn(
          "text-sm",
          variant === "primary" ? "text-primary-foreground/80" : "text-muted-foreground"
        )}>
          {title}
        </p>
        <p className={cn(
          "text-3xl font-bold mt-1",
          variant === "primary" ? "text-primary-foreground" : "text-foreground"
        )}>
          {value}
        </p>
      </div>
    </div>
  );
}
