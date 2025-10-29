import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
}

export function Button({ children, variant = 'primary', className = '', ...props }: ButtonProps) {
  const baseClasses = 'button';
  const variantClasses = {
    primary: '',
    secondary: 'button-secondary',
    danger: 'button-danger',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
