import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Save, 
  Printer, 
  Search, 
  Edit3, 
  Check, 
  X, 
  CheckCircle2, 
  XCircle, 
  Filter, 
  Info
} from 'lucide-react';
import Swal from 'sweetalert2';
import { db } from '../utils/db';
import { DEFAULT_ROLE_PERMISSIONS } from '../utils/mockData';

export default function RolePermissions({ currentUser, _clinicInfo, setClinicInfo }) {
  const isAdmin = ['Admin', 'admin'].includes(currentUser?.role);

  // สเตตข้อมูลตารางสิทธิ์
  const [permissions, setPermissions] = useState(() => db.getRolePermissions());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [roleFocus, setRoleFocus] = useState('all'); // 'all', 'parent', 'staff', 'ot', 'admin'
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // สเตตสำหรับ Modal แก้ไขสิทธิ์เฉพาะเซลล์
  const [editingCell, setEditingCell] = useState(null); // { permId, roleKey, capability, allowed, note }
  
  // สเตตสำหรับ Modal เพิ่มความสามารถใหม่
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCapability, setNewCapability] = useState({
    capability: '',
    category: 'ทั่วไป & อื่นๆ',
    parentAllowed: false,
    parentNote: '',
    staffAllowed: true,
    staffNote: 'เต็มรูปแบบ',
    otAllowed: true,
    otNote: 'ดู/แก้ไขงานตนเอง',
    adminAllowed: true,
    adminNote: 'จัดการทั้งหมด'
  });

  // สเตตสำหรับแก้ไขชื่อความสามารถ
  const [editingRow, setEditingRow] = useState(null); // { id, capability, category }

  // ซิงค์ข้อมูลเมื่อ clinicInfo หรือ event ภายนอกอัปเดต
  useEffect(() => {
    const handleSync = (e) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setPermissions(e.detail);
        setHasUnsavedChanges(false);
      }
    };
    window.addEventListener('hdh_role_permissions_updated', handleSync);
    return () => window.removeEventListener('hdh_role_permissions_updated', handleSync);
  }, []);

  // ดึงหมวดหมู่ทั้งหมดที่มีในรายการ
  const categories = useMemo(() => {
    const set = new Set();
    permissions.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [permissions]);

  // ฟิลเตอร์ข้อมูลตามคำค้นหาและหมวดหมู่
  const filteredPermissions = useMemo(() => {
    return permissions.filter(item => {
      const matchSearch = 
        !searchQuery ||
        item.capability.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        Object.values(item.roles || {}).some(r => r.note && r.note.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [permissions, searchQuery, selectedCategory]);

  // ข้อกำหนดสีและป้ายของแต่ละบทบาท
  const roleMeta = {
    parent: {
      name: 'ผู้ปกครอง',
      en: 'Parent',
      badgeColor: '#10B981',
      badgeBg: '#ECFDF5',
      borderColor: '#A7F3D0',
      desc: 'ผู้ใช้งานฝั่งครอบครัว / คนไข้'
    },
    staff: {
      name: 'ธุรการ/ต้อนรับ',
      en: 'Staff',
      badgeColor: '#2563EB',
      badgeBg: '#EFF6FF',
      borderColor: '#BFDBFE',
      desc: 'เจ้าหน้าที่ประสานงานและเคาน์เตอร์'
    },
    ot: {
      name: 'นักบำบัด',
      en: 'OT',
      badgeColor: '#7C3AED',
      badgeBg: '#F5F3FF',
      borderColor: '#DDD6FE',
      desc: 'นักกิจกรรมบำบัดวิชาชีพ'
    },
    admin: {
      name: 'ผู้บริหาร',
      en: 'Admin',
      badgeColor: '#D97706',
      badgeBg: '#FFFBEB',
      borderColor: '#FDE68A',
      desc: 'ผู้ดูแลระบบและผู้บริหารคลินิก'
    }
  };

  // ด่วน: สลับสิทธิ์อนุญาต/ไม่อนุญาตสำหรับ Admin
  const handleToggleAllowed = (permId, roleKey) => {
    if (!isAdmin) return;
    setPermissions(prev => prev.map(item => {
      if (item.id === permId) {
        const currentRole = item.roles?.[roleKey] || { allowed: false, note: '' };
        return {
          ...item,
          roles: {
            ...item.roles,
            [roleKey]: {
              ...currentRole,
              allowed: !currentRole.allowed
            }
          }
        };
      }
      return item;
    }));
    setHasUnsavedChanges(true);
  };

  // เปิด Modal แก้ไขสิทธิ์และรายละเอียดของเซลล์
  const handleOpenEditCell = (item, roleKey) => {
    if (!isAdmin) return;
    const roleData = item.roles?.[roleKey] || { allowed: false, note: '' };
    setEditingCell({
      permId: item.id,
      capability: item.capability,
      roleKey,
      roleName: roleMeta[roleKey].name,
      allowed: !!roleData.allowed,
      note: roleData.note || ''
    });
  };

  // บันทึกการแก้ไขเซลล์
  const handleSaveCell = (e) => {
    e?.preventDefault();
    if (!editingCell) return;
    setPermissions(prev => prev.map(item => {
      if (item.id === editingCell.permId) {
        return {
          ...item,
          roles: {
            ...item.roles,
            [editingCell.roleKey]: {
              allowed: editingCell.allowed,
              note: editingCell.note.trim()
            }
          }
        };
      }
      return item;
    }));
    setHasUnsavedChanges(true);
    setEditingCell(null);
  };

  // บันทึกข้อมูลลงฐานข้อมูลและ Cloud
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      db.setRolePermissions(permissions);
      
      if (typeof setClinicInfo === 'function') {
        setClinicInfo(prev => ({
          ...prev,
          rolePermissions: permissions
        }));
      }

      setHasUnsavedChanges(false);

      Swal.fire({
        icon: 'success',
        title: 'บันทึกการตั้งค่าสิทธิ์สำเร็จ! 🛡️',
        text: 'ข้อมูลสิทธิ์การใช้งานตามบทบาทได้รับการอัปเดตและซิงค์เชื่อมต่อไปยังทุกเครื่องเรียบร้อยแล้วค่ะ',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err) {
      console.error('Error saving role permissions:', err);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาดในการบันทึก',
        text: err.message
      });
    } finally {
      setIsSaving(false);
    }
  };

  // คืนค่าเริ่มต้นตามเอกสารอ้างอิงคลินิก
  const handleResetToDefault = async () => {
    if (!isAdmin) return;
    const result = await Swal.fire({
      title: 'คืนค่าตารางสิทธิ์เริ่มต้น?',
      html: `ต้องการรีเซ็ตสิทธิ์ทั้ง 10 หัวข้อกลับเป็นค่ามาตรฐานคลินิกฮักดีโฮมหรือไม่?<br><span style="font-size: 0.85rem; color: #64748B;">(การเปลี่ยนแปลงที่ไม่ได้บันทึกจะถูกแทนที่ด้วยค่ามาตรฐานจากเอกสาร)</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'คืนค่าเริ่มต้น',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#D97706'
    });

    if (result.isConfirmed) {
      setPermissions(DEFAULT_ROLE_PERMISSIONS);
      setHasUnsavedChanges(true);
      Swal.fire({
        icon: 'info',
        title: 'รีเซ็ตเป็นค่าเริ่มต้นแล้ว',
        text: 'กรุณากดปุ่ม "บันทึกการตั้งค่า" เพื่อนำค่าเริ่มต้นไปใช้งานจริง',
        timer: 2200,
        showConfirmButton: false
      });
    }
  };

  // เพิ่มแถวสิทธิ์ใหม่
  const handleAddNewCapability = (e) => {
    e.preventDefault();
    if (!newCapability.capability.trim()) {
      Swal.fire({ icon: 'warning', title: 'กรุณาระบุชื่อความสามารถของระบบ' });
      return;
    }

    const newId = `perm_${Date.now()}`;
    const newRow = {
      id: newId,
      capability: newCapability.capability.trim(),
      category: newCapability.category.trim() || 'ทั่วไป & อื่นๆ',
      roles: {
        parent: { allowed: newCapability.parentAllowed, note: newCapability.parentNote.trim() },
        staff: { allowed: newCapability.staffAllowed, note: newCapability.staffNote.trim() },
        ot: { allowed: newCapability.otAllowed, note: newCapability.otNote.trim() },
        admin: { allowed: newCapability.adminAllowed, note: newCapability.adminNote.trim() }
      }
    };

    setPermissions(prev => [...prev, newRow]);
    setHasUnsavedChanges(true);
    setShowAddModal(false);
    setNewCapability({
      capability: '',
      category: 'ทั่วไป & อื่นๆ',
      parentAllowed: false,
      parentNote: '',
      staffAllowed: true,
      staffNote: 'เต็มรูปแบบ',
      otAllowed: true,
      otNote: 'ดู/แก้ไขงานตนเอง',
      adminAllowed: true,
      adminNote: 'จัดการทั้งหมด'
    });

    Swal.fire({
      icon: 'success',
      title: 'เพิ่มหัวข้อสิทธิ์เรียบร้อย',
      timer: 1500,
      showConfirmButton: false
    });
  };

  // ลบแถวสิทธิ์
  const handleDeleteRow = async (id, title) => {
    if (!isAdmin) return;
    const result = await Swal.fire({
      title: 'ยืนยันการลบสิทธิ์นี้?',
      text: `ต้องการลบ "${title}" ออกจากตารางแจกแจงสิทธิ์หรือไม่`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ลบรายการ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#EF4444'
    });

    if (result.isConfirmed) {
      setPermissions(prev => prev.filter(item => item.id !== id));
      setHasUnsavedChanges(true);
    }
  };

  // บันทึกการแก้ไขชื่อหัวข้อและหมวดหมู่
  const handleSaveEditRow = (e) => {
    e.preventDefault();
    if (!editingRow || !editingRow.capability.trim()) return;

    setPermissions(prev => prev.map(item => {
      if (item.id === editingRow.id) {
        return {
          ...item,
          capability: editingRow.capability.trim(),
          category: editingRow.category.trim() || 'ทั่วไป & อื่นๆ'
        };
      }
      return item;
    }));
    setHasUnsavedChanges(true);
    setEditingRow(null);
  };

  // พิมพ์เอกสารตารางสิทธิ์
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="role-permissions-container" style={{ padding: '1.5rem', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #4A3B32 0%, #2D241E 100%)',
        color: '#FFFFFF',
        borderRadius: '20px',
        padding: '1.75rem 2rem',
        marginBottom: '1.5rem',
        boxShadow: '0 10px 25px -5px rgba(45, 36, 30, 0.15)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <ShieldCheck size={32} color="#FDE047" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
                ตารางแจกแจงสิทธิ์การใช้งานตามบทบาท
              </h1>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: 'rgba(253, 224, 71, 0.2)',
                color: '#FDE047',
                padding: '3px 10px',
                borderRadius: '999px',
                border: '1px solid rgba(253, 224, 71, 0.4)'
              }}>
                Role Matrix
              </span>
            </div>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.88rem', color: '#E2E8F0', opacity: 0.9 }}>
              กำหนดและควบคุมความสามารถในการเข้าถึงระบบของแต่ละบทบาท (ผู้ปกครอง, ธุรการ, นักบำบัด OT, ผู้บริหาร) เพื่อความยืดหยุ่นและโปร่งใสในการดำเนินงาน
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="btn"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '9px 16px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <Plus size={16} /> เพิ่มสิทธิ์ใหม่
              </button>

              <button
                type="button"
                onClick={handleResetToDefault}
                className="btn"
                title="รีเซ็ตสิทธิ์เป็นค่ามาตรฐาน 10 ข้อตามเอกสาร"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#FDE68A',
                  border: '1px solid rgba(253, 230, 138, 0.3)',
                  padding: '9px 14px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={16} /> ค่าเริ่มต้น
              </button>

              <button
                type="button"
                onClick={handleSaveAll}
                disabled={isSaving}
                className="btn"
                style={{
                  backgroundColor: hasUnsavedChanges ? '#10B981' : '#3B82F6',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '9px 18px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: isSaving ? 'wait' : 'pointer',
                  boxShadow: hasUnsavedChanges ? '0 0 15px rgba(16, 185, 129, 0.4)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                <Save size={18} /> {isSaving ? 'กำลังบันทึก...' : hasUnsavedChanges ? 'บันทึกการเปลี่ยนแปลง *' : 'บันทึกการตั้งค่า'}
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="btn"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              color: '#FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              padding: '9px 14px',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Printer size={16} /> พิมพ์ตาราง
          </button>
        </div>
      </div>

      {/* Role Summary Badges Banner */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '12px',
        marginBottom: '1.5rem'
      }}>
        {Object.entries(roleMeta).map(([roleKey, meta]) => {
          const isSelected = roleFocus === roleKey;
          const allowedCount = permissions.filter(p => p.roles?.[roleKey]?.allowed).length;

          return (
            <div
              key={roleKey}
              onClick={() => setRoleFocus(prev => prev === roleKey ? 'all' : roleKey)}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                padding: '14px 18px',
                border: `2px solid ${isSelected ? meta.badgeColor : '#F1F5F9'}`,
                boxShadow: isSelected ? `0 4px 14px ${meta.badgeColor}25` : '0 1px 3px rgba(0,0,0,0.05)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  backgroundColor: meta.badgeBg,
                  color: meta.badgeColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.9rem'
                }}>
                  {roleKey.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1E293B' }}>
                    {meta.name} <span style={{ fontSize: '0.78rem', color: '#64748B' }}>({meta.en})</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                    {meta.desc}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  color: meta.badgeColor,
                  backgroundColor: meta.badgeBg,
                  padding: '4px 8px',
                  borderRadius: '8px'
                }}>
                  {allowedCount}/{permissions.length} สิทธิ์
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter and Search Toolbar */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '14px 18px',
        marginBottom: '1.25rem',
        border: '1px solid #E2E8F0',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        {/* Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 280px', position: 'relative' }}>
          <Search size={18} color="#94A3B8" style={{ position: 'absolute', left: '12px' }} />
          <input
            type="text"
            placeholder="ค้นหาความสามารถของระบบ หรือข้อความระบุสิทธิ์..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 14px 9px 38px',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              fontSize: '0.88rem',
              outline: 'none'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '10px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94A3B8'
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#64748B' }}>
            <Filter size={16} />
            <span>หมวดหมู่:</span>
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              fontSize: '0.85rem',
              backgroundColor: '#F8FAFC',
              color: '#334155',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            <option value="all">ทั้งหมด ({permissions.length} รายการ)</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {roleFocus !== 'all' && (
            <button
              onClick={() => setRoleFocus('all')}
              style={{
                fontSize: '0.8rem',
                backgroundColor: '#F1F5F9',
                color: '#475569',
                border: '1px solid #CBD5E1',
                padding: '6px 10px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              ล้างตัวกรองบทบาท <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Role Permissions Matrix Table */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '20px',
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                <th style={{ padding: '16px 20px', fontWeight: 800, fontSize: '0.9rem', color: '#1E293B', width: '32%' }}>
                  ความสามารถของระบบ (Feature / Capability)
                </th>
                
                {(roleFocus === 'all' || roleFocus === 'parent') && (
                  <th style={{ 
                    padding: '16px 14px', 
                    fontWeight: 800, 
                    fontSize: '0.9rem', 
                    color: '#065F46', 
                    backgroundColor: '#F0FDF4',
                    borderLeft: '1px solid #E2E8F0',
                    width: roleFocus === 'all' ? '17%' : '60%',
                    textAlign: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                      ผู้ปกครอง (Parent)
                    </div>
                  </th>
                )}

                {(roleFocus === 'all' || roleFocus === 'staff') && (
                  <th style={{ 
                    padding: '16px 14px', 
                    fontWeight: 800, 
                    fontSize: '0.9rem', 
                    color: '#1E40AF', 
                    backgroundColor: '#EFF6FF',
                    borderLeft: '1px solid #E2E8F0',
                    width: roleFocus === 'all' ? '17%' : '60%',
                    textAlign: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563EB' }} />
                      ธุรการ/ต้อนรับ (Staff)
                    </div>
                  </th>
                )}

                {(roleFocus === 'all' || roleFocus === 'ot') && (
                  <th style={{ 
                    padding: '16px 14px', 
                    fontWeight: 800, 
                    fontSize: '0.9rem', 
                    color: '#5B21B6', 
                    backgroundColor: '#F5F3FF',
                    borderLeft: '1px solid #E2E8F0',
                    width: roleFocus === 'all' ? '17%' : '60%',
                    textAlign: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#7C3AED' }} />
                      นักบำบัด (OT)
                    </div>
                  </th>
                )}

                {(roleFocus === 'all' || roleFocus === 'admin') && (
                  <th style={{ 
                    padding: '16px 14px', 
                    fontWeight: 800, 
                    fontSize: '0.9rem', 
                    color: '#92400E', 
                    backgroundColor: '#FFFBEB',
                    borderLeft: '1px solid #E2E8F0',
                    width: roleFocus === 'all' ? '17%' : '60%',
                    textAlign: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#D97706' }} />
                      ผู้บริหาร (Admin)
                    </div>
                  </th>
                )}

                {isAdmin && (
                  <th style={{ padding: '16px 12px', fontWeight: 800, fontSize: '0.85rem', color: '#64748B', textAlign: 'center', width: '60px' }}>
                    จัดการ
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredPermissions.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>
                    <Info size={36} style={{ margin: '0 auto 10px', opacity: 0.6 }} />
                    <div style={{ fontWeight: 600, fontSize: '1rem', color: '#64748B' }}>ไม่พบรายการสิทธิ์ที่ตรงกับคำค้นหา</div>
                    <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>ลองเปลี่ยนคำค้นหาหรือตัวกรองหมวดหมู่</div>
                  </td>
                </tr>
              ) : (
                filteredPermissions.map((item, index) => {
                  return (
                    <tr 
                      key={item.id} 
                      style={{ 
                        borderBottom: '1px solid #F1F5F9',
                        backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      {/* Capability Column */}
                      <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1E293B', lineHeight: 1.4 }}>
                              {item.capability}
                            </div>
                            {item.category && (
                              <span style={{
                                display: 'inline-block',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                color: '#64748B',
                                backgroundColor: '#F1F5F9',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                marginTop: '4px'
                              }}>
                                {item.category}
                              </span>
                            )}
                          </div>

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => setEditingRow({ id: item.id, capability: item.capability, category: item.category || '' })}
                              title="แก้ไขชื่อความสามารถ"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#94A3B8',
                                cursor: 'pointer',
                                padding: '4px',
                                borderRadius: '6px'
                              }}
                            >
                              <Edit3 size={15} />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Parent Role Cell */}
                      {(roleFocus === 'all' || roleFocus === 'parent') && (
                        <td 
                          style={{ 
                            padding: '12px 14px', 
                            borderLeft: '1px solid #F1F5F9', 
                            textAlign: 'center', 
                            verticalAlign: 'middle',
                            cursor: isAdmin ? 'pointer' : 'default'
                          }}
                          onClick={() => isAdmin && handleOpenEditCell(item, 'parent')}
                          title={isAdmin ? "คลิกเพื่อแก้ไขสิทธิ์/รายละเอียดของผู้ปกครอง" : undefined}
                        >
                          <RoleCellBadge 
                            allowed={item.roles?.parent?.allowed} 
                            note={item.roles?.parent?.note} 
                            isAdmin={isAdmin}
                            onToggleAllowed={(e) => {
                              e.stopPropagation();
                              handleToggleAllowed(item.id, 'parent');
                            }}
                          />
                        </td>
                      )}

                      {/* Staff Role Cell */}
                      {(roleFocus === 'all' || roleFocus === 'staff') && (
                        <td 
                          style={{ 
                            padding: '12px 14px', 
                            borderLeft: '1px solid #F1F5F9', 
                            textAlign: 'center', 
                            verticalAlign: 'middle',
                            cursor: isAdmin ? 'pointer' : 'default'
                          }}
                          onClick={() => isAdmin && handleOpenEditCell(item, 'staff')}
                          title={isAdmin ? "คลิกเพื่อแก้ไขสิทธิ์/รายละเอียดของธุรการ" : undefined}
                        >
                          <RoleCellBadge 
                            allowed={item.roles?.staff?.allowed} 
                            note={item.roles?.staff?.note} 
                            isAdmin={isAdmin}
                            onToggleAllowed={(e) => {
                              e.stopPropagation();
                              handleToggleAllowed(item.id, 'staff');
                            }}
                          />
                        </td>
                      )}

                      {/* OT Role Cell */}
                      {(roleFocus === 'all' || roleFocus === 'ot') && (
                        <td 
                          style={{ 
                            padding: '12px 14px', 
                            borderLeft: '1px solid #F1F5F9', 
                            textAlign: 'center', 
                            verticalAlign: 'middle',
                            cursor: isAdmin ? 'pointer' : 'default'
                          }}
                          onClick={() => isAdmin && handleOpenEditCell(item, 'ot')}
                          title={isAdmin ? "คลิกเพื่อแก้ไขสิทธิ์/รายละเอียดของนักบำบัด OT" : undefined}
                        >
                          <RoleCellBadge 
                            allowed={item.roles?.ot?.allowed} 
                            note={item.roles?.ot?.note} 
                            isAdmin={isAdmin}
                            onToggleAllowed={(e) => {
                              e.stopPropagation();
                              handleToggleAllowed(item.id, 'ot');
                            }}
                          />
                        </td>
                      )}

                      {/* Admin Role Cell */}
                      {(roleFocus === 'all' || roleFocus === 'admin') && (
                        <td 
                          style={{ 
                            padding: '12px 14px', 
                            borderLeft: '1px solid #F1F5F9', 
                            textAlign: 'center', 
                            verticalAlign: 'middle',
                            cursor: isAdmin ? 'pointer' : 'default'
                          }}
                          onClick={() => isAdmin && handleOpenEditCell(item, 'admin')}
                          title={isAdmin ? "คลิกเพื่อแก้ไขสิทธิ์/รายละเอียดของผู้บริหาร Admin" : undefined}
                        >
                          <RoleCellBadge 
                            allowed={item.roles?.admin?.allowed} 
                            note={item.roles?.admin?.note} 
                            isAdmin={isAdmin}
                            onToggleAllowed={(e) => {
                              e.stopPropagation();
                              handleToggleAllowed(item.id, 'admin');
                            }}
                          />
                        </td>
                      )}

                      {/* Actions Column */}
                      {isAdmin && (
                        <td style={{ padding: '12px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(item.id, item.capability)}
                            title="ลบแถวความสามารถนี้"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#EF4444',
                              cursor: 'pointer',
                              padding: '6px',
                              borderRadius: '8px',
                              opacity: 0.7,
                              transition: 'opacity 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Info & Explanation Note */}
      <div style={{
        marginTop: '1.5rem',
        padding: '1rem 1.5rem',
        backgroundColor: '#F8FAFC',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '0.85rem',
        color: '#64748B'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={16} color="#3B82F6" />
          <span>
            <strong>สัญลักษณ์:</strong> <span style={{ color: '#059669', fontWeight: 700 }}>✓</span> = ได้รับอนุญาตในระบบ, <span style={{ color: '#DC2626', fontWeight: 700 }}>✕</span> = ไม่อนุญาตหรือจำกัดสิทธิ์, ในวงเล็บระบุขอบเขตการทำงานเฉพาะ
          </span>
        </div>
        {isAdmin && (
          <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
            💡 แอดมินสามารถคลิกที่แต่ละช่องเพื่อปรับเปลี่ยนสถานะหรือระบุข้อความสิทธิ์ได้อย่างอิสระ
          </div>
        )}
      </div>

      {/* MODAL 1: Edit Specific Cell Permission Note */}
      {editingCell && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease'
          }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#F8FAFC'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1E293B' }}>
                  แก้ไขสิทธิ์: {editingCell.roleName}
                </h3>
                <div style={{ fontSize: '0.82rem', color: '#64748B', marginTop: '2px' }}>
                  {editingCell.capability}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCell(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCell} style={{ padding: '1.5rem' }}>
              {/* Permission Toggle */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  สถานะการอนุญาต (Permission Status)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setEditingCell(prev => ({ ...prev, allowed: true }))}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: editingCell.allowed ? '2px solid #10B981' : '1px solid #CBD5E1',
                      backgroundColor: editingCell.allowed ? '#ECFDF5' : '#FFFFFF',
                      color: editingCell.allowed ? '#065F46' : '#64748B',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <CheckCircle2 size={18} color={editingCell.allowed ? '#10B981' : '#94A3B8'} />
                    อนุญาตให้ใช้งาน (✓)
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingCell(prev => ({ ...prev, allowed: false }))}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: !editingCell.allowed ? '2px solid #EF4444' : '1px solid #CBD5E1',
                      backgroundColor: !editingCell.allowed ? '#FEF2F2' : '#FFFFFF',
                      color: !editingCell.allowed ? '#991B1B' : '#64748B',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <XCircle size={18} color={!editingCell.allowed ? '#EF4444' : '#94A3B8'} />
                    ไม่อนุญาต / จำกัด (✕)
                  </button>
                </div>
              </div>

              {/* Note / Scope description */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  รายละเอียดหรือขอบเขตสิทธิ์ (ถ้าทำได้ ทำอะไรได้บ้าง)
                </label>
                <input
                  type="text"
                  value={editingCell.note}
                  onChange={(e) => setEditingCell(prev => ({ ...prev, note: e.target.value }))}
                  placeholder="เช่น เต็มรูปแบบ, ดูประวัติตนเอง, เฉพาะเคสที่ได้รับมอบหมาย"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
                <span style={{ fontSize: '0.78rem', color: '#64748B', display: 'block', marginTop: '6px' }}>
                  * หากเว้นว่างไว้จะแสดงเฉพาะสัญลักษณ์ ✓ หรือ ✕ ตามสถานะ
                </span>
              </div>

              {/* Quick Preset Chips */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B', marginBottom: '6px' }}>
                  ข้อความแนะนำด่วน:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {['เต็มรูปแบบ', 'จัดการทั้งหมด', 'ดู/แก้ไขประวัติ', 'ดูตารางงานตนเอง', 'ตรวจสอบ', 'รับแจ้งเตือน', 'หน้าจอดิจิทัล/ปากกา', 'รับรายงานสรุป', 'ประเมิน & แปลผล', 'โทรตาม & บันทึก Note'].map(chip => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setEditingCell(prev => ({ ...prev, note: chip }))}
                      style={{
                        fontSize: '0.75rem',
                        backgroundColor: '#F1F5F9',
                        color: '#475569',
                        border: '1px solid #E2E8F0',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingCell(null)}
                  className="btn"
                  style={{
                    padding: '9px 16px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#64748B',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="btn"
                  style={{
                    padding: '9px 20px',
                    borderRadius: '10px',
                    backgroundColor: '#10B981',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  ใช้ค่านี้
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add New System Capability */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '640px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#F8FAFC'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1E293B' }}>
                  เพิ่มความสามารถและสิทธิ์ใหม่ของระบบ
                </h3>
                <div style={{ fontSize: '0.82rem', color: '#64748B', marginTop: '2px' }}>
                  กำหนดความสามารถใหม่พร้อมระบุสิทธิ์ของทั้ง 4 บทบาท
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddNewCapability} style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  ชื่อความสามารถของระบบ (Feature Name) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ระบบส่งไฟล์เอกสารภาษี, จัดการใบส่งตัวออนไลน์"
                  value={newCapability.capability}
                  onChange={(e) => setNewCapability(prev => ({ ...prev, capability: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  หมวดหมู่ (Category)
                </label>
                <input
                  type="text"
                  list="category-suggestions"
                  placeholder="เลือกหรือพิมพ์หมวดหมู่ใหม่"
                  value={newCapability.category}
                  onChange={(e) => setNewCapability(prev => ({ ...prev, category: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9rem'
                  }}
                />
                <datalist id="category-suggestions">
                  {categories.map(c => <option key={c} value={c} />)}
                  <option value="ทั่วไป & อื่นๆ" />
                </datalist>
              </div>

              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                กำหนดสิทธิ์เริ่มต้นของแต่ละบทบาท:
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginBottom: '1.5rem' }}>
                {/* Parent */}
                <div style={{ padding: '10px 14px', backgroundColor: '#F0FDF4', borderRadius: '12px', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="new-parent-allowed"
                    checked={newCapability.parentAllowed}
                    onChange={(e) => setNewCapability(prev => ({ ...prev, parentAllowed: e.target.checked }))}
                    style={{ width: '18px', height: '18px', accentColor: '#10B981' }}
                  />
                  <label htmlFor="new-parent-allowed" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#065F46', width: '90px' }}>
                    ผู้ปกครอง:
                  </label>
                  <input
                    type="text"
                    placeholder="รายละเอียด (ถ้ามี)"
                    value={newCapability.parentNote}
                    onChange={(e) => setNewCapability(prev => ({ ...prev, parentNote: e.target.value }))}
                    style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', border: '1px solid #86EFAC', fontSize: '0.82rem' }}
                  />
                </div>

                {/* Staff */}
                <div style={{ padding: '10px 14px', backgroundColor: '#EFF6FF', borderRadius: '12px', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="new-staff-allowed"
                    checked={newCapability.staffAllowed}
                    onChange={(e) => setNewCapability(prev => ({ ...prev, staffAllowed: e.target.checked }))}
                    style={{ width: '18px', height: '18px', accentColor: '#2563EB' }}
                  />
                  <label htmlFor="new-staff-allowed" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1E40AF', width: '90px' }}>
                    ธุรการ:
                  </label>
                  <input
                    type="text"
                    placeholder="รายละเอียด (ถ้ามี)"
                    value={newCapability.staffNote}
                    onChange={(e) => setNewCapability(prev => ({ ...prev, staffNote: e.target.value }))}
                    style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', border: '1px solid #93C5FD', fontSize: '0.82rem' }}
                  />
                </div>

                {/* OT */}
                <div style={{ padding: '10px 14px', backgroundColor: '#F5F3FF', borderRadius: '12px', border: '1px solid #DDD6FE', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="new-ot-allowed"
                    checked={newCapability.otAllowed}
                    onChange={(e) => setNewCapability(prev => ({ ...prev, otAllowed: e.target.checked }))}
                    style={{ width: '18px', height: '18px', accentColor: '#7C3AED' }}
                  />
                  <label htmlFor="new-ot-allowed" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#5B21B6', width: '90px' }}>
                    นักบำบัด OT:
                  </label>
                  <input
                    type="text"
                    placeholder="รายละเอียด (ถ้ามี)"
                    value={newCapability.otNote}
                    onChange={(e) => setNewCapability(prev => ({ ...prev, otNote: e.target.value }))}
                    style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', border: '1px solid #C4B5FD', fontSize: '0.82rem' }}
                  />
                </div>

                {/* Admin */}
                <div style={{ padding: '10px 14px', backgroundColor: '#FFFBEB', borderRadius: '12px', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="new-admin-allowed"
                    checked={newCapability.adminAllowed}
                    onChange={(e) => setNewCapability(prev => ({ ...prev, adminAllowed: e.target.checked }))}
                    style={{ width: '18px', height: '18px', accentColor: '#D97706' }}
                  />
                  <label htmlFor="new-admin-allowed" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#92400E', width: '90px' }}>
                    ผู้บริหาร:
                  </label>
                  <input
                    type="text"
                    placeholder="รายละเอียด (ถ้ามี)"
                    value={newCapability.adminNote}
                    onChange={(e) => setNewCapability(prev => ({ ...prev, adminNote: e.target.value }))}
                    style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', border: '1px solid #FCD34D', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn"
                  style={{
                    padding: '9px 16px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#64748B',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="btn"
                  style={{
                    padding: '9px 20px',
                    borderRadius: '10px',
                    backgroundColor: '#3B82F6',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  เพิ่มความสามารถนี้
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Edit Capability Row Title */}
      {editingRow && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#F8FAFC'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1E293B' }}>
                แก้ไขชื่อความสามารถของระบบ
              </h3>
              <button
                type="button"
                onClick={() => setEditingRow(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEditRow} style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  ชื่อความสามารถ *
                </label>
                <input
                  type="text"
                  required
                  value={editingRow.capability}
                  onChange={(e) => setEditingRow(prev => ({ ...prev, capability: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  หมวดหมู่
                </label>
                <input
                  type="text"
                  value={editingRow.category}
                  onChange={(e) => setEditingRow(prev => ({ ...prev, category: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingRow(null)}
                  className="btn"
                  style={{
                    padding: '9px 16px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#64748B',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="btn"
                  style={{
                    padding: '9px 20px',
                    borderRadius: '10px',
                    backgroundColor: '#10B981',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// Subcomponent: ป้ายแสดงสิทธิ์ในแต่ละช่อง
function RoleCellBadge({ allowed, note, isAdmin, onToggleAllowed }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
      {allowed ? (
        <span 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#ECFDF5',
            color: '#065F46',
            border: '1px solid #A7F3D0',
            padding: '4px 10px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.85rem'
          }}
        >
          <span style={{ fontSize: '1rem', fontWeight: 900, color: '#10B981' }}>✓</span>
          {note ? (
            <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>
              {note.startsWith('(') ? note : `${note}`}
            </span>
          ) : (
            <span style={{ fontSize: '0.78rem', color: '#059669' }}>อนุญาต</span>
          )}
        </span>
      ) : (
        <span 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: note ? '#F8FAFC' : 'transparent',
            color: note ? '#64748B' : '#94A3B8',
            border: note ? '1px solid #E2E8F0' : 'none',
            padding: note ? '4px 8px' : '2px 6px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.85rem'
          }}
        >
          <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#EF4444' }}>✕</span>
          {note && (
            <span style={{ fontWeight: 500, fontSize: '0.8rem', color: '#64748B' }}>
              {note.startsWith('(') ? note : `(${note})`}
            </span>
          )}
        </span>
      )}

      {isAdmin && (
        <button
          type="button"
          onClick={onToggleAllowed}
          title={allowed ? "คลิกเพื่อสลับเป็นไม่อนุญาต (✕)" : "คลิกเพื่อสลับเป็นอนุญาต (✓)"}
          style={{
            background: 'none',
            border: '1px solid #E2E8F0',
            borderRadius: '6px',
            padding: '2px 6px',
            cursor: 'pointer',
            fontSize: '0.72rem',
            color: allowed ? '#EF4444' : '#10B981',
            backgroundColor: '#FFFFFF',
            lineHeight: 1.2
          }}
        >
          {allowed ? '✕ ปิด' : '✓ เปิด'}
        </button>
      )}
    </div>
  );
}
