import React from "react";

export default function Logo({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer elegant ring representing unity and protection */}
      <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="2.5" className="text-primary/20" />
      
      {/* Central pillar of justice */}
      <path
        d="M50 22V72"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        className="text-primary"
      />
      
      {/* Base of the scale */}
      <path
        d="M35 72H65"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        className="text-primary"
      />
      <path
        d="M28 78H72"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="text-primary/80"
      />

      {/* The main balance beam */}
      <path
        d="M20 32H80"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        className="text-primary"
      />

      {/* Left scale pan */}
      <path
        d="M20 32L10 52H30L20 32Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        className="text-primary/30 dark:text-primary/20"
      />
      <path
        d="M10 52C10 58 20 62 20 62C20 62 30 58 30 52"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="text-primary"
      />

      {/* Right scale pan */}
      <path
        d="M80 32L70 52H90L80 32Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        className="text-primary/30 dark:text-primary/20"
      />
      <path
        d="M70 52C70 58 80 62 80 62C80 62 90 58 90 52"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="text-primary"
      />

      {/* Center fulcrum indicator */}
      <circle cx="50" cy="32" r="4" className="fill-primary" />
    </svg>
  );
}