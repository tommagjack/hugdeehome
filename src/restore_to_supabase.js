import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Read .env file
const envPath = '.env';
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
  if (match) {
    env[match[1]] = match[2].trim();
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

// Load backup data
const backup = JSON.parse(fs.readFileSync('sheets_backup.json', 'utf8'));

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

const TABLE_COLUMNS = {
  clinic_info: [
    'id', 'name', 'license_no', 'phone', 'email', 'line_id', 'address', 
    'logo_url', 'stamp_url', 'receipt_footer', 'folder_id', 'folder_url',
    'type', 'payslip_footer'
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
    'allergies_details', 'created_by'
  ]
};

const toSnakeCase = (str) => {
  if (str === 'snapIV') return 'snap_iv';
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

async function restore() {
  const keys = Object.keys(TABLE_MAP);
  
  for (const key of keys) {
    const tableName = TABLE_MAP[key];
    const rawData = backup[key];
    
    if (!rawData) {
      console.log(`⚠️ Skip ${tableName}: No data in backup`);
      continue;
    }
    
    let records = [];
    if (key === 'hdh_clinic_info') {
      const info = Array.isArray(rawData) ? (rawData[0] || {}) : (rawData || {});
      records = [{ ...info, id: 1 }];
    } else if (key === 'hdh_salary_rules') {
      // Reconstruct single object with earnings and deductions lists
      const earnings = [];
      const deductions = [];
      rawData.forEach(rule => {
        const cleanRule = {
          id: rule.id,
          name: rule.name,
          type: rule.type,
          value: Number(rule.value),
          maxLimit: rule.maxLimit ? Number(rule.maxLimit) : null
        };
        if (rule.ruleType === 'earnings' || rule.ruleType === 'earning') {
          earnings.push(cleanRule);
        } else {
          deductions.push(cleanRule);
        }
      });
      records = [{ id: 1, earnings, deductions }];
    } else if (key === 'hdh_appointments') {
      // Map raw ApptID, Kru, HN keys
      const therapists = backup.hdh_therapists || [];
      const getTherapistIdByName = (kruName) => {
        if (!kruName) return null;
        const cleanName = kruName.replace('ครู', '').trim();
        const t = therapists.find(t => t.nickname === cleanName || t.fullname.includes(cleanName));
        return t ? t.id : null;
      };

      records = rawData.map(app => ({
        id: app.ApptID,
        hn: String(app.HN),
        therapistId: getTherapistIdByName(app.Kru),
        date: app.RawDate || app.Date,
        timeSlot: app.Time,
        type: app.Type,
        status: app.Status
      }));
    } else if (Array.isArray(rawData)) {
      records = rawData;
    } else if (rawData && typeof rawData === 'object') {
      records = [rawData];
    }
    
    const snakeRecords = records.map(record => {
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
        if (snakeKey === 'hn') {
          val = String(val); // Ensure HN is string
        }
        
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
    
    if (snakeRecords.length === 0) {
      console.log(`ℹ️ Table "${tableName}": No records to insert`);
      continue;
    }
    
    try {
      const { data, error } = await supabase.from(tableName).upsert(snakeRecords);
      if (error) {
        console.log(`❌ Table "${tableName}": Error ->`, error.message);
        if (error.details) console.log(`   Details:`, error.details);
        if (error.hint) console.log(`   Hint:`, error.hint);
      } else {
        console.log(`✅ Table "${tableName}": Successfully restored ${snakeRecords.length} rows`);
      }
    } catch (e) {
      console.log(`❌ Table "${tableName}": Exception ->`, e.message);
    }
  }
  
  console.log('Restoration process finished.');
}

restore();
