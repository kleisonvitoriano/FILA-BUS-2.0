import React from "react";

interface UserAvatarProps {
  src?: string;
  name?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function UserAvatar({ src, name = "U", size = "md", className = "" }: UserAvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  
  const sizeClasses = {
    sm: "w-8 h-8 text-sm",
    md: "w-11 h-11 text-lg",
    lg: "w-20 h-20 text-3xl"
  };

  const borderSizes = {
    sm: "p-0.5 border",
    md: "p-1 border-2",
    lg: "p-1.5 border-[3px]"
  };

  // Generate a distinct theme color or fallback to standard colors
  const activeSize = sizeClasses[size];
  const activeBorder = borderSizes[size];

  return (
    <div 
      className={`inline-block bg-theme text-white border-white shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] transform rotate-3 overflow-hidden ${activeBorder} ${className}`}
    >
      {src && !src.includes("placehold.co") ? (
        <img 
          src={src} 
          alt={name} 
          referrerPolicy="no-referrer"
          className={`${activeSize} object-cover`}
        />
      ) : (
        <div className={`${activeSize} bg-black border border-theme flex items-center justify-center font-black italic`}>
          {initial}
        </div>
      )}
    </div>
  );
}
