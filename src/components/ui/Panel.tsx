import { HTMLAttributes, ReactNode } from 'react';

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Panel({ children, className = '', ...props }: PanelProps) {
  return (
    <div className={`panel ${className}`} {...props}>
      {children}
    </div>
  );
}
