"use client";

import React, { useState, useEffect, useCallback } from "react";
import UsersTable from "@/components/UsersTable";
import {
  SuperAdminOverview,
  SuperAdminInsights,
  SuperAdminConfig,
  SuperAdminData,
  SuperAdminReference,
  SuperAdminAcademic,
  SuperAdminRegions,
  SuperAdminSecurity,
  SuperAdminHealth
} from "@/components/SuperAdminTabs";
import { 
  Database, 
  RefreshCw, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  User, 
  LogOut, 
  Users, 
  GraduationCap, 
  ArrowLeftRight, 
  UserMinus, 
  Search, 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  ArrowLeft, 
  Check, 
  ShieldCheck, 
  Activity, 
  ActivitySquare, 
  Settings, 
  Sun, 
  Moon, 
  FileText, 
  Map, 
  ShieldAlert, 
  AlertCircle
} from "lucide-react";
import { Logo } from "@/components/Logo";
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
  const [superTab, setSuperTab] = useState<"insights" | "users" | "config" | "data" | "reference" | "academic" | "regions" | "security" | "health">("insights");
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Dynamic user roles list managed from database entries
  const [availableRoles, setAvailableRoles] = useState<string[]>([
    "super_admin",
    "emis_admin",
    "region_admin",
    "subregion_admin",
    "school_head",
    "data_entry_clerk",
    "education_officer",
    "report_viewer",
    "school_admin"
  ]);

  // Role Permissions State Management (Initialized with database defaults, synced dynamically)
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({
    super_admin: ["view_all_schools", "manage_all_schools", "view_region_schools", "manage_region_schools", "view_subregion_schools", "manage_subregion_schools", "view_own_school", "manage_own_school", "view_students", "manage_students", "view_staff", "manage_staff", "view_inventory", "manage_inventory", "view_reports", "manage_users", "view_audit_log", "manage_policies"],
    emis_admin: ["view_all_schools", "manage_all_schools", "view_region_schools", "manage_region_schools", "view_subregion_schools", "manage_subregion_schools", "view_own_school", "manage_own_school", "view_students", "manage_students", "view_staff", "manage_staff", "view_inventory", "manage_inventory", "view_reports", "manage_users", "manage_policies"],
    region_admin: ["view_region_schools", "manage_region_schools", "view_students", "manage_students", "view_staff", "manage_staff", "view_inventory", "manage_inventory", "view_reports"],
    subregion_admin: ["view_subregion_schools", "manage_subregion_schools", "view_students", "manage_students", "view_staff", "manage_staff", "view_inventory", "manage_inventory"],
    school_head: ["view_own_school", "manage_own_school", "view_students", "manage_students", "view_staff", "manage_staff", "view_inventory", "manage_inventory"],
    school_admin: ["view_own_school", "view_students", "manage_students", "view_staff", "manage_staff", "view_inventory", "view_reports"]
  });

  const isAdministrator = user?.role === "super_admin" || user?.role === "emis_admin";

  const adminTabs = React.useMemo(() => {
    if (!user) return [];
    const baseTabs = [
      { id: "insights", label: "National EMIS Insights", icon: Activity },
      { id: "users", label: "User & Access Management", icon: Users },
      { id: "config", label: "System Configuration", icon: Settings },
      { id: "data", label: "Data Management", icon: Database },
      { id: "reference", label: "Reference Data Management", icon: FileText },
      { id: "academic", label: "Academic Management", icon: GraduationCap },
      { id: "regions", label: "School & Region Management", icon: Map },
      { id: "security", label: "Security & Monitoring", icon: ShieldAlert },
      { id: "health", label: "System Health", icon: ActivitySquare }
    ];
    if (user.role === "super_admin") {
      return baseTabs;
    } else if (user.role === "emis_admin") {
      // Remove "data" (Data Management) tab for EMIS Admin
      return baseTabs.filter(tab => tab.id !== "data");
    }
    return [];
  }, [user]);

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
        
        // Extract distinct roles from database users and merge with existing available roles
        const dbRoles = fetchedUsers.map((u: any) => u.role).filter(Boolean);
        setAvailableRoles((prev) => Array.from(new Set([...prev, ...dbRoles])));

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

  // Fetch role permissions from DB
  const fetchRolePermissions = useCallback(async () => {
    if (dbStatus !== "online") return;
    try {
      const res = await fetch("/api/roles");
      if (res.ok) {
        const data = await res.json();
        if (data.role_permissions) {
          setRolePermissions(data.role_permissions);
        }
        if (data.roles) {
          setAvailableRoles(data.roles);
        }
      }
    } catch (e) {
      console.error("Error fetching role permissions:", e);
    }
  }, [dbStatus]);

  // Tab access control/redirection for EMIS system administrator
  useEffect(() => {
    if (user && isAdministrator) {
      const allowedTabIds = adminTabs.map(t => t.id);
      if (!allowedTabIds.includes(superTab as any)) {
        setSuperTab(allowedTabIds[0] as any);
      }
    }
  }, [user, isAdministrator, adminTabs, superTab]);

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
        // Always save user session to prevent unexpected logouts
        localStorage.setItem("edu_vision_remembered_user", JSON.stringify(data.user));
        
        if (rememberMe) {
          localStorage.setItem("edu_vision_remembered_username", authForm.username);
          localStorage.setItem("edu_vision_remember", "true");
        } else {
          localStorage.removeItem("edu_vision_remembered_username");
          localStorage.removeItem("edu_vision_remember");
        }
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
      } else {
        alert("Failed to delete record.");
      }
    } catch (e) {
      alert("Network error while deleting from database.");
    }
  };

  // Load remembered user session & preference on initial mount
  useEffect(() => {
    // 1. Always load active session if it exists to prevent automatic logout on reload/refresh
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

    // 2. Load "Remember Me" preferences & username
    const savedRemember = localStorage.getItem("edu_vision_remember");
    if (savedRemember === "true") {
      setRememberMe(true);
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
      if (isAdministrator) {
        fetchSystemUsers();
      }
      fetchRolePermissions();
    }
  }, [activeTab, dbStatus, user, fetchRecords, fetchSystemUsers, fetchRolePermissions, isAdministrator]);

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
      <div className="flex-1 min-h-screen bg-slate-50 dark:bg-[#070D1F] flex items-center justify-center transition-colors duration-300">
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
        className="relative min-h-screen flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8 bg-slate-50 dark:bg-[#070D1F] text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-300"
      >
        {/* Floating Theme Toggle */}
        <button
          onClick={toggleDarkMode}
          className="absolute top-4 right-4 z-50 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-slate-700 dark:text-slate-300 shadow-sm hover:shadow-md transition duration-200 flex items-center justify-center cursor-pointer"
          title="Toggle Theme"
          id="theme-toggle-login"
        >
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>

        {/* Interactive Mouse Spotlight / Follow Background Animation */}
        <motion.div
          className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(0, 168, 204, 0.12), transparent 80%)`,
          }}
          animate={{
            opacity: isHoveringBg ? 1 : 0,
          }}
        />

        {/* Glowing bubble that follows mouse */}
        <motion.div
          className="absolute pointer-events-none rounded-full bg-cyan-400/5 blur-3xl w-80 h-80 -translate-x-1/2 -translate-y-1/2 z-0"
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

        {/* Login Card */}
        <div className="relative z-10 w-full max-w-md bg-white dark:bg-[#0D1B3E]/85 dark:backdrop-blur-md rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.1),_0_0_0_1px_rgba(0,0,0,0.04)] border border-slate-200/60 dark:border-[#1E2F5F] p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_35px_80px_-15px_rgba(0,0,0,0.15),_0_0_0_1px_rgba(0,0,0,0.05)] ring-8 ring-slate-100/40 dark:ring-slate-950/10">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="mb-4 flex justify-center">
              <Logo size={80} className="drop-shadow-sm" />
            </div>
            
            <h2 className="text-2xl font-extrabold tracking-tight font-sans">
              <span className="text-[#0a192f] dark:text-slate-100">EDU-</span>
              <span className="text-[#00a8cc]">VISION</span>
              <span className="text-[#0a192f] dark:text-slate-100"> EMIS</span>
            </h2>
            
            <p className="text-xs font-semibold text-slate-500/90 dark:text-slate-400 mt-2 leading-relaxed">
              Botswana Educational Management Indicators System
            </p>
          </div>

          {!showForgotPassword ? (
            <div key="login-form">
              {authError && (
                <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-lg flex gap-2 items-center text-xs text-rose-600 dark:text-rose-400 font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-gray-300 uppercase tracking-wider mb-1">Username or Email</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                      <User className="h-4 w-4" />
                    </span>
                    <input 
                      type="text"
                      required
                      disabled={authLoading}
                      className="w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-[#1E2E5D] dark:bg-[#111C3A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00a8cc] focus:border-[#00a8cc] disabled:bg-slate-50 disabled:text-slate-400 text-sm transition dark:text-slate-100"
                      placeholder="e.g. super_admin"
                      value={authForm.username}
                      onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(true);
                        setForgotPasswordSuccess(false);
                        setForgotPasswordError("");
                        setForgotPasswordEmail("");
                      }}
                      className="text-xs font-bold text-[#00a8cc] hover:text-[#0077b6] transition"
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
                      className="w-full pl-10 pr-10 py-2 border border-slate-200 dark:border-[#1E2E5D] dark:bg-[#111C3A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00a8cc] focus:border-[#00a8cc] disabled:bg-slate-50 disabled:text-slate-400 text-sm transition dark:text-slate-100"
                      placeholder="••••••••"
                      value={authForm.password}
                      onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-650 dark:hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    id="remember_me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-[#00a8cc] focus:ring-[#00a8cc] border-slate-350 dark:border-slate-700 dark:bg-[#111C3A] rounded cursor-pointer"
                  />
                  <label htmlFor="remember_me" className="ml-2 block text-xs text-slate-600 dark:text-slate-300 font-medium cursor-pointer select-none">
                    Remember my credentials
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-850 dark:bg-[#00B4D8] dark:hover:bg-[#0077B6] text-white font-bold rounded-lg transition text-sm disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
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
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition font-medium cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Sign In
                </button>
              </div>

              <h3 className="text-base font-bold text-slate-950 dark:text-slate-100 mb-1">Reset Password</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                Enter your registered administrator email address below. We will simulate sending a password reset request code.
              </p>

              {forgotPasswordSuccess ? (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-lg text-center">
                  <div className="inline-flex items-center justify-center p-2 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full mb-3">
                    <Check className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-950 dark:text-slate-100 mb-1">Reset Code Dispatched</h4>
                  <p className="text-xs text-slate-650 dark:text-slate-450 leading-relaxed mb-4">
                    A password recovery link has been simulated & dispatched to <span className="font-semibold">{forgotPasswordEmail}</span>.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotPasswordSuccess(false);
                    }}
                    className="w-full py-2 bg-slate-950 hover:bg-slate-800 dark:bg-[#111C3A] dark:hover:bg-[#1e2f5d] text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                  >
                    Done, return to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  {forgotPasswordError && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-lg flex gap-2 items-center text-xs text-rose-600 dark:text-rose-400 font-medium">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{forgotPasswordError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-gray-300 uppercase tracking-wider mb-1">Email Address</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                        <Mail className="h-4 w-4" />
                      </span>
                      <input 
                        type="email"
                        required
                        disabled={forgotPasswordLoading}
                        className="w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-[#1E2E5D] dark:bg-[#111C3A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00a8cc] focus:border-[#00a8cc] disabled:bg-slate-50 disabled:text-slate-400 text-sm transition dark:text-slate-100"
                        placeholder="e.g. admin@gov.bw"
                        value={forgotPasswordEmail}
                        onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={forgotPasswordLoading}
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-850 dark:bg-[#00B4D8] dark:hover:bg-[#0077B6] text-white font-bold rounded-lg transition text-sm disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 cursor-pointer"
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
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 dark:bg-[#070D1F] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Top Bar Header */}
      <header className="bg-white dark:bg-[#0D1B3E] border-b border-slate-200 dark:border-[#1E2F5F] px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors duration-300">
        <div className="flex items-center gap-4">
          <div className="relative p-0.5 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm shrink-0">
            <Logo size={44} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex flex-wrap items-center gap-x-1.5 font-sans">
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
              <span className="font-semibold block text-slate-850 dark:text-slate-200">{user.full_name}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">{user.role.replace(/_/g, " ")} ({user.region} Region)</span>
            </div>
          </div>

          <button
            onClick={toggleDarkMode}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
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
      <div className="bg-slate-900 dark:bg-slate-950 text-white px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-850">
        <div className="flex items-center gap-2 text-xs font-sans">
          <Database className={`h-4 w-4 ${dbStatus === 'online' ? 'text-emerald-400' : 'text-rose-400 animate-pulse'}`} />
          <span className="text-slate-300 font-medium">
            {dbStatus === 'online' ? 'EMIS Database Sync Connected (Aiven Cloud)' : 'EMIS Database Disconnected'}
          </span>
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

      {/* Administrative Tab Selector */}
      {isAdministrator && (
        <div className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-850 px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 transition-colors duration-300">
          <div className="flex flex-wrap gap-1.5">
            {adminTabs.map((tab) => {
              const Icon = tab.icon;
              const isSelected = superTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSuperTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    isSelected
                      ? "bg-slate-900 dark:bg-slate-850 text-white shadow-sm"
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
            {user.role === "super_admin" ? "Active Super Admin Session" : "Active EMIS Admin Session"}
          </div>
        </div>
      )}

      {/* Primary Dashboard Content Area */}
      {!isAdministrator ? (
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Navigation / Registry Selection sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
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
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition cursor-pointer ${
                        isSelected 
                          ? "bg-slate-900 dark:bg-slate-800 text-white shadow" 
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Quick Metrics */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs transition-colors duration-300">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Registry Summary</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Active Registry</span>
                  <span className="font-bold capitalize">{activeTab}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Records Loaded</span>
                  <span className="font-bold">{records.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Active Region Filter</span>
                  <span className="font-bold">{regionFilter}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main List Area */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 transition-colors duration-300">
              
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={`Search ${activeTab}...`}
                    className="w-full pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#00a8cc] focus:border-[#00a8cc] text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="flex items-center gap-2">
                  {user.region === "All" && (
                    <select
                      value={regionFilter}
                      onChange={(e) => setRegionFilter(e.target.value)}
                      className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#00a8cc] dark:text-slate-200"
                    >
                      <option value="All">All Regions</option>
                      {availableRegions.map((reg) => (
                        <option key={reg} value={reg}>{reg}</option>
                      ))}
                    </select>
                  )}

                  <button
                    onClick={() => {
                      setFormFields({
                        school_name: user.region === "All" ? "" : "Mogoditshane Secondary",
                        region: user.region === "All" ? "South" : user.region,
                      });
                      setIsAdding(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-[#00B4D8] dark:hover:bg-[#0077B6] text-white text-xs font-bold rounded-lg transition shadow-sm cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Record
                  </button>
                </div>
              </div>

              {/* Add form overlay / view */}
              {isAdding && (
                <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-extrabold capitalize dark:text-slate-100">Add New {activeTab.slice(0, -1)} Record</h3>
                    <button 
                      onClick={() => setIsAdding(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                  
                  <form onSubmit={handleAddRecord} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">School Name</label>
                        <input
                          type="text"
                          required
                          value={formFields.school_name || ""}
                          onChange={(e) => setFormFields({ ...formFields, school_name: e.target.value })}
                          placeholder="e.g. Mogoditshane Secondary"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Region</label>
                        <select
                          value={formFields.region || ""}
                          onChange={(e) => setFormFields({ ...formFields, region: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none dark:text-white"
                        >
                          {availableRegions.map(reg => (
                            <option key={reg} value={reg}>{reg}</option>
                          ))}
                        </select>
                      </div>

                      {/* Dynamic inputs based on activeTab */}
                      {activeTab === "students" && (
                        <>
                          <div>
                            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Student Full Name</label>
                            <input
                              type="text"
                              required
                              placeholder="John Doe"
                              value={formFields.full_name || ""}
                              onChange={(e) => setFormFields({ ...formFields, full_name: e.target.value })}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Age</label>
                            <input
                              type="number"
                              required
                              placeholder="15"
                              value={formFields.age || ""}
                              onChange={(e) => setFormFields({ ...formFields, age: e.target.value })}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Gender</label>
                            <select
                              value={formFields.gender || "Male"}
                              onChange={(e) => setFormFields({ ...formFields, gender: e.target.value })}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none dark:text-white"
                            >
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                            </select>
                          </div>
                          <div>
                            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Grade / Standard</label>
                            <input
                              type="text"
                              required
                              placeholder="Form 3"
                              value={formFields.grade || ""}
                              onChange={(e) => setFormFields({ ...formFields, grade: e.target.value })}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Parent Contact</label>
                            <input
                              type="text"
                              required
                              placeholder="+267 71234567"
                              value={formFields.parent_contact || ""}
                              onChange={(e) => setFormFields({ ...formFields, parent_contact: e.target.value })}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none dark:text-white"
                            />
                          </div>
                        </>
                      )}

                      {activeTab === "teachers" && (
                        <>
                          <div>
                            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Teacher Full Name</label>
                            <input
                              type="text"
                              required
                              placeholder="Mrs. Sarah Gaseitsewe"
                              value={formFields.full_name || ""}
                              onChange={(e) => setFormFields({ ...formFields, full_name: e.target.value })}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Qualification</label>
                            <input
                              type="text"
                              required
                              placeholder="B.Ed Mathematics"
                              value={formFields.qualification || ""}
                              onChange={(e) => setFormFields({ ...formFields, qualification: e.target.value })}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Subject</label>
                            <input
                              type="text"
                              required
                              placeholder="Mathematics"
                              value={formFields.subject || ""}
                              onChange={(e) => setFormFields({ ...formFields, subject: e.target.value })}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Experience (Years)</label>
                            <input
                              type="number"
                              required
                              placeholder="8"
                              value={formFields.years_of_experience || ""}
                              onChange={(e) => setFormFields({ ...formFields, years_of_experience: e.target.value })}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Phone Number</label>
                            <input
                              type="text"
                              required
                              placeholder="+267 72345678"
                              value={formFields.phone_number || ""}
                              onChange={(e) => setFormFields({ ...formFields, phone_number: e.target.value })}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none dark:text-white"
                            />
                          </div>
                        </>
                      )}

                      {activeTab === "dropouts" && (
                        <>
                          <div>
                            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Student Full Name</label>
                            <input
                              type="text"
                              required
                              placeholder="Kabo Smith"
                              value={formFields.full_name || ""}
                              onChange={(e) => setFormFields({ ...formFields, full_name: e.target.value })}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Grade</label>
                            <input
                              type="text"
                              required
                              placeholder="Form 2"
                              value={formFields.grade || ""}
                              onChange={(e) => setFormFields({ ...formFields, grade: e.target.value })}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Dropout Date</label>
                            <input
                              type="date"
                              required
                              value={formFields.dropout_date || ""}
                              onChange={(e) => setFormFields({ ...formFields, dropout_date: e.target.value })}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Reason</label>
                            <select
                              value={formFields.reason || "Relocation"}
                              onChange={(e) => setFormFields({ ...formFields, reason: e.target.value })}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none dark:text-white"
                            >
                              <option value="Relocation">Family Relocation</option>
                              <option value="Financial">Financial Hardship</option>
                              <option value="Academic">Academic Difficulty</option>
                              <option value="Health">Health Issues</option>
                              <option value="Other">Other Reason</option>
                            </select>
                          </div>
                        </>
                      )}

                      {activeTab === "transfers" && (
                        <>
                          <div>
                            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Student Full Name</label>
                            <input
                              type="text"
                              required
                              placeholder="Neo Mokgware"
                              value={formFields.full_name || ""}
                              onChange={(e) => setFormFields({ ...formFields, full_name: e.target.value })}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Destination School</label>
                            <input
                              type="text"
                              required
                              placeholder="Gaborone Senior Secondary"
                              value={formFields.destination_school || ""}
                              onChange={(e) => setFormFields({ ...formFields, destination_school: e.target.value })}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Grade</label>
                            <input
                              type="text"
                              required
                              placeholder="Form 4"
                              value={formFields.grade || ""}
                              onChange={(e) => setFormFields({ ...formFields, grade: e.target.value })}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Transfer Reason</label>
                            <input
                              type="text"
                              required
                              placeholder="Closer to family"
                              value={formFields.transfer_reason || ""}
                              onChange={(e) => setFormFields({ ...formFields, transfer_reason: e.target.value })}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none dark:text-white"
                            />
                          </div>
                        </>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-850 dark:bg-[#00B4D8] dark:hover:bg-[#0077B6] text-white font-bold rounded-lg transition text-xs cursor-pointer"
                    >
                      {submitting ? "Submitting record..." : "Submit to Database"}
                    </button>
                  </form>
                </div>
              )}

              {/* Records Table View */}
              <div className="overflow-x-auto">
                {recordsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <RefreshCw className="h-6 w-6 animate-spin text-[#00a8cc]" />
                    <span className="text-xs text-slate-500 font-medium">Retrieving registry records...</span>
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    <AlertTriangle className="h-8 w-8 mx-auto text-slate-400 mb-3" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No records found</p>
                    <p className="text-xs text-slate-500 mt-1">There are no records in this category matching the query filters.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-bold tracking-wider">
                        <th className="py-3 px-4">School</th>
                        <th className="py-3 px-4">Region</th>
                        {activeTab === "students" && (
                          <>
                            <th className="py-3 px-4">Name</th>
                            <th className="py-3 px-4">Age / Gender</th>
                            <th className="py-3 px-4">Grade</th>
                            <th className="py-3 px-4">Contact</th>
                          </>
                        )}
                        {activeTab === "teachers" && (
                          <>
                            <th className="py-3 px-4">Name</th>
                            <th className="py-3 px-4">Qualification</th>
                            <th className="py-3 px-4">Subject</th>
                            <th className="py-3 px-4">Experience</th>
                          </>
                        )}
                        {activeTab === "dropouts" && (
                          <>
                            <th className="py-3 px-4">Student Name</th>
                            <th className="py-3 px-4">Grade</th>
                            <th className="py-3 px-4">Date</th>
                            <th className="py-3 px-4">Reason</th>
                          </>
                        )}
                        {activeTab === "transfers" && (
                          <>
                            <th className="py-3 px-4">Student Name</th>
                            <th className="py-3 px-4">Destination</th>
                            <th className="py-3 px-4">Grade</th>
                            <th className="py-3 px-4">Reason</th>
                          </>
                        )}
                        <th className="py-3 px-4">Created At</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                      {filteredRecords.map((record) => (
                        <tr key={record.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition">
                          <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">{record.school_name}</td>
                          <td className="py-3.5 px-4"><span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-medium">{record.region}</span></td>
                          
                          {activeTab === "students" && (
                            <>
                              <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">{record.record_data?.full_name || "N/A"}</td>
                              <td className="py-3.5 px-4">{record.record_data?.age || "N/A"} / {record.record_data?.gender || "N/A"}</td>
                              <td className="py-3.5 px-4">{record.record_data?.grade || "N/A"}</td>
                              <td className="py-3.5 px-4 text-slate-500 font-mono">{record.record_data?.parent_contact || "N/A"}</td>
                            </>
                          )}
                          {activeTab === "teachers" && (
                            <>
                              <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">{record.record_data?.full_name || "N/A"}</td>
                              <td className="py-3.5 px-4">{record.record_data?.qualification || "N/A"}</td>
                              <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">{record.record_data?.subject || "N/A"}</td>
                              <td className="py-3.5 px-4">{record.record_data?.years_of_experience ? `${record.record_data.years_of_experience} yrs` : "N/A"}</td>
                            </>
                          )}
                          {activeTab === "dropouts" && (
                            <>
                              <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">{record.record_data?.full_name || "N/A"}</td>
                              <td className="py-3.5 px-4">{record.record_data?.grade || "N/A"}</td>
                              <td className="py-3.5 px-4 text-slate-500 font-mono">{record.record_data?.dropout_date || "N/A"}</td>
                              <td className="py-3.5 px-4"><span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded font-medium">{record.record_data?.reason || "N/A"}</span></td>
                            </>
                          )}
                          {activeTab === "transfers" && (
                            <>
                              <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">{record.record_data?.full_name || "N/A"}</td>
                              <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">{record.record_data?.destination_school || "N/A"}</td>
                              <td className="py-3.5 px-4">{record.record_data?.grade || "N/A"}</td>
                              <td className="py-3.5 px-4 text-slate-500">{record.record_data?.transfer_reason || "N/A"}</td>
                            </>
                          )}

                          <td className="py-3.5 px-4 text-slate-500 font-mono text-[10px]">{record.created_at}</td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleDeleteRecord(record.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

            </div>
          </div>
        </main>
      ) : (
        /* Super Admin Tabs Display */
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
          {superTab === "insights" && (
            <div className="space-y-6">
              <SuperAdminOverview />
              <SuperAdminInsights />
            </div>
          )}

          {superTab === "users" && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <UsersTable 
                currentUser={user} 
                availableRegions={availableRegions} 
                availableRoles={availableRoles} 
                rolePermissions={rolePermissions} 
                onConfigureRole={() => setSuperTab("config")}
                onRefreshStats={() => checkDatabaseStatus(true)}
              />
            </div>
          )}

          {superTab === "config" && <SuperAdminConfig />}
          {superTab === "data" && user?.role === "super_admin" && <SuperAdminData />}
          {superTab === "reference" && <SuperAdminReference />}
          {superTab === "academic" && <SuperAdminAcademic />}
          {superTab === "regions" && <SuperAdminRegions />}
          {superTab === "security" && <SuperAdminSecurity />}
          {superTab === "health" && <SuperAdminHealth />}
        </main>
      )}

      {/* Persistent System Info Footer */}
      <footer className="mt-auto py-4 bg-white dark:bg-[#0D1B3E] border-t border-slate-200 dark:border-[#1E2F5F] text-center text-[10px] text-slate-400 font-mono">
        Botswana Educational Management Indicators System — Connected to Aiven MySQL Sandbox Database
      </footer>
    </div>
  );
}
