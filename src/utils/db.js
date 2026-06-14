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
};

// --- ฟังก์ชันซิงค์ข้อมูลกับ Google Sheets (ใช้ชื่อเดิมเพื่อป้องกันการกระทบโค้ดอื่น) ---
export const syncFromSupabase = async (customUrl) => {
  const gasUrl = customUrl || localStorage.getItem('hdh_gas_url') || import.meta.env.VITE_GAS_URL || 'https://script.google.com/macros/s/AKfycbw9t-DSskCxgPWNkR8bkOWabLgpSGuF6EqBRrM46rE-T2I9krkV1hz5Ao-d_WVQQ15Ueg/exec';
  if (!gasUrl) return false;

  try {
    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'get_all' })
    });
    if (!response.ok) {
      console.error('Error fetching from Google Sheets:', response.statusText);
      return false;
    }

    const result = await response.json();
    if (result.status === 'success' && result.data) {
      const therapistsList = result.data[KEYS.THERAPISTS] || result.data['hdh_therapists'] || get(KEYS.THERAPISTS, []);

      // อัปเดตข้อมูลลง LocalStorage
      Object.keys(result.data).forEach(key => {
        let val = result.data[key];
        if ((key === KEYS.SALARY_RULES || key === 'hdh_salary_rules' || key === 'salary_rules') && Array.isArray(val)) {
          const earnings = val.filter(row => row.ruleType === 'earning' || (row.id && String(row.id).startsWith('earn'))).map(({ ruleType, ...rest }) => rest);
          const deductions = val.filter(row => row.ruleType === 'deduction' || (row.id && String(row.id).startsWith('ded'))).map(({ ruleType, ...rest }) => rest);
          val = { earnings, deductions };
        } else if ((key === KEYS.APPOINTMENTS || key === 'hdh_appointments' || key === 'appointments') && Array.isArray(val)) {
          val = val.map(row => {
            const id = row.ApptID || row.id || '';
            const date = row.RawDate || row.date || '';
            const timeSlot = row.Time || row.timeSlot || '';
            const hn = row.HN || row.hn || '';
            const type = row.Type || row.type || '';
            const status = row.Status || row.status || '';
            
            let therapistId = row.therapistId || '';
            if (!therapistId && row.Kru) {
              const cleanKru = row.Kru.replace(/^ครู/, '');
              const foundTherapist = therapistsList.find(t => t.nickname === cleanKru || t.fullname === row.Kru || t.fullname === cleanKru);
              if (foundTherapist) {
                therapistId = foundTherapist.id;
              } else {
                therapistId = row.Kru;
              }
            }

            return {
              id,
              hn: String(hn),
              therapistId,
              date,
              timeSlot,
              type,
              status
            };
          });
        }
        localStorage.setItem(key, JSON.stringify(val));
      });
      return true;
    }
  } catch (e) {
    console.error('Exception during Google Sheets sync load:', e);
  }
  return false;
};

export const syncToSupabase = async (key, value) => {
  const gasUrl = localStorage.getItem('hdh_gas_url') || import.meta.env.VITE_GAS_URL || 'https://script.google.com/macros/s/AKfycbw9t-DSskCxgPWNkR8bkOWabLgpSGuF6EqBRrM46rE-T2I9krkV1hz5Ao-d_WVQQ15Ueg/exec';
  if (!gasUrl) return false;

  let finalValue = value;
  if (key === KEYS.CLINIC_INFO || key === 'hdh_clinic_info') {
    finalValue = Array.isArray(value) ? value : [value];
  } else if (key === KEYS.SALARY_RULES || key === 'hdh_salary_rules' || key === 'salary_rules') {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const earningsRows = (value.earnings || []).map(item => ({ ...item, ruleType: 'earning' }));
      const deductionsRows = (value.deductions || []).map(item => ({ ...item, ruleType: 'deduction' }));
      finalValue = [...earningsRows, ...deductionsRows];
    }
  } else if ((key === KEYS.APPOINTMENTS || key === 'hdh_appointments' || key === 'appointments') && Array.isArray(value)) {
    const patientsList = get(KEYS.PATIENTS, []);
    const therapistsList = get(KEYS.THERAPISTS, []);
    
    // Format Thai Date
    const getThaiDateString = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      
      const yearBE = d.getFullYear() + 543;
      const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
      ];
      return `${d.getDate()} ${thaiMonths[d.getMonth()]} ${yearBE}`;
    };

    finalValue = value.map(app => {
      const p = patientsList.find(pat => String(pat.hn) === String(app.hn)) || {};
      const t = therapistsList.find(ther => ther.id === app.therapistId) || {};
      
      const cleanTitle = (p.title || '').replace(/\$/g, '');
      const cleanFirstname = (p.firstname || '').replace(/\$/g, '');
      const cleanLastname = (p.lastname || '').replace(/\$/g, '');
      const patientFullName = p.firstname ? `${cleanTitle}${cleanFirstname} ${cleanLastname}` : '';
      const patientNick = p.nickname ? `น้อง${p.nickname.replace(/\$/g, '')}` : '';
      const therapistNick = t.nickname ? `ครู${t.nickname}` : t.fullname || '';

      return {
        ApptID: app.id,
        RawDate: app.date,
        Date: getThaiDateString(app.date),
        Time: app.timeSlot,
        HN: app.hn,
        Nick: patientNick,
        Name: patientFullName,
        Type: app.type || 'ฝึกกระตุ้นพัฒนาการ',
        Kru: therapistNick,
        Status: app.status
      };
    });
  }

  try {
    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain' // ป้องกันการทำ preflight request (CORS) ในเบราว์เซอร์
      },
      body: JSON.stringify({
        action: 'sync_table',
        key: key,
        value: finalValue
      })
    });

    if (!response.ok) {
      console.error(`Error saving ${key} to Google Sheets:`, response.statusText);
      return false;
    }

    const result = await response.json();
    return result.status === 'success';
  } catch (e) {
    console.error(`Exception saving ${key} to Google Sheets:`, e);
  }
  return false;
};
