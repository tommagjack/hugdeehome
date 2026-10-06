import React, { useState, useEffect } from 'react';
import { 
  Award, Sparkles, ExternalLink, Copy, Check, Plus, Edit3, Trash2, 
  MapPin, Phone, MessageCircle, Save, RotateCcw, ArrowLeft, ArrowUpRight,
  ShieldCheck, Eye, Layers, Upload, Info
} from 'lucide-react';
import Swal from 'sweetalert2';
import { DEFAULT_CLINIC_LOGO } from '../utils/defaultAssets';
import { db } from '../utils/db';

const DEFAULT_HIGHLIGHT_DOMAINS = [
  {
    title: 'กิจกรรมบำบัด (Occupational Therapy)',
    desc: 'ฟื้นฟูและส่งเสริมพัฒนาการกล้ามเนื้อมัดเล็ก การหยิบจับ การเขียน ทักษะชีวิตประจำวัน และการช่วยเหลือตนเอง',
    icon: '🧩',
    color: '#EA580C',
    bg: '#FFF7ED',
    badge: 'แนะนำ'
  },
  {
    title: 'บูรณาการประสาทความรู้สึก (Sensory Integration - SI)',
    desc: 'ปรับสมดุลระบบประสาทสัมผัส ลดความไวต่อสิ่งเร้า เพิ่มสมาธิ การทรงตัว และการวางแผนการเคลื่อนไหว',
    icon: '🧠',
    color: '#0284C7',
    bg: '#F0F9FF',
    badge: 'ยอดนิยม'
  },
  {
    title: 'กระตุ้นพัฒนาการเด็ก & พฤติกรรมบำบัด',
    desc: 'ส่งเสริมการสื่อสาร การสบตา อารมณ์ ทักษะทางสังคม และเตรียมความพร้อมก่อนเข้าเรียน',
    icon: '🌱',
    color: '#059669',
    bg: '#ECFDF5',
    badge: 'เฉพาะบุคคล'
  },
  {
    title: 'การประเมินและวางแผนรายบุคคล (ITP Plan)',
    desc: 'ตรวจประเมินพัฒนาการอย่างรอบด้าน ออกแบบแผนการฝึกเฉพาะบุคคล พร้อมให้คำแนะนำผู้ปกครองฝึกต่อที่บ้าน',
    icon: '📋',
    color: '#7C3AED',
    bg: '#FAF5FF',
    badge: 'ครบวงจร'
  }
];

export default function ServicesPageEditor({
  clinicInfo,
  setClinicInfo,
  services = [],
  setServices,
  onRefreshData,
  logActivity,
  onBack
}) {
  const [editorSubTab, setEditorSubTab] = useState('general'); // 'general' | 'programs' | 'services' | 'preview'
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // General clinic info states
  const [clinicName, setClinicName] = useState(clinicInfo?.name || 'บ้านฮักดี');
  const [subtitle, setSubtitle] = useState(clinicInfo?.servicesSubtitle || 'บริการกิจกรรมบำบัดและส่งเสริมพัฒนาการเด็ก โดยทีมนักกิจกรรมบำบัดวิชาชีพ 🤎');
  const [phone, setPhone] = useState(clinicInfo?.phone || '0946753557');
  const [lineId, setLineId] = useState(clinicInfo?.lineId || '@hugdeehome');
  const [logoUrl, setLogoUrl] = useState(clinicInfo?.logoUrl || DEFAULT_CLINIC_LOGO);
  const [address, setAddress] = useState(clinicInfo?.address || '104/7 หมู่ 17 ตำบลบ้านต๋อม อำเภอเมือง จังหวัดพะเยา 56000');
  const [footerTitle, setFooterTitle] = useState(clinicInfo?.servicesFooterTitle || 'พร้อมร่วมดูแลพัฒนาการลูกรักกับบ้านฮักดี');
  const [mapsUrl, setMapsUrl] = useState(clinicInfo?.mapsUrl || 'https://maps.google.com/?q=Hug+Dee+Home+Clinic');

  // Highlight domains state
  const [programs, setPrograms] = useState(() => {
    if (Array.isArray(clinicInfo?.servicePrograms) && clinicInfo.servicePrograms.length > 0) {
      return clinicInfo.servicePrograms;
    }
    return DEFAULT_HIGHLIGHT_DOMAINS;
  });

  // Services list state (local copy for editing)
  const [localServices, setLocalServices] = useState(services || []);

  useEffect(() => {
    if (services && services.length > 0) {
      setLocalServices(services);
    }
  }, [services]);

  // Modal State for Adding/Editing Service
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingServiceIndex, setEditingServiceIndex] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    code: '',
    name: '',
    price: '',
    description: '',
    sessionsPerUnit: 1,
    duration: 60,
    category: 'บำบัดฟื้นฟู'
  });

  // Modal State for Adding/Editing Program
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [editingProgramIndex, setEditingProgramIndex] = useState(null);
  const [programForm, setProgramForm] = useState({
    title: '',
    desc: '',
    icon: '🧩',
    color: '#EA580C',
    bg: '#FFF7ED',
    badge: 'แนะนำ'
  });

  const fullServicesUrl = 'https://portal.hugdeehome.com/#/services';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullServicesUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Open Service Modal
  const openAddServiceModal = () => {
    setEditingServiceIndex(null);
    setServiceForm({
      code: `SRV-${Date.now().toString().slice(-4)}`,
      name: '',
      price: '',
      description: 'ราคาปกติ',
      sessionsPerUnit: 1,
      duration: 60,
      category: 'บำบัดฟื้นฟู'
    });
    setShowServiceModal(true);
  };

  const openEditServiceModal = (srv, index) => {
    setEditingServiceIndex(index);
    setServiceForm({
      code: srv.code || `SRV-${index}`,
      name: srv.name || '',
      price: srv.price !== undefined ? srv.price : '',
      description: srv.description || '',
      sessionsPerUnit: srv.sessionsPerUnit || 1,
      duration: srv.duration || 60,
      category: srv.category || 'บำบัดฟื้นฟู'
    });
    setShowServiceModal(true);
  };

  const handleSaveServiceForm = (e) => {
    e.preventDefault();
    if (!serviceForm.name.trim()) {
      Swal.fire({ icon: 'warning', title: 'กรุณากรอกชื่อบริการ' });
      return;
    }
    const priceNum = Number(serviceForm.price) || 0;
    const newSrv = {
      ...serviceForm,
      price: priceNum,
      sessionsPerUnit: Number(serviceForm.sessionsPerUnit) || 1
    };

    if (editingServiceIndex !== null) {
      const updated = [...localServices];
      updated[editingServiceIndex] = newSrv;
      setLocalServices(updated);
    } else {
      setLocalServices([...localServices, newSrv]);
    }
    setShowServiceModal(false);
  };

  const handleDeleteService = (index) => {
    const srv = localServices[index];
    Swal.fire({
      title: 'ยืนยันการลบบริการ?',
      text: `ต้องการลบรายการ "${srv?.name}" ออกจากหน้าบริการหรือไม่`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบรายการ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#EF4444'
    }).then((res) => {
      if (res.isConfirmed) {
        setLocalServices(localServices.filter((_, idx) => idx !== index));
      }
    });
  };

  // Open Program Modal
  const openAddProgramModal = () => {
    setEditingProgramIndex(null);
    setProgramForm({
      title: '',
      desc: '',
      icon: '✨',
      color: '#059669',
      bg: '#ECFDF5',
      badge: 'บริการเด่น'
    });
    setShowProgramModal(true);
  };

  const openEditProgramModal = (prog, index) => {
    setEditingProgramIndex(index);
    setProgramForm({ ...prog });
    setShowProgramModal(true);
  };

  const handleSaveProgramForm = (e) => {
    e.preventDefault();
    if (!programForm.title.trim()) {
      Swal.fire({ icon: 'warning', title: 'กรุณากรอกชื่อโปรแกรม' });
      return;
    }
    if (editingProgramIndex !== null) {
      const updated = [...programs];
      updated[editingProgramIndex] = programForm;
      setPrograms(updated);
    } else {
      setPrograms([...programs, programForm]);
    }
    setShowProgramModal(false);
  };

  const handleDeleteProgram = (index) => {
    Swal.fire({
      title: 'ยืนยันการลบโปรแกรม?',
      text: `ต้องการลบโปรแกรมนี้ออกจากหน้าบริการหรือไม่`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบโปรแกรม',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#EF4444'
    }).then((res) => {
      if (res.isConfirmed) {
        setPrograms(programs.filter((_, idx) => idx !== index));
      }
    });
  };

  const handleResetPrograms = () => {
    Swal.fire({
      title: 'คืนค่าโปรแกรมบำบัดเริ่มต้น?',
      text: 'ระบบจะรีเซ็ตโปรแกรมบำบัด 4 ด้านกลับเป็นค่ามาตรฐานของคลินิก',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันคืนค่า',
      cancelButtonText: 'ยกเลิก'
    }).then((res) => {
      if (res.isConfirmed) {
        setPrograms(DEFAULT_HIGHLIGHT_DOMAINS);
      }
    });
  };

  // Main Save All Changes to ClinicInfo + Services
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const updatedClinic = {
        ...(clinicInfo || {}),
        name: clinicName,
        phone: phone,
        lineId: lineId,
        logoUrl: logoUrl,
        address: address,
        servicesSubtitle: subtitle,
        servicesFooterTitle: footerTitle,
        mapsUrl: mapsUrl,
        servicePrograms: programs
      };

      // 1. Update clinicInfo
      if (typeof setClinicInfo === 'function') {
        setClinicInfo(updatedClinic);
      }
      db.setClinicInfo(updatedClinic);

      // 2. Update services
      if (typeof setServices === 'function') {
        setServices(localServices);
      }
      db.setServices(localServices);

      if (typeof logActivity === 'function') {
        logActivity('อัปเดตข้อมูลและรายการแพ็กเกจหน้าบริการสาธารณะ (portal.hugdeehome.com/#/services)');
      }

      Swal.fire({
        icon: 'success',
        title: 'บันทึกข้อมูลเรียบร้อย',
        text: 'ระบบได้อัปเดตข้อมูลหน้า https://portal.hugdeehome.com/#/services และซิงค์ขึ้นระบบคลาวด์เรียบร้อยแล้ว',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err) {
      console.error('Save error:', err);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาดในการบันทึก',
        text: err.message
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '1.75rem', border: '1px solid #E2E8F0', boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }}>
      
      {/* Top Banner & Actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        paddingBottom: '1.25rem',
        borderBottom: '1px solid #E2E8F0',
        marginBottom: '1.5rem'
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '8px', backgroundColor: '#FEF3C7', color: '#B45309', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px' }}>
            <Award size={15} /> หน้าบริการสาธารณะ & เมนู LINE Rich Menu #1
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: '800', margin: '0 0 4px 0', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
            จัดการและอัปเดตหน้าบริการคลินิก 🛍️
          </h2>
          <div style={{ fontSize: '0.86rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span>URL: <strong style={{ color: '#0284C7' }}>{fullServicesUrl}</strong></span>
            <span>•</span>
            <span>ปลายทางของปุ่ม "บริการของเรา" ใน LINE Official Account</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleCopyLink}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '12px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#F8FAFC',
              color: '#334155',
              fontSize: '0.9rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            {copiedLink ? <Check size={16} color="#10B981" /> : <Copy size={16} />}
            {copiedLink ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์'}
          </button>

          <button
            type="button"
            onClick={() => window.open('#/services', '_blank')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '12px',
              border: '1.5px solid #0284C7',
              backgroundColor: '#F0F9FF',
              color: '#0284C7',
              fontSize: '0.9rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <ExternalLink size={16} />
            เปิดดูหน้าจริง (Live Preview)
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 22px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: '#10B981',
              color: '#FFFFFF',
              fontSize: '0.92rem',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}
          >
            <Save size={16} />
            {isSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
          </button>
        </div>
      </div>

      {/* Internal Sub-Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #F1F5F9', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setEditorSubTab('general')}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: editorSubTab === 'general' ? '3px solid #7C3AED' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: editorSubTab === 'general' ? '#7C3AED' : '#64748B',
            fontWeight: '700',
            fontSize: '0.92rem',
            cursor: 'pointer'
          }}
        >
          🏷️ 1. ข้อมูลส่วนหัว & ช่องทางติดต่อ
        </button>

        <button
          type="button"
          onClick={() => setEditorSubTab('programs')}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: editorSubTab === 'programs' ? '3px solid #7C3AED' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: editorSubTab === 'programs' ? '#7C3AED' : '#64748B',
            fontWeight: '700',
            fontSize: '0.92rem',
            cursor: 'pointer'
          }}
        >
          🧩 2. โปรแกรมการบำบัด 4 ด้าน ({programs.length})
        </button>

        <button
          type="button"
          onClick={() => setEditorSubTab('services')}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: editorSubTab === 'services' ? '3px solid #7C3AED' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: editorSubTab === 'services' ? '#7C3AED' : '#64748B',
            fontWeight: '700',
            fontSize: '0.92rem',
            cursor: 'pointer'
          }}
        >
          💰 3. รายการบริการและแพ็กเกจคอร์ส ({localServices.length})
        </button>

        <button
          type="button"
          onClick={() => setEditorSubTab('preview')}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: editorSubTab === 'preview' ? '3px solid #7C3AED' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: editorSubTab === 'preview' ? '#7C3AED' : '#64748B',
            fontWeight: '700',
            fontSize: '0.92rem',
            cursor: 'pointer'
          }}
        >
          📱 4. จำลองหน้าจอมือถือ (Live Mobile Mockup)
        </button>
      </div>

      {/* SUB-TAB 1: GENERAL INFO */}
      {editorSubTab === 'general' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          <div style={{ backgroundColor: '#F8FAFC', padding: '1.5rem', borderRadius: '18px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', margin: '0 0 1rem 0', color: '#1E293B' }}>
              ส่วนหัวของหน้า (Header Banner)
            </h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                ชื่อคลินิกที่แสดง
              </label>
              <input
                type="text"
                className="form-control"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                placeholder="เช่น บ้านฮักดี"
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                คำบรรยายแนะนำบริการ (Subtitle / Tagline)
              </label>
              <textarea
                className="form-control"
                rows={3}
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="เช่น บริการกิจกรรมบำบัดและส่งเสริมพัฒนาการเด็ก โดยทีมนักกิจกรรมบำบัดวิชาชีพ 🤎"
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                URL โลโก้คลินิก
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <img 
                  src={logoUrl || DEFAULT_CLINIC_LOGO} 
                  alt="Logo" 
                  style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'contain', border: '1px solid #CBD5E1', padding: '2px', backgroundColor: '#FFF' }} 
                />
                <input
                  type="text"
                  className="form-control"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="URL รูปภาพโลโก้"
                />
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#F8FAFC', padding: '1.5rem', borderRadius: '18px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', margin: '0 0 1rem 0', color: '#1E293B' }}>
              ข้อมูลติดต่อและส่วนท้าย (Contact & Footer)
            </h3>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                เบอร์โทรศัพท์คลินิก (สำหรับปุ่มโทรติดต่อ)
              </label>
              <input
                type="text"
                className="form-control"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="เช่น 094-675-3557"
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                Line Official ID
              </label>
              <input
                type="text"
                className="form-control"
                value={lineId}
                onChange={(e) => setLineId(e.target.value)}
                placeholder="เช่น @hugdeehome"
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                ที่อยู่คลินิก
              </label>
              <textarea
                className="form-control"
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="เช่น 104/7 หมู่ 17 ตำบลบ้านต๋อม อำเภอเมือง จังหวัดพะเยา 56000"
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                หัวข้อส่วนท้าย (Footer Title)
              </label>
              <input
                type="text"
                className="form-control"
                value={footerTitle}
                onChange={(e) => setFooterTitle(e.target.value)}
                placeholder="เช่น พร้อมร่วมดูแลพัฒนาการลูกรักกับบ้านฮักดี"
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                ลิงก์แผนที่ Google Maps (สำหรับปุ่มแผนที่คลินิก)
              </label>
              <input
                type="text"
                className="form-control"
                value={mapsUrl}
                onChange={(e) => setMapsUrl(e.target.value)}
                placeholder="https://maps.google.com/?q=..."
              />
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: HIGHLIGHT PROGRAMS */}
      {editorSubTab === 'programs' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0, color: '#1E293B' }}>
                โปรแกรมการบำบัดและฟื้นฟูพัฒนาการ
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '4px 0 0 0' }}>
                การ์ดโปรแกรมไฮไลต์ที่แสดงใต้แถบแบนเนอร์ส่วนบน เพื่อแนะนำบริการหลักของคลินิก
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleResetPrograms}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#64748B',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={14} /> คืนค่าเริ่มต้น
              </button>
              <button
                type="button"
                onClick={openAddProgramModal}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#7C3AED',
                  color: '#FFFFFF',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                <Plus size={16} /> เพิ่มโปรแกรมใหม่
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {programs.map((item, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: item.bg || '#F8FAFC',
                  borderRadius: '18px',
                  padding: '1.25rem',
                  border: `1.5px solid ${item.color || '#CBD5E1'}30`,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '2rem' }}>{item.icon}</span>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: '800',
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      backgroundColor: item.color || '#0284C7',
                      color: '#FFFFFF'
                    }}>
                      {item.badge}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#1E293B', margin: '0 0 6px 0' }}>
                    {item.title}
                  </h4>
                  <p style={{ fontSize: '0.86rem', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                    {item.desc}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '1rem', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <button
                    type="button"
                    onClick={() => openEditProgramModal(item, idx)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      color: '#334155',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Edit3 size={13} /> แก้ไข
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteProgram(idx)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: '1px solid #FCA5A5',
                      backgroundColor: '#FEF2F2',
                      color: '#DC2626',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Trash2 size={13} /> ลบ
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: SERVICES & PACKAGES LIST */}
      {editorSubTab === 'services' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0, color: '#1E293B' }}>
                รายการบริการและแพ็กเกจคอร์สที่แสดงในหน้าเว็บ
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '4px 0 0 0' }}>
                รายการที่ปรากฏในส่วน "รายการบริการและแพ็กเกจคอร์ส" ที่ผู้ปกครองและคนไข้สามารถเลือกดูได้
              </p>
            </div>

            <button
              type="button"
              onClick={openAddServiceModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 18px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: '#C19B6C',
                color: '#FFFFFF',
                fontSize: '0.9rem',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(193, 155, 108, 0.3)'
              }}
            >
              <Plus size={16} /> เพิ่มบริการ / แพ็กเกจคอร์สใหม่
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {localServices.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8', backgroundColor: '#F8FAFC', borderRadius: '14px', border: '1px dashed #CBD5E1' }}>
                ยังไม่มีรายการบริการ กดปุ่ม "+ เพิ่มบริการ / แพ็กเกจคอร์สใหม่" ด้านบนเพื่อเริ่มสร้าง
              </div>
            ) : (
              localServices.map((srv, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 18px',
                    borderRadius: '14px',
                    backgroundColor: '#FAFAF9',
                    border: '1px solid #E7E5E4',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#E2E8F0', color: '#475569' }}>
                        {srv.code || `#${idx + 1}`}
                      </span>
                      <span style={{ fontWeight: '800', color: '#1C1917', fontSize: '1.02rem' }}>
                        {srv.name}
                      </span>
                    </div>
                    {srv.description && (
                      <div style={{ fontSize: '0.84rem', color: '#78716C', marginTop: '4px' }}>
                        {srv.description}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#C19B6C' }}>
                        {typeof srv.price === 'number' ? `${srv.price.toLocaleString()} ฿` : `${srv.price || 0} ฿`}
                      </span>
                      {srv.sessionsPerUnit && (
                        <div style={{ fontSize: '0.75rem', color: '#A8A29E' }}>
                          จำนวน {srv.sessionsPerUnit} ครั้ง
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => openEditServiceModal(srv, idx)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#FFFFFF',
                          color: '#334155',
                          fontSize: '0.82rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Edit3 size={14} /> แก้ไข
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteService(idx)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: '1px solid #FCA5A5',
                          backgroundColor: '#FEF2F2',
                          color: '#DC2626',
                          fontSize: '0.82rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Trash2 size={14} /> ลบ
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: LIVE MOBILE PREVIEW */}
      {editorSubTab === 'preview' && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
          <div style={{
            width: '100%',
            maxWidth: '420px',
            borderRadius: '40px',
            border: '12px solid #1E293B',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
            backgroundColor: '#FEF8F1',
            fontFamily: "'Prompt', sans-serif"
          }}>
            {/* Mobile Header Bar */}
            <div style={{ backgroundColor: '#1E293B', color: '#FFFFFF', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '700' }}>
              <span>9:41</span>
              <span>📶 5G 100%</span>
            </div>

            {/* Mobile Browser URL bar */}
            <div style={{ backgroundColor: '#F1F5F9', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#64748B', borderBottom: '1px solid #E2E8F0' }}>
              <span>🔒</span>
              <span style={{ fontWeight: '600', color: '#334155', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                portal.hugdeehome.com/#/services
              </span>
            </div>

            {/* Simulated PublicServices Content */}
            <div style={{ maxHeight: '680px', overflowY: 'auto', paddingBottom: '2rem' }}>
              {/* Header Banner */}
              <div style={{
                background: 'linear-gradient(135deg, #C19B6C 0%, #A57D4F 100%)',
                color: '#FFFFFF',
                padding: '2rem 1.25rem 2.5rem',
                textAlign: 'center',
                borderBottomLeftRadius: '28px',
                borderBottomRightRadius: '28px'
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  margin: '0 auto 0.75rem',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  padding: '4px'
                }}>
                  <img src={logoUrl || DEFAULT_CLINIC_LOGO} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <h1 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '0 0 0.25rem 0' }}>
                  {clinicName}
                </h1>
                <p style={{ fontSize: '0.85rem', opacity: 0.95, margin: '0 auto', lineHeight: 1.4 }}>
                  {subtitle}
                </p>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '1rem', flexWrap: 'wrap' }}>
                  <span style={{ backgroundColor: '#FFFFFF', color: '#855829', padding: '6px 14px', borderRadius: '9999px', fontWeight: '700', fontSize: '0.8rem' }}>
                    ลงทะเบียนคนไข้ใหม่ ➔
                  </span>
                  <span style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.5)', padding: '6px 12px', borderRadius: '9999px', fontWeight: '600', fontSize: '0.8rem' }}>
                    📞 โทร {phone}
                  </span>
                </div>
              </div>

              {/* Highlights */}
              <div style={{ padding: '0 1rem', marginTop: '-1.25rem' }}>
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', border: '1px solid #F1E7DD', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '800', margin: '0 0 0.75rem 0', color: '#4A4036', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={16} color="#C19B6C" /> โปรแกรมการบำบัดและฟื้นฟูพัฒนาการ
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {programs.map((item, idx) => (
                      <div key={idx} style={{ backgroundColor: item.bg || '#F8FAFC', borderRadius: '12px', padding: '10px 12px', border: `1px solid ${item.color || '#CBD5E1'}25` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '1.3rem' }}>{item.icon}</span>
                          <span style={{ fontSize: '0.68rem', fontWeight: '800', padding: '2px 6px', borderRadius: '9999px', backgroundColor: item.color, color: '#FFF' }}>
                            {item.badge}
                          </span>
                        </div>
                        <div style={{ fontWeight: '700', fontSize: '0.88rem', color: '#1E293B' }}>{item.title}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px', lineHeight: 1.4 }}>{item.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Services List */}
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', border: '1px solid #F1E7DD', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '800', margin: '0 0 0.75rem 0', color: '#4A4036', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Award size={16} color="#C19B6C" /> รายการบริการและแพ็กเกจคอร์ส
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {localServices.map((srv, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '12px', backgroundColor: '#FAFAF9', border: '1px solid #E7E5E4' }}>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '0.86rem', color: '#292524' }}>{srv.name}</div>
                          <div style={{ fontSize: '0.74rem', color: '#78716C' }}>{srv.description || 'ราคาปกติ'}</div>
                        </div>
                        <div style={{ fontWeight: '800', color: '#C19B6C', fontSize: '0.98rem' }}>
                          {typeof srv.price === 'number' ? `${srv.price.toLocaleString()} ฿` : `${srv.price} ฿`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Preview */}
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '1.25rem', textAlign: 'center', border: '1px solid #F1E7DD' }}>
                  <div style={{ fontWeight: '800', fontSize: '0.92rem', color: '#4A4036', marginBottom: '4px' }}>
                    {footerTitle}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#78716C', marginBottom: '1rem' }}>
                    {address}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ backgroundColor: '#10B981', color: '#FFFFFF', padding: '8px', borderRadius: '10px', fontWeight: '700', fontSize: '0.82rem' }}>
                      ลงทะเบียนคนไข้ใหม่ 📝
                    </span>
                    <span style={{ backgroundColor: '#06C755', color: '#FFFFFF', padding: '8px', borderRadius: '10px', fontWeight: '700', fontSize: '0.82rem' }}>
                      💬 เชื่อมต่อ LINE OA
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT SERVICE */}
      {showServiceModal && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '1.75rem', width: '90%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: '0 0 1rem 0', color: '#1E293B' }}>
              {editingServiceIndex !== null ? '✏️ แก้ไขบริการ / แพ็กเกจ' : '➕ เพิ่มบริการ / แพ็กเกจใหม่'}
            </h3>

            <form onSubmit={handleSaveServiceForm}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  รหัสบริการ (Code)
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={serviceForm.code}
                  onChange={(e) => setServiceForm({ ...serviceForm, code: e.target.value })}
                  required
                />
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  ชื่อบริการหรือแพ็กเกจคอร์ส *
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={serviceForm.name}
                  onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                  placeholder="เช่น คอร์สฝึกกระตุ้นพัฒนาการ 10 ครั้ง"
                  required
                />
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  ราคา (บาท) *
                </label>
                <input
                  type="number"
                  className="form-control"
                  value={serviceForm.price}
                  onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                  placeholder="เช่น 7000"
                  required
                />
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  คำอธิบายราคา / โปรโมชัน
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                  placeholder="เช่น ราคาปกติ 7,000 บาท หรือ รวมอุปกรณ์ประเมิน"
                />
              </div>

              <div style={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    จำนวนครั้ง (Sessions)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={serviceForm.sessionsPerUnit}
                    onChange={(e) => setServiceForm({ ...serviceForm, sessionsPerUnit: e.target.value })}
                    min={1}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    หมวดหมู่
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={serviceForm.category}
                    onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#F8FAFC',
                    color: '#64748B',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#C19B6C',
                    color: '#FFFFFF',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  บันทึกรายการ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT PROGRAM */}
      {showProgramModal && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '1.75rem', width: '90%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: '0 0 1rem 0', color: '#1E293B' }}>
              {editingProgramIndex !== null ? '✏️ แก้ไขโปรแกรมบำบัด' : '➕ เพิ่มโปรแกรมบำบัดใหม่'}
            </h3>

            <form onSubmit={handleSaveProgramForm}>
              <div style={{ marginBottom: '0.75rem', display: 'grid', gridTemplateColumns: '80px 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    ไอคอน
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ textAlign: 'center', fontSize: '1.2rem' }}
                    value={programForm.icon}
                    onChange={(e) => setProgramForm({ ...programForm, icon: e.target.value })}
                    placeholder="🧩"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    ป้ายกำกับ (Badge)
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={programForm.badge}
                    onChange={(e) => setProgramForm({ ...programForm, badge: e.target.value })}
                    placeholder="เช่น แนะนำ, ยอดนิยม"
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  ชื่อโปรแกรมบำบัด *
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={programForm.title}
                  onChange={(e) => setProgramForm({ ...programForm, title: e.target.value })}
                  placeholder="เช่น กิจกรรมบำบัด (Occupational Therapy)"
                  required
                />
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  คำอธิบายรายละเอียด
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={programForm.desc}
                  onChange={(e) => setProgramForm({ ...programForm, desc: e.target.value })}
                  placeholder="ฟื้นฟูและส่งเสริมพัฒนาการกล้ามเนื้อมัดเล็ก..."
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    สีข้อความ / ป้าย
                  </label>
                  <input
                    type="color"
                    className="form-control"
                    style={{ height: '40px', padding: '2px' }}
                    value={programForm.color}
                    onChange={(e) => setProgramForm({ ...programForm, color: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    สีพื้นหลังการ์ด
                  </label>
                  <input
                    type="color"
                    className="form-control"
                    style={{ height: '40px', padding: '2px' }}
                    value={programForm.bg}
                    onChange={(e) => setProgramForm({ ...programForm, bg: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowProgramModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#F8FAFC',
                    color: '#64748B',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#7C3AED',
                    color: '#FFFFFF',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  บันทึกโปรแกรม
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
