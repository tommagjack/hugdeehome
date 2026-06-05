import React, { useState, useMemo, useRef } from 'react';
import { 
  Building2, 
  Tag, 
  FolderHeart, 
  CreditCard, 
  UserSquare2, 
  CalendarDays, 
  Plus, 
  Trash2, 
  Edit3, 
  Download, 
  Upload,
  Eye,
  Printer
} from 'lucide-react';
import Swal from 'sweetalert2';

export default function Settings({
  clinicInfo,
  setClinicInfo,
  services,
  setServices,
  promotions,
  setPromotions,
  bankAccounts,
  setBankAccounts,
  therapists,
  setTherapists,
  holidays,
  setHolidays,
  users,
  setUsers,
  onResetAllData,
  onPrintAnnualHolidays
}) {
  const [activeSubMenu, setActiveSubMenu] = useState('clinic'); // clinic, services, promos, banks, therapists, holidays, users
  const fileInputRef = useRef(null);

  const todayStr = '2026-06-05'; // วันที่จำลองระบบ

  // 1. ฟอร์มเพิ่ม/แก้ไข สินค้า/บริการ
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingServiceCode, setEditingServiceCode] = useState(null);
  const [serviceCode, setServiceCode] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [serviceDesc, setServiceDesc] = useState('');
  const [serviceStart, setServiceStart] = useState('2026-01-01');
  const [serviceEnd, setServiceEnd] = useState('2026-12-31');
  const [serviceCategory, setServiceCategory] = useState('บริการ');
  const [servicePrice, setServicePrice] = useState(0);

  // 2. ฟอร์มเพิ่ม/แก้ไข โปรโมชั่น
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [editingPromoCode, setEditingPromoCode] = useState(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoName, setPromoName] = useState('');
  const [promoDesc, setPromoDesc] = useState('');
  const [promoStart, setPromoStart] = useState('2026-01-01');
  const [promoEnd, setPromoEnd] = useState('2026-12-31');
  const [promoLimit, setPromoLimit] = useState(100);
  const [promoType, setPromoType] = useState('flat'); // flat, percentage
  const [promoValue, setPromoValue] = useState(0);

  // 3. ฟอร์มเพิ่ม/แก้ไข บัญชีธนาคาร
  const [showBankModal, setShowBankModal] = useState(false);
  const [editingBankId, setEditingBankId] = useState(null);
  const [bankName, setBankName] = useState('กสิกรไทย');
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');

  // 4. ฟอร์มเพิ่ม/แก้ไข ครูผู้สอน
  const [showTherapistModal, setShowTherapistModal] = useState(false);
  const [editingTherapistId, setEditingTherapistId] = useState(null);
  const [therapistNickname, setTherapistNickname] = useState('');
  const [therapistFullname, setTherapistFullname] = useState('');
  const [therapistLicense, setTherapistLicense] = useState('');  const [therapistWorkDays, setTherapistWorkDays] = useState([]);
  const [therapistWorkHours, setTherapistWorkHours] = useState({});
  // 5. ฟอร์มเพิ่ม/แก้ไข วันหยุดคลินิก
  const [holidayDate, setHolidayDate] = useState('2026-06-05');
  const [holidayName, setHolidayName] = useState('');
  const [holidayType, setHolidayType] = useState('วันหยุดคลินิก');
  const [editingHolidayDate, setEditingHolidayDate] = useState(null);
  const [holidayPage, setHolidayPage] = useState(1);

  // States สำหรับพิมพ์ปฏิทินรายปี
  const [showPrintHolidayModal, setShowPrintHolidayModal] = useState(false);
  const [selectedPrintYear, setSelectedPrintYear] = useState(new Date().getFullYear());

  const availableHolidayYears = useMemo(() => {
    const years = [...new Set(holidays.map(h => new Date(h.date).getFullYear()))].sort((a,b) => b - a);
    const currentYear = new Date().getFullYear();
    if (!years.includes(currentYear)) {
      years.unshift(currentYear);
    }
    return years;
  }, [holidays]);



  // ฟังก์ชันหาชื่อสีการ์ดตามธนาคาร
  const getBankClass = (bank) => {
    if (bank.includes('กสิกร')) return 'bank-kbank';
    if (bank.includes('ไทยพาณิชย์')) return 'bank-scb';
    if (bank.includes('กรุงไทย')) return 'bank-ktb';
    if (bank.includes('กรุงเทพ')) return 'bank-bbl';
    if (bank.includes('ทหารไทย') || bank.includes('ทีทีบี')) return 'bank-tmb';
    if (bank.includes('ออมสิน')) return 'bank-gsb';
    return 'bank-default';
  };

  // --- จัดการบริการ/สินค้า ---
  const handleSaveService = (e) => {
    e.preventDefault();
    const newService = {
      code: serviceCode,
      name: serviceName,
      description: serviceDesc,
      startDate: serviceStart,
      endDate: serviceEnd,
      category: serviceCategory,
      price: Number(servicePrice)
    };

    if (editingServiceCode) {
      setServices(services.map(s => s.code === editingServiceCode ? newService : s));
    } else {
      if (services.find(s => s.code === serviceCode)) {
        Swal.fire('รหัสซ้ำ', 'รหัสบริการนี้มีอยู่ในระบบแล้ว', 'error');
        return;
      }
      setServices([...services, newService]);
    }
    setShowServiceModal(false);
    resetServiceForm();
  };

  const resetServiceForm = () => {
    setEditingServiceCode(null);
    setServiceCode('');
    setServiceName('');
    setServiceDesc('');
    setServiceStart('2026-01-01');
    setServiceEnd('2026-12-31');
    setServiceCategory('บริการ');
    setServicePrice(0);
  };

  const handleEditService = (s) => {
    setEditingServiceCode(s.code);
    setServiceCode(s.code);
    setServiceName(s.name);
    setServiceDesc(s.description || '');
    setServiceStart(s.startDate);
    setServiceEnd(s.endDate);
    setServiceCategory(s.category);
    setServicePrice(s.price);
    setShowServiceModal(true);
  };

  const handleDeleteService = (code) => {
    Swal.fire({
      title: 'ลบรายการสินค้า/บริการนี้?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--danger)',
      confirmButtonText: 'ลบข้อมูล'
    }).then(res => {
      if (res.isConfirmed) {
        setServices(services.filter(s => s.code !== code));
      }
    });
  };

  // --- จัดการโปรโมชั่น ---
  const handleSavePromo = (e) => {
    e.preventDefault();
    const newPromo = {
      code: promoCode,
      name: promoName,
      description: promoDesc,
      startDate: promoStart,
      endDate: promoEnd,
      maxUses: Number(promoLimit),
      type: promoType,
      value: Number(promoValue)
    };

    if (editingPromoCode) {
      setPromotions(promotions.map(p => p.code === editingPromoCode ? newPromo : p));
    } else {
      if (promotions.find(p => p.code === promoCode)) {
        Swal.fire('รหัสโปรโมชั่นซ้ำ', 'รหัสโปรโมชั่นนี้มีอยู่ในระบบแล้ว', 'error');
        return;
      }
      setPromotions([...promotions, newPromo]);
    }
    setShowPromoModal(false);
    resetPromoForm();
  };

  const resetPromoForm = () => {
    setEditingPromoCode(null);
    setPromoCode('');
    setPromoName('');
    setPromoDesc('');
    setPromoStart('2026-01-01');
    setPromoEnd('2026-12-31');
    setPromoLimit(100);
    setPromoType('flat');
    setPromoValue(0);
  };

  const handleEditPromo = (p) => {
    setEditingPromoCode(p.code);
    setPromoCode(p.code);
    setPromoName(p.name);
    setPromoDesc(p.description || '');
    setPromoStart(p.startDate);
    setPromoEnd(p.endDate);
    setPromoLimit(p.maxUses);
    setPromoType(p.type);
    setPromoValue(p.value);
    setShowPromoModal(true);
  };

  const handleDeletePromo = (code) => {
    Swal.fire({
      title: 'ลบโปรโมชั่นนี้?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--danger)',
      confirmButtonText: 'ลบ'
    }).then(res => {
      if (res.isConfirmed) {
        setPromotions(promotions.filter(p => p.code !== code));
      }
    });
  };

  // --- จัดการธนาคาร ---
  const handleSaveBank = (e) => {
    e.preventDefault();
    const newBank = {
      id: editingBankId || 'B' + (bankAccounts.length + 1) + Math.floor(Math.random() * 10),
      bankName,
      accountNo: bankAccountNo,
      accountName: bankAccountName
    };

    if (editingBankId) {
      setBankAccounts(bankAccounts.map(b => b.id === editingBankId ? newBank : b));
    } else {
      setBankAccounts([...bankAccounts, newBank]);
    }
    setShowBankModal(false);
    resetBankForm();
  };

  const resetBankForm = () => {
    setEditingBankId(null);
    setBankName('กสิกรไทย');
    setBankAccountNo('');
    setBankAccountName('');
  };

  const handleEditBank = (b) => {
    setEditingBankId(b.id);
    setBankName(b.bankName);
    setBankAccountNo(b.accountNo);
    setBankAccountName(b.accountName);
    setShowBankModal(true);
  };

  const handleDeleteBank = (id) => {
    Swal.fire({
      title: 'ลบบัญชีธนาคารนี้?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--danger)',
      confirmButtonText: 'ลบ'
    }).then(res => {
      if (res.isConfirmed) {
        setBankAccounts(bankAccounts.filter(b => b.id !== id));
      }
    });
  };

  // --- จัดการผู้สอน (OT) ---
  const handleSaveTherapist = (e) => {
    e.preventDefault();
    if (therapistWorkDays.length === 0) {
      Swal.fire('ข้อผิดพลาด', 'กรุณาเลือกวันเข้าทำงานอย่างน้อย 1 วัน', 'error');
      return;
    }

    const newTherapist = {
      id: editingTherapistId || 'T' + (therapists.length + 1) + Math.floor(Math.random() * 10),
      nickname: therapistNickname,
      fullname: therapistFullname,
      licenseNo: therapistLicense,
      workDays: therapistWorkDays,
      workHours: therapistWorkHours
    };

    if (editingTherapistId) {
      setTherapists(therapists.map(t => t.id === editingTherapistId ? newTherapist : t));
    } else {
      setTherapists([...therapists, newTherapist]);
    }
    setShowTherapistModal(false);
    resetTherapistForm();
  };
  const resetTherapistForm = () => {
    setEditingTherapistId(null);
    setTherapistNickname('');
    setTherapistFullname('');
    setTherapistLicense('');
    setTherapistWorkDays([]);
    setTherapistWorkHours({});
  };

  const handleEditTherapist = (t) => {
    setEditingTherapistId(t.id);
    setTherapistNickname(t.nickname);
    setTherapistFullname(t.fullname);
    setTherapistLicense(t.licenseNo || '');
    setTherapistWorkDays(t.workDays || []);
    
    // จัดเตรียมข้อมูลช่วงเวลาเข้าทำงาน (รองรับการแปลงข้อมูลประวัติแบบเก่า)
    let hrs = t.workHours || {};
    if (Array.isArray(hrs)) {
      const migrated = {};
      const days = t.workDays || [];
      days.forEach(d => {
        migrated[d] = [...hrs];
      });
      hrs = migrated;
    }
    setTherapistWorkHours(hrs);
    setShowTherapistModal(true);
  };

  const handleTherapistDayToggle = (day) => {
    if (therapistWorkDays.includes(day)) {
      setTherapistWorkDays(therapistWorkDays.filter(d => d !== day));
      const updatedHours = { ...therapistWorkHours };
      delete updatedHours[day];
      setTherapistWorkHours(updatedHours);
    } else {
      setTherapistWorkDays([...therapistWorkDays, day]);
      
      // วันธรรมดา (Monday - Friday) จะมีเวลาช่วงค่ำเพิ่มเติม (18:00 - 19:00, 19:00 - 20:00)
      const isWeekday = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(day);
      const defaultSlots = ["09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", "13:00 - 14:00", "14:00 - 15:00", "15:00 - 16:00"];
      if (isWeekday) {
        defaultSlots.push("18:00 - 19:00", "19:00 - 20:00");
      }
      
      setTherapistWorkHours({
        ...therapistWorkHours,
        [day]: defaultSlots
      });
    }
  };

  const handleDeleteTherapist = (id) => {
    Swal.fire({
      title: 'ลบข้อมูลครูผู้สอนนี้?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--danger)',
      confirmButtonText: 'ลบ'
    }).then(res => {
      if (res.isConfirmed) {
        setTherapists(therapists.filter(t => t.id !== id));
      }
    });
  };

  // --- จัดการวันหยุดคลินิก (Holidays) ---
  const handleAddHoliday = (e) => {
    e.preventDefault();
    if (!holidayName.trim()) return;

    if (editingHolidayDate) {
      if (editingHolidayDate !== holidayDate && holidays.some(h => h.date === holidayDate)) {
        Swal.fire('วันที่ซ้ำ', 'มีข้อมูลวันหยุดในวันที่นี้อยู่แล้ว', 'error');
        return;
      }
      const updated = holidays.map(h => 
        h.date === editingHolidayDate ? { date: holidayDate, name: holidayName, type: holidayType } : h
      ).sort((a, b) => b.date.localeCompare(a.date));
      setHolidays(updated);
      setEditingHolidayDate(null);
      setHolidayName('');
      setHolidayType('วันหยุดคลินิก');
      Swal.fire({ icon: 'success', title: 'แก้ไขวันหยุดสำเร็จ', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
    } else {
      if (holidays.some(h => h.date === holidayDate)) {
        Swal.fire('วันที่ซ้ำ', 'มีข้อมูลวันหยุดในวันที่นี้อยู่แล้ว', 'error');
        return;
      }

      const newHoliday = { date: holidayDate, name: holidayName, type: holidayType };
      setHolidays([...holidays, newHoliday].sort((a, b) => b.date.localeCompare(a.date)));
      setHolidayName('');
      Swal.fire({ icon: 'success', title: 'เพิ่มวันหยุดสำเร็จ', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
    }
  };

  const handleEditHoliday = (h) => {
    setEditingHolidayDate(h.date);
    setHolidayDate(h.date);
    setHolidayName(h.name);
    setHolidayType(h.type || 'วันหยุดคลินิก');
  };

  const handleCancelEditHoliday = () => {
    setEditingHolidayDate(null);
    setHolidayDate('2026-06-05');
    setHolidayName('');
    setHolidayType('วันหยุดคลินิก');
  };

  const handlePrintAnnualHolidays = () => {
    if (availableHolidayYears.length > 0) {
      setSelectedPrintYear(availableHolidayYears[0]);
    } else {
      setSelectedPrintYear(new Date().getFullYear());
    }
    setShowPrintHolidayModal(true);
  };

  const handleDeleteHoliday = (date) => {
    setHolidays(holidays.filter(h => h.date !== date));
  };

  // Pagination ของวันหยุด
  const paginatedHolidays = useMemo(() => {
    const itemsPerPage = 10;
    const startIndex = (holidayPage - 1) * itemsPerPage;
    return holidays.slice(startIndex, startIndex + itemsPerPage);
  }, [holidays, holidayPage]);

  const maxHolidayPages = Math.ceil(holidays.length / 10) || 1;

  // นำออกวันหยุด CSV (รองรับภาษาไทย + BOM ให้ Excel อ่านได้ถูกต้อง)
  const handleExportHolidaysCSV = () => {
    let csvContent = "\uFEFF"; // BOM สำหรับ Excel สนับสนุน UTF-8
    csvContent += "วันที่,ชื่อวันหยุด,ประเภทวันหยุด\r\n";

    if (holidays.length > 0) {
      holidays.forEach(h => {
        csvContent += `${h.date},${h.name},${h.type || 'วันหยุดคลินิก'}\r\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `วันหยุดคลินิก_HugDeeHome.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // นำเข้าวันหยุด CSV
  const handleImportHolidaysCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split(/\r?\n/);
      const imported = [];
      
      // ข้ามหัวตาราง (บรรทัดแรก)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // แยกข้อมูลด้วยคอมม่า
        const parts = line.split(',');
        if (parts.length >= 2) {
          const date = parts[0].replace('\uFEFF', '').trim(); // ล้าง BOM ถ้าตกค้าง
          const name = parts[1].trim();
          const type = parts[2] ? parts[2].trim() : 'วันหยุดคลินิก';
          
          // ตรวจสอบฟอร์แมตวันที่แบบง่าย YYYY-MM-DD
          if (date.match(/^\d{4}-\d{2}-\d{2}$/) && name) {
            imported.push({ date, name, type });
          }
        }
      }

      if (imported.length === 0) {
        Swal.fire('นำเข้าล้มเหลว', 'ไม่พบข้อมูลที่ถูกต้องในไฟล์ หรือรูปแบบไม่ตรงกับวันที่,ชื่อวันหยุด', 'error');
        return;
      }

      // ทำการรวมข้อมูล (ป้องกันวันซ้ำ)
      const merged = [...holidays];
      let addedCount = 0;
      imported.forEach(imp => {
        if (!merged.find(h => h.date === imp.date)) {
          merged.push(imp);
          addedCount++;
        }
      });

      setHolidays(merged.sort((a, b) => b.date.localeCompare(a.date)));
      Swal.fire('นำเข้าสำเร็จ', `นำเข้าข้อมูลวันหยุดคลินิกสำเร็จทั้งหมด ${addedCount} รายการ`, 'success');
      e.target.value = null; // รีเซ็ต input
    };
    reader.readAsText(file, "UTF-8");
  };



  // เช็คสถานะการเข้าเกณฑ์ Active/Inactive ของบริการ
  const checkServiceStatus = (s) => {
    const start = s.startDate || '1970-01-01';
    const end = s.endDate || '2999-12-31';
    return (todayStr >= start && todayStr <= end) ? 'Active' : 'Inactive';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="page-header">
        <h1 className="page-title">
          <Building2 size={28} />
          ระบบการตั้งค่าหลังบ้าน (Settings - Admin Only)
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* เมนูย่อยฝั่งซ้าย - ตีกรอบพอดีไม่มีส่วนเกิน */}
        <div className="card-2xl settings-menu" style={{ padding: '0.75rem' }}>
          <div className="settings-link-group">
            <a className={`settings-link ${activeSubMenu === 'clinic' ? 'active' : ''}`} onClick={() => setActiveSubMenu('clinic')}>
              <Building2 size={16} /> ข้อมูลทั่วไปคลินิก
            </a>
            <a className={`settings-link ${activeSubMenu === 'services' ? 'active' : ''}`} onClick={() => setActiveSubMenu('services')}>
              <FolderHeart size={16} /> บริการและสินค้า
            </a>
            <a className={`settings-link ${activeSubMenu === 'promos' ? 'active' : ''}`} onClick={() => setActiveSubMenu('promos')}>
              <Tag size={16} /> โปรโมชั่นและส่วนลด
            </a>
            <a className={`settings-link ${activeSubMenu === 'banks' ? 'active' : ''}`} onClick={() => setActiveSubMenu('banks')}>
              <CreditCard size={16} /> บัญชีธนาคาร
            </a>
            <a className={`settings-link ${activeSubMenu === 'therapists' ? 'active' : ''}`} onClick={() => setActiveSubMenu('therapists')}>
              <UserSquare2 size={16} /> นักกิจกรรมบำบัด
            </a>
            <a className={`settings-link ${activeSubMenu === 'holidays' ? 'active' : ''}`} onClick={() => setActiveSubMenu('holidays')}>
              <CalendarDays size={16} /> วันหยุดคลินิก
            </a>
          </div>
          
          <div style={{ borderTop: '1px solid var(--border-light)', marginTop: '1rem', paddingTop: '1rem' }}>
            <button 
              className="btn btn-danger" 
              style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem' }}
              onClick={onResetAllData}
            >
              รีเซ็ตข้อมูลตัวอย่างทั้งหมด
            </button>
          </div>
        </div>

        {/* แผงแสดงรายละเอียดฝั่งขวา */}
        <div className="card-3xl">
          
          {/* 1. ข้อมูลทั่วไปคลินิก */}
          {activeSubMenu === 'clinic' && (
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem' }}>แก้ไขข้อมูลทั่วไปของคลินิก</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-row">
                  <div className="form-group" style={{ flex: 1.5 }}>
                    <label className="form-label">ชื่อคลินิก</label>
                    <input type="text" className="form-control" value={clinicInfo.name} onChange={(e) => setClinicInfo({ ...clinicInfo, name: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ flex: 2 }}>
                    <label className="form-label">ประเภทคลินิก</label>
                    <input type="text" className="form-control" placeholder="เช่น คลินิกการประกอบโรคศิลปะ สาขากิจกรรมบำบัด" value={clinicInfo.type || ''} onChange={(e) => setClinicInfo({ ...clinicInfo, type: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">ใบอนุญาตเลขที่</label>
                    <input type="text" className="form-control" value={clinicInfo.licenseNo} onChange={(e) => setClinicInfo({ ...clinicInfo, licenseNo: e.target.value })} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">เบอร์โทรศัพท์คลินิก</label>
                    <input type="tel" className="form-control" value={clinicInfo.phone} onChange={(e) => setClinicInfo({ ...clinicInfo, phone: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">อีเมลติดต่อ</label>
                    <input type="email" className="form-control" value={clinicInfo.email} onChange={(e) => setClinicInfo({ ...clinicInfo, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Line ID คลินิก</label>
                    <input type="text" className="form-control" value={clinicInfo.lineId} onChange={(e) => setClinicInfo({ ...clinicInfo, lineId: e.target.value })} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">ที่อยู่คลินิก</label>
                  <textarea className="form-control" rows="2" value={clinicInfo.address} onChange={(e) => setClinicInfo({ ...clinicInfo, address: e.target.value })}></textarea>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">URL รูปโลโก้คลินิก</label>
                    <input type="url" className="form-control" value={clinicInfo.logoUrl} onChange={(e) => setClinicInfo({ ...clinicInfo, logoUrl: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">URL ตราประทับคลินิก (สำหรับใบเสร็จ)</label>
                    <input type="url" className="form-control" value={clinicInfo.stampUrl} onChange={(e) => setClinicInfo({ ...clinicInfo, stampUrl: e.target.value })} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Folder ID (รหัสโฟลเดอร์หลักเก็บเอกสาร)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="ระบุ Folder ID ในระบบคลาวด์ เช่น 1A2B3C4D5E..." 
                      value={clinicInfo.folderId || ''} 
                      onChange={(e) => setClinicInfo({ ...clinicInfo, folderId: e.target.value })} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Folder URL (ลิงก์โฟลเดอร์หลักเก็บเอกสาร)</label>
                    <input 
                      type="url" 
                      className="form-control" 
                      placeholder="ระบุลิงก์ เช่น https://drive.google.com/drive/folders/..." 
                      value={clinicInfo.folderUrl || ''} 
                      onChange={(e) => setClinicInfo({ ...clinicInfo, folderUrl: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">ข้อความส่วนท้ายใบเสร็จรับเงิน</label>
                  <input type="text" className="form-control" value={clinicInfo.receiptFooter} onChange={(e) => setClinicInfo({ ...clinicInfo, receiptFooter: e.target.value })} />
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <button className="btn btn-secondary" onClick={() => Swal.fire('สำเร็จ', 'บันทึกข้อมูลคลินิกเรียบร้อย', 'success')}>
                    บันทึกข้อมูลทั่วไป
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. รายการบริการและสินค้า */}
          {activeSubMenu === 'services' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>รายการสินค้าและบริการที่ลงทะเบียน</h2>
                <button className="btn btn-primary" onClick={() => { resetServiceForm(); setShowServiceModal(true); }}>
                  <Plus size={16} /> เพิ่มบริการ/สินค้าใหม่
                </button>
              </div>

              <div className="table-container">
                <table className="hdh-table">
                  <thead>
                    <tr>
                      <th>รหัส</th>
                      <th>ชื่อรายการ</th>
                      <th>หมวดหมู่</th>
                      <th>ราคาต่อหน่วย</th>
                      <th>ระยะเวลาจัดโปร</th>
                      <th>สถานะ</th>
                      <th>การดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map(s => (
                      <tr key={s.code}>
                        <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{s.code}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{s.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--dark-light)' }}>{s.description}</div>
                        </td>
                        <td>{s.category}</td>
                        <td style={{ fontWeight: 600, color: 'var(--secondary)' }}>฿{s.price.toLocaleString()}</td>
                        <td style={{ fontSize: '0.8rem' }}>{s.startDate} ถึง {s.endDate}</td>
                        <td>
                          <span className={`badge ${checkServiceStatus(s) === 'Active' ? 'badge-success' : 'badge-secondary'}`}>
                            {checkServiceStatus(s)}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button className="btn btn-light btn-icon-only" onClick={() => handleEditService(s)}>
                              <Edit3 size={14} color="var(--secondary)" />
                            </button>
                            <button className="btn btn-light btn-icon-only" onClick={() => handleDeleteService(s.code)}>
                              <Trash2 size={14} color="var(--danger)" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. โปรโมชั่นและส่วนลด */}
          {activeSubMenu === 'promos' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>โปรโมชั่นและส่วนลด (Promotions)</h2>
                <button className="btn btn-primary" onClick={() => { resetPromoForm(); setShowPromoModal(true); }}>
                  <Plus size={16} /> เพิ่มโปรโมชั่นใหม่
                </button>
              </div>

              <div className="table-container">
                <table className="hdh-table">
                  <thead>
                    <tr>
                      <th>รหัสคูปอง</th>
                      <th>ชื่อโปรโมชั่น</th>
                      <th>ประเภทส่วนลด</th>
                      <th>มูลค่าส่วนลด</th>
                      <th>จำนวนสิทธิ์</th>
                      <th>ระยะเวลากิจกรรม</th>
                      <th>สถานะ</th>
                      <th>การดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promotions.map(p => {
                      const isActive = (todayStr >= p.startDate && todayStr <= p.endDate);
                      return (
                        <tr key={p.code}>
                          <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{p.code}</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{p.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--dark-light)' }}>{p.description}</div>
                          </td>
                          <td>{p.type === 'flat' ? 'ส่วนลดเงินสด (บาท)' : 'ส่วนลดเปอร์เซ็นต์ (%)'}</td>
                          <td style={{ fontWeight: 700, color: 'var(--danger)' }}>
                            {p.type === 'flat' ? `฿${p.value}` : `${p.value}%`}
                          </td>
                          <td>{p.maxUses} สิทธิ์</td>
                          <td style={{ fontSize: '0.8rem' }}>{p.startDate} ถึง {p.endDate}</td>
                          <td>
                            <span className={`badge ${isActive ? 'badge-success' : 'badge-secondary'}`}>
                              {isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button className="btn btn-light btn-icon-only" onClick={() => handleEditPromo(p)}>
                                <Edit3 size={14} color="var(--secondary)" />
                              </button>
                              <button className="btn btn-light btn-icon-only" onClick={() => handleDeletePromo(p.code)}>
                                <Trash2 size={14} color="var(--danger)" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. บัญชีธนาคาร */}
          {activeSubMenu === 'banks' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>บัญชีธนาคารรับเงินโอนคลินิก</h2>
                <button className="btn btn-primary" onClick={() => { resetBankForm(); setShowBankModal(true); }}>
                  <Plus size={16} /> เพิ่มบัญชีรับโอน
                </button>
              </div>

              <div className="bank-card-grid">
                {bankAccounts.map(bank => (
                  <div key={bank.id} className={`bank-card ${getBankClass(bank.bankName)}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <span className="bank-name-label">{bank.bankName}</span>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button 
                          className="btn" 
                          style={{ padding: '0.25rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none' }}
                          onClick={() => handleEditBank(bank)}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          className="btn" 
                          style={{ padding: '0.25rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none' }}
                          onClick={() => handleDeleteBank(bank.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    
                    <span className="bank-no">{bank.accountNo}</span>
                    
                    <div className="bank-holder">
                      <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>ชื่อบัญชี:</div>
                      <div style={{ fontWeight: 600 }}>{bank.accountName}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. นักกิจกรรมบำบัด */}
          {activeSubMenu === 'therapists' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1.2.rem', fontWeight: 700 }}>ฐานข้อมูลนักกิจกรรมบำบัดผู้สอน</h2>
                <button className="btn btn-primary" onClick={() => { resetTherapistForm(); setShowTherapistModal(true); }}>
                  <Plus size={16} /> เพิ่มประวัติครูผู้สอน
                </button>
              </div>

              <div className="table-container">
                <table className="hdh-table">
                  <thead>
                    <tr>
                      <th>ชื่อเล่น</th>
                      <th>ชื่อ-นามสกุลจริง</th>
                      <th>เลขที่ใบอนุญาต ก.บ.</th>
                      <th>วันปฏิบัติงาน</th>
                      <th>รอบเวลารับเคส</th>
                      <th>การดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {therapists.map(t => (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 700, color: 'var(--secondary)' }}>ครู{t.nickname}</td>
                        <td>{t.fullname}</td>
                        <td style={{ fontFamily: 'monospace' }}>{t.licenseNo || '-'}</td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem' }}>
                            {(t.workDays || []).map(day => (
                              <span key={day} className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                                {day === 'Monday' ? 'จ.' : day === 'Tuesday' ? 'อ.' : day === 'Wednesday' ? 'พ.' : day === 'Thursday' ? 'พฤ.' : day === 'Friday' ? 'ศ.' : day === 'Saturday' ? 'ส.' : 'อา.'}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--dark-light)' }}>
                          {t.workHours ? (Array.isArray(t.workHours) ? t.workHours.length : Object.values(t.workHours).flat().length) : 0} สล็อตทั้งหมด
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button className="btn btn-light btn-icon-only" onClick={() => handleEditTherapist(t)}>
                              <Edit3 size={14} color="var(--secondary)" />
                            </button>
                            <button className="btn btn-light btn-icon-only" onClick={() => handleDeleteTherapist(t.id)}>
                              <Trash2 size={14} color="var(--danger)" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. วันหยุดคลินิก */}
          {activeSubMenu === 'holidays' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>กำหนดวันหยุดคลินิก (Holidays)</h2>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-light" onClick={handlePrintAnnualHolidays} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Printer size={16} /> พิมพ์วันหยุดประจำปี
                  </button>
                  <button className="btn btn-light" onClick={handleExportHolidaysCSV}>
                    <Download size={16} /> นำออก CSV
                  </button>
                  <button className="btn btn-light" onClick={() => fileInputRef.current.click()}>
                    <Upload size={16} /> นำเข้า CSV
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    accept=".csv"
                    onChange={handleImportHolidaysCSV}
                  />
                </div>
              </div>

              {/* ฟอร์มเพิ่มวันหยุดด่วน */}
              <form onSubmit={handleAddHoliday} className="card-2xl" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end', backgroundColor: 'var(--light)', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
                  <label className="form-label">เลือกวันที่</label>
                  <input type="date" className="form-control" value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} required />
                </div>
                
                <div className="form-group" style={{ marginBottom: 0, flex: 2, minWidth: '220px' }}>
                  <label className="form-label">ชื่อวันหยุด / รายละเอียด</label>
                  <input type="text" className="form-control" placeholder="เช่น วันปีใหม่, ปิดปรับปรุงร้าน..." value={holidayName} onChange={(e) => setHolidayName(e.target.value)} required />
                </div>

                <div className="form-group" style={{ marginBottom: 0, flex: 1.2, minWidth: '150px' }}>
                  <label className="form-label">ประเภทวันหยุด</label>
                  <select className="form-control" value={holidayType} onChange={(e) => setHolidayType(e.target.value)}>
                    <option value="วันหยุดคลินิก">วันหยุดคลินิก</option>
                    <option value="วันหยุดอื่นๆ">วันหยุดอื่นๆ</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" className="btn btn-secondary">
                    {editingHolidayDate ? 'บันทึก' : 'เพิ่มวันหยุด'}
                  </button>
                  {editingHolidayDate && (
                    <button type="button" className="btn btn-light" onClick={handleCancelEditHoliday}>
                      ยกเลิก
                    </button>
                  )}
                </div>
              </form>

              {/* ตารางแสดงผลวันหยุดคลินิก */}
              <div className="table-container">
                <table className="hdh-table">
                  <thead>
                    <tr>
                      <th>วันที่</th>
                      <th>รายละเอียดวันหยุด</th>
                      <th>ประเภทวันหยุด</th>
                      <th style={{ textAlign: 'center' }}>ดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedHolidays.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--dark-light)' }}>
                          ไม่มีข้อมูลวันหยุดที่ระบุ
                        </td>
                      </tr>
                    ) : (
                      paginatedHolidays.map(h => (
                        <tr key={h.date}>
                          <td style={{ fontWeight: 600 }}>
                            {new Date(h.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </td>
                          <td>{h.name}</td>
                          <td>
                            <span className={`badge ${h.type === 'วันหยุดคลินิก' || !h.type ? 'badge-danger' : 'badge-light'}`}>
                              {h.type || 'วันหยุดคลินิก'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                              <button className="btn btn-light btn-icon-only" onClick={() => handleEditHoliday(h)} title="แก้ไขข้อมูล">
                                <Edit3 size={14} color="var(--secondary)" />
                              </button>
                              <button className="btn btn-light btn-icon-only" onClick={() => handleDeleteHoliday(h.date)} title="ลบวันหยุด">
                                <Trash2 size={14} color="var(--danger)" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination หน้าละ 10 รายการตามสเปก */}
              {maxHolidayPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                  <button 
                    className="btn btn-light" 
                    disabled={holidayPage === 1}
                    onClick={() => setHolidayPage(holidayPage - 1)}
                  >
                    ก่อนหน้า
                  </button>
                  <span style={{ fontSize: '0.9rem' }}>หน้า {holidayPage} / {maxHolidayPages}</span>
                  <button 
                    className="btn btn-light" 
                    disabled={holidayPage === maxHolidayPages}
                    onClick={() => setHolidayPage(holidayPage + 1)}
                  >
                    ถัดไป
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* MODAL 1: เพิ่ม/แก้ไข สินค้าบริการ */}
      {showServiceModal && (
        <div className="modal-overlay">
          <div className="modal-content-wrapper" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>{editingServiceCode ? 'แก้ไขสินค้า/บริการ' : 'เพิ่มสินค้า/บริการใหม่'}</h3>
              <button className="close-modal-btn" onClick={() => setShowServiceModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveService}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">รหัสรายการ <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="เช่น SV01, PD02" 
                      value={serviceCode} 
                      onChange={(e) => setServiceCode(e.target.value)} 
                      disabled={!!editingServiceCode}
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">หมวดหมู่</label>
                    <select className="form-control" value={serviceCategory} onChange={(e) => setServiceCategory(e.target.value)}>
                      <option value="บริการ">บริการ (คอร์สเรียน)</option>
                      <option value="สินค้า">สินค้าทั่วไป</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">ชื่อเรียกสินค้า/บริการ <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="text" className="form-control" value={serviceName} onChange={(e) => setServiceName(e.target.value)} required />
                </div>
                
                <div className="form-group">
                  <label className="form-label">คำอธิบายรายละเอียด</label>
                  <input type="text" className="form-control" value={serviceDesc} onChange={(e) => setServiceDesc(e.target.value)} />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">เริ่มให้บริการวันที่</label>
                    <input type="date" className="form-control" value={serviceStart} onChange={(e) => setServiceStart(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">สิ้นสุดให้บริการวันที่</label>
                    <input type="date" className="form-control" value={serviceEnd} onChange={(e) => setServiceEnd(e.target.value)} required />
                  </div>
                </div>

                <div className="form-group" style={{ maxWidth: '200px' }}>
                  <label className="form-label">ราคาขายต่อหน่วย <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="number" className="form-control" min="0" value={servicePrice} onChange={(e) => setServicePrice(e.target.value)} required />
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="submit" className="btn btn-secondary">บันทึกข้อมูล</button>
                <button type="button" className="btn btn-light" onClick={() => setShowServiceModal(false)}>ยกเลิก</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: เพิ่ม/แก้ไข คูปองโปรโมชั่น */}
      {showPromoModal && (
        <div className="modal-overlay">
          <div className="modal-content-wrapper" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>{editingPromoCode ? 'แก้ไขคูปองส่วนลด' : 'เพิ่มคูปองโปรโมชั่นใหม่'}</h3>
              <button className="close-modal-btn" onClick={() => setShowPromoModal(false)}>×</button>
            </div>
            <form onSubmit={handleSavePromo}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">รหัสคูปอง <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="เช่น PM-SUMMER" 
                      value={promoCode} 
                      onChange={(e) => setPromoCode(e.target.value)} 
                      disabled={!!editingPromoCode}
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">จำนวนสิทธิ์จำกัด</label>
                    <input type="number" className="form-control" min="1" value={promoLimit} onChange={(e) => setPromoLimit(e.target.value)} required />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">ชื่อโปรโมชั่น/คูปอง <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="text" className="form-control" value={promoName} onChange={(e) => setPromoName(e.target.value)} required />
                </div>
                
                <div className="form-group">
                  <label className="form-label">รายละเอียด / เงื่อนไข</label>
                  <input type="text" className="form-control" value={promoDesc} onChange={(e) => setPromoDesc(e.target.value)} />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">วันที่เริ่มกิจกรรม</label>
                    <input type="date" className="form-control" value={promoStart} onChange={(e) => setPromoStart(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">วันที่สิ้นสุดกิจกรรม</label>
                    <input type="date" className="form-control" value={promoEnd} onChange={(e) => setPromoEnd(e.target.value)} required />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">ประเภทส่วนลด</label>
                    <select className="form-control" value={promoType} onChange={(e) => setPromoType(e.target.value)}>
                      <option value="flat">ลดจำนวนเงินสด (บาท)</option>
                      <option value="percentage">ลดเป็นเปอร์เซ็นต์ (%)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">มูลค่าที่ลดตามเงื่อนไข <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input type="number" className="form-control" min="0" value={promoValue} onChange={(e) => setPromoValue(e.target.value)} required />
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="submit" className="btn btn-secondary">บันทึกโปรโมชั่น</button>
                <button type="button" className="btn btn-light" onClick={() => setShowPromoModal(false)}>ยกเลิก</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: เพิ่ม/แก้ไข บัญชีธนาคาร */}
      {showBankModal && (
        <div className="modal-overlay">
          <div className="modal-content-wrapper" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>{editingBankId ? 'แก้ไขบัญชีธนาคาร' : 'เพิ่มบัญชีธนาคารรับโอน'}</h3>
              <button className="close-modal-btn" onClick={() => setShowBankModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveBank}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">ธนาคาร</label>
                  <select className="form-control" value={bankName} onChange={(e) => setBankName(e.target.value)}>
                    <option value="กสิกรไทย">กสิกรไทย (KBANK)</option>
                    <option value="ไทยพาณิชย์">ไทยพาณิชย์ (SCB)</option>
                    <option value="กรุงไทย">กรุงไทย (KTB)</option>
                    <option value="กรุงเทพ">กรุงเทพ (BBL)</option>
                    <option value="ทหารไทยธนชาต">ทหารไทยธนชาต (TTB)</option>
                    <option value="ออมสิน">ออมสิน (GSB)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">หมายเลขบัญชี <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="เช่น 123-4-56789-0" 
                    value={bankAccountNo} 
                    onChange={(e) => setBankAccountNo(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ชื่อบัญชี <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="text" className="form-control" value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} required />
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="submit" className="btn btn-secondary">บันทึกบัญชี</button>
                <button type="button" className="btn btn-light" onClick={() => setShowBankModal(false)}>ยกเลิก</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: เพิ่ม/แก้ไข นักกิจกรรมบำบัด */}
      {showTherapistModal && (
        <div className="modal-overlay">
          <div className="modal-content-wrapper" style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>{editingTherapistId ? 'แก้ไขข้อมูลนักกิจกรรมบำบัด' : 'ลงทะเบียนนักกิจกรรมบำบัดใหม่'}</h3>
              <button className="close-modal-btn" onClick={() => setShowTherapistModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveTherapist}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">ชื่อเล่นครูผู้สอน <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input type="text" className="form-control" placeholder="เช่น ครูปิ่น" value={therapistNickname} onChange={(e) => setTherapistNickname(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">เลขประกอบโรคศิลปะ (ก.บ.)</label>
                    <input type="text" className="form-control" placeholder="เช่น ก.บ. 60102" value={therapistLicense} onChange={(e) => setTherapistLicense(e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">ชื่อ-นามสกุลจริงผู้สอน <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="text" className="form-control" value={therapistFullname} onChange={(e) => setTherapistFullname(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label className="form-label">เลือกวันเข้าทำงานคลินิก <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <div className="multi-select-toggles">
                    {[
                      { val: 'Monday', th: 'วันจันทร์' },
                      { val: 'Tuesday', th: 'วันอังคาร' },
                      { val: 'Wednesday', th: 'วันพุธ' },
                      { val: 'Thursday', th: 'วันพฤหัส' },
                      { val: 'Friday', th: 'วันศุกร์' },
                      { val: 'Saturday', th: 'วันเสาร์' },
                      { val: 'Sunday', th: 'วันอาทิตย์' }
                    ].map(day => (
                      <label key={day.val} className="toggle-checkbox-btn">
                        <input 
                          type="checkbox" 
                          checked={therapistWorkDays.includes(day.val)}
                          onChange={() => handleTherapistDayToggle(day.val)}
                        />
                        <span className="toggle-checkbox-label">{day.th}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">ตั้งค่าเวลาทำงานแยกย่อยแต่ละวัน (สล็อตเวลา)</label>
                  {therapistWorkDays.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: 'var(--danger)', fontStyle: 'italic' }}>
                      * กรุณาเลือกวันเข้าทำงานคลินิกด้านบนก่อนเพื่อระบุเวลาของแต่ละวัน
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem', maxHeight: '200px', overflowY: 'auto', paddingRight: '0.5rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '0.5rem' }}>
                      {therapistWorkDays.map(dayVal => {
                        const dayTh = dayVal === 'Monday' ? 'วันจันทร์' :
                                      dayVal === 'Tuesday' ? 'วันอังคาร' :
                                      dayVal === 'Wednesday' ? 'วันพุธ' :
                                      dayVal === 'Thursday' ? 'วันพฤหัสบดี' :
                                      dayVal === 'Friday' ? 'วันศุกร์' :
                                      dayVal === 'Saturday' ? 'วันเสาร์' : 'วันอาทิตย์';
                        const daySlots = therapistWorkHours[dayVal] || [];
                        const isWeekday = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(dayVal);
                        const slotsOptions = [
                          "09:00 - 10:00",
                          "10:00 - 11:00",
                          "11:00 - 12:00",
                          "13:00 - 14:00",
                          "14:00 - 15:00",
                          "15:00 - 16:00",
                          "16:00 - 17:00"
                        ];
                        if (isWeekday) {
                          slotsOptions.push("18:00 - 19:00", "19:00 - 20:00");
                        }
                        return (
                          <div key={dayVal} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.75rem', backgroundColor: 'var(--light)' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--dark)', display: 'flex', justifyContent: 'space-between' }}>
                              <span>🕒 {dayTh} ({dayVal})</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--secondary)' }}>เลือกแล้ว {daySlots.length} สล็อต</span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                              {slotsOptions.map(slot => {
                                const isSelected = daySlots.includes(slot);
                                return (
                                  <button
                                    key={slot}
                                    type="button"
                                    className={`btn ${isSelected ? 'btn-secondary' : 'btn-light'}`}
                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', minWidth: '95px' }}
                                    onClick={() => {
                                      let newSlots;
                                      if (isSelected) {
                                        newSlots = daySlots.filter(s => s !== slot);
                                      } else {
                                        newSlots = [...daySlots, slot].sort();
                                      }
                                      setTherapistWorkHours({
                                        ...therapistWorkHours,
                                        [dayVal]: newSlots
                                      });
                                    }}
                                  >
                                    {slot}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>              </div>
              
              <div className="modal-footer">
                <button type="submit" className="btn btn-secondary">บันทึกประวัติ</button>
                <button type="button" className="btn btn-light" onClick={() => setShowTherapistModal(false)}>ยกเลิก</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {false && (
        <div className="modal-overlay">
          <div className="modal-content-wrapper" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>{editingUsername ? 'แก้ไขข้อมูลพนักงาน/ผู้ใช้งาน' : 'เพิ่มพนักงาน'}</h3>
              <button className="close-modal-btn" onClick={() => setShowUserModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveUser}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                
                {/* ข้อมูลการเข้าสู่ระบบบัญชี */}
                <h4 style={{ color: '#b0895a', fontWeight: 700, marginBottom: '0.25rem', fontSize: '0.95rem' }}>ข้อมูลเข้าสู่ระบบ</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">ชื่อบัญชีผู้ใช้งาน (Username) <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="ภาษาอังกฤษไม่มีช่องว่าง" 
                      value={uUsername} 
                      onChange={(e) => setUUsername(e.target.value)} 
                      disabled={!!editingUsername}
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">รหัสผ่าน (Password) <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input type="text" className="form-control" value={uPassword} onChange={(e) => setUPassword(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">สิทธิ์การเข้าใช้งานระบบ</label>
                    <select className="form-control" value={uRole} onChange={(e) => setURole(e.target.value)}>
                      <option value="Staff">Staff (พนักงานทั่วไป)</option>
                      <option value="OT">OT (นักกิจกรรมบำบัด)</option>
                      <option value="Admin">Admin (ผู้ดูแลระบบสูงสุด)</option>
                    </select>
                  </div>
                </div>

                <div style={{ height: '1px', background: 'var(--border-light)', margin: '0.5rem 0' }}></div>

                {/* ข้อมูลโปรไฟล์พนักงาน */}
                <h4 style={{ color: '#b0895a', fontWeight: 700, marginBottom: '0.25rem', fontSize: '0.95rem' }}>ข้อมูลส่วนตัวและตำแหน่งงาน</h4>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">รหัสพนักงาน</label>
                    <input type="text" className="form-control" value={uEmployeeId} onChange={(e) => setUEmployeeId(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">ประเภทพนักงาน</label>
                    <select className="form-control" value={uEmployeeType} onChange={(e) => setUEmployeeType(e.target.value)}>
                      <option value="พนักงานประจำ">พนักงานประจำ</option>
                      <option value="พนักงานชั่วคราว">พนักงานชั่วคราว</option>
                      <option value="นักบำบัดอิสระ (Freelance)">นักบำบัดอิสระ (Freelance)</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">คำนำหน้า</label>
                    <select className="form-control" value={uTitle} onChange={(e) => setUTitle(e.target.value)}>
                      <option value="นาย">นาย</option>
                      <option value="นาง">นาง</option>
                      <option value="นางสาว">นางสาว</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">ชื่อ-สกุล <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input type="text" className="form-control" value={uFullname} onChange={(e) => setUFullname(e.target.value)} required />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">ชื่อเล่น</label>
                    <input type="text" className="form-control" placeholder="ระบุชื่อเล่น" value={uNickname} onChange={(e) => setUNickname(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">เลขบัตรประชาชน</label>
                    <input type="text" className="form-control" placeholder="เลข 13 หลัก" value={uCitizenId} onChange={(e) => setUCitizenId(e.target.value)} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">เพศ</label>
                    <select className="form-control" value={uGender} onChange={(e) => setUGender(e.target.value)}>
                      <option value="ชาย">ชาย</option>
                      <option value="หญิง">หญิง</option>
                      <option value="อื่นๆ">อื่นๆ</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">วันเกิด</label>
                    <input type="date" className="form-control" value={uDob} onChange={(e) => setUDob(e.target.value)} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">ตำแหน่ง</label>
                    <input type="text" className="form-control" placeholder="เช่น ธุรการ, นักกิจกรรมบำบัด" value={uPosition} onChange={(e) => setUPosition(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">วันที่เริ่มงาน</label>
                    <input type="date" className="form-control" value={uStartDate} onChange={(e) => setUStartDate(e.target.value)} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">เบอร์โทรศัพท์ (OXXXXXXXXX)</label>
                    <input type="tel" className="form-control" placeholder="08xxxxxxxx" value={uPhone} onChange={(e) => setUPhone(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">อีเมล</label>
                    <input type="email" className="form-control" placeholder="name@email.com" value={uEmail} onChange={(e) => setUEmail(e.target.value)} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">เงินเดือนพื้นฐาน</label>
                    <input type="number" className="form-control" placeholder="ระบุจำนวนเงิน" value={uBasicSalary} onChange={(e) => setUBasicSalary(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">สถานะ</label>
                    <select className="form-control" value={uStatus} onChange={(e) => setUStatus(e.target.value)}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* ข้อมูลธนาคาร */}
                <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem' }}>
                  <h4 style={{ color: '#b0895a', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.95rem' }}>Banking Info</h4>
                  <div className="form-row">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">ชื่อธนาคาร</label>
                      <select className="form-control" value={uBankName} onChange={(e) => setUBankName(e.target.value)}>
                        <option value="กสิกรไทย">กสิกรไทย (KBANK)</option>
                        <option value="ไทยพาณิชย์">ไทยพาณิชย์ (SCB)</option>
                        <option value="กรุงไทย">กรุงไทย (KTB)</option>
                        <option value="กรุงเทพ">กรุงเทพ (BBL)</option>
                        <option value="ทหารไทยธนชาต">ทหารไทยธนชาต (TTB)</option>
                        <option value="ออมสิน">ออมสิน (GSB)</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">เลขบัญชี</label>
                      <input type="text" className="form-control" placeholder="ระบุเลขบัญชีธนาคาร" value={uBankAccountNo} onChange={(e) => setUBankAccountNo(e.target.value)} />
                    </div>
                  </div>
                </div>

              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-light" onClick={() => setShowUserModal(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-secondary">บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* CUSTOM PRINT HOLIDAY MODAL */}
      {showPrintHolidayModal && (
        <div className="modal-overlay">
          <div className="modal-content-wrapper" style={{ maxWidth: '400px', borderRadius: 'var(--radius-3xl)' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CalendarDays color="var(--secondary)" size={20} />
                <h3 style={{ fontWeight: 700, fontSize: '1.2rem', margin: 0 }}>พิมพ์ปฏิทินวันหยุดประจำปี</h3>
              </div>
              <button className="close-modal-btn" onClick={() => setShowPrintHolidayModal(false)}>×</button>
            </div>
            
            <div className="modal-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 600, color: 'var(--dark)' }}>เลือกปีที่จัดพิมพ์:</label>
                <select 
                  className="form-control" 
                  value={selectedPrintYear}
                  onChange={(e) => setSelectedPrintYear(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-lg)', border: '2px solid var(--border)', fontSize: '1rem', fontWeight: 600 }}
                >
                  {availableHolidayYears.map(yr => {
                    const thYear = yr + 543;
                    return (
                      <option key={yr} value={yr}>ปี พ.ศ. {thYear} (ค.ศ. {yr})</option>
                    );
                  })}
                </select>
              </div>
            </div>
            
            <div className="modal-footer" style={{ padding: '1rem 1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                onClick={() => {
                  const filtered = holidays.filter(h => {
                    const hYear = new Date(h.date).getFullYear();
                    return hYear === selectedPrintYear && (h.type === 'วันหยุดคลินิก' || !h.type);
                  });
                  if (onPrintAnnualHolidays) {
                    onPrintAnnualHolidays(selectedPrintYear, filtered);
                  }
                  setShowPrintHolidayModal(false);
                }}
              >
                <Printer size={14} /> พิมพ์ปฏิทิน
              </button>
              <button 
                type="button" 
                className="btn btn-light" 
                onClick={() => setShowPrintHolidayModal(false)}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
