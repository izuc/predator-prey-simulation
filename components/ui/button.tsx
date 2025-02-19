import type React from "react"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string
}

export const Button: React.FC<ButtonProps> = ({ className, ...props }) => {
  return <button className={`px-4 py-2 font-semibold transition-colors ${className}`} {...props} />
}

