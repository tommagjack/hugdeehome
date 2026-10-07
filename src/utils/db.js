import * as mock from './mockData';
import { supabase } from './supabaseClient';

export const KEYS = {
  CLINIC_INFO: 'hdh_clinic_info',
  USERS: 'hdh_users',
  THERAPISTS: 'hdh_therapists',
  SERVICES: 'hdh_services',
  PROMOTIONS: 'hdh_promotions',
  BANK_ACCOUNTS: 'hdh_bank_accounts',
  HOLIDAYS: 'hdh_holidays',
  PATIENTS: 'hdh_patients',
  RECEIPTS: 'hdh_receipts',
  APPOINTMENTS: 'hdh_appointments',
  ASSESSMENTS: 'hdh_assessments',
  SALARY_RULES: 'hdh_salary_rules',
  PAYROLLS: 'hdh_payrolls',
  TRANSACTIONS: 'hdh_transactions',
  OPD_RECORDS: 'hdh_opd_records',
  REWARDS: 'hdh_rewards',
  REFERRALS: 'hdh_referrals',
  ASSESSMENT_TEMPLATES: 'hdh_assessment_templates',
  ATTENDANCE: 'hdh_attendance',
  ITP_GOALS: 'hdh_itp_goals',
};

// ฟังก์ชันคัดกรองข้อมูลไฟล์เอกสารขนาดใหญ่ (เช่น เอกสารบัตรประชาชน, ทะเบียนบ้าน, ใบประกอบวิชาชีพ) ออกจาก LocalStorage เพื่อแก้ปัญหา QuotaExceededError
export const cleanUsersData = (usersList) => {
  if (!Array.isArray(usersList)) return usersList;
  return usersList.map(u => {
    if (!u) return u;
    const cleaned = { ...u };
    const docFields = ['citizenIdDoc', 'houseRegDoc', 'bankBookDoc', 'licenseDoc', 'contractDoc', 'otherDoc'];
    docFields.forEach(field => {
      if (cleaned[field]) {
        let doc = cleaned[field];
        if (typeof doc === 'string') {
          try { doc = JSON.parse(doc); } catch { /* ignore invalid json */ }
        }
        if (doc && typeof doc === 'object') {
          const docCopy = { ...doc };
          if (docCopy.path && (docCopy.path.startsWith('http://') || docCopy.path.startsWith('https://'))) {
            docCopy.data = '';
          } else if (docCopy.path && docCopy.path.startsWith('data:')) {
            docCopy.data = '';
          } else if (docCopy.data && docCopy.data.startsWith('data:')) {
            docCopy.path = docCopy.data;
            docCopy.data = '';
          }
          cleaned[field] = docCopy;
        }
      }
    });
    if (cleaned.avatarFile) {
      let avFile = cleaned.avatarFile;
      if (typeof avFile === 'string') {
        try { avFile = JSON.parse(avFile); } catch { /* ignore invalid json */ }
      }
      if (avFile && typeof avFile === 'object') {
        cleaned.avatarFile = { ...avFile, data: '' };
      }
    }
    return cleaned;
  });
};

// ตรวจสอบและสร้างข้อมูลเริ่มต้นใน localStorage หากไม่มีข้อมูล
export const initDatabase = (forceReset = false) => {
  if (forceReset || !localStorage.getItem(KEYS.CLINIC_INFO)) {
    localStorage.setItem(KEYS.CLINIC_INFO, JSON.stringify(mock.INITIAL_CLINIC_INFO));
    localStorage.setItem(KEYS.USERS, JSON.stringify(mock.INITIAL_USERS));
    localStorage.setItem(KEYS.THERAPISTS, JSON.stringify(mock.INITIAL_THERAPISTS));
    localStorage.setItem(KEYS.SERVICES, JSON.stringify(mock.INITIAL_SERVICES));
    localStorage.setItem(KEYS.PROMOTIONS, JSON.stringify(mock.INITIAL_PROMOTIONS));
    localStorage.setItem(KEYS.BANK_ACCOUNTS, JSON.stringify(mock.INITIAL_BANK_ACCOUNTS));
    localStorage.setItem(KEYS.HOLIDAYS, JSON.stringify(mock.INITIAL_HOLIDAYS));
    localStorage.setItem(KEYS.PATIENTS, JSON.stringify(mock.INITIAL_PATIENTS));
    localStorage.setItem(KEYS.RECEIPTS, JSON.stringify(mock.INITIAL_RECEIPTS));
    localStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify(mock.INITIAL_APPOINTMENTS));
    localStorage.setItem(KEYS.ASSESSMENTS, JSON.stringify(mock.INITIAL_ASSESSMENTS));
    localStorage.setItem(KEYS.SALARY_RULES, JSON.stringify(mock.INITIAL_SALARY_RULES));
    localStorage.setItem(KEYS.PAYROLLS, JSON.stringify(mock.INITIAL_PAYROLLS));
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(mock.INITIAL_TRANSACTIONS));
    localStorage.setItem(KEYS.OPD_RECORDS, JSON.stringify(mock.INITIAL_OPD_RECORDS));
    localStorage.setItem(KEYS.REWARDS, JSON.stringify([]));
    localStorage.setItem(KEYS.REFERRALS, JSON.stringify([]));
    localStorage.setItem(KEYS.ASSESSMENT_TEMPLATES, JSON.stringify(mock.INITIAL_ASSESSMENT_TEMPLATES));
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify([]));
    return true;
  }
  // ตรวจสอบความปลอดภัยสำหรับคีย์ใหม่ที่อาจไม่มีในเครื่องผู้ใช้ที่มีประวัติเดิมอยู่แล้ว
  if (!localStorage.getItem(KEYS.CLINIC_INFO)) {
    localStorage.setItem(KEYS.CLINIC_INFO, JSON.stringify(mock.INITIAL_CLINIC_INFO));
  }
  const currentUsers = localStorage.getItem(KEYS.USERS);
  if (!currentUsers || JSON.parse(currentUsers || '[]').length === 0) {
    localStorage.setItem(KEYS.USERS, JSON.stringify(mock.INITIAL_USERS));
  } else {
    try {
      const parsed = JSON.parse(currentUsers);
      const cleaned = cleanUsersData(parsed);
      localStorage.setItem(KEYS.USERS, JSON.stringify(cleaned));
    } catch {
      /* ignore invalid JSON */
    }
  }
  if (!localStorage.getItem(KEYS.ASSESSMENT_TEMPLATES)) {
    localStorage.setItem(KEYS.ASSESSMENT_TEMPLATES, JSON.stringify(mock.INITIAL_ASSESSMENT_TEMPLATES));
  }
  if (!localStorage.getItem(KEYS.ATTENDANCE)) {
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify([]));
  }
  return false;
};

// ฟังก์ชันดึง/บันทึกทั่วไป
const get = (key, defaultVal) => {
  try {
    const data = localStorage.getItem(key);
    if (!data || data === 'undefined' || data === 'null') {
      return defaultVal;
    }
    const parsed = JSON.parse(data);
    if (parsed === null || parsed === undefined) {
      return defaultVal;
    }
    if (Array.isArray(defaultVal) && !Array.isArray(parsed)) {
      return defaultVal;
    }
    return parsed;
  } catch (e) {
    console.error(`Error reading key ${key} from localStorage:`, e);
    return defaultVal;
  }
};

const set = (key, val) => {
  if (val === undefined || val === null) return;
  localStorage.setItem(key, JSON.stringify(val));
};

export const db = {
  getClinicInfo: () => {
    const data = get(KEYS.CLINIC_INFO, mock.INITIAL_CLINIC_INFO);
    let info = Array.isArray(data) ? (data[0] || mock.INITIAL_CLINIC_INFO) : data;
    if (info) {
      let parsed = null;
      if (typeof info.folderUrl === 'object' && (info.folderUrl?.operatingHours || info.folderUrl?.richmenuConfig)) {
        parsed = info.folderUrl;
      } else if (typeof info.folderUrl === 'string' && info.folderUrl.startsWith('{')) {
        parsed = safeJsonParse(info.folderUrl, null);
      } else if (typeof info.folder_url === 'string' && info.folder_url.startsWith('{')) {
        parsed = safeJsonParse(info.folder_url, null);
      }
      if (parsed && typeof parsed === 'object') {
        info = {
          ...info,
          operatingHours: parsed.operatingHours || info.operatingHours || mock.DEFAULT_OPERATING_HOURS,
          operatingHoursSummary: parsed.operatingHoursSummary || info.operatingHoursSummary || mock.INITIAL_CLINIC_INFO.operatingHoursSummary,
          servicesSubtitle: parsed.servicesSubtitle !== undefined ? parsed.servicesSubtitle : (info.servicesSubtitle || mock.INITIAL_CLINIC_INFO.servicesSubtitle),
          servicesFooterTitle: parsed.servicesFooterTitle !== undefined ? parsed.servicesFooterTitle : (info.servicesFooterTitle || mock.INITIAL_CLINIC_INFO.servicesFooterTitle),
          servicePrograms: parsed.servicePrograms !== undefined ? parsed.servicePrograms : (info.servicePrograms || null),
          mapsUrl: parsed.mapsUrl !== undefined ? parsed.mapsUrl : (info.mapsUrl || mock.INITIAL_CLINIC_INFO.mapsUrl),
          richmenuConfig: parsed.richmenuConfig || info.richmenuConfig || null,
          richmenuImages: parsed.richmenuImages || info.richmenuImages || null,
          richmenuUpdatedAt: parsed.richmenuUpdatedAt || info.richmenuUpdatedAt || '',
          dynamicLinks: parsed.dynamicLinks || info.dynamicLinks || null,
          folderUrl: parsed.original !== undefined ? parsed.original : (typeof info.folderUrl === 'string' && !info.folderUrl.startsWith('{') ? info.folderUrl : ''),
          folder_url: parsed.original !== undefined ? parsed.original : (typeof info.folder_url === 'string' && !info.folder_url.startsWith('{') ? info.folder_url : '')
        };
      } else if (!info.operatingHours) {
        info = {
          ...info,
          operatingHours: mock.DEFAULT_OPERATING_HOURS,
          operatingHoursSummary: mock.INITIAL_CLINIC_INFO.operatingHoursSummary
        };
      }

      // ตรวจสอบและดึงข้อมูลสำรองจาก localStorage หากใน info ยังไม่มี
      if (!info.richmenuConfig) {
        try {
          const localCfg = localStorage.getItem('hdh_line_richmenu_custom_configs');
          if (localCfg) info.richmenuConfig = JSON.parse(localCfg);
          else info.richmenuConfig = mock.DEFAULT_RICHMENU_CONFIG;
        } catch {
          info.richmenuConfig = mock.DEFAULT_RICHMENU_CONFIG;
        }
      }
      if (!info.richmenuImages) {
        try {
          const localImgs = localStorage.getItem('hdh_line_richmenu_custom_images');
          if (localImgs) info.richmenuImages = JSON.parse(localImgs);
          else info.richmenuImages = {};
        } catch {
          info.richmenuImages = {};
        }
      }
      if (!info.dynamicLinks) {
        try {
          const localLinks = localStorage.getItem('hdh_dynamic_links');
          if (localLinks) info.dynamicLinks = JSON.parse(localLinks);
        } catch {}
      }
    }
    return info;
  },
  setClinicInfo: (data) => set(KEYS.CLINIC_INFO, data),

  getUsers: () => {
    const data = get(KEYS.USERS, mock.INITIAL_USERS);
    if (Array.isArray(data)) {
      return data.map(u => {
        const empCode = String(u.employeeId || u.employee_id || u.username || '').toUpperCase().trim();
        const savedLine = localStorage.getItem(`hdh_line_user_${empCode}`) || '';
        let lineId = u.lineUserId || u.line_user_id || savedLine || '';
        if (!lineId && u.avatarFile) {
          const av = typeof u.avatarFile === 'string' ? safeJsonParse(u.avatarFile) : u.avatarFile;
          if (av && (av.line_user_id || av.lineUserId)) {
            lineId = av.line_user_id || av.lineUserId;
          }
        }
        return {
          ...u,
          lineUserId: lineId,
          line_user_id: lineId,
          password: u.password || (u.username === 'admin' ? 'admin0100' : '123456'),
          avatarFile: safeJsonParse(u.avatarFile),
          citizenIdDoc: safeJsonParse(u.citizenIdDoc),
          houseRegDoc: safeJsonParse(u.houseRegDoc),
          bankBookDoc: safeJsonParse(u.bankBookDoc),
          licenseDoc: safeJsonParse(u.licenseDoc),
          otherDoc: safeJsonParse(u.otherDoc),
          contractDoc: safeJsonParse(u.contractDoc)
        };
      });
    }
    return data;
  },
  setUsers: (data) => {
    const cleaned = cleanUsersData(data);
    set(KEYS.USERS, cleaned);
  },

  getTherapists: () => {
    const data = get(KEYS.THERAPISTS, mock.INITIAL_THERAPISTS);
    if (Array.isArray(data)) {
      return data.map(t => ({
        ...t,
        workDays: safeJsonParse(t.workDays),
        workHours: safeJsonParse(t.workHours)
      }));
    }
    return data;
  },
  setTherapists: (data) => set(KEYS.THERAPISTS, data),

  getServices: () => get(KEYS.SERVICES, mock.INITIAL_SERVICES),
  setServices: (data) => set(KEYS.SERVICES, data),

  getPromotions: () => get(KEYS.PROMOTIONS, mock.INITIAL_PROMOTIONS),
  setPromotions: (data) => set(KEYS.PROMOTIONS, data),

  getBankAccounts: () => get(KEYS.BANK_ACCOUNTS, mock.INITIAL_BANK_ACCOUNTS),
  setBankAccounts: (data) => set(KEYS.BANK_ACCOUNTS, data),

  getHolidays: () => get(KEYS.HOLIDAYS, mock.INITIAL_HOLIDAYS),
  setHolidays: (data) => set(KEYS.HOLIDAYS, data),

  getPatients: () => {
    const data = get(KEYS.PATIENTS, mock.INITIAL_PATIENTS);
    if (Array.isArray(data)) {
      return data.map(p => ({
        ...p,
        channels: safeJsonParse(p.channels)
      }));
    }
    return data;
  },
  setPatients: (data) => set(KEYS.PATIENTS, data),

  getReceipts: () => get(KEYS.RECEIPTS, mock.INITIAL_RECEIPTS),
  setReceipts: (data) => set(KEYS.RECEIPTS, data),

  getAppointments: () => get(KEYS.APPOINTMENTS, mock.INITIAL_APPOINTMENTS),
  setAppointments: (data) => set(KEYS.APPOINTMENTS, data),

  getAssessments: () => {
    const data = get(KEYS.ASSESSMENTS, mock.INITIAL_ASSESSMENTS);
    if (Array.isArray(data)) {
      return data.map(item => ({
        ...item,
        gm: item.gm === 'ล่าช้า' ? 'ไม่สมวัย' : (item.gm || 'สมวัย'),
        fm: item.fm === 'ล่าช้า' ? 'ไม่สมวัย' : (item.fm || 'สมวัย'),
        language: item.language === 'ล่าช้า' ? 'ไม่สมวัย' : (item.language || 'สมวัย'),
        social: item.social === 'ล่าช้า' ? 'ไม่สมวัย' : (item.social || 'สมวัย'),
        templateIds: safeJsonParse(item.templateIds),
        scores: safeJsonParse(item.scores),
        details: safeJsonParse(item.details),
        sensoryScores: safeJsonParse(item.sensoryScores),
        snapIV: safeJsonParse(item.snapIV)
      }));
    }
    return data;
  },
  setAssessments: (data) => set(KEYS.ASSESSMENTS, data),

  getSalaryRules: () => {
    const data = get(KEYS.SALARY_RULES, mock.INITIAL_SALARY_RULES);
    if (data) {
      return {
        ...data,
        earnings: safeJsonParse(data.earnings),
        deductions: safeJsonParse(data.deductions)
      };
    }
    return data;
  },
  setSalaryRules: (data) => set(KEYS.SALARY_RULES, data),

  getPayrolls: () => {
    const data = get(KEYS.PAYROLLS, mock.INITIAL_PAYROLLS);
    if (Array.isArray(data)) {
      return data.map(p => ({
        ...p,
        earningsList: safeJsonParse(p.earningsList),
        deductionsList: safeJsonParse(p.deductionsList),
        specialEarnings: safeJsonParse(p.specialEarnings),
        specialDeductions: safeJsonParse(p.specialDeductions)
      }));
    }
    return data;
  },
  setPayrolls: (data) => set(KEYS.PAYROLLS, data),

  getTransactions: () => get(KEYS.TRANSACTIONS, mock.INITIAL_TRANSACTIONS),
  setTransactions: (data) => set(KEYS.TRANSACTIONS, data),

  getOpdRecords: () => get(KEYS.OPD_RECORDS, mock.INITIAL_OPD_RECORDS),
  setOpdRecords: (data) => set(KEYS.OPD_RECORDS, data),

  getRewards: () => get(KEYS.REWARDS, []),
  setRewards: (data) => set(KEYS.REWARDS, data),

  getReferrals: () => get(KEYS.REFERRALS, []),
  setReferrals: (data) => set(KEYS.REFERRALS, data),

  getItpGoals: () => get(KEYS.ITP_GOALS, []),
  setItpGoals: (data) => set(KEYS.ITP_GOALS, data),

  getAssessmentTemplates: () => {
    const data = get(KEYS.ASSESSMENT_TEMPLATES, mock.INITIAL_ASSESSMENT_TEMPLATES);
    if (Array.isArray(data)) {
      return data.map(t => ({
        ...t,
        categories: safeJsonParse(t.categories),
        questions: safeJsonParse(t.questions),
        scoringRules: safeJsonParse(t.scoringRules),
        checklistOptions: safeJsonParse(t.checklistOptions)
      }));
    }
    return data;
  },
  setAssessmentTemplates: (data) => set(KEYS.ASSESSMENT_TEMPLATES, data),

  getAttendance: () => get(KEYS.ATTENDANCE, []),
  setAttendance: (data) => set(KEYS.ATTENDANCE, data),

  saveEmployeeLineUser: async (employeeId, lineUserId) => {
    return await saveEmployeeLineUser(employeeId, lineUserId);
  }
};

// --- ฟังก์ชันบันทึกการผูกบัญชี LINE OA ของพนักงาน ---
export const saveEmployeeLineUser = async (employeeId, lineUserId) => {
  if (!employeeId) return false;
  const empClean = String(employeeId).trim().toUpperCase();

  // 1. จัดเก็บลง LocalStorage hdh_users
  try {
    const raw = localStorage.getItem(KEYS.USERS);
    const users = raw ? JSON.parse(raw) : (mock.INITIAL_USERS || []);
    let updated = false;
    const newUsers = users.map(u => {
      const uEmp = String(u.employeeId || u.employee_id || u.username || '').toUpperCase().trim();
      if (uEmp === empClean) {
        updated = true;
        return {
          ...u,
          lineUserId,
          line_user_id: lineUserId
        };
      }
      return u;
    });
    if (updated) {
      localStorage.setItem(KEYS.USERS, JSON.stringify(newUsers));
    }
  } catch (e) {
    console.warn('Error updating local users with lineUserId:', e);
  }

  // 2. จัดเก็บ mapping สำรองใน LocalStorage
  if (lineUserId) {
    localStorage.setItem(`hdh_line_user_${empClean}`, lineUserId);
  } else {
    localStorage.removeItem(`hdh_line_user_${empClean}`);
  }

  // 3. บันทึกลง Supabase users
  try {
    const avatarPayload = JSON.stringify({ line_user_id: lineUserId || '' });
    // พยายามอัปเดต line_user_id ตรงๆ
    try {
      await supabase.from('users').update({ line_user_id: lineUserId || null }).or(`employee_id.eq.${empClean},username.eq.${empClean}`);
    } catch {
      /* ignore column error */
    }
    // และอัปเดต avatar_file สำรอง
    await supabase.from('users').update({ avatar_file: avatarPayload }).or(`employee_id.eq.${empClean},username.eq.${empClean}`);
  } catch (err) {
    console.warn('Could not update line_user_id in Supabase users:', err);
  }

  // ส่ง custom event แจ้งเตือนคอมโพเนนต์ต่างๆ ในหน้าจอ
  try {
    window.dispatchEvent(new CustomEvent('hdh_line_user_updated', { detail: { employeeId: empClean, lineUserId } }));
  } catch {
    /* ignore event dispatch error */
  }

  return true;
};

// --- ฟังก์ชันดึง Google Apps Script URL ที่ถูกต้อง ---
export const getGasUrl = () => {
  const localUrl = localStorage.getItem('hdh_gas_url');
  if (localUrl && localUrl.trim()) {
    return localUrl.trim();
  }
  const envUrl = import.meta.env.VITE_GAS_URL;
  if (envUrl && envUrl.trim() && !envUrl.includes('AKfycbz2A08')) {
    return envUrl.trim();
  }
  return 'https://script.google.com/macros/s/AKfycbw9t-DSskCxgPWNkR8bkOWabLgpSGuF6EqBRrM46rE-T2I9krkV1hz5Ao-d_WVQQ15Ueg/exec';
};

// --- ส่งข้อความแจ้งเตือนการลงเวลาเข้า LINE OA ---
export const sendAttendanceLineNotification = async (payload, extraOptions = {}) => {
  try {
    let finalBody = payload;
    if (typeof payload === 'string') {
      finalBody = { lineUserId: payload, ...(extraOptions || {}) };
    }
    // หากไม่มี lineUserId ให้พยายามหาจาก localStorage สำรอง
    if (!finalBody.lineUserId && finalBody.employeeId) {
      const empClean = String(finalBody.employeeId).trim().toUpperCase();
      const saved = localStorage.getItem(`hdh_line_user_${empClean}`);
      if (saved) {
        finalBody.lineUserId = saved;
      }
    }
    // ส่ง channelAccessToken จาก clinicInfo สำรอง เผื่อ RLS ใน Supabase บล็อกฝั่ง backend
    if (!finalBody.channelAccessToken) {
      try {
        const clinicRaw = localStorage.getItem(KEYS.CLINIC_INFO);
        const clinic = clinicRaw ? JSON.parse(clinicRaw) : null;
        if (clinic && (clinic.lineChannelAccessToken || clinic.line_channel_access_token)) {
          finalBody.channelAccessToken = clinic.lineChannelAccessToken || clinic.line_channel_access_token;
        }
      } catch {
        /* ignore parse error */
      }
    }

    const res = await fetch('/api/send-line-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(finalBody)
    });
    return await res.json();
  } catch (err) {
    console.error('Failed to send attendance LINE notification:', err);
    return { success: false, error: err.message };
  }
};

// --- ตารางแปลงชื่อคีย์เป็นชื่อตารางใน Supabase ---
export const TABLE_MAP = {
  'hdh_clinic_info': 'clinic_info',
  'hdh_users': 'users',
  'hdh_therapists': 'therapists',
  'hdh_services': 'services',
  'hdh_promotions': 'promotions',
  'hdh_bank_accounts': 'bank_accounts',
  'hdh_holidays': 'holidays',
  'hdh_patients': 'patients',
  'hdh_receipts': 'receipts',
  'hdh_appointments': 'appointments',
  'hdh_assessments': 'assessments',
  'hdh_salary_rules': 'salary_rules',
  'hdh_payrolls': 'payrolls',
  'hdh_transactions': 'transactions',
  'hdh_opd_records': 'opd_records',
  'hdh_rewards': 'rewards',
  'hdh_referrals': 'referrals',
  'hdh_assessment_templates': 'assessment_templates',
  'hdh_attendance': 'attendance',
  'hdh_itp_goals': 'itp_goals',
};

// --- คอลัมน์ที่รองรับในแต่ละตารางฐานข้อมูล Supabase เพื่อป้องกันปัญหาส่งฟิลด์ส่วนเกิน ---
const TABLE_COLUMNS = {
  clinic_info: [
    'id', 'name', 'license_no', 'phone', 'email', 'line_id', 'address', 
    'logo_url', 'stamp_url', 'receipt_footer', 'folder_id', 'folder_url',
    'type', 'payslip_footer', 'liff_id', 'line_channel_access_token', 'hero_image_url'
  ],
  users: [
    'username', 'password', 'fullname', 'role', 'status', 'employee_id', 
    'employee_type', 'title', 'nickname', 'citizen_id', 'gender', 'dob', 
    'position', 'start_date', 'phone', 'email', 'basic_salary', 'bank_name', 
    'bank_account_no', 'avatar_url', 'contract_doc', 'user_folder_url',
    'avatar_file', 'citizen_id_doc', 'house_reg_doc', 'bank_book_doc', 'license_doc', 'other_doc', 'resignation_date'
  ],
  therapists: [
    'id', 'fullname', 'nickname', 'license_no', 'status',
    'work_days', 'work_hours'
  ],
  services: [
    'code', 'name', 'description', 'price', 'category', 'status', 'start_date', 'end_date',
    'sessions_per_unit'
  ],
  holidays: [
    'id', 'date', 'name', 'type'
  ],
  appointments: [
    'id', 'hn', 'therapist_id', 'date', 'time_slot', 'type', 'status'
  ],
  receipts: [
    'id', 'hn', 'date', 'therapist_id', 'total_amount', 'payment_method', 
    'status', 'items', 'discount', 'received_amount', 'change_amount',
    'discount_type', 'discount_value', 'discount_reason', 'promotion_id', 
    'bank_account_id', 'slip_url', 'created_by', 'patient_name', 'patient_nickname', 
    'reward_id', 'reward_discount_amount'
  ],
  assessment_templates: [
    'id', 'name', 'description', 'type', 'chart_type', 'status', 
    'categories', 'questions', 'scoring_rules', 'checklist_options',
    'is_system'
  ],
  assessments: [
    'id', 'hn', 'therapist_id', 'date', 'comment', 'template_id', 
    'template_ids', 'scores', 'details', 'gm', 'fm', 'language', 'social', 
    'sensory_scores', 'snap_iv', 'has_developmental', 'has_sensory', 'has_snap'
  ],
  opd_records: [
    'id', 'hn', 'date', 'details', 'therapist', 'file_url', 'is_visible'
  ],
  salary_rules: [
    'id', 'earnings', 'deductions'
  ],
  payrolls: [
    'id', 'therapist_id', 'employee_username', 'employee_name', 'employee_id', 
    'month', 'year', 'basic_salary', 'earnings_list', 'deductions_list', 
    'special_earnings', 'special_deductions', 'total_earnings', 'total_deductions', 'net_pay', 'payment_date', 'status'
  ],
  transactions: [
    'id', 'date', 'type', 'category', 'amount', 'description', 'reference_id',
    'ref_id', 'slip_url'
  ],
  rewards: [
    'code', 'name', 'description', 'full_price', 'points', 'max_uses', 'start_date', 'end_date', 'type', 'condition', 'value'
  ],
  referrals: [
    'id', 'hn', 'date', 'hospital', 'reason', 'details', 'therapist_id',
    'to', 'intro', 'interview', 'observation', 'opinion', 'conclusion', 'status'
  ],
  promotions: [
    'code', 'name', 'description', 'start_date', 'end_date', 'max_uses', 'type', 'value'
  ],
  bank_accounts: [
    'id', 'bank_name', 'account_no', 'account_name'
  ],
  patients: [
    'hn', 'title', 'firstname', 'lastname', 'nickname', 'dob', 
    'gender', 'guardian', 'phone', 'status', 'allergies',
    'conditions', 'conditions_details', 'channels', 'channels_other_details', 'worries',
    'allergies_details', 'created_by', 'line_user_id', 'activated_by', 'activated_at', 'created_at'
  ],
  attendance: [
    'id', 'employee_id', 'employee_name', 'date', 'time', 'type',
    'latitude', 'longitude', 'accuracy', 'maps_url', 'work_hours',
    'line_user_id', 'notes', 'created_at'
  ]
};

// --- ฟังก์ชันช่วยเหลือในการเปลี่ยนรูปแบบคีย์ ---
export const toSnakeCase = (str) => {
  if (str === 'snapIV') return 'snap_iv';
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};
export const toCamelCase = (str) => {
  if (str === 'snap_iv') return 'snapIV';
  return str.replace(/_([a-z])/g, g => g[1].toUpperCase());
};

export const safeJsonParse = (val) => {
  if (typeof val === 'string') {
    let trimmed = val.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      try {
        trimmed = JSON.parse(trimmed);
      } catch {
        // ignore
      }
    }
    if (typeof trimmed === 'string') {
      if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
        try {
          return JSON.parse(trimmed);
        } catch (e) {
          console.error('Error parsing JSON:', e);
          return val;
        }
      }
    } else {
      return trimmed;
    }
  }
  return val;
};

// ฟังก์ชันแพ็กข้อมูลโครงสร้าง clinic_info.folder_url เพื่อเก็บ operatingHours, ค่าหน้า services, Rich Menu buttons & images, dynamic links ครบถ้วนโดยไม่สูญหาย
export const packClinicFolderUrl = (record, existingRaw = null) => {
  let baseFolder = {};

  const parseCandidate = (cand) => {
    if (!cand) return null;
    if (typeof cand === 'object') return cand;
    if (typeof cand === 'string' && cand.trim().startsWith('{')) {
      try { return JSON.parse(cand); } catch { return null; }
    }
    return null;
  };

  const parsedExisting = parseCandidate(existingRaw) || 
                         parseCandidate(record?.folderUrl) || 
                         parseCandidate(record?.folder_url);

  if (parsedExisting && typeof parsedExisting === 'object') {
    baseFolder = { ...parsedExisting };
  }

  // กำหนด folderUrl ดั้งเดิมที่เป็น Google Drive URL
  let origUrl = baseFolder.original || '';
  if (typeof record?.folderUrl === 'string' && !record.folderUrl.trim().startsWith('{')) {
    origUrl = record.folderUrl;
  } else if (typeof record?.folder_url === 'string' && !record.folder_url.trim().startsWith('{')) {
    origUrl = record.folder_url;
  } else if (typeof existingRaw === 'string' && !existingRaw.trim().startsWith('{')) {
    origUrl = existingRaw;
  }

  // ดึงข้อมูลสำรองจาก LocalStorage หากไม่มีใน record หรือ baseFolder
  let localRichmenuConfig = null;
  let localRichmenuImages = null;
  let localDynamicLinks = null;
  try {
    const rawCfg = localStorage.getItem('hdh_line_richmenu_custom_configs');
    if (rawCfg) localRichmenuConfig = JSON.parse(rawCfg);
  } catch {}
  try {
    const rawImgs = localStorage.getItem('hdh_line_richmenu_custom_images');
    if (rawImgs) localRichmenuImages = JSON.parse(rawImgs);
  } catch {}
  try {
    const rawLinks = localStorage.getItem('hdh_dynamic_links');
    if (rawLinks) localDynamicLinks = JSON.parse(rawLinks);
  } catch {}

  const packed = {
    ...baseFolder,
    original: origUrl,
    operatingHours: record?.operatingHours !== undefined ? record.operatingHours : (baseFolder.operatingHours || mock.DEFAULT_OPERATING_HOURS),
    operatingHoursSummary: record?.operatingHoursSummary !== undefined ? record.operatingHoursSummary : (baseFolder.operatingHoursSummary || ''),
    servicesSubtitle: record?.servicesSubtitle !== undefined ? record.servicesSubtitle : (baseFolder.servicesSubtitle || mock.INITIAL_CLINIC_INFO.servicesSubtitle),
    servicesFooterTitle: record?.servicesFooterTitle !== undefined ? record.servicesFooterTitle : (baseFolder.servicesFooterTitle || mock.INITIAL_CLINIC_INFO.servicesFooterTitle),
    servicePrograms: record?.servicePrograms !== undefined ? record.servicePrograms : (baseFolder.servicePrograms || null),
    mapsUrl: record?.mapsUrl !== undefined ? record.mapsUrl : (baseFolder.mapsUrl || mock.INITIAL_CLINIC_INFO.mapsUrl),
    richmenuConfig: record?.richmenuConfig || baseFolder.richmenuConfig || localRichmenuConfig || mock.DEFAULT_RICHMENU_CONFIG,
    richmenuImages: record?.richmenuImages || baseFolder.richmenuImages || localRichmenuImages || {},
    richmenuUpdatedAt: record?.richmenuUpdatedAt || baseFolder.richmenuUpdatedAt || new Date().toISOString(),
    dynamicLinks: record?.dynamicLinks || baseFolder.dynamicLinks || localDynamicLinks || null
  };

  return JSON.stringify(packed);
};

// ฟังก์ชันเรียกคำสั่ง Supabase พร้อมกำหนด Timeout สูงสุดเพื่อไม่ให้ระบบค้าง
const fetchTableWithTimeout = async (queryPromise, timeoutMs = 10000, tableName = '') => {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Timeout: Query on ${tableName} took longer than ${timeoutMs}ms`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([queryPromise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
};

// --- ฟังก์ชันซิงค์ข้อมูลลง LocalStorage จาก Supabase ---
export const syncFromSupabase = async (targetKeys = null) => {
  try {
    const tableKeys = Array.isArray(targetKeys) && targetKeys.length > 0
      ? targetKeys.filter(k => TABLE_MAP[k])
      : Object.keys(TABLE_MAP);
    
    // โหลดข้อมูลตามตารางที่กำหนดพร้อมกัน โดยมี Timeout 10 วินาทีต่อตาราง ป้องกันระบบค้าง
    const promises = tableKeys.map(async (key) => {
      const tableName = TABLE_MAP[key];
      if (!tableName) return { key, data: null };
      let query = supabase.from(tableName).select('*');
      if (key === KEYS.CLINIC_INFO) {
        query = supabase.from(tableName).select('id, name, license_no, phone, email, line_id, address, logo_url, stamp_url, receipt_footer, folder_id, folder_url, type, payslip_footer, liff_id, line_channel_access_token, hero_image_url');
      }
      try {
        const { data, error } = await fetchTableWithTimeout(query, 10000, tableName);
        if (error) {
          console.warn(`[Sync Warning] Failed to fetch ${tableName} (likely RLS / Auth):`, error.message);
          return { key, data: null }; // คืนค่า null เพื่อระบุว่าซิงค์ตารางนี้ไม่ได้เนื่องจากไม่มีสิทธิ์ RLS/Auth
        }
        return { key, data: data || [] };
      } catch (err) {
        console.warn(`[Sync Warning] Failed to fetch ${tableName}:`, err.message || err);
        return { key, data: null };
      }
    });
    
    const results = await Promise.all(promises);
    
    // ตรวจสอบว่าคลาวด์ว่างเปล่าหรือไม่ (เฉพาะเมื่อซิงค์แบบเต็มทุกตาราง)
    const isFullSync = !targetKeys || targetKeys.length >= Object.keys(TABLE_MAP).length;
    if (isFullSync) {
      const isCloudEmpty = results.every(({ key, data }) => {
        if (data === null) return true; // ข้ามตารางที่ดึงไม่สำเร็จเนื่องจากสิทธิ์ RLS
        if (key === KEYS.CLINIC_INFO || key === KEYS.SALARY_RULES || key === KEYS.SERVICES || key === KEYS.ASSESSMENT_TEMPLATES || key === KEYS.HOLIDAYS) {
          return true; // ข้ามตารางข้อมูลตั้งต้น
        }
        return data.length === 0;
      });

      // หากคลาวด์ว่างเปล่า และในเครื่องของผู้ใช้งานมีข้อมูลอยู่แล้ว ให้ส่งกลับสถานะพิเศษเพื่อความปลอดภัย
      if (isCloudEmpty) {
        const patientsRaw = localStorage.getItem(KEYS.PATIENTS);
        const hasLocalPatients = patientsRaw && JSON.parse(patientsRaw).length > 0;
        if (hasLocalPatients) {
          console.log("Supabase database is empty but local storage has patient data. Skipping overwrite to prevent data loss.");
          return "empty_but_has_local";
        }
      }
    }
    
    const pendingSyncsRaw = localStorage.getItem('hdh_pending_syncs');
    const pendingSyncs = pendingSyncsRaw ? JSON.parse(pendingSyncsRaw) : [];

    results.forEach(({ key, data }) => {
      if (data === null) return; // ข้ามการเขียนทับหากดึงข้อมูลจาก Supabase ไม่สำเร็จ (ไม่มีสิทธิ์ RLS / Offline)
      
      // แปลงข้อมูลจาก snake_case กลับมาเป็น camelCase
      const mappedData = data.map(row => {
        const mapped = {};
        for (const k in row) {
          mapped[toCamelCase(k)] = safeJsonParse(row[k]);
        }
        return mapped;
      });

      // ดึงข้อมูลการซิงค์ที่ค้างสำหรับตารางนี้มาควบรวม (Merge) เพื่อป้องกันข้อมูลใหม่ในเครื่องสูญหาย
      let finalData = mappedData;
      const tableName = TABLE_MAP[key];
      const pk = getPrimaryKey(tableName);

      if (pk) {
        // 1. ดึงข้อมูลจาก pendingSyncs
        const tableSyncs = pendingSyncs.filter(item => item && item.key === key);
        const upsertMap = new Map();
        const deleteSet = new Set();

        tableSyncs.forEach(s => {
          if (s.delta) {
            if (Array.isArray(s.delta.toUpsert)) {
              s.delta.toUpsert.forEach(item => {
                if (item && item[pk] !== undefined && item[pk] !== null) {
                  upsertMap.set(String(item[pk]), item);
                }
              });
            }
            if (Array.isArray(s.delta.toDelete)) {
              s.delta.toDelete.forEach(id => {
                if (id !== undefined && id !== null) {
                  deleteSet.add(String(id));
                }
              });
            }
          }
        });

        // ไม่ทำการกู้คืนข้อมูลแบบคาดเดาโดยไม่มีคิวซิงค์ เพื่อป้องกันไม่ให้ข้อมูลที่ลบไปจากเครื่องอื่นฟื้นคืนชีพกลับมา (Resurrection bug)

        if (upsertMap.size > 0 || deleteSet.size > 0) {
          const merged = [];
          const dbItemIds = new Set();

          mappedData.forEach(item => {
            const idStr = String(item[pk]);
            if (deleteSet.has(idStr)) {
              return; // ข้าม (จำลองว่าถูกลบแล้วในเครื่องนี้)
            }
            if (upsertMap.has(idStr)) {
              merged.push(upsertMap.get(idStr)); // ใช้ข้อมูลใหม่กว่าในเครื่อง
              dbItemIds.add(idStr);
            } else {
              merged.push(item);
              dbItemIds.add(idStr);
            }
          });

          // แทรกรายการใหม่ที่ยังไม่เคยขึ้น Supabase
          for (const [idStr, localItem] of upsertMap.entries()) {
            if (!dbItemIds.has(idStr)) {
              merged.push(localItem);
            }
          }
          finalData = merged;
        }

        // สำหรับข้อมูลผู้ใช้ (USERS) ให้รักษารูปโปรไฟล์และรหัสผ่านที่บันทึกไว้ในเครื่องเสมอ และคัดกรองลิงก์ pic.in.th ที่เสียแล้วออก
        if (key === KEYS.USERS && Array.isArray(finalData)) {
          const localRaw = localStorage.getItem(key);
          const localUsers = localRaw ? JSON.parse(localRaw) : [];
          const localUserMap = new Map(localUsers.map(u => [u.username, u]));

          finalData = finalData.map(dbUser => {
            const localUser = localUserMap.get(dbUser.username);
            const empCode = String(dbUser.employeeId || dbUser.employee_id || dbUser.username || '').toUpperCase().trim();
            const savedLine = localStorage.getItem(`hdh_line_user_${empCode}`) || '';
            let lineId = localUser?.lineUserId || localUser?.line_user_id || dbUser.lineUserId || dbUser.line_user_id || savedLine || '';
            if (!lineId && dbUser.avatarFile) {
              const av = typeof dbUser.avatarFile === 'string' ? safeJsonParse(dbUser.avatarFile) : dbUser.avatarFile;
              if (av && (av.line_user_id || av.lineUserId)) {
                lineId = av.line_user_id || av.lineUserId;
              }
            }
            if (localUser) {
              let bestAvatar = localUser.avatarUrl || dbUser.avatarUrl || '';
              if (bestAvatar.includes('pic.in.th')) {
                bestAvatar = (localUser.avatarUrl && !localUser.avatarUrl.includes('pic.in.th')) ? localUser.avatarUrl : '';
              }
              return {
                ...dbUser,
                avatarUrl: bestAvatar,
                lineUserId: lineId,
                line_user_id: lineId,
                password: localUser.password || dbUser.password || (dbUser.username === 'admin' ? 'admin0100' : '123456')
              };
            }
            return {
              ...dbUser,
              lineUserId: lineId,
              line_user_id: lineId
            };
          });

          const existingNames = new Set(finalData.map(u => u.username));
          localUsers.forEach(lu => {
            if (!existingNames.has(lu.username)) {
              finalData.push(lu);
            }
          });
        }
      }
      
      // บันทึกลง LocalStorage (พร้อมระบบป้องกันการเขียนทับด้วยข้อมูลว่างเปล่า 0 รายการ)
      if (key === KEYS.CLINIC_INFO) {
        const infoObj = finalData.find(r => r && Number(r.id) === 1) || finalData[0];
        if (infoObj && Object.keys(infoObj).length > 0) {
          // ถอดรหัส operatingHours, ค่าหน้า services, rich menu configs, rich menu images, dynamic links จาก folderUrl หรือ folder_url
          let parsedFolder = null;
          if (infoObj.folderUrl && typeof infoObj.folderUrl === 'object' && (infoObj.folderUrl.operatingHours || infoObj.folderUrl.richmenuConfig)) {
            parsedFolder = infoObj.folderUrl;
          } else if (typeof infoObj.folderUrl === 'string' && infoObj.folderUrl.startsWith('{')) {
            parsedFolder = safeJsonParse(infoObj.folderUrl, null);
          } else if (typeof infoObj.folder_url === 'string' && infoObj.folder_url.startsWith('{')) {
            parsedFolder = safeJsonParse(infoObj.folder_url, null);
          }

          if (parsedFolder && typeof parsedFolder === 'object') {
            if (parsedFolder.operatingHours) infoObj.operatingHours = parsedFolder.operatingHours;
            if (parsedFolder.operatingHoursSummary) infoObj.operatingHoursSummary = parsedFolder.operatingHoursSummary;
            if (parsedFolder.servicesSubtitle !== undefined) infoObj.servicesSubtitle = parsedFolder.servicesSubtitle;
            if (parsedFolder.servicesFooterTitle !== undefined) infoObj.servicesFooterTitle = parsedFolder.servicesFooterTitle;
            if (parsedFolder.servicePrograms !== undefined) infoObj.servicePrograms = parsedFolder.servicePrograms;
            if (parsedFolder.mapsUrl !== undefined) infoObj.mapsUrl = parsedFolder.mapsUrl;

            // กู้คืนการตั้งค่าปุ่ม Rich Menu (richmenuConfig) สู่ LocalStorage และ infoObj
            if (parsedFolder.richmenuConfig && typeof parsedFolder.richmenuConfig === 'object') {
              infoObj.richmenuConfig = parsedFolder.richmenuConfig;
              try {
                localStorage.setItem('hdh_line_richmenu_custom_configs', JSON.stringify(parsedFolder.richmenuConfig));
              } catch {}
            }

            // กู้คืนรูปภาพเมนู Rich Menu (richmenuImages) สู่ LocalStorage และ infoObj
            if (parsedFolder.richmenuImages && typeof parsedFolder.richmenuImages === 'object') {
              infoObj.richmenuImages = parsedFolder.richmenuImages;
              try {
                localStorage.setItem('hdh_line_richmenu_custom_images', JSON.stringify(parsedFolder.richmenuImages));
              } catch {}
            }

            // กู้คืน Dynamic Links สู่ LocalStorage
            if (Array.isArray(parsedFolder.dynamicLinks) && parsedFolder.dynamicLinks.length > 0) {
              infoObj.dynamicLinks = parsedFolder.dynamicLinks;
              try {
                localStorage.setItem('hdh_dynamic_links', JSON.stringify(parsedFolder.dynamicLinks));
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('hdh_dynamic_links_updated', { detail: parsedFolder.dynamicLinks }));
                }
              } catch {}
            }

            // คืนค่า folderUrl ดั้งเดิมให้เป็น string URL ปกติ
            infoObj.folderUrl = parsedFolder.original !== undefined ? parsedFolder.original : '';
            infoObj.folder_url = parsedFolder.original !== undefined ? parsedFolder.original : '';
          } else if (infoObj.operating_hours) {
            infoObj.operatingHours = typeof infoObj.operating_hours === 'string' ? safeJsonParse(infoObj.operating_hours, null) : infoObj.operating_hours;
          }

          // Fallbacks สำหรับ Rich Menu หาก Supabase ยังไม่มี
          if (!infoObj.richmenuConfig) {
            try {
              const localCfg = localStorage.getItem('hdh_line_richmenu_custom_configs');
              if (localCfg) infoObj.richmenuConfig = JSON.parse(localCfg);
              else infoObj.richmenuConfig = mock.DEFAULT_RICHMENU_CONFIG;
            } catch {
              infoObj.richmenuConfig = mock.DEFAULT_RICHMENU_CONFIG;
            }
          }
          if (!infoObj.richmenuImages) {
            try {
              const localImgs = localStorage.getItem('hdh_line_richmenu_custom_images');
              if (localImgs) infoObj.richmenuImages = JSON.parse(localImgs);
              else infoObj.richmenuImages = {};
            } catch {
              infoObj.richmenuImages = {};
            }
          }

          // หากยังไม่มี ให้ดึงจากข้อมูล Local เดิม หรือค่าเริ่มต้น
          if (!infoObj.operatingHours) {
            const currentLocal = localStorage.getItem(key);
            const parsedLocal = currentLocal ? safeJsonParse(currentLocal, null) : null;
            if (parsedLocal?.operatingHours) {
              infoObj.operatingHours = parsedLocal.operatingHours;
              infoObj.operatingHoursSummary = parsedLocal.operatingHoursSummary;
            } else {
              infoObj.operatingHours = mock.DEFAULT_OPERATING_HOURS;
              infoObj.operatingHoursSummary = mock.INITIAL_CLINIC_INFO.operatingHoursSummary;
            }
          }
          localStorage.setItem(key, JSON.stringify(infoObj));
        } else {
          const currentLocal = localStorage.getItem(key);
          if (!currentLocal) {
            localStorage.setItem(key, JSON.stringify(mock.INITIAL_CLINIC_INFO));
          }
        }
      } else if (key === KEYS.USERS) {
        if (finalData && finalData.length > 0) {
          const cleaned = cleanUsersData(finalData);
          localStorage.setItem(key, JSON.stringify(cleaned));
        } else {
          const currentUsersRaw = localStorage.getItem(key);
          const currentUsers = currentUsersRaw ? JSON.parse(currentUsersRaw) : [];
          if (currentUsers.length === 0) {
            localStorage.setItem(key, JSON.stringify(mock.INITIAL_USERS));
          }
        }
      } else if (key === KEYS.SALARY_RULES) {
        const rulesObj = finalData.find(r => r && Number(r.id) === 1) || finalData[finalData.length - 1];
        if (rulesObj) {
          localStorage.setItem(key, JSON.stringify(rulesObj));
        } else {
          const currentRules = localStorage.getItem(key);
          if (!currentRules) {
            localStorage.setItem(key, JSON.stringify(mock.INITIAL_SALARY_RULES));
          }
        }
      } else {
        if (finalData && finalData.length > 0) {
          localStorage.setItem(key, JSON.stringify(finalData));
        } else {
          const currentItemRaw = localStorage.getItem(key);
          const currentItems = currentItemRaw ? JSON.parse(currentItemRaw) : [];
          if (currentItems.length === 0 && mappedData.length > 0) {
            localStorage.setItem(key, JSON.stringify(mappedData));
          }
        }
      }
    });
    
    return true;
  } catch (e) {
    console.error('Exception during Supabase sync load:', e);
    return false;
  }
};

const getPrimaryKey = (tableName) => {
  if (tableName === 'patients') return 'hn';
  if (tableName === 'users') return 'username';
  if (tableName === 'promotions' || tableName === 'rewards' || tableName === 'services') return 'code';
  return 'id';
};

// --- ฟังก์ชันซิงค์ข้อมูลจาก LocalStorage ขึ้น Supabase ---
export const syncToSupabase = async (key, value, throwOnError = false) => {
  const tableName = TABLE_MAP[key];
  if (!tableName) {
    console.error(`Unknown sync key: ${key}`);
    if (throwOnError) {
      throw new Error(`Unknown sync key: ${key}`);
    }
    return false;
  }

  try {
    let records = [];
    if (key === KEYS.CLINIC_INFO) {
      const info = Array.isArray(value) ? (value[0] || {}) : (value || {});
      const record = { ...info, id: 1 };
      const packedJson = packClinicFolderUrl(record);
      record.folder_url = packedJson;
      record.folderUrl = packedJson;
      records = [record];
    } else if (key === KEYS.SALARY_RULES) {
      const rules = Array.isArray(value) ? (value[0] || {}) : (value || {});
      const record = { ...rules, id: 1 };
      records = [record];
    } else if (Array.isArray(value)) {
      records = value;
    } else if (value && typeof value === 'object') {
      records = [value];
    } else {
      return true;
    }

    // แปลงรูปแบบคีย์เป็น snake_case เพื่อสอดคล้องกับคอลัมน์ของ PostgreSQL (พร้อมคัดกรองฟิลด์ที่ไม่มีในฐานข้อมูลออก)
    const snakeRecords = records.map(record => {
      const mapped = {};
      const validCols = TABLE_COLUMNS[tableName];
      for (const k in record) {
        if ((k === 'createdAt' || k === 'updatedAt') && !record[k]) {
          continue;
        }
        const snakeKey = toSnakeCase(k);
        // หากมีการระบุคอลัมน์และคีย์นี้ไม่ตรงกับตาราง ให้กรองออกเพื่อความปลอดภัย
        if (validCols && validCols.length > 0 && !validCols.includes(snakeKey)) {
          continue;
        }
        
        let val = record[k];
        const numericKeys = [
          'total_amount', 'discount', 'received_amount', 'change_amount',
          'discount_value', 'reward_discount_amount', 'price', 'amount',
          'basic_salary', 'total_earnings', 'total_deductions', 'net_pay',
          'value', 'full_price', 'points', 'max_uses'
        ];
        if (numericKeys.includes(snakeKey)) {
          if (val === '' || val === undefined || val === null) {
            val = 0;
          } else {
            val = Number(val);
            if (isNaN(val)) val = 0;
          }
        }
        mapped[snakeKey] = val;
      }
      return mapped;
    });

    const pk = getPrimaryKey(tableName);

    if (snakeRecords.length === 0) {
      if (tableName !== 'clinic_info' && tableName !== 'salary_rules') {
        const { error: deleteError } = await supabase.from(tableName).delete().neq(pk, '_impossible_val_');
        if (deleteError) {
          console.error(`Error clearing ${tableName} in Supabase:`, deleteError.message);
          if (throwOnError) throw new Error(deleteError.message);
          return false;
        }
      }
      return true;
    }

    // ลบเรคคอร์ดที่มี Primary Key ซ้ำกันเพื่อป้องกันข้อผิดพลาด ON CONFLICT DO UPDATE ใน PostgreSQL
    const uniqueMap = new Map();
    snakeRecords.forEach(rec => {
      const val = rec[pk];
      if (val !== undefined && val !== null) {
        uniqueMap.set(String(val), rec);
      } else {
        uniqueMap.set(Math.random().toString(), rec);
      }
    });
    const uniqueSnakeRecords = Array.from(uniqueMap.values());

    // ทำการเขียนทับ/อัปเดตข้อมูลแบบกลุ่ม (Bulk Upsert)
    if (tableName === 'holidays') {
      await supabase.from('holidays').delete().neq('date', '');
    }
    const { error: upsertError } = await supabase.from(tableName).upsert(uniqueSnakeRecords);
    if (upsertError) {
      console.error(`Error syncing ${tableName} to Supabase:`, upsertError.message);
      if (throwOnError) {
        throw new Error(upsertError.message);
      }
      return false;
    }

    // ลบเรคคอร์ดที่ไม่ได้อยู่ในรายการปัจจุบัน ( Obsolete / Deleted rows )
    if (tableName !== 'clinic_info' && tableName !== 'salary_rules' && tableName !== 'holidays') {
      const pksToKeep = uniqueSnakeRecords.map(rec => rec[pk]).filter(val => val !== undefined && val !== null);
      if (pksToKeep.length > 0) {
        const { error: deleteError } = await supabase
          .from(tableName)
          .delete()
          .not(pk, 'in', `(${pksToKeep.map(val => String(val)).join(',')})`);
        if (deleteError) {
          console.error(`Error deleting obsolete rows from ${tableName}:`, deleteError.message);
          if (throwOnError) {
            throw new Error(deleteError.message);
          }
          return false;
        }
      }
    }

    return true;
  } catch (e) {
    console.error(`Exception syncing ${key} to Supabase:`, e);
    if (throwOnError) {
      throw e;
    }
    return false;
  }
};

// --- ฟังก์ชันซิงค์เฉพาะส่วนต่าง (Delta Sync) ไปยัง Supabase ---
export const syncDeltaToSupabase = async (key, { toUpsert = [], toDelete = [] }, throwOnError = false) => {
  const tableName = TABLE_MAP[key];
  if (!tableName) {
    console.error(`Unknown sync key for delta: ${key}`);
    if (throwOnError) throw new Error(`Unknown sync key for delta: ${key}`);
    return false;
  }

  try {
    const pk = getPrimaryKey(tableName);

    // 1. จัดการลบข้อมูล (Delete) ตาม ID ที่ถูกลบออกไปจริง
    if (toDelete.length > 0) {
      const idsToDelete = toDelete.map(row => row[pk]).filter(val => val !== undefined && val !== null);
      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from(tableName)
          .delete()
          .in(pk, idsToDelete);
        if (deleteError) {
          console.error(`Error deleting rows from ${tableName}:`, deleteError.message);
          if (throwOnError) throw new Error(deleteError.message);
          return false;
        }
      }
    }

    // 2. จัดการอัปเดต/เพิ่มข้อมูล (Upsert)
    if (toUpsert.length > 0) {
      const snakeRecords = toUpsert.map(record => {
        const mapped = {};
        const validCols = TABLE_COLUMNS[tableName];
        
        // บังคับให้เป็น id: 1 สำหรับข้อมูลการตั้งค่าที่มีแถวเดียว (เหมือนใน syncToSupabase)
        let recordWithId = record;
        if (tableName === 'clinic_info') {
          recordWithId = { ...record, id: 1 };
          const packedJson = packClinicFolderUrl(recordWithId);
          recordWithId.folder_url = packedJson;
          recordWithId.folderUrl = packedJson;
        } else if (tableName === 'salary_rules') {
          recordWithId = { ...record, id: 1 };
        }

        for (const k in recordWithId) {
          if ((k === 'createdAt' || k === 'updatedAt') && !recordWithId[k]) {
            continue;
          }
          const snakeKey = toSnakeCase(k);
          if (validCols && validCols.length > 0 && !validCols.includes(snakeKey)) {
            continue;
          }
          
          let val = recordWithId[k];
          const numericKeys = [
            'total_amount', 'discount', 'received_amount', 'change_amount',
            'discount_value', 'reward_discount_amount', 'price', 'amount',
            'basic_salary', 'total_earnings', 'total_deductions', 'net_pay',
            'value', 'full_price', 'points', 'max_uses'
          ];
          if (numericKeys.includes(snakeKey)) {
            if (val === '' || val === undefined || val === null) {
              val = 0;
            } else {
              val = Number(val);
              if (isNaN(val)) val = 0;
            }
          }
          mapped[snakeKey] = val;
        }
        return mapped;
      });

      const uniqueMap = new Map();
      snakeRecords.forEach(rec => {
        const val = rec[pk];
        if (val !== undefined && val !== null) {
          uniqueMap.set(String(val), rec);
        } else {
          uniqueMap.set(Math.random().toString(), rec);
        }
      });
      const uniqueSnakeRecords = Array.from(uniqueMap.values());

      const { error: upsertError } = await supabase.from(tableName).upsert(uniqueSnakeRecords);
      if (upsertError) {
        console.error(`Error upserting delta to ${tableName}:`, upsertError.message);
        if (throwOnError) throw new Error(upsertError.message);
        return false;
      }
    }

    return true;
  } catch (e) {
    console.error(`Exception during delta sync for ${key}:`, e);
    if (throwOnError) throw e;
    return false;
  }
};

// --- ฟังก์ชันโอนย้ายข้อมูลจาก LocalStorage ขึ้น Supabase ทั้งหมด ---
export const migrateLocalToSupabase = async (onProgress) => {
  const tableKeys = Object.keys(TABLE_MAP);
  for (let i = 0; i < tableKeys.length; i++) {
    const key = tableKeys[i];
    const tableName = TABLE_MAP[key];
    if (onProgress) {
      onProgress(tableName, i, tableKeys.length);
    }
    const rawData = localStorage.getItem(key);
    if (rawData) {
      const value = JSON.parse(rawData);
      // ส่งผ่านค่า true เพื่อระบุให้ขว้าง Error หากบันทึกล้มเหลว
      await syncToSupabase(key, value, true);
    }
  }
  return true;
};
