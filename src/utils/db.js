import * as mock from './mockData';

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
    return true;
  }
  return false;
};

// ฟังก์ชันดึง/บันทึกทั่วไป
const get = (key, defaultVal) => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultVal;
};

const set = (key, val) => {
  localStorage.setItem(key, JSON.stringify(val));
};

export const db = {
  getClinicInfo: () => get(KEYS.CLINIC_INFO, mock.INITIAL_CLINIC_INFO),
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

  getAssessments: () => get(KEYS.ASSESSMENTS, mock.INITIAL_ASSESSMENTS),
  setAssessments: (data) => set(KEYS.ASSESSMENTS, data),

  getSalaryRules: () => get(KEYS.SALARY_RULES, mock.INITIAL_SALARY_RULES),
  setSalaryRules: (data) => set(KEYS.SALARY_RULES, data),

  getPayrolls: () => get(KEYS.PAYROLLS, mock.INITIAL_PAYROLLS),
  setPayrolls: (data) => set(KEYS.PAYROLLS, data),

  getTransactions: () => get(KEYS.TRANSACTIONS, mock.INITIAL_TRANSACTIONS),
  setTransactions: (data) => set(KEYS.TRANSACTIONS, data),

  getOpdRecords: () => get(KEYS.OPD_RECORDS, mock.INITIAL_OPD_RECORDS),
  setOpdRecords: (data) => set(KEYS.OPD_RECORDS, data),
};
