import * as mock from './mockData';
import { supabase } from './supabaseClient';

const KEYS = {
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
    return true;
  }
  // ตรวจสอบความปลอดภัยสำหรับคีย์ใหม่ที่อาจไม่มีในเครื่องผู้ใช้ที่มีประวัติเดิมอยู่แล้ว
  if (!localStorage.getItem(KEYS.ASSESSMENT_TEMPLATES)) {
    localStorage.setItem(KEYS.ASSESSMENT_TEMPLATES, JSON.stringify(mock.INITIAL_ASSESSMENT_TEMPLATES));
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
    if (Array.isArray(data)) {
      return data[0] || mock.INITIAL_CLINIC_INFO;
    }
    return data;
  },
  setClinicInfo: (data) => set(KEYS.CLINIC_INFO, data),

  getUsers: () => {
    const data = get(KEYS.USERS, mock.INITIAL_USERS);
    if (Array.isArray(data)) {
      return data.map(u => ({
        ...u,
        avatarFile: safeJsonParse(u.avatarFile),
        citizenIdDoc: safeJsonParse(u.citizenIdDoc),
        houseRegDoc: safeJsonParse(u.houseRegDoc),
        bankBookDoc: safeJsonParse(u.bankBookDoc),
        licenseDoc: safeJsonParse(u.licenseDoc),
        otherDoc: safeJsonParse(u.otherDoc),
        contractDoc: safeJsonParse(u.contractDoc)
      }));
    }
    return data;
  },
  setUsers: (data) => set(KEYS.USERS, data),

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

// --- ตารางแปลงชื่อคีย์เป็นชื่อตารางใน Supabase ---
const TABLE_MAP = {
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
    'avatar_file', 'citizen_id_doc', 'house_reg_doc', 'bank_book_doc', 'license_doc', 'other_doc'
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
    'allergies_details', 'created_by', 'line_user_id'
  ]
};

// --- ฟังก์ชันช่วยเหลือในการเปลี่ยนรูปแบบคีย์ ---
const toSnakeCase = (str) => {
  if (str === 'snapIV') return 'snap_iv';
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};
const toCamelCase = (str) => {
  if (str === 'snap_iv') return 'snapIV';
  return str.replace(/_([a-z])/g, g => g[1].toUpperCase());
};

const safeJsonParse = (val) => {
  if (typeof val === 'string') {
    let trimmed = val.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      try {
        trimmed = JSON.parse(trimmed);
      } catch (e) {
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

// --- ฟังก์ชันซิงค์ข้อมูลลง LocalStorage จาก Supabase ---
export const syncFromSupabase = async () => {
  try {
    const tableKeys = Object.keys(TABLE_MAP);
    
    // โหลดข้อมูลทุกตารางพร้อมกัน
    const promises = tableKeys.map(async (key) => {
      const tableName = TABLE_MAP[key];
      const { data, error } = await supabase.from(tableName).select('*');
      if (error) {
        throw new Error(`Error fetching ${tableName}: ${error.message}`);
      }
      return { key, data: data || [] };
    });
    
    const results = await Promise.all(promises);
    
    // ตรวจสอบว่าคลาวด์ว่างเปล่าหรือไม่ (วัดจากตารางสำคัญๆ เช่น patients, appointments, receipts)
    const isCloudEmpty = results.every(({ key, data }) => {
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
    
    const pendingSyncsRaw = localStorage.getItem('hdh_pending_syncs');
    const pendingSyncs = pendingSyncsRaw ? JSON.parse(pendingSyncsRaw) : [];

    results.forEach(({ key, data }) => {
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
        // 1. อ่านข้อมูลเดิมใน LocalStorage ก่อนโดนทับ
        const localRaw = localStorage.getItem(key);
        const localList = localRaw ? JSON.parse(localRaw) : [];

        // 2. ดึงข้อมูลจาก pendingSyncs
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
      }
      
      // บันทึกลง LocalStorage
      if (key === KEYS.CLINIC_INFO) {
        const infoObj = finalData.find(r => r && Number(r.id) === 1) || finalData[0] || mock.INITIAL_CLINIC_INFO;
        localStorage.setItem(key, JSON.stringify(infoObj));
      } else if (key === KEYS.SALARY_RULES) {
        const rulesObj = finalData.find(r => r && Number(r.id) === 1) || finalData[finalData.length - 1] || mock.INITIAL_SALARY_RULES;
        localStorage.setItem(key, JSON.stringify(rulesObj));
      } else {
        localStorage.setItem(key, JSON.stringify(finalData));
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
        for (const k in record) {
          if ((k === 'createdAt' || k === 'updatedAt') && !record[k]) {
            continue;
          }
          const snakeKey = toSnakeCase(k);
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
