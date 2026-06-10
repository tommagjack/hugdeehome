import React, { useState, useMemo, useRef } from 'react';
import { formatTherapistName } from '../utils/format';
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
  Printer,
  Database
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
  onPrintAnnualHolidays,
  receipts
}) {
  const [activeSubMenu, setActiveSubMenu] = useState('clinic'); // clinic, services, promos, banks, therapists, holidays, users, integration
  const fileInputRef = useRef(null);

  const [localClinicInfo, setLocalClinicInfo] = useState(clinicInfo);

  React.useEffect(() => {
    if (clinicInfo) {
      setLocalClinicInfo(clinicInfo);
    }
  }, [clinicInfo]);

  const handleSaveClinicInfo = () => {
    setClinicInfo(localClinicInfo);
    Swal.fire({
      icon: 'success',
      title: 'บันทึกข้อมูลคลินิกเรียบร้อย',
      text: 'ระบบได้บันทึกข้อมูลและซิงค์ไปยัง Google Sheets เรียบร้อยแล้ว',
      timer: 1500,
      showConfirmButton: false
    });
  };

  const todayStr = '2026-06-05'; // วันที่จำลองระบบ

  // integration states
  const [sheetId, setSheetId] = useState(localStorage.getItem('hdh_sheet_id') || import.meta.env.VITE_SHEET_ID || '');
  const [gasUrl, setGasUrl] = useState(localStorage.getItem('hdh_gas_url') || import.meta.env.VITE_GAS_URL || '');
  const [isTestingBackup, setIsTestingBackup] = useState(false);

  const handleSaveIntegration = (e) => {
    e.preventDefault();
    localStorage.setItem('hdh_sheet_id', sheetId.trim());
    localStorage.setItem('hdh_gas_url', gasUrl.trim());
    Swal.fire({
      icon: 'success',
      title: 'บันทึกการเชื่อมต่อสำเร็จ',
      text: 'ระบบตั้งค่าฐานข้อมูล Google Sheets เรียบร้อยแล้ว',
      confirmButtonText: 'ตกลง'
    });
  };

  const handleTriggerBackup = async () => {
    if (!gasUrl) {
      Swal.fire('ข้อผิดพลาด', 'กรุณาระบุ URL ของ Google Apps Script Web App ก่อน', 'error');
      return;
    }
    
    setIsTestingBackup(true);
    Swal.fire({
      title: 'กำลังซิงค์ข้อมูล...',
      text: 'ระบบกำลังดึงข้อมูลล่าสุดจาก Google Sheets มาอัปเดตบนเบราว์เซอร์',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      // ดึงฟังก์ชันนำเข้าจาก utils/db.js แบบไดนามิกเพื่อหลีกเลี่ยงการวนลูป dependency
      const { syncFromSupabase } = await import('../utils/db');
      const success = await syncFromSupabase();
      if (success) {
        Swal.fire({
          icon: 'success',
          title: 'ซิงค์ข้อมูลสำเร็จ',
          text: 'ดาวน์โหลดข้อมูลจาก Google Sheets ลงระบบเรียบร้อยแล้ว ระบบจะทำการรีโหลดหน้าจอใหม่เพื่อแสดงผล',
          timer: 2000,
          showConfirmButton: false
        }).then(() => {
          window.location.reload();
        });
      } else {
        Swal.fire('ไม่สำเร็จ', 'ไม่สามารถดึงข้อมูลได้ โปรดตรวจสอบสิทธิ์และ URL ของ GAS', 'error');
      }
    } catch (error) {
      Swal.fire('ข้อผิดพลาด', 'เกิดความล้มเหลวในการเชื่อมต่อ: ' + error.message, 'error');
    } finally {
      setIsTestingBackup(false);
    }
  };

  const getGasCode = () => {
    return `// Google Apps Script (GAS) - สำหรับใช้งานเป็นฐานข้อมูลของคลินิกผ่าน Google Sheets
// คัดลอกโค้ดนี้ไปวางใน Extensions > Apps Script ใน Google Sheet ของคุณ

function doGet(e) {
  try {
    const action = e.parameter.action || 'get_all';
    
    if (action === 'get_all') {
      const data = getAllDataFromSheets();
      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: data }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "ไม่พบการทำงานที่ระบุ" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    
    if (action === 'sync_table') {
      const key = payload.key;
      const value = payload.value;
      
      const result = saveTableToSheet(key, value);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: result }))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (action === 'get_all') {
      const data = getAllDataFromSheets();
      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: data }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "ไม่พบการทำงานที่ระบุ" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ฟังก์ชันสำหรับอ่านข้อมูลจากทุกแผ่นชีทส่งกลับแอปพลิเคชัน
function getAllDataFromSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  const result = {};
  
  sheets.forEach(sheet => {
    const sheetName = sheet.getName();
    const range = sheet.getDataRange();
    const values = range.getValues();
    
    if (values.length < 1) return;
    
    const headers = values[0];
    const rows = values.slice(1);
    
    const dataList = rows.map(row => {
      const item = {};
      headers.forEach((header, index) => {
        if (!header) return;
        let val = row[index];
        
        // ลองถอดรูป JSON string (เช่น อาร์เรย์รายการสินค้า หรืออ็อบเจกต์ชั่วโมงทำงาน)
        if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
          try {
            val = JSON.parse(val);
          } catch(err) {
            // ทำตัวเป็นข้อความปกติหากแปลงไม่สำเร็จ
          }
        }
        item[header] = val;
      });
      return item;
    });
    
    // ตั้งคีย์ในรูปแบบ hdh_xxx
    let keyName = 'hdh_' + sheetName.toLowerCase();
    // กรณีข้อยกเว้นพิเศษเกี่ยวกับตัวอักษรพิมพ์ใหญ่/เล็กของบางตาราง
    if (sheetName.toLowerCase() === 'clinicinfo') {
      keyName = 'hdh_clinic_info';
    } else if (sheetName.toLowerCase() === 'bankaccounts') {
      keyName = 'hdh_bank_accounts';
    } else if (sheetName.toLowerCase() === 'salaryrules') {
      keyName = 'hdh_salary_rules';
    } else if (sheetName.toLowerCase() === 'opdrecords') {
      keyName = 'hdh_opd_records';
    }
    
    result[keyName] = dataList;
  });
  
  return result;
}

// ฟังก์ชันสำหรับเขียนทับข้อมูลลงในตารางชีททีละส่วน
function saveTableToSheet(key, list) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // แปลงชื่อคีย์ให้เป็นชื่อชีท
  let tabName = key.replace('hdh_', '');
  
  if (tabName.toLowerCase() === 'clinic_info') {
    tabName = 'ClinicInfo';
  } else if (tabName.toLowerCase() === 'bank_accounts') {
    tabName = 'BankAccounts';
  } else if (tabName.toLowerCase() === 'salary_rules') {
    tabName = 'SalaryRules';
  } else if (tabName.toLowerCase() === 'opd_records') {
    tabName = 'OpdRecords';
  } else {
    tabName = tabName.charAt(0).toUpperCase() + tabName.slice(1);
  }
  
  let sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
  } else {
    sheet.clear(); 
  }
  
  if (!Array.isArray(list) || list.length === 0) {
    return 'แผ่นงาน ' + tabName + ' เคลียร์ค่าว่างสำเร็จ (ไม่มีข้อมูลบันทึก)';
  }
  
  // ค้นหา Headers ทั้งหมด
  const headers = [];
  list.forEach(item => {
    Object.keys(item).forEach(k => {
      if (!headers.includes(k)) {
        headers.push(k);
      }
    });
  });
  
  // เขียนหัวตาราง
  sheet.appendRow(headers);
  
  // แปลงข้อมูลแถว
  const rows = list.map(item => {
    return headers.map(header => {
      const val = item[header];
      if (typeof val === 'object' && val !== null) {
        return JSON.stringify(val); 
      }
      return val !== undefined && val !== null ? val : '';
    });
  });
  
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  
  // ตกแต่งหัวตารางด้วยสีน้ำตาลทองตามดีไซน์คลินิก
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground("#A67C52") 
    .setFontColor("#FFFFFF")
    .setFontWeight("bold");
  
  sheet.autoResizeColumns(1, headers.length);
  
  return 'บันทึกข้อมูลลง ' + tabName + ' จำนวน ' + rows.length + ' แถวสำเร็จ';
}`;
  };

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
  const [serviceSessionsPerUnit, setServiceSessionsPerUnit] = useState(1);

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
      price: Number(servicePrice),
      sessionsPerUnit: Number(serviceSessionsPerUnit || 1)
    };

    if (editingServiceCode) {
      if (serviceCode !== editingServiceCode && services.some(s => s.code === serviceCode)) {
        Swal.fire('รหัสซ้ำ', 'รหัสบริการนี้มีอยู่ในระบบแล้ว', 'error');
        return;
      }
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
    setServiceSessionsPerUnit(1);
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
    setServiceSessionsPerUnit(s.sessionsPerUnit || 1);
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
      if (promoCode !== editingPromoCode && promotions.some(p => p.code === promoCode)) {
        Swal.fire('รหัสโปรโมชั่นซ้ำ', 'รหัสโปรโมชั่นนี้มีอยู่ในระบบแล้ว', 'error');
        return;
      }
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
      const defaultSlots = ["09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", "13:00 - 14:00", "14:00 - 15:00", "15:00 - 16:00", "16:00 - 17:00", "17:00 - 18:00"];
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
            <a className={`settings-link ${activeSubMenu === 'integration' ? 'active' : ''}`} onClick={() => setActiveSubMenu('integration')}>
              <Database size={16} /> ตั้งค่าคลาวด์และชีท
            </a>
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
                    <input type="text" className="form-control" value={localClinicInfo?.name || ''} onChange={(e) => setLocalClinicInfo({ ...localClinicInfo, name: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ flex: 2 }}>
                    <label className="form-label">ประเภทคลินิก</label>
                    <input type="text" className="form-control" placeholder="เช่น คลินิกการประกอบโรคศิลปะ สาขากิจกรรมบำบัด" value={localClinicInfo?.type || ''} onChange={(e) => setLocalClinicInfo({ ...localClinicInfo, type: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">ใบอนุญาตเลขที่</label>
                    <input type="text" className="form-control" value={localClinicInfo?.licenseNo || ''} onChange={(e) => setLocalClinicInfo({ ...localClinicInfo, licenseNo: e.target.value })} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">เบอร์โทรศัพท์คลินิก</label>
                    <input type="tel" className="form-control" value={localClinicInfo?.phone || ''} onChange={(e) => setLocalClinicInfo({ ...localClinicInfo, phone: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">อีเมลติดต่อ</label>
                    <input type="email" className="form-control" value={localClinicInfo?.email || ''} onChange={(e) => setLocalClinicInfo({ ...localClinicInfo, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Line ID คลินิก</label>
                    <input type="text" className="form-control" value={localClinicInfo?.lineId || ''} onChange={(e) => setLocalClinicInfo({ ...localClinicInfo, lineId: e.target.value })} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">ที่อยู่คลินิก</label>
                  <textarea className="form-control" rows="2" value={localClinicInfo?.address || ''} onChange={(e) => setLocalClinicInfo({ ...localClinicInfo, address: e.target.value })}></textarea>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">URL รูปโลโก้คลินิก</label>
                    <input type="url" className="form-control" value={localClinicInfo?.logoUrl || ''} onChange={(e) => setLocalClinicInfo({ ...localClinicInfo, logoUrl: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">URL ตราประทับคลินิก (สำหรับใบเสร็จ)</label>
                    <input type="url" className="form-control" value={localClinicInfo?.stampUrl || ''} onChange={(e) => setLocalClinicInfo({ ...localClinicInfo, stampUrl: e.target.value })} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Folder ID (รหัสโฟลเดอร์หลักเก็บเอกสาร)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="ระบุ Folder ID ในระบบคลาวด์ เช่น 1A2B3C4D5E..." 
                      value={localClinicInfo?.folderId || ''} 
                      onChange={(e) => setLocalClinicInfo({ ...localClinicInfo, folderId: e.target.value })} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Folder URL (ลิงก์โฟลเดอร์หลักเก็บเอกสาร)</label>
                    <input 
                      type="url" 
                      className="form-control" 
                      placeholder="ระบุลิงก์ เช่น https://drive.google.com/drive/folders/..." 
                      value={localClinicInfo?.folderUrl || ''} 
                      onChange={(e) => setLocalClinicInfo({ ...localClinicInfo, folderUrl: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">ข้อความส่วนท้ายใบเสร็จรับเงิน</label>
                  <input type="text" className="form-control" value={localClinicInfo?.receiptFooter || ''} onChange={(e) => setLocalClinicInfo({ ...localClinicInfo, receiptFooter: e.target.value })} />
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={handleSaveClinicInfo}>
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
                      <th>จำนวนครั้งคอร์ส</th>
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
                        <td>{s.category === 'บริการ' ? `${s.sessionsPerUnit || 1} ครั้ง` : '-'}</td>
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
                      const usedCount = receipts ? receipts.filter(r => r.promotionId === p.code && r.status !== 'ยกเลิก').length : 0;
                      const remaining = Math.max(0, p.maxUses - usedCount);
                      const isExpired = !(todayStr >= p.startDate && todayStr <= p.endDate);
                      const isActive = !isExpired && remaining > 0;
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
                          <td>คงเหลือ {remaining} / {p.maxUses} สิทธิ์ (ใช้ไป {usedCount})</td>
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
                        <td style={{ fontWeight: 700, color: 'var(--secondary)' }}>{formatTherapistName(t.nickname)}</td>
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

          {/* 7. ตั้งค่าคลาวด์และชีท (Cloud & Sheets Integration) */}
          {activeSubMenu === 'integration' && (
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Database size={20} color="var(--secondary)" />
                เชื่อมต่อฐานข้อมูลระบบผ่าน Google Sheets
              </h2>
              
              <form onSubmit={handleSaveIntegration} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* ส่วนที่ 1: Google Sheets Configuration */}
                <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--secondary)', marginBottom: '1rem' }}>
                    ตั้งค่า Google Sheets Cloud Database
                  </h3>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Google Sheet ID</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="ระบุรหัสแผ่นชีท (จาก URL ของ Google Sheets)" 
                        value={sheetId} 
                        onChange={(e) => setSheetId(e.target.value)} 
                        required
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1.5 }}>
                      <label className="form-label">Google Apps Script Web App URL (GAS URL)</label>
                      <input 
                        type="url" 
                        className="form-control" 
                        placeholder="https://script.google.com/macros/s/xxxx/exec" 
                        value={gasUrl} 
                        onChange={(e) => setGasUrl(e.target.value)} 
                        required
                      />
                    </div>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--dark-light)', marginTop: '0.5rem' }}>
                    * ข้อมูลแอปพลิเคชันจะจัดเก็บลง Google Sheets แบบเรียลไทม์ และหากระบบออฟไลน์จะสลับไปใช้ LocalStorage ในเครื่องอัตโนมัติ
                  </p>
                </div>

                {/* ปุ่มบันทึกการตั้งค่าทั้งหมด */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <button type="submit" className="btn btn-secondary" style={{ padding: '0.6rem 1.5rem' }}>
                    บันทึกการเชื่อมต่อ
                  </button>
                  {gasUrl && (
                    <button 
                      type="button" 
                      className="btn btn-light" 
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.5rem' }}
                      onClick={handleTriggerBackup}
                      disabled={isTestingBackup}
                    >
                      <Download size={16} />
                      {isTestingBackup ? 'กำลังซิงค์ข้อมูล...' : 'ดาวน์โหลดข้อมูลจาก Google Sheets ทันที'}
                    </button>
                  )}
                </div>
              </form>

              {/* ส่วนที่ 3: โค้ด Google Apps Script */}
              <div style={{ marginTop: '2rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--secondary)', marginBottom: '0.75rem' }}>
                  3. รหัสโปรแกรม Google Apps Script (GAS Script)
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--dark-light)', marginBottom: '0.75rem' }}>
                  นำรหัสโปรแกรมนี้ไปใส่ใน Google Sheet ของคุณ โดยคลิกเมนู <strong>Extensions (ส่วนขยาย) &gt; Apps Script</strong> วางรหัสลงไปแล้วเลือก <strong>Deploy (การใช้งานได้จริง) &gt; New deployment &gt; Web app</strong> และอนุญาตสิทธิ์การเข้าถึงให้เรียบร้อย
                </p>
                <div style={{ position: 'relative' }}>
                  <textarea 
                    className="form-control" 
                    readOnly 
                    rows="12" 
                    value={getGasCode()} 
                    style={{ 
                      fontFamily: 'monospace', 
                      fontSize: '0.8rem', 
                      backgroundColor: 'var(--light)', 
                      whiteSpace: 'pre', 
                      overflowX: 'auto',
                      padding: '1rem'
                    }}
                  />
                  <button 
                    className="btn btn-light" 
                    style={{ 
                      position: 'absolute', 
                      top: '0.5rem', 
                      right: '0.5rem', 
                      padding: '0.3rem 0.6rem',
                      fontSize: '0.75rem',
                      border: '1px solid var(--border)'
                    }}
                    onClick={() => {
                      navigator.clipboard.writeText(getGasCode());
                      Swal.fire({
                        icon: 'success',
                        title: 'คัดลอกรหัสโปรแกรมแล้ว',
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 1500
                      });
                    }}
                  >
                    คัดลอกโค้ด
                  </button>
                </div>
              </div>
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

                <div className="form-row">
                  <div className="form-group" style={{ maxWidth: '200px' }}>
                    <label className="form-label">ราคาขายต่อหน่วย <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input type="number" className="form-control" min="0" value={servicePrice} onChange={(e) => setServicePrice(e.target.value)} required />
                  </div>
                  {serviceCategory === 'บริการ' && (
                    <div className="form-group" style={{ maxWidth: '200px' }}>
                      <label className="form-label">จำนวนครั้งในคอร์ส (Sessions/Unit) <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <input type="number" className="form-control" min="1" value={serviceSessionsPerUnit} onChange={(e) => setServiceSessionsPerUnit(Number(e.target.value) || 1)} required />
                    </div>
                  )}
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
                          "16:00 - 17:00",
                          "17:00 - 18:00"
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
