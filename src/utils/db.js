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

  getUsers: () => get(KEYS.USERS, mock.INITIAL_USERS),
  setUsers: (data) => set(KEYS.USERS, data),

  getTherapists: () => get(KEYS.THERAPISTS, mock.INITIAL_THERAPISTS),
  setTherapists: (data) => set(KEYS.THERAPISTS, data),

  getServices: () => get(KEYS.SERVICES, mock.INITIAL_SERVICES),
  setServices: (data) => set(KEYS.SERVICES, data),

  getPromotions: () => get(KEYS.PROMOTIONS, mock.INITIAL_PROMOTIONS),
  setPromotions: (data) => set(KEYS.PROMOTIONS, data),

  getBankAccounts: () => get(KEYS.BANK_ACCOUNTS, mock.INITIAL_BANK_ACCOUNTS),
  setBankAccounts: (data) => set(KEYS.BANK_ACCOUNTS, data),

  getHolidays: () => get(KEYS.HOLIDAYS, mock.INITIAL_HOLIDAYS),
  setHolidays: (data) => set(KEYS.HOLIDAYS, data),

  getPatients: () => get(KEYS.PATIENTS, mock.INITIAL_PATIENTS),
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
      }));
    }
    return data;
  },
  setAssessments: (data) => set(KEYS.ASSESSMENTS, data),

  getSalaryRules: () => get(KEYS.SALARY_RULES, mock.INITIAL_SALARY_RULES),
  setSalaryRules: (data) => set(KEYS.SALARY_RULES, data),

  getPayrolls: () => get(KEYS.PAYROLLS, mock.INITIAL_PAYROLLS),
  setPayrolls: (data) => set(KEYS.PAYROLLS, data),

  getTransactions: () => get(KEYS.TRANSACTIONS, mock.INITIAL_TRANSACTIONS),
  setTransactions: (data) => set(KEYS.TRANSACTIONS, data),

  getOpdRecords: () => get(KEYS.OPD_RECORDS, mock.INITIAL_OPD_RECORDS),
  setOpdRecords: (data) => set(KEYS.OPD_RECORDS, data),

  getRewards: () => get(KEYS.REWARDS, []),
  setRewards: (data) => set(KEYS.REWARDS, data),

  getReferrals: () => get(KEYS.REFERRALS, []),
  setReferrals: (data) => set(KEYS.REFERRALS, data),

  getAssessmentTemplates: () => get(KEYS.ASSESSMENT_TEMPLATES, mock.INITIAL_ASSESSMENT_TEMPLATES),
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

// --- ฟังก์ชันช่วยเหลือในการเปลี่ยนรูปแบบคีย์ ---
const toSnakeCase = (str) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
const toCamelCase = (str) => str.replace(/_([a-z])/g, g => g[1].toUpperCase());

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
    
    results.forEach(({ key, data }) => {
      // แปลงข้อมูลจาก snake_case กลับมาเป็น camelCase
      const mappedData = data.map(row => {
        const mapped = {};
        for (const k in row) {
          mapped[toCamelCase(k)] = row[k];
        }
        return mapped;
      });
      
      // บันทึกลง LocalStorage
      if (key === KEYS.CLINIC_INFO) {
        const infoObj = mappedData[0] || mock.INITIAL_CLINIC_INFO;
        localStorage.setItem(key, JSON.stringify(infoObj));
      } else if (key === KEYS.SALARY_RULES) {
        const rulesObj = mappedData[0] || mock.INITIAL_SALARY_RULES;
        localStorage.setItem(key, JSON.stringify(rulesObj));
      } else {
        localStorage.setItem(key, JSON.stringify(mappedData));
      }
    });
    
    return true;
  } catch (e) {
    console.error('Exception during Supabase sync load:', e);
    return false;
  }
};

// --- ฟังก์ชันซิงค์ข้อมูลจาก LocalStorage ขึ้น Supabase ---
export const syncToSupabase = async (key, value) => {
  const tableName = TABLE_MAP[key];
  if (!tableName) {
    console.error(`Unknown sync key: ${key}`);
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

    // แปลงรูปแบบคีย์เป็น snake_case เพื่อสอดคล้องกับคอลัมน์ของ PostgreSQL
    const snakeRecords = records.map(record => {
      const mapped = {};
      for (const k in record) {
        if ((k === 'createdAt' || k === 'updatedAt') && !record[k]) {
          continue;
        }
        mapped[toSnakeCase(k)] = record[k];
      }
      return mapped;
    });

    if (snakeRecords.length === 0) return true;

    // ทำการเขียนทับ/อัปเดตข้อมูลแบบกลุ่ม (Bulk Upsert)
    const { error } = await supabase.from(tableName).upsert(snakeRecords);
    if (error) {
      console.error(`Error syncing ${tableName} to Supabase:`, error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`Exception syncing ${key} to Supabase:`, e);
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
      const success = await syncToSupabase(key, value);
      if (!success) {
        throw new Error(`ล้มเหลวขณะโอนย้ายตาราง ${tableName}`);
      }
    }
  }
  return true;
};
