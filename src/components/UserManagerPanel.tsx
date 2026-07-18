import React, { useState, useEffect } from "react";
import { 
  User, 
  Users, 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Key, 
  Trash2, 
  Plus, 
  Edit2, 
  UserPlus, 
  Check, 
  X, 
  Lock, 
  RefreshCw, 
  AlertCircle, 
  Info,
  Eye,
  EyeOff
} from "lucide-react";
import { UserAccount } from "../types";

interface UserManagerPanelProps {
  currentUser: string;
  isClientFallback: boolean;
}

export default function UserManagerPanel({ currentUser, isClientFallback }: UserManagerPanelProps) {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [addUsername, setAddUsername] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRole, setAddRole] = useState<'admin' | 'operator' | 'viewer'>('viewer');

  const [showEditPassModal, setShowEditPassModal] = useState<string | null>(null); // username of user being edited
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [currentUserRole, setCurrentUserRole] = useState<string>("viewer");

  // Load current user's role from localStorage or fetch from state
  useEffect(() => {
    const role = localStorage.getItem("esp32_user_role") || "viewer";
    setCurrentUserRole(role);
  }, [currentUser]);

  // Fetch all users
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);

    if (isClientFallback) {
      // Offline client-side mock DB loading
      const localUsersJson = localStorage.getItem("esp32_custom_users");
      const defaultUsers: UserAccount[] = [
        { username: "admin", password: "admin1234", role: "admin", lastActive: "กำลังออนไลน์ขณะนี้" },
        { username: "operator", password: "operator1234", role: "operator", lastActive: "ยังไม่เคยเข้าสู่ระบบ" },
        { username: "viewer", password: "viewer1234", role: "viewer", lastActive: "ยังไม่เคยเข้าสู่ระบบ" }
      ];

      if (localUsersJson) {
        try {
          const parsed = JSON.parse(localUsersJson) as UserAccount[];
          // Merge to ensure defaults are always present
          const merged = [...defaultUsers];
          parsed.forEach(pu => {
            if (!merged.some(du => du.username.toLowerCase() === pu.username.toLowerCase())) {
              merged.push(pu);
            }
          });
          setUsers(merged);
        } catch (e) {
          setUsers(defaultUsers);
        }
      } else {
        localStorage.setItem("esp32_custom_users", JSON.stringify(defaultUsers));
        setUsers(defaultUsers);
      }
      setLoading(false);
    } else {
      // Fetch from real server API
      try {
        const res = await fetch("/api/users");
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
          
          // Sync current logged in user's role from API as well
          const currentMe = data.users.find((u: any) => u.username.toLowerCase() === currentUser.toLowerCase());
          if (currentMe) {
            setCurrentUserRole(currentMe.role);
            localStorage.setItem("esp32_user_role", currentMe.role);
          }
        } else {
          throw new Error("ดึงข้อมูลบัญชีผู้ใช้ไม่สำเร็จ");
        }
      } catch (err: any) {
        setError(err.message || "ไม่สามารถเชื่อมต่อฐานข้อมูลผู้ใช้งานได้");
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [isClientFallback, currentUser]);

  // Handle Add User
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const targetUsername = addUsername.trim();
    const targetPassword = addPassword.trim();

    if (!targetUsername || !targetPassword) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    if (users.some(u => u.username.toLowerCase() === targetUsername.toLowerCase())) {
      setError("ชื่อผู้ใช้งานนี้มีอยู่ในระบบแล้ว");
      return;
    }

    if (isClientFallback) {
      // Local simulated add
      const newUser: UserAccount = {
        username: targetUsername,
        password: targetPassword,
        role: addRole,
        lastActive: "ยังไม่เคยเข้าสู่ระบบ"
      };

      const updated = [...users, newUser];
      setUsers(updated);
      localStorage.setItem("esp32_custom_users", JSON.stringify(updated.filter(u => u.username !== "admin" && u.username !== "operator" && u.username !== "viewer")));
      
      setSuccess(`เพิ่มผู้ใช้งานสำเร็จ: ${targetUsername} ในตำแหน่ง ${getRoleLabel(addRole)}`);
      setShowAddModal(false);
      setAddUsername("");
      setAddPassword("");
      setAddRole("viewer");
    } else {
      // Send API request
      try {
        const response = await fetch("/api/users/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: targetUsername, password: targetPassword, role: addRole }),
        });

        if (response.ok) {
          setSuccess(`เพิ่มผู้ใช้งานสำเร็จ: ${targetUsername}`);
          setShowAddModal(false);
          setAddUsername("");
          setAddPassword("");
          setAddRole("viewer");
          fetchUsers();
        } else {
          const errData = await response.json();
          setError(errData.error || "ไม่สามารถสร้างบัญชีผู้ใช้ได้");
        }
      } catch (err: any) {
        setError(err.message || "เกิดข้อผิดพลาดในการส่งข้อมูล");
      }
    }
  };

  // Handle Change Role / Permissions (Admins only)
  const handleChangeRole = async (username: string, newRole: 'admin' | 'operator' | 'viewer') => {
    setError(null);
    setSuccess(null);

    if (username.toLowerCase() === "admin") {
      setError("ไม่สามารถแก้ไขบทบาทของบัญชีผู้ใช้เริ่มต้นสูงสุด (admin) ได้");
      return;
    }

    if (isClientFallback) {
      const updated = users.map(u => {
        if (u.username.toLowerCase() === username.toLowerCase()) {
          return { ...u, role: newRole };
        }
        return u;
      });
      setUsers(updated);
      localStorage.setItem("esp32_custom_users", JSON.stringify(updated.filter(u => u.username !== "admin" && u.username !== "operator" && u.username !== "viewer")));
      setSuccess(`ปรับเปลี่ยนสิทธิ์ผู้ใช้ ${username} เป็น: ${getRoleLabel(newRole)} เรียบร้อยแล้ว`);
    } else {
      try {
        const response = await fetch("/api/users/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, role: newRole }),
        });

        if (response.ok) {
          setSuccess(`อัปเดตสิทธิ์ของ ${username} เป็น ${getRoleLabel(newRole)} สำเร็จแล้ว`);
          fetchUsers();
        } else {
          const errData = await response.json();
          setError(errData.error || "อัปเดตบทบาทผู้ใช้งานไม่สำเร็จ");
        }
      } catch (err: any) {
        setError(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ");
      }
    }
  };

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newPassword) {
      setError("กรุณากรอกรหัสผ่านใหม่");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    const targetUser = isAdmin ? showEditPassModal : currentUser;
    if (!targetUser) return;

    if (isClientFallback) {
      const updated = users.map(u => {
        if (u.username.toLowerCase() === targetUser.toLowerCase()) {
          return { ...u, password: newPassword };
        }
        return u;
      });
      setUsers(updated);
      localStorage.setItem("esp32_custom_users", JSON.stringify(updated.filter(u => u.username !== "admin" && u.username !== "operator" && u.username !== "viewer")));
      setSuccess(`เปลี่ยนรหัสผ่านสำหรับ ${targetUser} เสร็จสิ้นเรียบร้อย`);
      setShowEditPassModal(null);
      setNewPassword("");
      setConfirmPassword("");
    } else {
      try {
        const response = await fetch("/api/users/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: targetUser, password: newPassword }),
        });

        if (response.ok) {
          setSuccess(`เปลี่ยนรหัสผ่านสำหรับ ${targetUser} เรียบร้อยแล้ว!`);
          setShowEditPassModal(null);
          setNewPassword("");
          setConfirmPassword("");
          fetchUsers();
        } else {
          const errData = await response.json();
          setError(errData.error || "เปลี่ยนรหัสผ่านล้มเหลว");
        }
      } catch (err: any) {
        setError(err.message || "เกิดข้อผิดพลาดในการติดต่อระบบ");
      }
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (username: string) => {
    setError(null);
    setSuccess(null);

    if (username.toLowerCase() === "admin") {
      setError("ไม่สามารถลบบัญชีผู้ใช้สูงสุด (admin) ได้");
      return;
    }

    if (username.toLowerCase() === currentUser.toLowerCase()) {
      setError("คุณไม่สามารถลบบัญชีของตัวคุณเองที่กำลังเข้าสู่ระบบอยู่ในขณะนี้ได้");
      return;
    }

    if (!window.confirm(`คุณแน่ใจหรือไม่ที่จะลบผู้ใช้งาน "${username}"?`)) {
      return;
    }

    if (isClientFallback) {
      const updated = users.filter(u => u.username.toLowerCase() !== username.toLowerCase());
      setUsers(updated);
      localStorage.setItem("esp32_custom_users", JSON.stringify(updated.filter(u => u.username !== "admin" && u.username !== "operator" && u.username !== "viewer")));
      setSuccess(`ลบผู้ใช้งาน ${username} ออกจากระบบเรียบร้อยแล้ว`);
    } else {
      try {
        const response = await fetch("/api/users/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });

        if (response.ok) {
          setSuccess(`ลบผู้ใช้งาน ${username} สำเร็จแล้ว`);
          fetchUsers();
        } else {
          const errData = await response.json();
          setError(errData.error || "ไม่สามารถลบผู้ใช้งานได้");
        }
      } catch (err: any) {
        setError(err.message || "เกิดข้อผิดพลาดลบผู้ใช้ล้มเหลว");
      }
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case "admin": return "ผู้ดูแลระบบสูงสุด (Admin)";
      case "operator": return "ผู้ควบคุมบอร์ด (Operator)";
      case "viewer": return "ผู้เข้าชมทั่วไป (Viewer)";
      default: return "ไม่ระบุตำแหน่ง";
    }
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      case "admin": return "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30";
      case "operator": return "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30";
      case "viewer": return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/50";
      default: return "bg-slate-50 text-slate-400 border-slate-100";
    }
  };

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case "admin": return <ShieldAlert className="w-4 h-4 text-rose-500" />;
      case "operator": return <ShieldCheck className="w-4 h-4 text-emerald-500" />;
      default: return <Shield className="w-4 h-4 text-slate-400" />;
    }
  };

  // Determine if current user has administrator authority to manage others
  const isAdmin = currentUserRole === "admin" || currentUser.toLowerCase() === "admin";

  if (!isAdmin) {
    // Return a beautiful personal profile settings UI
    return (
      <div className="space-y-6" id="personal-profile-panel-container">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex gap-4 items-start">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-display text-slate-800">ตั้งค่าโปรไฟล์ส่วนตัว (Profile Settings)</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  ดูรายละเอียดข้อมูลประจำตัวของคุณและปรับเปลี่ยนรหัสผ่านเพื่อความปลอดภัยของระบบ IoT
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 p-4 bg-slate-50/80 rounded-xl border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">ชื่อผู้ใช้:</span>
              <span className="font-mono bg-slate-900 text-slate-100 px-2 py-0.5 rounded-md font-bold">{currentUser}</span>
              <span className="text-slate-500 font-medium">ตำแหน่งปัจจุบัน:</span>
              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold flex items-center gap-1 ${getRoleColor(currentUserRole)}`}>
                {getRoleIcon(currentUserRole)}
                <span>{getRoleLabel(currentUserRole)}</span>
              </span>
            </div>
            <div className="text-[11px] text-amber-600 font-semibold bg-amber-500/5 px-2.5 py-1 rounded-lg border border-amber-500/10">
              🔒 บัญชีทั่วไป: ได้รับสิทธิ์เข้าถึงเฉพาะการตั้งค่ารหัสผ่านตัวเองเท่านั้น
            </div>
          </div>
        </div>

        {/* Success/Error Alerts */}
        {error && (
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-xs text-rose-600 flex gap-2.5 items-center animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-xs text-emerald-700 flex gap-2.5 items-center animate-fade-in">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Change Password Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs max-w-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <Lock className="w-4.5 h-4.5 text-blue-500" />
            <span className="font-bold text-sm text-slate-800">เปลี่ยนรหัสผ่านใหม่ (Change Password)</span>
          </div>

          <form onSubmit={handleChangePassword} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500">รหัสผ่านใหม่ (New Password)</label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 text-sm rounded-xl focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none transition-all text-slate-800 font-mono font-bold"
                  placeholder="กรอกรหัสผ่านใหม่ที่ต้องการ..."
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500">ยืนยันรหัสผ่านใหม่อีกครั้ง</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 text-sm rounded-xl focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none transition-all text-slate-800 font-mono font-bold"
                placeholder="ยืนยันรหัสผ่านใหม่อีกครั้ง..."
              />
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 text-[11px] text-slate-500 leading-relaxed border border-slate-100">
              💡 เพื่อความปลอดภัยของอุปกรณ์ IoT แนะนำให้ตั้งรหัสผ่านที่มีความยาวอย่างน้อย 8 ตัวอักษร และประกอบด้วยตัวอักษรและตัวเลข
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer shadow-sm shadow-blue-500/10 hover:shadow-md active:scale-98"
              >
                บันทึกรหัสผ่านใหม่
              </button>
            </div>
          </form>
        </div>

        {/* 3. Role Privileges Description */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs">
          <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
            <Info className="w-4.5 h-4.5 text-indigo-500" />
            <span>ระดับการอนุญาตและสิทธิ์เข้าถึง (Your Role Privileges)</span>
          </h4>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2">
              {getRoleIcon(currentUserRole)}
              <span className="font-bold text-slate-800 text-xs">คุณได้รับบทบาท: {getRoleLabel(currentUserRole)}</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {currentUserRole === "operator" ? (
                <span>คุณสามารถ เข้าควบคุมอุปกรณ์ฮาร์ดแวร์หลักของระบบ สลับเปิด/ปิดไฟ LED และรีเลย์ และดาวน์โหลดซอร์สโค้ด ESP32 (Arduino) ได้อย่างเต็มที่ ทว่าไม่สามารถจัดการบัญชีผู้อื่นหรือเข้าสู่การปรับปรุงรายละเอียด Supabase DB ได้</span>
              ) : (
                <span>คุณสามารถ เข้าชมข้อมูลเซ็นเซอร์ ค่าความชื้น ค่าดิน ค่าอุณหภูมิ และแสงแดด ตลอดจนวิเคราะห์กราฟข้อมูลย้อนหลังและบันทึกเหตุการณ์ (Logs) ทว่าไม่สามารถสลับเปิด/ปิดสวิตช์สั่งการอุปกรณ์หรือแก้ไขพินเซ็นเซอร์ได้</span>
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="user-manager-panel-container">
      {/* 1. Header Information Block */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-4 items-start">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-display text-slate-800">ระบบจัดการผู้ใช้งาน & สิทธิ์การอนุญาต</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                บริหารจัดการบัญชี กำหนดบทบาทระดับความปลอดภัย (Role-Based Access Control) สำหรับการควบคุมอุปกรณ์ ESP32 และเปลี่ยนรหัสผ่านเพื่อความปลอดภัยทางไซเบอร์
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all cursor-pointer"
              title="รีเฟรชข้อมูลผู้ใช้"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            {isAdmin && (
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:shadow-md active:scale-98 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>เพิ่มผู้ใช้งานใหม่</span>
              </button>
            )}
          </div>
        </div>

        {/* Current Identity Summary Banner */}
        <div className="mt-5 p-4 bg-slate-50/80 rounded-xl border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">คุณล็อกอินในชื่อ:</span>
            <span className="font-mono bg-slate-900 text-slate-100 px-2 py-0.5 rounded-md font-bold">{currentUser}</span>
            <span className="text-slate-500 font-medium">สิทธิ์ปัจจุบัน:</span>
            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold flex items-center gap-1 ${getRoleColor(currentUserRole)}`}>
              {getRoleIcon(currentUserRole)}
              <span>{getRoleLabel(currentUserRole)}</span>
            </span>
          </div>

          <div className="text-[11px] text-slate-400">
            {isAdmin ? (
              <span className="text-emerald-600 font-semibold bg-emerald-500/5 px-2.5 py-1 rounded-lg border border-emerald-500/10 block">
                ⭐ คุณได้รับสิทธิ์ระดับแอดมิน: สามารถเพิ่ม, ลบ, แก้ไขสิทธิ์ และรีเซ็ตรหัสผ่านทุกบัญชีได้
              </span>
            ) : (
              <span className="text-amber-600 font-semibold bg-amber-500/5 px-2.5 py-1 rounded-lg border border-amber-500/10 block">
                🔒 คุณเข้าใช้ในสิทธิ์ทั่วไป: สามารถแก้ไขเปลี่ยนรหัสผ่านเฉพาะบัญชีของตนเองได้เท่านั้น
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Success/Error Alerts */}
      {error && (
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-xs text-rose-600 flex gap-2.5 items-center animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-xs text-emerald-700 flex gap-2.5 items-center animate-fade-in">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* 2. Grid Table of Users */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h4 className="text-sm font-bold text-slate-700 font-display flex items-center gap-2">
            <Users className="w-4.5 h-4.5 text-blue-500" />
            <span>บัญชีผู้ใช้ในระบบทั้งหมด ({users.length} บัญชี)</span>
          </h4>
          <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-mono font-bold">
            {isClientFallback ? "LOCAL STORAGE DB" : "EXPRESS JSON DB"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[11px] uppercase tracking-wider bg-slate-50/30 font-mono">
                <th className="px-6 py-3">ชื่อผู้ใช้งาน</th>
                <th className="px-6 py-3">ระดับการอนุญาต (Role)</th>
                <th className="px-6 py-3">รหัสผ่านปัจจุบัน (สำหรับจัดการ)</th>
                <th className="px-6 py-3">ความเคลื่อนไหวล่าสุด</th>
                <th className="px-6 py-3 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm text-slate-700">
              {users.map((u) => {
                const isMe = u.username.toLowerCase() === currentUser.toLowerCase();
                const canManageUser = isAdmin || isMe;
                
                return (
                  <tr key={u.username} className={`hover:bg-slate-50/50 transition-all ${isMe ? "bg-blue-50/15" : ""}`}>
                    {/* Username Column */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl shrink-0 ${isMe ? "bg-blue-600/10 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 block">{u.username}</span>
                          {isMe && (
                            <span className="text-[10px] bg-blue-100 text-blue-600 border border-blue-200 px-1.5 py-0.2 rounded-md font-bold mt-0.5 inline-block font-sans">
                              บัญชีของคุณตอนนี้
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Role / Authorization Level Column */}
                    <td className="px-6 py-4">
                      {isAdmin && u.username.toLowerCase() !== "admin" ? (
                        <select
                          value={u.role}
                          onChange={(e) => handleChangeRole(u.username, e.target.value as any)}
                          className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer shadow-2xs"
                        >
                          <option value="admin">ผู้ดูแลระบบสูงสุด (Admin)</option>
                          <option value="operator">ผู้ควบคุมบอร์ด (Operator)</option>
                          <option value="viewer">ผู้เข้าชมทั่วไป (Viewer)</option>
                        </select>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold inline-flex items-center gap-1 ${getRoleColor(u.role)}`}>
                          {getRoleIcon(u.role)}
                          <span>{getRoleLabel(u.role)}</span>
                        </span>
                      )}
                    </td>

                    {/* Masked Password column */}
                    <td className="px-6 py-4 font-mono text-slate-500 select-all font-semibold">
                      {canManageUser ? (
                        <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-bold">{u.password || "••••••••"}</span>
                      ) : (
                        <span className="text-slate-300 italic font-sans text-xs">ซ่อนด้วยความปลอดภัย</span>
                      )}
                    </td>

                    {/* Last active timestamp */}
                    <td className="px-6 py-4 text-xs font-medium text-slate-500 font-mono">
                      {u.lastActive}
                    </td>

                    {/* Actions Column */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canManageUser && (
                          <button
                            onClick={() => {
                              setShowEditPassModal(u.username);
                              setNewPassword("");
                              setConfirmPassword("");
                            }}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-100 transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold font-sans"
                            title="เปลี่ยนรหัสผ่าน"
                          >
                            <Key className="w-3.5 h-3.5" />
                            <span>เปลี่ยนรหัสผ่าน</span>
                          </button>
                        )}
                        {isAdmin && u.username.toLowerCase() !== "admin" && !isMe && (
                          <button
                            onClick={() => handleDeleteUser(u.username)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-100 transition-all cursor-pointer"
                            title="ลบผู้ใช้งาน"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Detailed Authorization Guidelines Card (Description of permissions) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs">
        <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
          <Info className="w-4.5 h-4.5 text-indigo-500" />
          <span>รายละเอียดสิทธิ์การใช้งานแต่ละระดับ (Role Privileges)</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Admin Block */}
          <div className="p-4 bg-rose-500/5 border border-rose-100 rounded-xl space-y-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4.5 h-4.5 text-rose-500" />
              <span className="font-bold text-slate-800 text-xs">สิทธิ์ Admin (สูงสุด)</span>
            </div>
            <ul className="text-[11px] text-slate-600 space-y-1 list-disc pl-4 leading-relaxed">
              <li>เพิ่ม ลบ แก้ไขสิทธิ์ผู้ใช้ทั้งหมดได้</li>
              <li>แก้ไขการเชื่อมต่อฐานข้อมูล Supabase</li>
              <li>เปิด/ปิดสวิตช์ LED, รีเลย์ และจัดการเซ็นเซอร์</li>
              <li>เปลี่ยนพินฮาร์ดแวร์และโครงสร้างเซ็นเซอร์</li>
              <li>ล้าง/รีเซ็ตประวัติฐานข้อมูล logs</li>
            </ul>
          </div>

          {/* Operator Block */}
          <div className="p-4 bg-emerald-500/5 border border-emerald-100 rounded-xl space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-500" />
              <span className="font-bold text-slate-800 text-xs">สิทธิ์ Operator (ผู้ควบคุม)</span>
            </div>
            <ul className="text-[11px] text-slate-600 space-y-1 list-disc pl-4 leading-relaxed">
              <li>เปิด/ปิดสวิตช์ LED และ รีเลย์บอร์ด</li>
              <li>แก้ไขเพิ่มเซ็นเซอร์ฮาร์ดแวร์ที่ตรวจจับได้</li>
              <li>ดาวน์โหลดซอร์สโค้ด Arduino ESP32</li>
              <li>เปลี่ยนรหัสผ่านส่วนตัวตนเองได้</li>
              <li className="text-slate-400 italic font-semibold">ไม่สามารถเข้าสู่เมนู Supabase หรือจัดการผู้ใช้อื่น</li>
            </ul>
          </div>

          {/* Viewer Block */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4.5 h-4.5 text-slate-500" />
              <span className="font-bold text-slate-800 text-xs">สิทธิ์ Viewer (ผู้เข้าชม)</span>
            </div>
            <ul className="text-[11px] text-slate-600 space-y-1 list-disc pl-4 leading-relaxed">
              <li>อ่านค่าเซ็นเซอร์แบบเรียลไทม์ได้เท่านั้น</li>
              <li>ดูสถิติกราฟประวัติย้อนหลังและบันทึก logs</li>
              <li>เปลี่ยนรหัสผ่านส่วนตัวตนเองได้</li>
              <li className="text-slate-400 italic font-semibold">ไม่สามารถคลิกควบคุมสวิตช์ไฟหรือสั่งงานใดๆ ได้</li>
              <li className="text-slate-400 italic font-semibold">ไม่สามารถแก้ไขโครงสร้างพินเซ็นเซอร์หลัก</li>
            </ul>
          </div>
        </div>
      </div>

      {/* MODAL: ADD USER */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-400" />
                <span className="font-bold text-sm sm:text-base font-display">เพิ่มผู้ใช้งานเข้าระบบใหม่</span>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">ชื่อผู้ใช้งาน (Username)</label>
                <input
                  type="text"
                  required
                  value={addUsername}
                  onChange={(e) => setAddUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 text-sm rounded-xl focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none transition-all text-slate-800 font-semibold"
                  placeholder="เช่น operator_farm..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">รหัสผ่านสำหรับลงทะเบียน</label>
                <input
                  type="password"
                  required
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 text-sm rounded-xl focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none transition-all text-slate-800 font-mono font-bold"
                  placeholder="ตัวอย่าง: opPass99#"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">สิทธิ์ในการเข้าถึงระบบ (Role)</label>
                <select
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 text-sm rounded-xl focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none transition-all text-slate-800 font-semibold cursor-pointer"
                >
                  <option value="admin">ผู้ดูแลระบบสูงสุด (Admin) - มีสิทธิ์เต็มพิกัด</option>
                  <option value="operator">ผู้ควบคุมบอร์ด (Operator) - ควบคุมอุปกรณ์ได้</option>
                  <option value="viewer">ผู้เข้าชมทั่วไป (Viewer) - ดูได้อย่างเดียว</option>
                </select>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 text-[10px] sm:text-xs text-slate-500 leading-relaxed border border-slate-100">
                💡 บัญชีที่เพิ่มใหม่จะสามารถนำไปป้อนที่หน้าจอ Login เพื่อเข้าทำงานตามสิทธิ์ที่จำกัดได้ทันที
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer text-center"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer shadow-sm shadow-blue-500/10 hover:shadow-md"
                >
                  ลงทะเบียนผู้ใช้
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CHANGE PASSWORD */}
      {showEditPassModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-sm sm:text-base font-display">เปลี่ยนรหัสผ่านสำหรับ: {showEditPassModal}</span>
              </div>
              <button 
                onClick={() => setShowEditPassModal(null)}
                className="text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">รหัสผ่านใหม่ (New Password)</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 text-sm rounded-xl focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none transition-all text-slate-800 font-mono font-bold"
                    placeholder="กรอกรหัสผ่านใหม่..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">ยืนยันรหัสผ่านใหม่อีกครั้ง</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 text-sm rounded-xl focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none transition-all text-slate-800 font-mono font-bold"
                  placeholder="ยืนยันรหัสผ่านใหม่อีกครั้ง..."
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditPassModal(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer text-center"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer shadow-sm shadow-blue-500/10 hover:shadow-md"
                >
                  บันทึกรหัสผ่านใหม่
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
