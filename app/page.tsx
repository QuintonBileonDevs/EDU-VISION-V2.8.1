"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Database, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Plus, 
  Trash2, 
  User, 
  LogOut, 
  Users, 
  GraduationCap, 
  ArrowLeftRight, 
  UserMinus, 
  Search, 
  Filter, 
  AlertOctagon,
  HelpCircle,
  Clock,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowLeft,
  Check,
  X,
  Shield,
  ShieldCheck,
  Activity,
  UserCheck,
  UserX,
  Settings,
  BarChart3,
  MapPin,
  Briefcase,
  Key,
  Sun,
  Moon
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts";
import confetti from "canvas-confetti";
import { Logo } from "../components/Logo";
import { motion } from "motion/react";

interface DbStatusResponse {
  success: boolean;
  status: "online" | "offline";
  details: string;
  code?: string;
  diagnostic?: string;
}

interface UserSession {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
  region: string;
  status: string;
}

interface RegistryRecord {
  id: number;
  type: string;
  school_name: string;
  region: string;
  record_data: any;
  created_at: string;
}

export default function Page() {
  // Authentication & Session
  const [user, setUser] = useState<UserSession | null>(null);
  const [authForm, setAuthForm] = useState({ username: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Dark Mode Support State
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  // Load and apply dark mode
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const systemPrefersDark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme || (systemPrefersDark ? "dark" : "light");
    setTheme(initialTheme);
    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // Database Connection Monitoring
  const [dbStatus, setDbStatus] = useState<"checking" | "online" | "offline">("checking");
  const [dbDiagnostic, setDbDiagnostic] = useState<DbStatusResponse | null>(null);
  const [checkingDb, setCheckingDb] = useState(false);

  // Registry Management
  const [activeTab, setActiveTab] = useState<"students" | "teachers" | "dropouts" | "transfers">("students");
  const [records, setRecords] = useState<RegistryRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [regionFilter, setRegionFilter] = useState("All");

  // Form Submission
  const [isAdding, setIsAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formFields, setFormFields] = useState<any>({});

  // Mouse position state for interactive login page background
  const [mousePos, setMousePos] = useState({ x: -200, y: -200 });
  const [isHoveringBg, setIsHoveringBg] = useState(false);

  // Login form interactive enhancements
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState("");

  // Super Admin specific state variables
  const [superTab, setSuperTab] = useState<"insights" | "registries" | "users">("insights");
  const [allRecords, setAllRecords] = useState<RegistryRecord[]>([]);
  const [allRecordsLoading, setAllRecordsLoading] = useState(false);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    username: "",
    email: "",
    full_name: "",
    role: "school_head",
    region: "South",
    password: "",
    status: "Active"
  });
  const [userSubmitting, setUserSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // Dynamic user roles list managed from database entries
  const [availableRoles, setAvailableRoles] = useState<string[]>([
    "super_admin",
    "region_admin",
    "subregion_admin",
    "school_head"
  ]);

  // Role Permissions State Management (persisted in localStorage)
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("emis_role_permissions");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          // Fallback
        }
      }
    }
    return {
      super_admin: ["read_registries", "write_registries", "approve_registries", "manage_users", "assign_roles", "configure_system", "force_sync", "export_reports"],
      region_admin: ["read_registries", "write_registries", "approve_registries", "export_reports"],
      subregion_admin: ["read_registries", "write_registries"],
      school_head: ["read_registries", "write_registries"],
      statistics_officer: ["read_registries", "approve_registries", "export_reports"],
      district_officer: ["read_registries", "write_registries", "approve_registries"]
    };
  });

  useEffect(() => {
    localStorage.setItem("emis_role_permissions", JSON.stringify(rolePermissions));
  }, [rolePermissions]);

  const [isCustomRoleModalOpen, setIsCustomRoleModalOpen] = useState(false);
  const [customRoleCode, setCustomRoleCode] = useState("");
  const [customRoleName, setCustomRoleName] = useState("");
  const [customRolePerms, setCustomRolePerms] = useState<string[]>([]);
  const [customRoleCallback, setCustomRoleCallback] = useState<((newRole: string) => void) | null>(null);

  const [editingUserRolePrompt, setEditingUserRolePrompt] = useState<number | null>(null);
  const [isCreatingCustomRole, setIsCreatingCustomRole] = useState(false);
  const [customRoleInput, setCustomRoleInput] = useState("");

  // Dynamic user regions list managed from database entries
  const [availableRegions, setAvailableRegions] = useState<string[]>([
    "Central",
    "Chobe",
    "Gantsi",
    "Kgalagadi",
    "Kgatleng",
    "Kweneng",
    "North East",
    "North West",
    "South",
    "South East"
  ]);

  const formatRoleLabel = (role: string) => {
    switch (role) {
      case "super_admin":
        return "Super Administrator";
      case "region_admin":
        return "Region Administrator";
      case "subregion_admin":
        return "Sub-Region Administrator";
      case "school_head":
        return "School Head";
      default:
        return role
          .replace(/[_-]/g, " ")
          .split(" ")
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
    }
  };

  // Fetch Database Status & Diagnostics
  const checkDatabaseStatus = async (silent = false) => {
    if (!silent) setCheckingDb(true);
    try {
      const res = await fetch("/api/db-status");
      const data: DbStatusResponse = await res.json();
      setDbStatus(data.status);
      setDbDiagnostic(data);
    } catch (e) {
      setDbStatus("offline");
      setDbDiagnostic({
        success: false,
        status: "offline",
        details: "Failed to communicate with local status API",
        diagnostic: "The dev server API could not be reached. Ensure the application has built correctly."
      });
    } finally {
      setCheckingDb(false);
    }
  };

  // Fetch Records from Aiven MySQL (filtered for active tabular selection)
  const fetchRecords = useCallback(async () => {
    if (dbStatus !== "online") return;
    setRecordsLoading(true);
    try {
      const res = await fetch(`/api/registries?type=${activeTab}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
      }
    } catch (e) {
      console.error("Error fetching records:", e);
    } finally {
      setRecordsLoading(false);
    }
  }, [dbStatus, activeTab]);

  // Fetch ALL Records (unfiltered) from Aiven MySQL for Super Admin analytics & graphs
  const fetchAllRecords = useCallback(async () => {
    if (dbStatus !== "online") return;
    setAllRecordsLoading(true);
    try {
      const res = await fetch("/api/registries");
      if (res.ok) {
        const data = await res.json();
        setAllRecords(data.records || []);
      }
    } catch (e) {
      console.error("Error fetching all records:", e);
    } finally {
      setAllRecordsLoading(false);
    }
  }, [dbStatus]);

  // Fetch System Users from Aiven MySQL
  const fetchSystemUsers = useCallback(async () => {
    if (dbStatus !== "online") return;
    setUsersLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        const fetchedUsers = data.users || [];
        setSystemUsers(fetchedUsers);
        
        // Extract distinct roles from database users and merge with default ones
        const dbRoles = fetchedUsers.map((u: any) => u.role).filter(Boolean);
        const uniqueRoles = Array.from(new Set([
          "super_admin",
          "region_admin",
          "subregion_admin",
          "school_head",
          ...dbRoles
        ]));
        setAvailableRoles(uniqueRoles);

        // Extract distinct regions from database if available
        if (data.regions && data.regions.length > 0) {
          setAvailableRegions(data.regions);
        }
      }
    } catch (e) {
      console.error("Error fetching system users:", e);
    } finally {
      setUsersLoading(false);
    }
  }, [dbStatus]);

  // Save or update custom role and its permissions
  const handleSaveCustomRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRoleCode.trim()) {
      alert("Role code is required.");
      return;
    }
    const roleCode = customRoleCode.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    
    // Register role in available roles list if it doesn't exist
    if (!availableRoles.includes(roleCode)) {
      setAvailableRoles((prev) => [...prev, roleCode]);
    }
    
    // Save configured permissions mapping
    setRolePermissions((prev) => ({
      ...prev,
      [roleCode]: customRolePerms
    }));
    
    // Close modal
    setIsCustomRoleModalOpen(false);
    
    // Execute dynamic callback to auto-assign this role to the pending user context
    if (customRoleCallback) {
      customRoleCallback(roleCode);
    }
    
    if (typeof window !== "undefined") {
      try {
        // @ts-ignore
        if (typeof confetti === "function") confetti({ particleCount: 30, spread: 40 });
      } catch (err) {}
    }
  };

  // Create a new administrative user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUserForm)
      });
      if (res.ok) {
        setIsAddingUser(false);
        setIsCreatingCustomRole(false);
        setCustomRoleInput("");
        setNewUserForm({
          username: "",
          email: "",
          full_name: "",
          role: "school_head",
          region: "South",
          password: "",
          status: "Active"
        });
        fetchSystemUsers();
        confetti({ particleCount: 40, spread: 50 });
      } else {
        const errData = await res.json();
        alert("Failed to provision user: " + (errData.error || "Unknown database error"));
      }
    } catch (e) {
      alert("Network error while creating user.");
    } finally {
      setUserSubmitting(false);
    }
  };

  // Toggle status of user (Active / Inactive)
  const handleToggleUserStatus = async (userId: number, currentStatus: string) => {
    const nextStatus = currentStatus === "Active" ? "Inactive" : "Active";
    try {
      const res = await fetch(`/api/users?id=${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        fetchSystemUsers();
      } else {
        const errData = await res.json();
        alert("Failed to update status: " + (errData.error || "Unknown error"));
      }
    } catch (e) {
      alert("Network error updating status.");
    }
  };

  // Change user role or region
  const handleUpdateUserRoleRegion = async (userId: number, updates: { role?: string; region?: string; full_name?: string }) => {
    try {
      const res = await fetch(`/api/users?id=${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        setEditingUser(null);
        fetchSystemUsers();
      } else {
        const errData = await res.json();
        alert("Failed to update user: " + (errData.error || "Unknown error"));
      }
    } catch (e) {
      alert("Network error updating user details.");
    }
  };

  // Delete an administrative user account
  const handleDeleteUser = async (userId: number, username: string) => {
    if (username === "super_admin") {
      alert("Action Forbidden: Cannot delete default super_admin account.");
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete user "${username}" from the database?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/users?id=${userId}`, { method: "DELETE" });
      if (res.ok) {
        fetchSystemUsers();
      } else {
        const errData = await res.json();
        alert("Failed to delete user: " + (errData.error || "Unknown error"));
      }
    } catch (e) {
      alert("Network error while deleting user.");
    }
  };

  // Handle Authentication Submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authForm)
      });

      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || "Login failed");
        // Update database connection indicator if a DB failure occurred during authentication
        if (data.error && data.error.includes("Database Connection")) {
          setDbStatus("offline");
          setDbDiagnostic({
            success: false,
            status: "offline",
            details: data.error,
            diagnostic: data.details || "Aiven MySQL rejected the connection handshake due to timeout."
          });
        }
      } else {
        setUser(data.user);
        if (rememberMe) {
          localStorage.setItem("edu_vision_remembered_user", JSON.stringify(data.user));
          localStorage.setItem("edu_vision_remembered_username", authForm.username);
          localStorage.setItem("edu_vision_remember", "true");
        } else {
          localStorage.removeItem("edu_vision_remembered_user");
          localStorage.removeItem("edu_vision_remembered_username");
          localStorage.removeItem("edu_vision_remember");
        }
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
    } catch (err) {
      setAuthError("Could not connect to the authentication server.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle De-authentication
  const handleLogout = () => {
    setUser(null);
    setAuthForm({ username: "", password: "" });
    localStorage.removeItem("edu_vision_remembered_user");
  };

  // Handle Forgot Password Form Submission
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordError("");
    setForgotPasswordLoading(true);

    try {
      // Simulate network request
      await new Promise((resolve) => setTimeout(resolve, 1500));
      if (!forgotPasswordEmail.trim()) {
        setForgotPasswordError("Please enter your email address.");
      } else if (!forgotPasswordEmail.includes("@") || !forgotPasswordEmail.includes(".")) {
        setForgotPasswordError("Please enter a valid email address.");
      } else {
        setForgotPasswordSuccess(true);
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      }
    } catch (err) {
      setForgotPasswordError("Could not reach authentication server. Please try again.");
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  // Handle Record Insertion
  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      type: activeTab,
      school_name: formFields.school_name || "Mogoditshane Secondary",
      region: formFields.region || user?.region || "South",
      record_data: { ...formFields }
    };

    // Clean payload of redundant details
    delete payload.record_data.school_name;
    delete payload.record_data.region;

    try {
      const res = await fetch("/api/registries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsAdding(false);
        setFormFields({});
        fetchRecords();
        if (user?.role === "super_admin") {
          fetchAllRecords();
        }
        confetti({ particleCount: 30, spread: 50 });
      } else {
        const errData = await res.json();
        alert("Failed to insert record: " + (errData.error || "Unknown database error"));
      }
    } catch (err) {
      alert("Network error while submitting to database.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Record Deletion
  const handleDeleteRecord = async (id: number) => {
    if (!confirm("Are you sure you want to permanently delete this record from Aiven MySQL?")) {
      return;
    }

    try {
      const res = await fetch(`/api/registries?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchRecords();
        if (user?.role === "super_admin") {
          fetchAllRecords();
        }
      } else {
        alert("Failed to delete record.");
      }
    } catch (e) {
      alert("Network error while deleting from database.");
    }
  };

  // Load remembered user session & preference on initial mount
  useEffect(() => {
    const savedRemember = localStorage.getItem("edu_vision_remember");
    if (savedRemember === "true") {
      setRememberMe(true);
      
      const rememberedUser = localStorage.getItem("edu_vision_remembered_user");
      if (rememberedUser) {
        try {
          const parsed = JSON.parse(rememberedUser);
          if (parsed) {
            setUser(parsed);
          }
        } catch (e) {
          console.error("Error parsing remembered user session:", e);
        }
      }

      const rememberedUsername = localStorage.getItem("edu_vision_remembered_username");
      if (rememberedUsername) {
        setAuthForm((prev) => ({ ...prev, username: rememberedUsername }));
      }
    }
  }, []);

  // Initialize status check
  useEffect(() => {
    checkDatabaseStatus();
  }, []);

  // Fetch records when tab or connection status changes
  useEffect(() => {
    if (dbStatus === "online" && user) {
      fetchRecords();
      if (user.role === "super_admin") {
        fetchAllRecords();
        fetchSystemUsers();
      }
    }
  }, [activeTab, dbStatus, user, fetchRecords, fetchAllRecords, fetchSystemUsers]);

  // Set default form values when tab changes
  useEffect(() => {
    setFormFields({
      school_name: user?.region === "All" ? "" : "Mogoditshane Secondary",
      region: user?.region === "All" ? "South" : user?.region,
    });
  }, [activeTab, user]);

  // Filter records based on search term & region
  const filteredRecords = records.filter(record => {
    const matchesRegion = regionFilter === "All" || record.region === regionFilter;
    
    // Flatten record values to string search
    const dataValuesString = JSON.stringify(record.record_data || {}).toLowerCase();
    const schoolString = record.school_name.toLowerCase();
    const regionString = record.region.toLowerCase();
    
    const matchesSearch = searchTerm === "" || 
      dataValuesString.includes(searchTerm.toLowerCase()) ||
      schoolString.includes(searchTerm.toLowerCase()) ||
      regionString.includes(searchTerm.toLowerCase());

    return matchesRegion && matchesSearch;
  });

  // Hydration safety guard
  if (!mounted) {
    return (
      <div className="flex-1 min-h-screen bg-slate-50 dark:bg-[#090d16] flex items-center justify-center transition-colors duration-300">
        <RefreshCw className="h-8 w-8 animate-spin text-[#00a8cc]" />
      </div>
    );
  }

  // Render Login Component
  if (!user) {
    return (
      <div 
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
        onMouseEnter={() => setIsHoveringBg(true)}
        onMouseLeave={() => setIsHoveringBg(false)}
        className="relative flex-1 flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8 bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-300"
      >
        {/* Floating Theme Toggle */}
        <button
          onClick={toggleDarkMode}
          className="absolute top-4 right-4 z-50 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-sm hover:shadow-md transition duration-200 flex items-center justify-center cursor-pointer"
          title="Toggle Theme"
          id="theme-toggle-login"
        >
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>

        {/* Interactive Mouse Spotlight / Follow Background Animation */}
        <motion.div
          className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(34, 211, 238, 0.18), transparent 80%)`,
          }}
          animate={{
            opacity: isHoveringBg ? 1 : 0,
          }}
        />

        {/* Glowing bubble that follows mouse */}
        <motion.div
          className="absolute pointer-events-none rounded-full bg-emerald-400/10 blur-3xl w-80 h-80 -translate-x-1/2 -translate-y-1/2 z-0"
          animate={{
            x: mousePos.x,
            y: mousePos.y,
            opacity: isHoveringBg ? 1 : 0,
          }}
          transition={{
            type: "spring",
            damping: 30,
            stiffness: 100,
            mass: 0.6,
          }}
        />

        {/* Subtle decorative grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-60 dark:opacity-30" />

        {/* Floating gradient blob 1 */}
        <motion.div
          animate={{
            x: [0, 40, -20, 0],
            y: [0, -30, 40, 0],
            scale: [1, 1.15, 0.9, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-cyan-200/40 dark:bg-cyan-950/20 blur-3xl pointer-events-none"
        />

        {/* Floating gradient blob 2 */}
        <motion.div
          animate={{
            x: [0, -50, 30, 0],
            y: [0, 40, -30, 0],
            scale: [1, 0.9, 1.1, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-emerald-200/30 dark:bg-emerald-950/10 blur-3xl pointer-events-none"
        />

        {/* Floating gradient blob 3 (Center subtle pulse) */}
        <motion.div
          animate={{
            opacity: [0.15, 0.3, 0.15],
            scale: [0.85, 1.05, 0.85],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-slate-200/25 dark:bg-slate-800/10 blur-3xl pointer-events-none"
        />

        {/* Login Card */}
        <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15),_0_0_0_1px_rgba(0,0,0,0.04)] border border-slate-200/60 dark:border-slate-800/80 p-8 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_35px_80px_-15px_rgba(0,0,0,0.22),_0_0_0_1px_rgba(0,0,0,0.06)] ring-8 ring-slate-100/40 dark:ring-slate-950/20">
          <div className="flex flex-col items-center text-center mb-6">
            {/* Elegant floating Logo (floating directly on card background as in the image) */}
            <div className="mb-4 flex justify-center">
              <Logo size={105} className="drop-shadow-sm" />
            </div>
            
            {/* EDU-VISION EMIS Brand Typography */}
            <h2 className="text-3xl font-extrabold tracking-tight font-sans">
              <span className="text-[#0a192f] dark:text-slate-100">EDU-</span>
              <span className="text-[#00a8cc]">VISION</span>
              <span className="text-[#0a192f] dark:text-slate-100"> EMIS</span>
            </h2>
            
            {/* Subtitle */}
            <p className="text-sm font-medium text-slate-500/90 dark:text-slate-400 mt-2 leading-relaxed max-w-[280px] sm:max-w-xs mx-auto">
              Botswana Educational Management Indicators System
            </p>
          </div>

          {!showForgotPassword ? (
            <div key="login-form">
              {authError && (
                <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-lg flex gap-2 items-center text-xs text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Username or Email</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                      <User className="h-4 w-4" />
                    </span>
                    <input 
                      type="text"
                      required
                      disabled={authLoading}
                      className="w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00a8cc] focus:border-[#00a8cc] disabled:bg-slate-50 disabled:text-slate-400 text-sm transition dark:text-slate-100"
                      placeholder="e.g. super_admin"
                      value={authForm.username}
                      onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(true);
                        setForgotPasswordSuccess(false);
                        setForgotPasswordError("");
                        setForgotPasswordEmail("");
                      }}
                      className="text-xs font-semibold text-[#00a8cc] hover:text-[#0b849f] transition"
                    >
                      Forgot password?
                    </button>
                  </div>
                  
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input 
                      type={showPassword ? "text" : "password"}
                      required
                      disabled={authLoading}
                      className="w-full pl-10 pr-10 py-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00a8cc] focus:border-[#00a8cc] disabled:bg-slate-50 disabled:text-slate-400 text-sm transition dark:text-slate-100"
                      placeholder="••••••••"
                      value={authForm.password}
                      onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me checkbox */}
                <div className="flex items-center">
                  <input
                    id="remember_me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-[#00a8cc] focus:ring-[#00a8cc] border-slate-300 dark:border-slate-700 dark:bg-slate-950 rounded cursor-pointer"
                  />
                  <label htmlFor="remember_me" className="ml-2 block text-xs text-slate-600 dark:text-slate-400 font-medium cursor-pointer select-none">
                    Remember my credentials
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold rounded-lg transition text-sm disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-md hover:shadow-lg"
                >
                  {authLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    "Sign In to Registry"
                  )}
                </button>
              </form>
            </div>
          ) : (
            <motion.div 
              key="forgot-password"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition font-medium"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Sign In
                </button>
              </div>

              <h3 className="text-base font-bold text-slate-950 dark:text-slate-100 mb-1">Reset Password</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                Enter your registered administrator email address below. We will send you a password reset request code.
              </p>

              {forgotPasswordSuccess ? (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-lg text-center">
                  <div className="inline-flex items-center justify-center p-2 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full mb-3">
                    <Check className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-950 dark:text-slate-100 mb-1">Reset Code Dispatched</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                    A password recovery link has been simulated & dispatched to <span className="font-semibold">{forgotPasswordEmail}</span>.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotPasswordSuccess(false);
                    }}
                    className="w-full py-2 bg-slate-950 hover:bg-slate-800 dark:bg-slate-850 dark:hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition"
                  >
                    Done, return to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  {forgotPasswordError && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-lg flex gap-2 items-center text-xs text-rose-600 dark:text-rose-400">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{forgotPasswordError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                        <Mail className="h-4 w-4" />
                      </span>
                      <input 
                        type="email"
                        required
                        disabled={forgotPasswordLoading}
                        className="w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00a8cc] focus:border-[#00a8cc] disabled:bg-slate-50 disabled:text-slate-400 text-sm transition dark:text-slate-100"
                        placeholder="e.g. admin@gov.bw"
                        value={forgotPasswordEmail}
                        onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={forgotPasswordLoading}
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold rounded-lg transition text-sm disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                  >
                    {forgotPasswordLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Send Reset Instructions"
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  // Render Full Application Dashboard (Main Registry Portal)
  return (
    <div className="flex-1 flex flex-col">
      {/* Top Bar Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors duration-200">
        <div className="flex items-center gap-4">
          <div className="relative p-0.5 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm shrink-0">
            <Logo size={44} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex flex-wrap items-center gap-x-1.5">
              <span>EDU-</span>
              <span className="text-[#00a8cc]">VISION</span>
              <span>EMIS</span>
            </h1>
          </div>
        </div>

        {/* User Info, Theme Toggle & Connection Monitoring */}
        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          <div className="bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs flex gap-2 items-center">
            <User className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            <div>
              <span className="font-semibold block text-slate-800 dark:text-slate-200">{user.full_name}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">{user.role.replace("_", " ")} ({user.region} Region)</span>
            </div>
          </div>

          <button
            onClick={toggleDarkMode}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            title="Toggle Theme"
            id="theme-toggle-dashboard"
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>

          <button
            onClick={handleLogout}
            className="p-2 bg-[#a60a0a] hover:bg-[#8c0808] text-white rounded-lg transition cursor-pointer flex items-center justify-center shadow-sm"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Database Diagnostics Bar */}
      <div className="bg-slate-900 text-white px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-2 text-xs font-sans">
          <Database className="h-4 w-4 text-emerald-400" />
          <span className="text-slate-300 font-medium">EMIS Database Sync Connected</span>
        </div>
        <button
          onClick={() => {
            checkDatabaseStatus();
            fetchRecords();
          }}
          disabled={checkingDb}
          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 rounded text-xs transition flex items-center gap-1.5 self-start md:self-auto border border-slate-700 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`h-3 w-3 ${checkingDb ? "animate-spin" : ""}`} />
          Force Sync Refresh
        </button>
      </div>

      {/* Super Admin Tab Selector */}
      {user?.role === "super_admin" && (
        <div className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 transition-colors duration-200">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "insights", label: "National EMIS Insights", icon: Activity },
              { id: "registries", label: "Connected Registries", icon: Database },
              { id: "users", label: "System Access Control", icon: Shield }
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = superTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSuperTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                    isSelected
                      ? "bg-slate-900 dark:bg-slate-800 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold font-mono flex items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            Active Super Admin Session
          </div>
        </div>
      )}

      {/* Primary Dashboard Content Area */}
      {user?.role !== "super_admin" || superTab === "registries" ? (
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation / Registry Selection sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
            <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Registries</h3>
            <nav className="space-y-1">
              {[
                { id: "students", label: "Student Registry", icon: GraduationCap },
                { id: "teachers", label: "Teacher Registry", icon: Users },
                { id: "dropouts", label: "Dropout Tracking", icon: UserMinus },
                { id: "transfers", label: "School Transfers", icon: ArrowLeftRight }
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      setIsAdding(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition ${
                      isSelected 
                        ? "bg-slate-900 dark:bg-slate-850 text-white shadow" 
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-55 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick Metrics Chart */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs transition-colors duration-200">
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Registry Summary counts</h4>
            <div className="space-y-2 mt-3">
              {[
                { type: "students", label: "Students", color: "bg-indigo-500" },
                { type: "teachers", label: "Teachers", color: "bg-emerald-500" },
                { type: "dropouts", label: "Dropouts", color: "bg-rose-500" },
                { type: "transfers", label: "Transfers", color: "bg-amber-500" }
              ].map((m) => {
                const count = records.filter(r => r.type === m.type).length;
                return (
                  <div key={m.type}>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-1">
                      <span>{m.label}</span>
                      <span className="font-semibold">{count} records</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${m.color} transition-all duration-500`}
                        style={{ width: `${Math.min(100, count * 20)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dynamic List and Insertion Forms */}
        <div className="lg:col-span-3 space-y-4">
          {/* Action Ribbon & Filters */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors duration-200">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={`Search active ${activeTab}...`}
                  className="w-full pl-9 pr-4 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-700"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Region Selector */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="bg-transparent border-none focus:outline-none font-medium text-slate-700 dark:text-slate-300 dark:bg-slate-950 cursor-pointer"
                >
                  <option value="All">All Regions</option>
                  {availableRegions.map((region) => (
                    <option key={region} value={region}>
                      {region} Region
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={() => setIsAdding(!isAdding)}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <Plus className={`h-4 w-4 transition-transform ${isAdding ? "rotate-45" : ""}`} />
              {isAdding ? "Cancel" : `Add Record`}
            </button>
          </div>

          {/* Create Form Panel */}
          {isAdding && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm animate-fadeIn transition-colors duration-200">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                Record New Registry Record: <span className="capitalize">{activeTab}</span>
              </h3>

              <form onSubmit={handleAddRecord} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">School Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-700"
                    placeholder="e.g. Mogoditshane Secondary"
                    value={formFields.school_name || ""}
                    onChange={(e) => setFormFields({ ...formFields, school_name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Region</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-700 cursor-pointer"
                    value={formFields.region || (availableRegions[0] || "South")}
                    onChange={(e) => setFormFields({ ...formFields, region: e.target.value })}
                  >
                    {availableRegions.map((region) => (
                      <option key={region} value={region}>
                        {region} Region
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tab Specific Fields */}
                {activeTab === "students" && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Student Full Name</label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-700"
                        placeholder="Thabo Molefe"
                        value={formFields.student_name || ""}
                        onChange={(e) => setFormFields({ ...formFields, student_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Gender</label>
                      <select
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-700"
                        value={formFields.gender || "Male"}
                        onChange={(e) => setFormFields({ ...formFields, gender: e.target.value })}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Grade / Level</label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-700"
                        placeholder="Form 3"
                        value={formFields.grade || ""}
                        onChange={(e) => setFormFields({ ...formFields, grade: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Age</label>
                      <input
                        type="number"
                        required
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-700"
                        placeholder="15"
                        value={formFields.age || ""}
                        onChange={(e) => setFormFields({ ...formFields, age: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {activeTab === "teachers" && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Teacher Full Name</label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-700"
                        placeholder="Mrs. Sarah Dube"
                        value={formFields.teacher_name || ""}
                        onChange={(e) => setFormFields({ ...formFields, teacher_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Specialization Subject</label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-700"
                        placeholder="Mathematics / Science"
                        value={formFields.subject || ""}
                        onChange={(e) => setFormFields({ ...formFields, subject: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Highest Qualification</label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-700"
                        placeholder="Bachelor of Education"
                        value={formFields.qualification || ""}
                        onChange={(e) => setFormFields({ ...formFields, qualification: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Employment Type</label>
                      <select
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-700"
                        value={formFields.employment_type || "Permanent"}
                        onChange={(e) => setFormFields({ ...formFields, employment_type: e.target.value })}
                      >
                        <option value="Permanent">Permanent</option>
                        <option value="Contract">Contract</option>
                        <option value="Temporary">Temporary</option>
                      </select>
                    </div>
                  </>
                )}

                {activeTab === "dropouts" && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Student Full Name</label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-700"
                        placeholder="Lindiwe Ndiaye"
                        value={formFields.student_name || ""}
                        onChange={(e) => setFormFields({ ...formFields, student_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Dropout Grade</label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-700"
                        placeholder="Form 4"
                        value={formFields.grade || ""}
                        onChange={(e) => setFormFields({ ...formFields, grade: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Reason for Withdrawal</label>
                      <select
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-700"
                        value={formFields.reason || "Financial"}
                        onChange={(e) => setFormFields({ ...formFields, reason: e.target.value })}
                      >
                        <option value="Financial">Financial Hardship</option>
                        <option value="Relocation">Family Relocation</option>
                        <option value="Health">Medical / Health Reasons</option>
                        <option value="Academic">Academic Underperformance</option>
                        <option value="Employment">Early Employment</option>
                      </select>
                    </div>
                  </>
                )}

                {activeTab === "transfers" && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Student Full Name</label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-700"
                        placeholder="Kabo Gaseitsiwe"
                        value={formFields.student_name || ""}
                        onChange={(e) => setFormFields({ ...formFields, student_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Destination School</label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-700"
                        placeholder="Serowe Senior School"
                        value={formFields.destination_school || ""}
                        onChange={(e) => setFormFields({ ...formFields, destination_school: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Transfer Justification</label>
                      <textarea
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none h-20 focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-700"
                        placeholder="Relocation of parent/guardian and proximity to new household."
                        value={formFields.justification || ""}
                        onChange={(e) => setFormFields({ ...formFields, justification: e.target.value })}
                      />
                    </div>
                  </>
                )}

                <div className="md:col-span-2 flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-slate-950 dark:bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-800 dark:hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {submitting ? "Saving to Aiven..." : "Submit to MySQL"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Record Display Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
              <h3 className="font-semibold text-slate-950 dark:text-slate-100 capitalize flex items-center gap-2 text-sm">
                <Database className="h-4 w-4 text-slate-400" />
                Active Database Collection: {activeTab} ({filteredRecords.length} entries)
              </h3>
            </div>

            {recordsLoading ? (
              <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
                <span className="text-sm">Querying Aiven MySQL...</span>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="py-16 text-center max-w-sm mx-auto">
                <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                  <Database className="h-6 w-6" />
                </div>
                <h4 className="font-semibold text-slate-800">No database entries found</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Add new records above, or make sure your database query was synced.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800/80">
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider">School & Region</th>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider">Record Details</th>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider">Date Created</th>
                      <th className="px-6 py-3 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {filteredRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition">
                        <td className="px-6 py-4">
                          <span className="font-semibold text-slate-950 dark:text-slate-100 block">{record.school_name}</span>
                          <span className="text-slate-500 dark:text-slate-400 text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full inline-block mt-0.5">
                            {record.region} Region
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1 text-slate-700 dark:text-slate-300">
                            {record.type === "students" && (
                              <>
                                <span className="font-bold text-slate-900 dark:text-slate-100 block">{record.record_data.student_name}</span>
                                <span>Gender: <b className="text-slate-900 dark:text-slate-100">{record.record_data.gender}</b> • Age: <b className="text-slate-900 dark:text-slate-100">{record.record_data.age}</b> • Grade: <b className="text-slate-900 dark:text-slate-100">{record.record_data.grade}</b></span>
                              </>
                            )}
                            {record.type === "teachers" && (
                              <>
                                <span className="font-bold text-slate-900 dark:text-slate-100 block">{record.record_data.teacher_name}</span>
                                <span>Subject: <b className="text-slate-900 dark:text-slate-100">{record.record_data.subject}</b> • Qualification: <b className="text-slate-900 dark:text-slate-100">{record.record_data.qualification}</b> • Employment: <b className="text-slate-900 dark:text-slate-100">{record.record_data.employment_type}</b></span>
                              </>
                            )}
                            {record.type === "dropouts" && (
                              <>
                                <span className="font-bold text-slate-900 dark:text-slate-100 block">{record.record_data.student_name}</span>
                                <span>Grade: <b className="text-slate-900 dark:text-slate-100">{record.record_data.grade}</b> • Reason: <b className="text-rose-600 bg-rose-50 dark:bg-rose-950/20 dark:text-rose-400 px-1.5 py-0.5 rounded">{record.record_data.reason}</b></span>
                              </>
                            )}
                            {record.type === "transfers" && (
                              <>
                                <span className="font-bold text-slate-900 dark:text-slate-100 block">{record.record_data.student_name}</span>
                                <span>Destination: <b className="text-slate-900 dark:text-slate-100">{record.record_data.destination_school}</b> • Justification: <span className="text-slate-500 dark:text-slate-400 italic">&ldquo;{record.record_data.justification || "None"}&rdquo;</span></span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {record.created_at}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeleteRecord(record.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded transition cursor-pointer"
                            title="Remove Record"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
      ) : superTab === "insights" ? (
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
          {/* Analytics Summary Header Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 animate-fadeIn">
            {[
              { label: "Total Students", count: allRecords.filter(r => r.type === "students").length, color: "border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20", icon: GraduationCap },
              { label: "Active Teachers", count: allRecords.filter(r => r.type === "teachers").length, color: "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20", icon: Users },
              { label: "Tracked Dropouts", count: allRecords.filter(r => r.type === "dropouts").length, color: "border-rose-500 text-rose-600 dark:text-rose-400 bg-rose-50/30 dark:bg-rose-950/20", icon: UserMinus },
              { label: "School Transfers", count: allRecords.filter(r => r.type === "transfers").length, color: "border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-950/20", icon: ArrowLeftRight },
              { label: "System Admins", count: systemUsers.length, color: "border-[#00a8cc] text-[#00a8cc] bg-cyan-50/20 dark:bg-cyan-950/20", icon: Shield }
            ].map((kpi, i) => {
              const Icon = kpi.icon;
              return (
                <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between hover:shadow-md transition duration-200">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{kpi.label}</span>
                    <h3 className="text-2xl font-extrabold text-slate-950 dark:text-slate-100">{kpi.count}</h3>
                  </div>
                  <div className={`p-2.5 rounded-lg border ${kpi.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recharts Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
            {/* Left Chart: Region distribution */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-sans">National EMIS Registration by Region</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Live dataset cross-tabulation across geographic regions of Botswana</p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded">
                  <Activity className="h-3 w-3 text-emerald-500" />
                  Realtime MySQL
                </div>
              </div>
              
              <div className="h-72 w-full text-xs">
                {allRecords.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500">
                    No registry data available to generate charts.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={["South", "Central", "North", "West"].map(reg => ({
                        name: reg,
                        Students: allRecords.filter(r => r.region === reg && r.type === "students").length,
                        Teachers: allRecords.filter(r => r.region === reg && r.type === "teachers").length,
                        Dropouts: allRecords.filter(r => r.region === reg && r.type === "dropouts").length,
                        Transfers: allRecords.filter(r => r.region === reg && r.type === "transfers").length,
                      }))}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === "light" ? "#f1f5f9" : "#1e293b"} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", color: "#fff", border: "none" }}
                        labelStyle={{ fontWeight: "bold" }}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      <Bar dataKey="Students" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Teachers" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Dropouts" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Transfers" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Right Chart: Dropout reasons */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-sans">Dropout Proportional Reasons</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Breakdown of tracked academic dropouts</p>
                </div>
              </div>

              <div className="h-72 w-full flex flex-col justify-between text-xs">
                {allRecords.filter(r => r.type === "dropouts").length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500">
                    No dropout records found to analyze.
                  </div>
                ) : (
                  <>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={["Financial", "Relocation", "Health", "Academic", "Employment"].map(reason => {
                              const count = allRecords.filter(r => r.type === "dropouts" && r.record_data?.reason === reason).length;
                              return { name: reason, value: count };
                            }).filter(item => item.value > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {[
                              { name: "Financial", color: "#f43f5e" },
                              { name: "Relocation", color: "#3b82f6" },
                              { name: "Health", color: "#10b981" },
                              { name: "Academic", color: "#a855f7" },
                              { name: "Employment", color: "#f59e0b" }
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", color: "#fff", border: "none" }} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
                      {[
                        { name: "Financial Hardship", color: "bg-rose-500", key: "Financial" },
                        { name: "Family Relocation", color: "bg-blue-500", key: "Relocation" },
                        { name: "Medical / Health", color: "bg-emerald-500", key: "Health" },
                        { name: "Academic performance", color: "bg-purple-500", key: "Academic" },
                        { name: "Early Employment", color: "bg-amber-500", key: "Employment" }
                      ].map((reason, i) => {
                        const count = allRecords.filter(r => r.type === "dropouts" && r.record_data?.reason === reason.key).length;
                        const percentage = allRecords.filter(r => r.type === "dropouts").length > 0 
                          ? Math.round((count / allRecords.filter(r => r.type === "dropouts").length) * 100) 
                          : 0;
                        return (
                          <div key={i} className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-1.5">
                              <span className={`h-2.5 w-2.5 rounded-full ${reason.color}`}></span>
                              <span>{reason.name}</span>
                            </div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{count} ({percentage}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Recent Database Activity Feed */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-fadeIn transition-colors duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm font-sans">
                <Database className="h-4 w-4 text-slate-400" />
                Live Database Audit Feed: All Registered Records
              </h3>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                {allRecords.length} records in registries table
              </span>
            </div>

            {allRecordsLoading ? (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center gap-2">
                <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
                <span className="text-xs">Querying registries across all tables...</span>
              </div>
            ) : allRecords.length === 0 ? (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                No database rows are registered yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800/80">
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider">School & Region</th>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider">Details</th>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider">Date Registered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {allRecords.slice(0, 8).map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            record.type === "students" ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40" :
                            record.type === "teachers" ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40" :
                            record.type === "dropouts" ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40" :
                            "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40"
                          }`}>
                            {record.type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 block">{record.school_name}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">{record.region} Region</span>
                        </td>
                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                          {record.type === "students" && (
                            <span>Student: <b className="text-slate-900 dark:text-slate-100">{record.record_data.student_name}</b> • Age: {record.record_data.age} • Grade: {record.record_data.grade}</span>
                          )}
                          {record.type === "teachers" && (
                            <span>Teacher: <b className="text-slate-900 dark:text-slate-100">{record.record_data.teacher_name}</b> • Subject: {record.record_data.subject}</span>
                          )}
                          {record.type === "dropouts" && (
                            <span>Student: <b className="text-slate-900 dark:text-slate-100">{record.record_data.student_name}</b> • Reason: <b className="text-rose-600 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-400 px-1">{record.record_data.reason}</b></span>
                          )}
                          {record.type === "transfers" && (
                            <span>Student: <b className="text-slate-900 dark:text-slate-100">{record.record_data.student_name}</b> • Destination: {record.record_data.destination_school}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {record.created_at}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fadeIn">
          {/* Left panel: Create System User Form */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
              <div className="flex items-center gap-2 mb-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Key className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Provision Administrator</h3>
              </div>
              
              <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-700"
                    placeholder="e.g. Neo Moroka"
                    value={newUserForm.full_name}
                    onChange={(e) => setNewUserForm({ ...newUserForm, full_name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-700"
                    placeholder="e.g. neomoroka"
                    value={newUserForm.username}
                    onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-700"
                    placeholder="e.g. nmoroka@gov.bw"
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Initial Password</label>
                  <input
                    type="password"
                    required
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-700"
                    placeholder="••••••••"
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">System Role</label>
                    <div className="flex items-center gap-1.5">
                      <select
                        className="w-full px-2.5 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-700 cursor-pointer"
                        value={newUserForm.role}
                        onChange={(e) => {
                          if (e.target.value === "__NEW_ROLE__") {
                            setCustomRoleCode("");
                            setCustomRoleName("");
                            setCustomRolePerms([]);
                            setCustomRoleCallback(() => (newRoleCode: string) => {
                              setNewUserForm((prev) => ({ ...prev, role: newRoleCode }));
                            });
                            setIsCustomRoleModalOpen(true);
                          } else {
                            setNewUserForm({ ...newUserForm, role: e.target.value });
                          }
                        }}
                      >
                        {availableRoles.map((role) => (
                          <option key={role} value={role}>
                            {formatRoleLabel(role)}
                          </option>
                        ))}
                        <option value="__NEW_ROLE__">+ Add Custom Role...</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const currentRole = newUserForm.role;
                          setCustomRoleCode(currentRole);
                          setCustomRoleName(formatRoleLabel(currentRole));
                          setCustomRolePerms(rolePermissions[currentRole] || []);
                          setCustomRoleCallback(() => (newRoleCode: string) => {
                            setNewUserForm((prev) => ({ ...prev, role: newRoleCode }));
                          });
                          setIsCustomRoleModalOpen(true);
                        }}
                        className="p-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg cursor-pointer flex items-center justify-center shrink-0"
                        title="Configure Permissions"
                      >
                        <Shield className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Assigned Region</label>
                    <select
                      className="w-full px-2.5 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-700 cursor-pointer"
                      value={newUserForm.region}
                      onChange={(e) => setNewUserForm({ ...newUserForm, region: e.target.value })}
                    >
                      <option value="All">All Regions</option>
                      {availableRegions.map((region) => (
                        <option key={region} value={region}>
                          {region}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={userSubmitting}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition text-xs flex justify-center items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  {userSubmitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Provisioning...
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-3.5 w-3.5" />
                      Provision Account
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right panel: Users list and Quick Actions */}
          <div className="lg:col-span-3 space-y-4 text-xs animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors duration-200">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search administrative accounts..."
                  className="w-full pl-9 pr-4 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-700"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                />
              </div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Total System Accounts: <span className="text-slate-950 dark:text-slate-100 font-bold">{systemUsers.length}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-200">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex justify-between items-center">
                <h3 className="font-semibold text-slate-950 dark:text-slate-100 flex items-center gap-2 text-sm font-sans">
                  <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  Credentials & Administrative Access Control
                </h3>
              </div>

              {usersLoading ? (
                <div className="py-16 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
                  <span className="text-xs">Querying system access list...</span>
                </div>
              ) : systemUsers.length === 0 ? (
                <div className="py-16 text-center text-slate-500 dark:text-slate-400">
                  No system administrative accounts found.
                </div>
              ) : (
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800/80">
                        <th className="px-6 py-3 font-semibold uppercase tracking-wider">Account Operator</th>
                        <th className="px-6 py-3 font-semibold uppercase tracking-wider">Role & Region</th>
                        <th className="px-6 py-3 font-semibold uppercase tracking-wider">Login Timestamp</th>
                        <th className="px-6 py-3 font-semibold uppercase tracking-wider">Status Control</th>
                        <th className="px-6 py-3 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {systemUsers
                        .filter(u => 
                          u.full_name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                          u.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                          u.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                          u.role.toLowerCase().includes(userSearchTerm.toLowerCase())
                        )
                        .map((sysUser) => {
                          const isSelf = sysUser.username === user?.username;
                          return (
                            <tr key={sysUser.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
                                    {sysUser.full_name.charAt(0)}
                                  </div>
                                  <div>
                                    <span className="font-semibold text-slate-950 dark:text-slate-100 block">{sysUser.full_name} {isSelf && <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.2 rounded-full border border-indigo-100 dark:border-indigo-900/40">You</span>}</span>
                                    <span className="text-slate-500 dark:text-slate-400 text-[10px]">{sysUser.email} • @{sysUser.username}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1.5">
                                    <select
                                      value={sysUser.role}
                                      disabled={sysUser.username === "super_admin"}
                                      onChange={(e) => {
                                        if (e.target.value === "__NEW_ROLE__") {
                                          setCustomRoleCode("");
                                          setCustomRoleName("");
                                          setCustomRolePerms([]);
                                          setCustomRoleCallback(() => (newRoleCode: string) => {
                                            handleUpdateUserRoleRegion(sysUser.id, { role: newRoleCode });
                                          });
                                          setIsCustomRoleModalOpen(true);
                                        } else {
                                          handleUpdateUserRoleRegion(sysUser.id, { role: e.target.value });
                                        }
                                      }}
                                      className="bg-transparent dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-1.5 py-0.5 font-semibold text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-700 focus:outline-none focus:border-slate-300 dark:focus:border-slate-700 cursor-pointer text-[11px]"
                                    >
                                      {availableRoles.map((role) => (
                                        <option key={role} value={role}>
                                          {formatRoleLabel(role)}
                                        </option>
                                      ))}
                                      <option value="__NEW_ROLE__">+ Add New Role...</option>
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const currentRole = sysUser.role;
                                        setCustomRoleCode(currentRole);
                                        setCustomRoleName(formatRoleLabel(currentRole));
                                        setCustomRolePerms(rolePermissions[currentRole] || []);
                                        setCustomRoleCallback(() => (newRoleCode: string) => {
                                          fetchSystemUsers();
                                        });
                                        setIsCustomRoleModalOpen(true);
                                      }}
                                      disabled={sysUser.username === "super_admin"}
                                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent"
                                      title="Configure Role Permissions"
                                    >
                                      <Shield className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                  <div className="flex flex-wrap gap-1 max-w-[220px] my-1">
                                    {(rolePermissions[sysUser.role] || []).map((p: string) => {
                                      const label = p.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
                                      return (
                                        <span key={p} className="text-[9px] font-medium bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100/30 dark:border-indigo-900/30 px-1 rounded-sm">
                                          {label}
                                        </span>
                                      );
                                    })}
                                    {(!rolePermissions[sysUser.role] || rolePermissions[sysUser.role].length === 0) && (
                                      <span className="text-[9px] text-slate-400 italic">No permissions assigned</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-[10px]">
                                    <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                                    <select
                                      value={sysUser.region}
                                      disabled={sysUser.username === "super_admin"}
                                      onChange={(e) => handleUpdateUserRoleRegion(sysUser.id, { region: e.target.value })}
                                      className="bg-transparent dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-1 py-0.1 focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-700 focus:outline-none focus:border-slate-300 dark:focus:border-slate-700 cursor-pointer"
                                    >
                                      <option value="All">All Regions</option>
                                      {availableRegions.map((region) => (
                                        <option key={region} value={region}>
                                          {region} Region
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                                  {sysUser.last_login || "Never accessed"}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <button
                                  onClick={() => handleToggleUserStatus(sysUser.id, sysUser.status)}
                                  disabled={sysUser.username === "super_admin"}
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition flex items-center gap-1 cursor-pointer ${
                                    sysUser.status === "Active" 
                                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/60"
                                      : "bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800"
                                  }`}
                                >
                                  {sysUser.status === "Active" ? (
                                    <>
                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                      Active
                                    </>
                                  ) : (
                                    <>
                                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                                      Suspended
                                    </>
                                  )}
                                </button>
                              </td>
                              <td className="px-6 py-4 text-right whitespace-nowrap">
                                <button
                                  onClick={() => handleDeleteUser(sysUser.id, sysUser.username)}
                                  disabled={sysUser.username === "super_admin"}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded transition disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                                  title={sysUser.username === "super_admin" ? "Protected System Account" : "Remove Account"}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {/* Configure Custom Role & Permissions Modal */}
      {isCustomRoleModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Role & Permissions Manager
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Configure operational rights and scopes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomRoleModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomRole} className="space-y-4">
              {/* If it's a built-in role, warn the user */}
              {["super_admin", "region_admin", "subregion_admin", "school_head"].includes(customRoleCode) ? (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-lg flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-normal">
                    <strong>System Built-in Role:</strong> You are customizing the permissions for <strong>{customRoleName}</strong>. This modification will apply to all operators holding this role.
                  </p>
                </div>
              ) : null}

              {/* Role Identifiers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Role System ID (Code)
                  </label>
                  <input
                    type="text"
                    required
                    disabled={["super_admin", "region_admin", "subregion_admin", "school_head"].includes(customRoleCode) && customRoleCode !== ""}
                    placeholder="e.g. inspector"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 disabled:opacity-60 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={customRoleCode}
                    onChange={(e) => setCustomRoleCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Role Display Title
                  </label>
                  <input
                    type="text"
                    required
                    disabled={["super_admin", "region_admin", "subregion_admin", "school_head"].includes(customRoleCode) && customRoleCode !== ""}
                    placeholder="e.g. System Inspector"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 disabled:opacity-60 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={customRoleName}
                    onChange={(e) => setCustomRoleName(e.target.value)}
                  />
                </div>
              </div>

              {/* Permissions Checklists */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Assign System Permissions
                </label>
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 border border-slate-100 dark:border-slate-800/80 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-950/40">
                  {/* Category: School Registries */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                      School Registries Operations
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { id: "read_registries", name: "Read Registries", desc: "View rosters, national stats, and general dashboards" },
                        { id: "write_registries", name: "Write Registries", desc: "Submit, amend, and delete school record cards" },
                        { id: "approve_registries", name: "Approve Registries", desc: "Officially verify and freeze collected EMIS data" },
                        { id: "export_reports", name: "Export Reports", desc: "Export statistical compilations to Excel / PDF" }
                      ].map((perm) => (
                        <label key={perm.id} className="flex items-start gap-2.5 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition cursor-pointer">
                          <input
                            type="checkbox"
                            className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
                            checked={customRolePerms.includes(perm.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCustomRolePerms((prev) => [...prev, perm.id]);
                              } else {
                                setCustomRolePerms((prev) => prev.filter(x => x !== perm.id));
                              }
                            }}
                          />
                          <div>
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">{perm.name}</span>
                            <span className="text-[10px] text-slate-400 leading-snug block">{perm.desc}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Category: Administrative Controls */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                      Administrative Governance
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { id: "manage_users", name: "Manage Administrative Operators", desc: "Provision, lock, or erase system user accounts" },
                        { id: "assign_roles", name: "Configure Roles & Scopes", desc: "Assign custom roles and security region perimeters" },
                        { id: "configure_system", name: "Manage Integrations & DB", desc: "Access primary DB setups and schema sync scripts" },
                        { id: "force_sync", name: "Initiate Synchronization Tasks", desc: "Force complete table rebuilds & external fetches" }
                      ].map((perm) => (
                        <label key={perm.id} className="flex items-start gap-2.5 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition cursor-pointer">
                          <input
                            type="checkbox"
                            className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
                            checked={customRolePerms.includes(perm.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCustomRolePerms((prev) => [...prev, perm.id]);
                              } else {
                                setCustomRolePerms((prev) => prev.filter(x => x !== perm.id));
                              }
                            }}
                          />
                          <div>
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">{perm.name}</span>
                            <span className="text-[10px] text-slate-400 leading-snug block">{perm.desc}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Handlers */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCustomRoleModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-950 font-semibold rounded-xl text-xs shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle className="h-4 w-4" />
                  Save Configurations
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
