"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  ShieldCheck,
  User,
  Mail,
  Phone,
  MapPin,
  Clock,
  Trash2,
  Lock,
  Unlock,
  RefreshCw,
  Search,
  MoreVertical,
  Key,
  Download,
  Upload,
  Edit2,
  CheckCircle,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Settings,
  UserPlus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { usePermissions } from "@/hooks/usePermissions";

// Interfaces
interface UserRecord {
  id: number;
  username: string;
  email: string;
  full_name: string;
  phone_number?: string;
  role: string;
  role_display_name?: string;
  status: string;
  region: string;
  last_login?: string;
  created_at?: string;
  deleted_at?: string | null;
  permissions?: string[];
}

interface UsersTableProps {
  currentUser: { id: number; username: string; role: string } | null;
  availableRegions: string[];
  availableRoles: string[];
  rolePermissions: Record<string, string[]>;
  onConfigureRole: (roleName: string) => void;
  onRefreshStats?: () => void;
}

export default function UsersTable({
  currentUser,
  availableRegions,
  availableRoles,
  rolePermissions,
  onConfigureRole,
  onRefreshStats
}: UsersTableProps) {
  // Permissions hook
  const { hasPermission } = usePermissions(currentUser?.id);

  // Pagination & Filter States
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("username");
  const [sortOrder, setSortOrder] = useState("asc");

  // Selection states
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modals / Dialog states
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    type: "danger" | "warning" | "success" | "info";
  } | null>(null);

  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    user: UserRecord | null;
  }>({ isOpen: false, user: null });

  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [loadingEditPermissions, setLoadingEditPermissions] = useState(false);
  const [showPermissionsPanel, setShowPermissionsPanel] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (editModal.isOpen && editModal.user) {
      const fetchUserPerms = async () => {
        try {
          setLoadingEditPermissions(true);
          const res = await fetch(`/api/users/${editModal.user!.id}/permissions`);
          if (res.ok) {
            const data = await res.json();
            setEditPermissions(data.permissions || []);
          }
        } catch (err) {
          console.error("Failed to fetch user-specific permissions:", err);
        } finally {
          setLoadingEditPermissions(false);
        }
      };
      fetchUserPerms();
    } else {
      setEditPermissions([]);
      setShowPermissionsPanel(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editModal.isOpen, editModal.user?.id]);

  const [viewModal, setViewModal] = useState<{
    isOpen: boolean;
    user: UserRecord | null;
  }>({ isOpen: false, user: null });

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  // User Provisioning states
  const [provisionModalOpen, setProvisionModalOpen] = useState(false);
  const [provisionForm, setProvisionForm] = useState({
    username: "",
    email: "",
    full_name: "",
    role: "",
    region: "All",
    password: "",
    status: "Active"
  });
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [provisionSuccess, setProvisionSuccess] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [customRoleText, setCustomRoleText] = useState("");
  const [availablePermissions, setAvailablePermissions] = useState<{permission_id: number, permission_name: string, permission_description: string}[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (availableRoles.length > 0 && !provisionForm.role) {
      setProvisionForm(prev => ({
        ...prev,
        role: availableRoles.includes("school_admin") ? "school_admin" : availableRoles[0]
      }));
    }
  }, [availableRoles, provisionForm.role]);

  useEffect(() => {
    // Fetch available permissions
    const fetchPermissions = async () => {
      try {
        const res = await fetch("/api/permissions");
        if (res.ok) {
          const data = await res.json();
          setAvailablePermissions(data);
        }
      } catch (err) {
        console.error("Failed to fetch permissions:", err);
      }
    };
    fetchPermissions();
  }, []);

  // Active Dropdowns
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        role: roleFilter,
        status: statusFilter,
        sortBy,
        sortOrder
      });

      const res = await fetch(`/api/users?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
        setTotal(data.pagination?.total || 0);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    if (onRefreshStats) onRefreshStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, roleFilter, statusFilter, sortBy, sortOrder]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const pageUserIds = users
        .filter((u) => u.username !== "super_admin" && u.id !== currentUser?.id)
        .map((u) => u.id);
      setSelectedIds(pageUserIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectUser = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  // Helper: Trigger Confirmation
  const triggerConfirm = (
    title: string,
    description: string,
    type: "danger" | "warning" | "success" | "info",
    onConfirm: () => void
  ) => {
    setConfirmDialog({
      isOpen: true,
      title,
      description,
      type,
      onConfirm: async () => {
        await onConfirm();
        setConfirmDialog(null);
      }
    });
  };

  // ----------------------------------------------------
  // SINGLE USER ACTIONS
  // ----------------------------------------------------
  const handleToggleStatus = async (user: UserRecord) => {
    if (user.id === currentUser?.id) return;
    const isLocking = user.status === "Active";

    if (isLocking && !hasPermission("LOCK_USER")) {
      alert("Permission Denied: LOCK_USER is required.");
      return;
    }
    if (!isLocking && !hasPermission("UNLOCK_USER")) {
      alert("Permission Denied: UNLOCK_USER is required.");
      return;
    }

    const action = isLocking ? "lock" : "unlock";
    triggerConfirm(
      `${isLocking ? "Suspend" : "Reactivate"} Account?`,
      `Are you sure you want to change the status of ${user.full_name} to ${isLocking ? "Suspended" : "Active"}?`,
      isLocking ? "warning" : "info",
      async () => {
        try {
          const res = await fetch(`/api/users/${user.id}/${action}`, {
            method: "POST",
            headers: { "x-user-id": currentUser?.id?.toString() || "1" }
          });
          const data = await res.json();
          if (data.success) {
            fetchUsers();
          } else {
            alert(data.error || "Failed to update status");
          }
        } catch (err) {
          console.error("Status toggle error:", err);
        }
      }
    );
  };

  const handleDeleteUser = async (user: UserRecord) => {
    if (user.id === currentUser?.id) return;
    if (!hasPermission("DELETE_USER")) {
      alert("Permission Denied: DELETE_USER is required.");
      return;
    }

    triggerConfirm(
      "Delete Account?",
      `Are you sure you want to soft-delete ${user.full_name}'s account? They can be restored later by an administrator.`,
      "danger",
      async () => {
        try {
          const res = await fetch(`/api/users/${user.id}`, {
            method: "DELETE",
            headers: { "x-user-id": currentUser?.id?.toString() || "1" }
          });
          const data = await res.json();
          if (data.success) {
            fetchUsers();
          } else {
            alert(data.error || "Failed to delete user");
          }
        } catch (err) {
          console.error("Delete user error:", err);
        }
      }
    );
  };

  const handleRestoreUser = async (user: UserRecord) => {
    if (!hasPermission("RESTORE_USER")) {
      alert("Permission Denied: RESTORE_USER is required.");
      return;
    }

    triggerConfirm(
      "Restore Account?",
      `Are you sure you want to restore ${user.full_name}'s account?`,
      "success",
      async () => {
        try {
          const res = await fetch(`/api/users/${user.id}/restore`, {
            method: "POST",
            headers: { "x-user-id": currentUser?.id?.toString() || "1" }
          });
          const data = await res.json();
          if (data.success) {
            fetchUsers();
          } else {
            alert(data.error || "Failed to restore user");
          }
        } catch (err) {
          console.error("Restore user error:", err);
        }
      }
    );
  };

  const handleResetPassword = async (user: UserRecord) => {
    if (!hasPermission("RESET_PASSWORD")) {
      alert("Permission Denied: RESET_PASSWORD is required.");
      return;
    }

    const generatedPass = Math.random().toString(36).substring(2, 10);
    triggerConfirm(
      "Reset Password?",
      `Are you sure you want to reset the password for ${user.full_name}? A new password will be generated automatically.`,
      "warning",
      async () => {
        try {
          const res = await fetch(`/api/users/${user.id}/reset-password`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-user-id": currentUser?.id?.toString() || "1"
            },
            body: JSON.stringify({ password: generatedPass })
          });
          const data = await res.json();
          if (data.success) {
            alert(`Password reset successfully!\n\nNew temporary password is:\n${generatedPass}`);
          } else {
            alert(data.error || "Failed to reset password");
          }
        } catch (err) {
          console.error("Reset password error:", err);
        }
      }
    );
  };

  const handleForcePasswordChange = async (user: UserRecord) => {
    triggerConfirm(
      "Force Password Change?",
      `Flag ${user.full_name} to change their password on next login?`,
      "info",
      async () => {
        try {
          const res = await fetch(`/api/users/${user.id}/force-password-change`, {
            method: "POST",
            headers: { "x-user-id": currentUser?.id?.toString() || "1" }
          });
          const data = await res.json();
          if (data.success) {
            alert("Security flag updated successfully.");
          }
        } catch (err) {
          console.error("Force password change error:", err);
        }
      }
    );
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal.user) return;

    try {
      setIsSavingUser(true);
      setSaveSuccess(false);
      const res = await fetch(`/api/users/${editModal.user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser?.id?.toString() || "1"
        },
        body: JSON.stringify({
          full_name: editModal.user.full_name,
          email: editModal.user.email,
          phone_number: editModal.user.phone_number,
          role: editModal.user.role,
          status: editModal.user.status,
          region: editModal.user.region,
          permissions: editPermissions
        })
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => {
          setEditModal({ isOpen: false, user: null });
          setSaveSuccess(false);
          fetchUsers();
        }, 1200);
      } else {
        alert(data.error || "Failed to update account details");
      }
    } catch (err) {
      console.error("Save edit user error:", err);
      alert("A system error occurred while saving. Please try again.");
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleFullNameChange = (name: string) => {
    setProvisionForm(prev => {
      const updated = { ...prev, full_name: name };
      const expectedOldSuggestion = prev.full_name.toLowerCase().trim().replace(/\s+/g, ".");
      if (!prev.username || prev.username === expectedOldSuggestion) {
        updated.username = name.toLowerCase().trim().replace(/\s+/g, ".");
      }
      return updated;
    });
  };

  const handleGeneratePassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setProvisionForm(prev => ({ ...prev, password }));
  };

  const handleProvisionUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvisionError(null);
    setProvisionSuccess(false);
    setProvisioning(true);

    const targetRole = isCustomRole ? customRoleText.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_") : provisionForm.role;

    if (!targetRole) {
      setProvisionError("Please specify a valid role name.");
      setProvisioning(false);
      return;
    }

    const payload = {
      ...provisionForm,
      role: targetRole,
      permissions: isCustomRole ? selectedPermissions : []
    };

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser?.id?.toString() || "1"
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProvisionSuccess(true);
        fetchUsers();
        if (onRefreshStats) onRefreshStats();
        setProvisionForm({
          username: "",
          email: "",
          full_name: "",
          role: availableRoles.includes("school_admin") ? "school_admin" : (availableRoles[0] || ""),
          region: "All",
          password: "",
          status: "Active"
        });
        setIsCustomRole(false);
        setCustomRoleText("");
        setSelectedPermissions([]);
        setTimeout(() => {
          setProvisionModalOpen(false);
          setProvisionSuccess(false);
        }, 1500);
      } else {
        setProvisionError(data.error || "Failed to provision new user account.");
      }
    } catch (err: any) {
      setProvisionError(err.message || "An unexpected error occurred.");
    } finally {
      setProvisioning(false);
    }
  };

  // ----------------------------------------------------
  // BULK ACTIONS
  // ----------------------------------------------------
  const handleBulkLock = () => {
    if (selectedIds.length === 0) return;
    if (!hasPermission("LOCK_USER")) {
      alert("Permission Denied: LOCK_USER is required.");
      return;
    }

    triggerConfirm(
      "Lock Selected Accounts?",
      `Are you sure you want to suspend/lock the ${selectedIds.length} selected accounts?`,
      "warning",
      async () => {
        try {
          const res = await fetch("/api/users/bulk/lock", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-user-id": currentUser?.id?.toString() || "1"
            },
            body: JSON.stringify({ ids: selectedIds })
          });
          const data = await res.json();
          if (data.success) {
            setSelectedIds([]);
            fetchUsers();
          }
        } catch (err) {
          console.error("Bulk lock error:", err);
        }
      }
    );
  };

  const handleBulkUnlock = () => {
    if (selectedIds.length === 0) return;
    if (!hasPermission("UNLOCK_USER")) {
      alert("Permission Denied: UNLOCK_USER is required.");
      return;
    }

    triggerConfirm(
      "Unlock Selected Accounts?",
      `Are you sure you want to reactivate the ${selectedIds.length} selected accounts?`,
      "info",
      async () => {
        try {
          const res = await fetch("/api/users/bulk/unlock", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-user-id": currentUser?.id?.toString() || "1"
            },
            body: JSON.stringify({ ids: selectedIds })
          });
          const data = await res.json();
          if (data.success) {
            setSelectedIds([]);
            fetchUsers();
          }
        } catch (err) {
          console.error("Bulk unlock error:", err);
        }
      }
    );
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (!hasPermission("DELETE_USER")) {
      alert("Permission Denied: DELETE_USER is required.");
      return;
    }

    triggerConfirm(
      "Delete Selected Accounts?",
      `Are you sure you want to soft-delete the ${selectedIds.length} selected accounts?`,
      "danger",
      async () => {
        try {
          const res = await fetch("/api/users/bulk/delete", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-user-id": currentUser?.id?.toString() || "1"
            },
            body: JSON.stringify({ ids: selectedIds })
          });
          const data = await res.json();
          if (data.success) {
            setSelectedIds([]);
            fetchUsers();
          }
        } catch (err) {
          console.error("Bulk delete error:", err);
        }
      }
    );
  };

  const handleBulkRestore = () => {
    if (selectedIds.length === 0) return;
    if (!hasPermission("RESTORE_USER")) {
      alert("Permission Denied: RESTORE_USER is required.");
      return;
    }

    triggerConfirm(
      "Restore Selected Accounts?",
      `Are you sure you want to restore the ${selectedIds.length} selected soft-deleted accounts?`,
      "success",
      async () => {
        try {
          const res = await fetch("/api/users/bulk/restore", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-user-id": currentUser?.id?.toString() || "1"
            },
            body: JSON.stringify({ ids: selectedIds })
          });
          const data = await res.json();
          if (data.success) {
            setSelectedIds([]);
            fetchUsers();
          }
        } catch (err) {
          console.error("Bulk restore error:", err);
        }
      }
    );
  };

  const handleBulkResetPassword = () => {
    if (selectedIds.length === 0) return;
    if (!hasPermission("RESET_PASSWORD")) {
      alert("Permission Denied: RESET_PASSWORD is required.");
      return;
    }

    const defaultPass = "GovBWPass#" + Math.floor(1000 + Math.random() * 9000);
    triggerConfirm(
      "Reset Selected Passwords?",
      `Are you sure you want to reset passwords for the ${selectedIds.length} selected accounts? All of them will be set to: ${defaultPass}`,
      "warning",
      async () => {
        try {
          const res = await fetch("/api/users/bulk/reset-password", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-user-id": currentUser?.id?.toString() || "1"
            },
            body: JSON.stringify({ ids: selectedIds, password: defaultPass })
          });
          const data = await res.json();
          if (data.success) {
            setSelectedIds([]);
            alert(`Bulk Password Reset Success!\n\nAll selected accounts set to temporary password:\n${defaultPass}`);
            fetchUsers();
          }
        } catch (err) {
          console.error("Bulk password reset error:", err);
        }
      }
    );
  };

  const handleBulkExport = async () => {
    try {
      const res = await fetch("/api/users/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser?.id?.toString() || "1"
        },
        body: JSON.stringify({ ids: selectedIds })
      });
      const data = await res.json();
      if (data.success) {
        // Convert to CSV
        const headers = ["ID", "Username", "Email", "Full Name", "Phone", "Role", "Status", "Region", "Last Login"];
        const rows = data.users.map((u: any) => [
          u.id,
          u.username,
          u.email,
          u.full_name,
          u.phone_number || "",
          u.role,
          u.status,
          u.region,
          u.last_login || ""
        ]);

        const csvContent = "data:text/csv;charset=utf-8," 
          + [headers.join(","), ...rows.map((r: any) => r.map((val: any) => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Administrative_Users_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error("Export error:", err);
    }
  };

  const handleBulkImport = async () => {
    try {
      const parsedUsers = JSON.parse(importText);
      if (!Array.isArray(parsedUsers)) {
        setImportFeedback("Error: Root element must be an array of user objects.");
        return;
      }

      const res = await fetch("/api/users/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser?.id?.toString() || "1"
        },
        body: JSON.stringify({ users: parsedUsers })
      });
      const data = await res.json();
      if (data.success) {
        setImportFeedback(`Import Complete! Successfully added ${data.imported} users. Skipped/Errored: ${data.skipped}.`);
        setImportText("");
        fetchUsers();
      } else {
        setImportFeedback(`Failed: ${data.error}`);
      }
    } catch (err: any) {
      setImportFeedback(`Invalid JSON input: ${err.message}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search user accounts by name, email, or username..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-700"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-lg text-xs px-3 py-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-700"
            >
              <option value="all">All Roles</option>
              {availableRoles.map((r) => (
                <option key={r} value={r}>
                  {r.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-lg text-xs px-3 py-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-700"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Suspended Only</option>
              <option value="deleted">Soft-Deleted Only</option>
            </select>

            {/* Bulk Actions Button Group triggers */}
            <button
              onClick={() => setProvisionModalOpen(true)}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white border border-transparent rounded-lg text-xs px-3 py-2 cursor-pointer font-bold shadow-sm shadow-blue-500/10 transition-colors"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Provision User
            </button>
            <button
              onClick={() => setImportModalOpen(true)}
              className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs px-3 py-2 cursor-pointer font-semibold"
            >
              <Upload className="h-3.5 w-3.5" />
              Import Bulk
            </button>
            <button
              onClick={() => handleBulkExport()}
              className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 dark:text-blue-400 border border-blue-100/40 dark:border-blue-900/40 rounded-lg text-xs px-3 py-2 cursor-pointer font-semibold"
            >
              <Download className="h-3.5 w-3.5" />
              Export {selectedIds.length > 0 ? `Selected (${selectedIds.length})` : "All"}
            </button>
          </div>
        </div>
      </div>

      {/* Group Actions Bar (appears above table when selection is > 0) */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-150 dark:border-blue-900 p-3 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn text-xs">
          <div className="flex items-center gap-2 font-medium text-blue-900 dark:text-blue-300">
            <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>
              <b>{selectedIds.length}</b> account{selectedIds.length > 1 ? "s" : ""} selected for bulk operations
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleBulkLock}
              className="flex items-center gap-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900 rounded px-2.5 py-1 font-bold cursor-pointer transition text-[11px]"
            >
              <Lock className="h-3 w-3" />
              Lock
            </button>
            <button
              onClick={handleBulkUnlock}
              className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 rounded px-2.5 py-1 font-bold cursor-pointer transition text-[11px]"
            >
              <Unlock className="h-3 w-3" />
              Unlock
            </button>
            <button
              onClick={handleBulkResetPassword}
              className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900 rounded px-2.5 py-1 font-bold cursor-pointer transition text-[11px]"
            >
              <Key className="h-3 w-3" />
              Reset Pass
            </button>
            {statusFilter === "deleted" ? (
              <button
                onClick={handleBulkRestore}
                className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 rounded px-2.5 py-1 font-bold cursor-pointer transition text-[11px]"
              >
                <RefreshCw className="h-3 w-3" />
                Restore
              </button>
            ) : (
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded px-2.5 py-1 font-bold cursor-pointer transition text-[11px]"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            )}
            <button
              onClick={() => setSelectedIds([])}
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 p-1 rounded-full cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800"
              title="Clear Selection"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Table container */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-200">
        {loading ? (
          <div className="py-20 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center gap-2.5">
            <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
            <span className="text-xs font-semibold">Querying school management database...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center text-slate-400 dark:text-slate-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No matching administrative accounts found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800/80 font-semibold uppercase tracking-wider">
                  <th className="p-4 w-10">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={
                        users.length > 0 &&
                        users
                          .filter((u) => u.username !== "super_admin" && u.id !== currentUser?.id)
                          .every((u) => selectedIds.includes(u.id))
                      }
                      className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-3 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-900 transition" onClick={() => { setSortBy("full_name"); setSortOrder(sortOrder === "asc" ? "desc" : "asc"); }}>
                    Account Operator
                  </th>
                  <th className="px-6 py-3 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-900 transition" onClick={() => { setSortBy("role"); setSortOrder(sortOrder === "asc" ? "desc" : "asc"); }}>
                    Role & Permissions
                  </th>
                  <th className="px-6 py-3 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-900 transition" onClick={() => { setSortBy("region"); setSortOrder(sortOrder === "asc" ? "desc" : "asc"); }}>
                    Scope Region
                  </th>
                  <th className="px-6 py-3">
                    Login / Status
                  </th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {users.map((sysUser) => {
                  const isSelf = sysUser.id === currentUser?.id;
                  const isSuperAdmin = sysUser.username === "super_admin";
                  const isSelected = selectedIds.includes(sysUser.id);
                  const isDeleted = sysUser.deleted_at !== null && sysUser.deleted_at !== undefined;

                  return (
                    <tr
                      key={sysUser.id}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition ${
                        isSelected ? "bg-blue-50/30 dark:bg-blue-950/10" : ""
                      } ${isDeleted ? "opacity-75 bg-slate-50/30 dark:bg-slate-950/10" : ""}`}
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          disabled={isSuperAdmin || isSelf}
                          checked={isSelected}
                          onChange={(e) => handleSelectUser(sysUser.id, e.target.checked)}
                          className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        />
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700 shrink-0">
                            {sysUser.full_name?.charAt(0) || "U"}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-950 dark:text-slate-100 block flex items-center gap-1.5">
                              {sysUser.full_name}
                              {isSelf && (
                                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.2 rounded-full border border-blue-100 dark:border-blue-900/40">
                                  You
                                </span>
                              )}
                              {isSuperAdmin && (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded-full border border-amber-100 dark:border-amber-900/40">
                                  Protected
                                </span>
                              )}
                              {isDeleted && (
                                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.2 rounded-full border border-rose-100 dark:border-rose-900/40">
                                  Deleted
                                </span>
                              )}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400 text-[10px]">
                              {sysUser.email} • @{sysUser.username}
                            </span>
                            {sysUser.phone_number && (
                              <span className="block text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                                <Phone className="h-3 w-3" /> {sysUser.phone_number}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200">
                              {sysUser.role ? sysUser.role.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : "School Admin"}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 max-w-[240px]">
                            {(() => {
                              const activePerms = sysUser.permissions || rolePermissions[sysUser.role] || [];
                              return (
                                <>
                                  {activePerms.slice(0, 3).map((p: string) => (
                                    <span
                                      key={p}
                                      className="text-[9px] font-medium bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-100/20 dark:border-blue-900/20 px-1 rounded-sm"
                                    >
                                      {p.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                                    </span>
                                  ))}
                                  {activePerms.length > 3 && (
                                    <span className="text-[9px] text-slate-400 font-medium">
                                      +{activePerms.length - 3} more
                                    </span>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          {sysUser.region === "All" ? "All Regions" : `${sysUser.region} Region`}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {sysUser.last_login || "Never accessed"}
                          </span>
                          <div>
                            {isDeleted ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 text-[9px] font-bold bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/20 rounded-full">
                                Trash Bin
                              </span>
                            ) : sysUser.status === "Active" ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/20 rounded-full">
                                Active State
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 text-[9px] font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/20 rounded-full">
                                Suspended
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        {/* Action buttons list */}
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Inline Quick Action Buttons */}
                          <button
                            onClick={() => setViewModal({ isOpen: true, user: sysUser })}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded cursor-pointer"
                            title="View operational profile"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => setEditModal({ isOpen: true, user: { ...sysUser } })}
                            disabled={isSuperAdmin || isSelf}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent"
                            title="Edit operator settings"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>

                          {/* 3-Dot Dropdown Menu for Context/Conditional Actions */}
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownId(activeDropdownId === sysUser.id ? null : sysUser.id);
                              }}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded cursor-pointer"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {activeDropdownId === sysUser.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setActiveDropdownId(null)}
                                ></div>
                                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg py-1.5 z-20 animate-in fade-in slide-in-from-top-1 text-left">
                                  {isDeleted ? (
                                    <button
                                      onClick={() => {
                                        setActiveDropdownId(null);
                                        handleRestoreUser(sysUser);
                                      }}
                                      className="w-full px-3 py-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                    >
                                      <RefreshCw className="h-3.5 w-3.5 text-emerald-500" />
                                      Restore Account
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        disabled={isSuperAdmin || isSelf}
                                        onClick={() => {
                                          setActiveDropdownId(null);
                                          handleToggleStatus(sysUser);
                                        }}
                                        className="w-full px-3 py-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 disabled:opacity-40"
                                      >
                                        {sysUser.status === "Active" ? (
                                          <>
                                            <Lock className="h-3.5 w-3.5 text-amber-500" />
                                            Suspend Account
                                          </>
                                        ) : (
                                          <>
                                            <Unlock className="h-3.5 w-3.5 text-emerald-500" />
                                            Activate Account
                                          </>
                                        )}
                                      </button>

                                      <button
                                        onClick={() => {
                                          setActiveDropdownId(null);
                                          handleResetPassword(sysUser);
                                        }}
                                        className="w-full px-3 py-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                      >
                                        <Key className="h-3.5 w-3.5 text-blue-500" />
                                        Reset Password
                                      </button>

                                      <button
                                        onClick={() => {
                                          setActiveDropdownId(null);
                                          handleForcePasswordChange(sysUser);
                                        }}
                                        className="w-full px-3 py-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                      >
                                        <Settings className="h-3.5 w-3.5 text-blue-500" />
                                        Force Pass Change
                                      </button>

                                      <div className="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>

                                      <button
                                        disabled={isSuperAdmin || isSelf}
                                        onClick={() => {
                                          setActiveDropdownId(null);
                                          handleDeleteUser(sysUser);
                                        }}
                                        className="w-full px-3 py-1.5 text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-2 disabled:opacity-40"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Delete Account
                                      </button>
                                    </>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Simple pagination footer */}
        {!loading && totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">
              Showing page <b>{page}</b> of <b>{totalPages}</b> (Total of <b>{total}</b> operators)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------
          CONFIRMATION DIALOG MODAL
          ---------------------------------------------------- */}
      {confirmDialog?.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 text-left animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4 mb-4">
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  confirmDialog.type === "danger"
                    ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                    : confirmDialog.type === "warning"
                    ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                    : confirmDialog.type === "success"
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                }`}
              >
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {confirmDialog.title}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {confirmDialog.description}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-4">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className={`px-3.5 py-1.5 text-xs font-semibold text-white rounded-lg cursor-pointer transition ${
                  confirmDialog.type === "danger"
                    ? "bg-rose-600 hover:bg-rose-750 shadow-sm shadow-rose-600/10"
                    : confirmDialog.type === "warning"
                    ? "bg-amber-600 hover:bg-amber-700 shadow-sm"
                    : "bg-blue-600 hover:bg-blue-700 shadow-sm"
                }`}
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          EDIT OPERATOR SETTINGS MODAL
          ---------------------------------------------------- */}
      {editModal.isOpen && editModal.user && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 text-left animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/85 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Update Operator Account
                </h3>
              </div>
              <button
                onClick={() => setEditModal({ isOpen: false, user: null })}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editModal.user.full_name}
                  onChange={(e) =>
                    setEditModal({
                      isOpen: true,
                      user: { ...editModal.user!, full_name: e.target.value }
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editModal.user.email}
                    onChange={(e) =>
                      setEditModal({
                        isOpen: true,
                        user: { ...editModal.user!, email: e.target.value }
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editModal.user.phone_number || ""}
                  onChange={(e) =>
                    setEditModal({
                      isOpen: true,
                      user: { ...editModal.user!, phone_number: e.target.value }
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg"
                  placeholder="e.g. +267 71000000"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Assigned Role</label>
                <select
                  value={editModal.user.role}
                  onChange={(e) => {
                    const newRole = e.target.value;
                    const newRolePerms = rolePermissions[newRole] || [];
                    setEditPermissions(newRolePerms);
                    setEditModal({
                      isOpen: true,
                      user: { ...editModal.user!, role: newRole }
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg cursor-pointer"
                >
                  {availableRoles.map((r) => (
                    <option key={r} value={r}>
                      {r.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Scope Region</label>
                <select
                  value={editModal.user.region}
                  onChange={(e) =>
                    setEditModal({
                      isOpen: true,
                      user: { ...editModal.user!, region: e.target.value }
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg cursor-pointer"
                >
                  <option value="All">All Regions</option>
                  {availableRegions.map((reg) => (
                    <option key={reg} value={reg}>
                      {reg}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Account State</label>
                <select
                  value={editModal.user.status}
                  onChange={(e) =>
                    setEditModal({
                      isOpen: true,
                      user: { ...editModal.user!, status: e.target.value }
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg cursor-pointer"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Suspended</option>
                </select>
              </div>
            </div>

            {/* Manage Permissions Toggle */}
            <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
              <button
                type="button"
                onClick={() => setShowPermissionsPanel(!showPermissionsPanel)}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-705 text-slate-700 dark:text-slate-300 rounded-lg font-semibold transition cursor-pointer"
              >
                <Settings className="h-3.5 w-3.5 animate-spin-hover" />
                {showPermissionsPanel ? "Hide Granular Permissions" : "Manage Permissions Overrides"}
              </button>
            </div>

            {showPermissionsPanel && availablePermissions.length > 0 && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/40 mt-1">
                <div className="flex items-center justify-between mb-2">
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 text-[11px]">
                    Granular Permission Overrides
                  </label>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    Add or remove capabilities specifically for this user
                  </span>
                </div>
                {loadingEditPermissions ? (
                  <div className="py-4 text-center text-slate-400 flex items-center justify-center gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-500" />
                    <span>Loading permissions...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2.5 bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800/80 rounded-xl">
                    {availablePermissions.map(p => {
                      const isChecked = editPermissions.includes(p.permission_name);
                      return (
                        <label key={p.permission_id} className="flex items-start gap-2 cursor-pointer group p-1 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 rounded">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditPermissions(prev => [...prev, p.permission_name]);
                              } else {
                                setEditPermissions(prev => prev.filter(n => n !== p.permission_name));
                              }
                            }}
                            className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <div className="flex flex-col text-[10px]">
                            <span className="text-slate-700 dark:text-slate-300 font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
                              {p.permission_name.replace(/_/g, " ")}
                            </span>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 leading-tight">
                              {p.permission_description || "System capability"}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-2">
              <button
                type="button"
                disabled={isSavingUser}
                onClick={() => setEditModal({ isOpen: false, user: null })}
                className="px-3.5 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingUser || saveSuccess}
                className={`px-4 py-1.5 font-semibold rounded-lg shadow-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                  saveSuccess
                    ? "bg-emerald-600 text-white shadow-emerald-600/10 scale-95"
                    : isSavingUser
                    ? "bg-blue-600/75 text-white/95 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md active:scale-98 shadow-blue-600/10"
                }`}
              >
                {saveSuccess ? (
                  <>
                    <CheckCircle className="h-4 w-4 animate-bounce shrink-0" />
                    <span>Saved Successfully!</span>
                  </>
                ) : isSavingUser ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* ----------------------------------------------------
        VIEW OPERATOR PROFILE MODAL
        ---------------------------------------------------- */}
    {viewModal.isOpen && viewModal.user && (
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 text-left animate-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/85 pb-3 mb-4">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Administrative Profile
            </h3>
            <button
              onClick={() => setViewModal({ isOpen: false, user: null })}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-250/20">
              <div className="h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold">
                {viewModal.user.full_name?.charAt(0)}
              </div>
              <div>
                <h4 className="text-sm font-bold">{viewModal.user.full_name}</h4>
                <p className="text-slate-500">@{viewModal.user.username}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="bg-slate-50/50 dark:bg-slate-950/20 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">Email</span>
                <span className="font-medium flex items-center gap-1 mt-0.5">
                  <Mail className="h-3.5 w-3.5 text-blue-500" /> {viewModal.user.email}
                </span>
              </div>
              <div className="bg-slate-50/50 dark:bg-slate-950/20 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">Phone</span>
                <span className="font-medium flex items-center gap-1 mt-0.5">
                  <Phone className="h-3.5 w-3.5 text-blue-500" /> {viewModal.user.phone_number || "None"}
                </span>
              </div>
              <div className="bg-slate-50/50 dark:bg-slate-950/20 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">Role</span>
                <span className="font-bold flex items-center gap-1 mt-0.5 text-blue-600">
                  <Shield className="h-3.5 w-3.5" /> {viewModal.user.role?.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                </span>
              </div>
              <div className="bg-slate-50/50 dark:bg-slate-950/20 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">Region</span>
                <span className="font-medium flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 text-blue-500" /> {viewModal.user.region} Region
                </span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase font-semibold mb-1">Core Access Control Permissions</span>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                {(rolePermissions[viewModal.user.role] || []).map((p: string) => (
                  <span
                    key={p}
                    className="text-[9px] font-medium bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded"
                  >
                    {p.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                  </span>
                ))}
                {(!rolePermissions[viewModal.user.role] || rolePermissions[viewModal.user.role].length === 0) && (
                  <span className="text-slate-400 italic">No access controls mapped.</span>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center bg-slate-50/30 dark:bg-slate-950/20 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 font-mono text-[10px] text-slate-500">
              <span>Created: {viewModal.user.created_at || "N/A"}</span>
              <span>Last Login: {viewModal.user.last_login || "Never"}</span>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* ----------------------------------------------------
        IMPORT OPERATORS DIALOG MODAL
        ---------------------------------------------------- */}
    {importModalOpen && (
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 text-left animate-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/85 pb-3 mb-4">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-600" />
              Import Administrative Accounts
            </h3>
            <button
              onClick={() => {
                setImportModalOpen(false);
                setImportFeedback(null);
              }}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3.5 text-xs">
            <p className="text-slate-500 dark:text-slate-400">
              Paste a JSON array containing administrative user objects to provision them in bulk. Existing usernames or emails will be automatically skipped to prevent duplication.
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-[10px] text-slate-600 dark:text-slate-400">
              <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">Expected JSON Schema Format:</span>
              {`[
  {
    "username": "kgomotsom",
    "email": "km@gov.bw",
    "full_name": "Kgomotso Moroka",
    "role": "school_admin",
    "region": "Chobe",
    "password": "securePass123"
  }
]`}
            </div>

            <textarea
              rows={8}
              className="w-full p-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg font-mono text-[10px] focus:outline-none"
              placeholder="[{ ... }]"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />

            {importFeedback && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-150 dark:border-blue-900/40 rounded-lg font-semibold">
                {importFeedback}
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-2">
              <button
                onClick={() => {
                  setImportModalOpen(false);
                  setImportFeedback(null);
                }}
                className="px-3.5 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer font-semibold"
              >
                Close
              </button>
              <button
                onClick={handleBulkImport}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg cursor-pointer shadow-sm shadow-blue-600/10"
              >
                Process JSON Import
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* ----------------------------------------------------
        PROVISION SINGLE USER DIALOG MODAL
        ---------------------------------------------------- */}
    {provisionModalOpen && (
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 text-left animate-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/85 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Provision New Administrator
              </h3>
            </div>
            <button
              onClick={() => {
                setProvisionModalOpen(false);
                setProvisionError(null);
                setProvisionSuccess(false);
                setSelectedPermissions([]);
              }}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleProvisionUser} className="space-y-4 text-xs">
            {provisionError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/20 rounded-lg font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
                <span>{provisionError}</span>
              </div>
            )}

            {provisionSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/20 rounded-lg font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>Account provisioned successfully! Closing...</span>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={provisionForm.full_name}
                onChange={(e) => handleFullNameChange(e.target.value)}
                placeholder="e.g. Kgomotso Moroka"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={provisionForm.username}
                  onChange={(e) =>
                    setProvisionForm({
                      ...provisionForm,
                      username: e.target.value.toLowerCase().replace(/\s+/g, "")
                    })
                  }
                  placeholder="e.g. kgomotsom"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={provisionForm.email}
                  onChange={(e) =>
                    setProvisionForm({
                      ...provisionForm,
                      email: e.target.value
                    })
                  }
                  placeholder="e.g. km@gov.bw"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Password</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={provisionForm.password}
                  onChange={(e) =>
                    setProvisionForm({
                      ...provisionForm,
                      password: e.target.value
                    })
                  }
                  placeholder="Enter secure password"
                  className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg cursor-pointer transition flex items-center gap-1 shrink-0"
                >
                  <Key className="h-3 w-3" />
                  Generate
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Assigned Role</label>
                <select
                  value={isCustomRole ? "__custom__" : provisionForm.role}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "__custom__") {
                      setIsCustomRole(true);
                    } else {
                      setIsCustomRole(false);
                      setProvisionForm({
                        ...provisionForm,
                        role: val
                      });
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {availableRoles.map((r) => (
                    <option key={r} value={r}>
                      {r.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                    </option>
                  ))}
                  <option value="__custom__">+ Custom Role...</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Scope Region</label>
                <select
                  value={provisionForm.region}
                  onChange={(e) =>
                    setProvisionForm({
                      ...provisionForm,
                      region: e.target.value
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="All">All Regions</option>
                  {availableRegions.map((reg) => (
                    <option key={reg} value={reg}>
                      {reg}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Account State</label>
                <select
                  value={provisionForm.status}
                  onChange={(e) =>
                    setProvisionForm({
                      ...provisionForm,
                      status: e.target.value
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Suspended</option>
                </select>
              </div>
            </div>

            {isCustomRole && (
              <div className="p-3 bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800/80 rounded-xl space-y-3 animate-fadeIn">
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400">Custom Role Name</label>
                  <input
                    type="text"
                    required
                    value={customRoleText}
                    onChange={(e) => setCustomRoleText(e.target.value)}
                    placeholder="e.g. academic_director, support_analyst"
                    className="w-full px-3 py-2 mt-1 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 block leading-normal mt-1.5">
                    The custom role identifier will be converted to lowercase with underscores (e.g., <b>support_analyst</b>) and dynamically registered.
                  </span>
                </div>
                
                {availablePermissions.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80">
                    <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-2">Assign Permissions</label>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                      {availablePermissions.map(p => (
                        <label key={p.permission_id} className="flex items-start gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={selectedPermissions.includes(p.permission_name)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPermissions(prev => [...prev, p.permission_name]);
                              } else {
                                setSelectedPermissions(prev => prev.filter(n => n !== p.permission_name));
                              }
                            }}
                            className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex flex-col">
                            <span className="text-slate-700 dark:text-slate-300 font-medium group-hover:text-blue-600 transition-colors">
                              {p.permission_name.replace(/_/g, " ")}
                            </span>
                            <span className="text-[9px] text-slate-400 leading-tight">
                              {p.permission_description || "System capability"}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-2">
              <button
                type="button"
                onClick={() => {
                  setProvisionModalOpen(false);
                  setProvisionError(null);
                  setProvisionSuccess(false);
                  setSelectedPermissions([]);
                }}
                className="px-3.5 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer font-semibold"
                disabled={provisioning}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg cursor-pointer shadow-sm shadow-blue-600/10 flex items-center gap-1.5"
                disabled={provisioning}
              >
                {provisioning ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <UserPlus className="h-3 w-3" />
                )}
                {provisioning ? "Provisioning..." : "Provision Account"}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </div>
);
}
