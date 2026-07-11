import React from "react";

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

export function Logo({ size = 48, className = "", ...props }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none ${className}`}
      {...props}
    >
      <defs>
        {/* Top Crystal - Left Face: Gradient from cyan to light-blue */}
        <linearGradient id="crystal-left-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>

        {/* Top Crystal - Right Face: Gradient from cyan to lime/yellow-green */}
        <linearGradient id="crystal-right-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="50%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#a3e635" />
        </linearGradient>

        {/* Middle Belt - Left Wall: Deep vibrant teal */}
        <linearGradient id="belt-left-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#0f766e" />
        </linearGradient>

        {/* Middle Belt - Right Wall: Deep navy teal */}
        <linearGradient id="belt-right-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0f766e" />
          <stop offset="100%" stopColor="#115e59" />
        </linearGradient>

        {/* Bottom Base - Left Face: Dark navy */}
        <linearGradient id="base-left-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>

        {/* Bottom Base - Right Face: Deepest slate/black */}
        <linearGradient id="base-right-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#020617" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>

      {/* Double Concentric Circular Guidelines in Background */}
      <circle cx="50" cy="50" r="41" stroke="#22d3ee" strokeWidth="0.75" fill="none" opacity="0.12" />
      <circle cx="50" cy="50" r="35" stroke="#22d3ee" strokeWidth="0.5" strokeDasharray="2 2" fill="none" opacity="0.15" />

      {/* Background Wireframe Cube */}
      {/* Top Face of Wireframe */}
      <polygon points="50,18 73,30 50,42 27,30" stroke="#0ea5e9" strokeWidth="0.5" fill="none" opacity="0.08" />
      {/* Vertical Pillars */}
      <line x1="27" y1="30" x2="27" y2="62" stroke="#0ea5e9" strokeWidth="0.5" opacity="0.08" />
      <line x1="73" y1="30" x2="73" y2="62" stroke="#0ea5e9" strokeWidth="0.5" opacity="0.08" />
      <line x1="50" y1="42" x2="50" y2="74" stroke="#0ea5e9" strokeWidth="0.5" opacity="0.08" />
      {/* Bottom Face of Wireframe */}
      <polygon points="50,50 73,62 50,74 27,62" stroke="#0ea5e9" strokeWidth="0.5" fill="none" opacity="0.08" />

      {/* 3D Structure 1: Bottom Base (Split Diamond pointing down) */}
      {/* Left Face of Bottom Base */}
      <polygon points="26,62 50,50 50,78" fill="url(#base-left-grad)" />
      {/* Right Face of Bottom Base */}
      <polygon points="50,50 74,62 50,78" fill="url(#base-right-grad)" />

      {/* 3D Structure 2: Middle Belt (Hexagonal wrap with central diagonal slash) */}
      {/* Left Wall Panel */}
      <polygon points="26,34 50,22 50,44 26,56" fill="url(#belt-left-grad)" />
      {/* Right Wall Panel */}
      <polygon points="50,22 74,34 74,56 50,44" fill="url(#belt-right-grad)" />

      {/* Elegant Diagonal Chevron Gap Mask (White Space Layer) */}
      {/* This creates the beautiful split gap style by overlaying a clean white gap line */}
      <polygon points="23,55 50,41.5 77,55 77,59 50,45.5 23,59" fill="#ffffff" />

      {/* 3D Structure 3: Top Hovering Crystal/Prism */}
      {/* Left Face */}
      <polygon points="50,12 26,34 50,49" fill="url(#crystal-left-grad)" />
      {/* Right Face */}
      <polygon points="50,12 74,34 50,49" fill="url(#crystal-right-grad)" />

      {/* Accent Beads / Laser nodes */}
      {/* Top Gold Apex Spark */}
      <circle cx="50" cy="12" r="1.5" fill="#eab308" />
      <circle cx="50" cy="12" r="3.5" fill="#facc15" opacity="0.4" />

      {/* Left Mid Node */}
      <circle cx="26" cy="34" r="1.2" fill="#38bdf8" />
      <circle cx="26" cy="34" r="2.5" fill="#0ea5e9" opacity="0.3" />

      {/* Right Mid Node */}
      <circle cx="74" cy="34" r="1.2" fill="#34d399" />
      <circle cx="74" cy="34" r="2.5" fill="#059669" opacity="0.3" />

      {/* Bottom Apex Teal Spark */}
      <circle cx="50" cy="78" r="1.5" fill="#0ea5e9" />
      <circle cx="50" cy="78" r="4.0" fill="#22d3ee" opacity="0.4" />
    </svg>
  );
}
