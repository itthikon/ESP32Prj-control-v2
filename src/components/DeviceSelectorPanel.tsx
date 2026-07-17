import React, { useState } from "react";
import { DeviceInfo } from "../types";
import { Plus, Trash2, Edit2, Cpu, Check, AlertCircle, RefreshCw, MapPin, Radio, Wifi } from "lucide-react";

interface DeviceSelectorPanelProps {
  devices: DeviceInfo[];
  selectedDeviceId: string;
  onSelectDevice: (id: string) => void;
  onAddDevice: (id: string, location: string) => Promise<{ success: boolean; error?: string }>;
  onDeleteDevice: (id: string) => Promise<{ success: boolean; error?: string }>;
  onEditDevice: (id: string, location: string) => Promise<{ success: boolean; error?: string }>;
}

export default function DeviceSelectorPanel({
  devices,
  selectedDeviceId,
  onSelectDevice,
  onAddDevice,
  onDeleteDevice,
  onEditDevice,
}: DeviceSelectorPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [idInput, setIdInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Editing state
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [editLocationInput, setEditLocationInput] = useState("");
  const [isEditingSubmitting, setIsEditingSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanId = idInput.trim().replace(/[^a-zA-Z0-9_-]/g, "");
    if (!cleanId) {
      setFormError("กรุณากรอกรหัสอุปกรณ์เฉพาะตัวอักษรและตัวเลขเท่านั้น (A-Z, 0-9, -, _)");
      return;
    }

    if (!locationInput.trim()) {
      setFormError("กรุณาระบุชื่อสถานที่/โรงเรือน");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onAddDevice(cleanId, locationInput.trim());
      if (res.success) {
        setIdInput("");
        setLocationInput("");
        setShowForm(false);
      } else {
        setFormError(res.error || "ไม่สามารถเพิ่มบอร์ดใหม่ได้");
      }
    } catch (err: any) {
      setFormError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (id: string, currentLocation: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDeviceId(id);
    setEditLocationInput(currentLocation);
  };

  const handleSaveEdit = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editLocationInput.trim()) {
      alert("กรุณากรอกชื่อสถานที่ติดตั้ง");
      return;
    }
    setIsEditingSubmitting(true);
    try {
      const res = await onEditDevice(id, editLocationInput.trim());
      if (res.success) {
        setEditingDeviceId(null);
      } else {
        alert(res.error || "ไม่สามารถอัปเดตชื่อสถานที่ติดตั้งได้");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsEditingSubmitting(false);
    }
  };

  const handleDelete = async (id: string, location: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent switching device when clicking delete button

    if (!window.confirm(`คุณต้องการลบสถานที่ [${location}] (ID: ${id}) ออกจากแผงควบคุมใช่หรือไม่?`)) {
      return;
    }

    try {
      const res = await onDeleteDevice(id);
      if (!res.success) {
        alert(res.error || "เกิดข้อผิดพลาดในการลบอุปกรณ์");
      }
    } catch (err) {
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อลบข้อมูลได้");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold font-display text-slate-800">
              เลือกสถานที่และอุปกรณ์ ESP32 (Locations & Devices)
            </h3>
            <p className="text-xs text-slate-400">
              สลับมุมมอง รายงานข้อมูลเซ็นเซอร์ และบันทึกประวัติ แยกอิสระตามแต่ละโรงเรือน
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setShowForm(!showForm);
            setFormError(null);
          }}
          className={`text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 self-start sm:self-auto ${
            showForm
              ? "bg-slate-100 text-slate-700 border border-slate-200"
              : "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
          }`}
        >
          <Plus className={`w-4 h-4 transition-transform ${showForm ? "rotate-45" : ""}`} />
          <span>{showForm ? "ปิดช่องกรอก" : "เพิ่มสถานที่/บอร์ดใหม่"}</span>
        </button>
      </div>

      {/* Add New Location Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-4 animate-fade-in">
          <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
            <Cpu className="w-3.5 h-3.5 text-blue-500" />
            <span>ฟอร์มลงทะเบียนสถานที่ติดตั้งใหม่</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600">รหัสอุปกรณ์เฉพาะตัว (Board ID / Unique ID)</label>
              <input
                type="text"
                required
                disabled={isSubmitting}
                value={idInput}
                onChange={(e) => setIdInput(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                placeholder="เช่น Greenhouse_Alpha, device_tomato"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 focus:border-blue-500 outline-none transition-all"
              />
              <p className="text-[10px] text-slate-400">ห้ามมีเว้นวรรค ใช้ภาษาอังกฤษ ตัวเลข และขีดกลาง/ขีดล่างเท่านั้น</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600">ชื่อสถานที่/โรงเรือนติดตั้ง (Location Name)</label>
              <input
                type="text"
                required
                disabled={isSubmitting}
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder="เช่น โรงเรือนที่ 4 (แปลงพริกขี้หนูสมาร์ท)"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:border-blue-500 outline-none transition-all"
              />
              <p className="text-[10px] text-slate-400">ใส่รายละเอียดชนิดพืชหรือจังหวัดเพื่อให้จดจำได้ง่าย</p>
            </div>
          </div>

          {formError && (
            <div className="bg-rose-50 border border-rose-100 text-rose-800 text-[11px] p-2.5 rounded-xl flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{formError}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1 border-t border-slate-200/50">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setShowForm(false);
                setFormError(null);
              }}
              className="text-xs font-semibold hover:bg-slate-100 text-slate-500 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-1.5 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>ลงทะเบียนบอร์ด</span>
            </button>
          </div>
        </form>
      )}

      {/* Grid of existing locations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {devices.map((dev) => {
          const isSelected = dev.id === selectedDeviceId;
          return (
            <div
              key={dev.id}
              onClick={() => onSelectDevice(dev.id)}
              className={`border rounded-2xl p-4 transition-all cursor-pointer relative flex flex-col justify-between group h-full ${
                isSelected
                  ? "bg-blue-50/50 border-blue-500 ring-1 ring-blue-500/20 shadow-xs"
                  : "bg-white border-slate-200 hover:bg-slate-50/50 hover:border-slate-300"
              }`}
            >
              {/* Active check indicator */}
              {isSelected && (
                <span className="absolute top-3.5 right-3.5 p-1 bg-blue-600 text-white rounded-full">
                  <Check className="w-3 h-3" />
                </span>
              )}

              <div className="space-y-2">
                {/* Online Status Badge & RSSI indicator */}
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    {dev.isOnline && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${
                      dev.isOnline ? "bg-emerald-500" : "bg-rose-400"
                    }`}></span>
                  </span>
                  <span className={`text-[10px] font-bold ${
                    dev.isOnline ? "text-emerald-700" : "text-rose-500"
                  }`}>
                    {dev.isOnline ? "ONLINE" : "OFFLINE"}
                  </span>

                  {dev.syncPending && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100 animate-pulse" title="การตั้งค่าบอร์ดนี้มีการปรับเปลี่ยนแบบ Local และกำลังรอสัญญาณเน็ตเพื่อซิงค์ไปยังอินเทอร์เน็ต">
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                      <span>รอซิงค์</span>
                    </span>
                  )}

                  {dev.telemetry?.wifiRssi !== undefined && dev.isOnline && (
                    <span className="text-[10px] text-slate-400 font-mono flex items-center gap-0.5 ml-auto pr-6">
                      <Wifi className="w-2.5 h-2.5" />
                      <span>{dev.telemetry.wifiRssi} dBm</span>
                    </span>
                  )}
                </div>

                {/* Location Title & Device ID */}
                <div className="space-y-0.5 pr-4">
                  {editingDeviceId === dev.id ? (
                    <div className="flex items-center gap-1.5 w-full mt-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editLocationInput}
                        onChange={(e) => setEditLocationInput(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 focus:border-blue-500 outline-none"
                        placeholder="ชื่อสถานที่ใหม่"
                        autoFocus
                      />
                      <button
                        onClick={(e) => handleSaveEdit(dev.id, e)}
                        disabled={isEditingSubmitting}
                        className="p-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg transition-all cursor-pointer shrink-0"
                        title="บันทึก"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingDeviceId(null);
                        }}
                        className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all cursor-pointer shrink-0"
                        title="ยกเลิก"
                      >
                        <Plus className="w-3 h-3 rotate-45" />
                      </button>
                    </div>
                  ) : (
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-1">
                      {dev.location}
                    </h4>
                  )}
                  <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                    <span>ID:</span>
                    <span className="bg-slate-100 text-slate-600 px-1 py-0.2 rounded-md font-bold">{dev.id}</span>
                  </div>
                </div>
              </div>

              {/* Mini Quick Telemetry values */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-slate-500 text-[11px] font-medium">
                <div className="flex gap-3">
                  <div>
                    <span className="text-slate-400 text-[10px] block font-semibold">อุณหภูมิ</span>
                    <span className="text-slate-700 font-bold font-mono">
                      {dev.telemetry?.temperature !== undefined ? `${dev.telemetry.temperature}°C` : "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-semibold">ความชื้นดิน</span>
                    <span className="text-slate-700 font-bold font-mono">
                      {dev.telemetry?.soilMoisture !== undefined ? `${dev.telemetry.soilMoisture}%` : "-"}
                    </span>
                  </div>
                </div>

                {/* Edit and Delete actions for all boards */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => handleStartEdit(dev.id, dev.location, e)}
                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all shrink-0 cursor-pointer opacity-0 group-hover:opacity-100"
                    title="แก้ไขชื่อสถานที่"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(dev.id, dev.location, e)}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all shrink-0 cursor-pointer opacity-0 group-hover:opacity-100"
                    title="ลบสถานที่นี้"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
