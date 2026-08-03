import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "primary";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  default: "bg-bg text-text-muted",
  success: "bg-primary-lighter text-primary-dark",
  warning: "bg-warning-light text-warning",
  danger: "bg-danger-light text-danger",
  info: "bg-info-light text-info",
  primary: "bg-primary text-white",
};

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// 状态徽章映射
export function StatusBadge({ status, label }: { status: string; label: string }) {
  const variantMap: Record<string, BadgeVariant> = {
    pending: "default",
    confirmed: "info",
    delivered: "success",
    paid: "primary",
    cancelled: "danger",
    received: "success",
    active: "success",
    inactive: "default",
  };

  return (
    <Badge variant={variantMap[status] || "default"}>
      {label}
    </Badge>
  );
}
