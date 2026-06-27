import { useState, useEffect, useRef } from 'react';
import { initDatabase, db, syncFromSupabase, syncToSupabase, syncDeltaToSupabase, getGasUrl } from './utils/db';
import { supabase } from './utils/supabaseClient';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PatientRegister from './components/PatientRegister';
import Appointments from './components/Appointments';
import DevelopmentalAssessment from './components/DevelopmentalAssessment';
import CourseBalance from './components/CourseBalance';
import ReceiptPOS from './components/ReceiptPOS';
import ReceiptHistory from './components/ReceiptHistory';
import ServiceSummary from './components/ServiceSummary';
import Settings from './components/Settings';
import Users from './components/Users';
import Salary from './components/Salary';
import SalarySettings from './components/SalarySettings';
import PDFViewer from './components/PDFViewer';
import Transactions from './components/Transactions';
import OPD from './components/OPD';
import ReferralLetter from './components/ReferralLetter';
import GuestRegister from './components/GuestRegister';
import UserProfile from './components/UserProfile';
import ErrorBoundary from './components/ErrorBoundary';
import AssessmentSettings from './components/AssessmentSettings';
import { RefreshCw } from 'lucide-react';
import Swal from 'sweetalert2';
const isObjectEqual = (a, b) => {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    const valA = a[k];
    const valB = b[k];
    if (typeof valA === 'object' && typeof valB === 'object') {
      if (JSON.stringify(valA) !== JSON.stringify(valB)) return false;
    } else if (valA !== valB) {
      return false;
    }
  }
  return true;
};

export default function App() {
  const [isSyncing, setIsSyncing] = useState(true);
  const hasLoadedRef = useRef(false);
  const [pendingSyncs, setPendingSyncs] = useState(() => {
    try {
      const saved = localStorage.getItem('hdh_pending_syncs');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // บันทึกคิวลง LocalStorage เสมอเมื่อคิวเปลี่ยน
  useEffect(() => {
    localStorage.setItem('hdh_pending_syncs', JSON.stringify(pendingSyncs));
  }, [pendingSyncs]);

  // 2. โหลดข้อมูลจาก LocalStorage เข้า State หลักของ React SPA
  const [clinicInfo, setClinicInfo] = useState(() => db.getClinicInfo());
  const [users, setUsers] = useState(() => {
    initDatabase();
    let currentUsers = db.getUsers();
    
    // กรอง admin ออกจากข้อมูลพนักงานเพื่อป้องกันการบันทึกซ้ำซ้อนในฐานข้อมูลพนักงาน
    if (currentUsers.some(u => u.username === 'admin')) {
      currentUsers = currentUsers.filter(u => u.username !== 'admin');
      db.setUsers(currentUsers);
    }
    
    // เคลียร์ค่า override แอดมินรหัสเก่า 123
    const override = localStorage.getItem('hdh_admin_override');
    if (override) {
      try {
        const parsed = JSON.parse(override);
        if (parsed.password === '123') {
          localStorage.removeItem('hdh_admin_override');
        }
      } catch (e) {
        localStorage.removeItem('hdh_admin_override');
      }
    }
    
    return currentUsers;
  });
  const [therapists, setTherapists] = useState(() => db.getTherapists());
  const [services, setServices] = useState(() => db.getServices());
  const [promotions, setPromotions] = useState(() => db.getPromotions());
  const [bankAccounts, setBankAccounts] = useState(() => db.getBankAccounts());
  const [holidays, setHolidays] = useState(() => db.getHolidays());
  
  const [patients, setPatients] = useState(() => db.getPatients());
  const [appointments, setAppointments] = useState(() => db.getAppointments());
  const [receipts, setReceipts] = useState(() => db.getReceipts());
  const [assessments, setAssessments] = useState(() => db.getAssessments());
  const [salaryRules, setSalaryRules] = useState(() => db.getSalaryRules());
  const [payrolls, setPayrolls] = useState(() => db.getPayrolls());
  const [transactions, setTransactions] = useState(() => db.getTransactions());
  const [opdRecords, setOpdRecords] = useState(() => db.getOpdRecords());
  const [rewards, setRewards] = useState(() => db.getRewards());
  const [referrals, setReferrals] = useState(() => db.getReferrals());
  const [assessmentTemplates, setAssessmentTemplates] = useState(() => db.getAssessmentTemplates());

  // Refs for tracking the last synced database state to perform delta sync (only syncing inserts, updates, and deletes)
  const lastClinicInfoRef = useRef(clinicInfo);
  const lastUsersRef = useRef(users);
  const lastTherapistsRef = useRef(therapists);
  const lastServicesRef = useRef(services);
  const lastPromotionsRef = useRef(promotions);
  const lastBankAccountsRef = useRef(bankAccounts);
  const lastHolidaysRef = useRef(holidays);
  const lastPatientsRef = useRef(patients);
  const lastAppointmentsRef = useRef(appointments);
  const lastReceiptsRef = useRef(receipts);
  const lastAssessmentsRef = useRef(assessments);
  const lastSalaryRulesRef = useRef(salaryRules);
  const lastPayrollsRef = useRef(payrolls);
  const lastTransactionsRef = useRef(transactions);
  const lastOpdRecordsRef = useRef(opdRecords);
  const lastRewardsRef = useRef(rewards);
  const lastReferralsRef = useRef(referrals);
  const lastAssessmentTemplatesRef = useRef(assessmentTemplates);

  const refreshAllLocalStates = () => {
    setClinicInfo(db.getClinicInfo());
    setUsers(db.getUsers());
    setTherapists(db.getTherapists());
    setServices(db.getServices());
    setPromotions(db.getPromotions());
    setBankAccounts(db.getBankAccounts());
    setHolidays(db.getHolidays());
    setPatients(db.getPatients());
    setAppointments(db.getAppointments());
    setReceipts(db.getReceipts());
    setAssessments(db.getAssessments());
    setSalaryRules(db.getSalaryRules());
    setPayrolls(db.getPayrolls());
    setTransactions(db.getTransactions());
    setOpdRecords(db.getOpdRecords());
    setRewards(db.getRewards());
    setReferrals(db.getReferrals());
    setAssessmentTemplates(db.getAssessmentTemplates());
  };

  // 1. ตรวจสอบการรันระบบครั้งแรก และซิงค์ข้อมูลจาก Supabase
  useEffect(() => {
    const runInitialSync = async () => {
      initDatabase();
      
      // ตรวจสอบเซสชันการล็อกอินจาก Supabase Auth
      const { data: { session } } = await supabase.auth.getSession();
      
      // หากยังไม่ได้ล็อกอิน ให้ข้ามการซิงค์ข้อมูลเริ่มต้น (เนื่องจาก RLS จะบล็อกการดึงข้อมูลตารางส่วนตัว)
      if (!session) {
        console.log("No active Supabase Auth session found. Skipping initial sync.");
        setIsSyncing(false);
        hasLoadedRef.current = true;
        return;
      }
      
      // เช็คว่าเป็นครั้งแรกที่มีข้อมูลไหม (ถ้าไม่มีข้อมูลเลย ให้บล็อกเพื่อรอซิงค์ครั้งแรก)
      const isFirstRun = db.getPatients().length === 0 && db.getReceipts().length === 0;
      
      if (isFirstRun) {
        Swal.fire({
          title: 'กำลังซิงค์ข้อมูล...',
          text: 'กำลังโหลดข้อมูลล่าสุดจากฐานข้อมูลคลาวด์ออนไลน์',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });
      } else {
        // หากมีข้อมูลเดิมอยู่แล้ว ให้ซิงค์เบื้องหลังแบบไม่ขัดจังหวะการใช้งานของครู/แอดมิน
        Swal.fire({
          icon: 'info',
          title: 'กำลังซิงค์ข้อมูลเบื้องหลัง...',
          text: 'กำลังดึงข้อมูลล่าสุดจากระบบคลาวด์',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2500
        });
      }
      
      const triggerDirectMigration = async () => {
        Swal.fire({
          title: 'กำลังโอนย้ายข้อมูล...',
          html: '<div id="migration-status" style="font-size: 0.95rem; margin-top: 0.5rem;">กำลังเตรียมโอนย้าย...</div>',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        try {
          const { migrateLocalToSupabase } = await import('./utils/db');
          await migrateLocalToSupabase((tableName, index, total) => {
            const statusEl = document.getElementById('migration-status');
            if (statusEl) {
              statusEl.innerHTML = `กำลังอัปโหลด <strong>${tableName}</strong> (${index + 1}/${total})...`;
            }
          });

          Swal.fire({
            icon: 'success',
            title: 'โอนย้ายข้อมูลสำเร็จ!',
            text: 'ข้อมูลในเครื่องของคุณออนไลน์เรียบร้อยแล้ว',
            confirmButtonColor: 'var(--secondary)'
          }).then(() => {
            window.location.reload();
          });
        } catch (error) {
          console.error(error);
          Swal.fire({
            icon: 'error',
            title: 'การโอนย้ายข้อมูลล้มเหลว',
            text: error.message || 'เกิดข้อผิดพลาดในการโอนย้ายข้อมูล',
            confirmButtonColor: 'var(--secondary)'
          });
        }
      };

      try {
        const success = await syncFromSupabase();
        
        if (success === "empty_but_has_local") {
          setIsSyncing(false);
          Swal.fire({
            title: 'พบข้อมูลในเครื่องนี้!',
            text: 'ระบบตรวจพบประวัติคนไข้และประวัติเดิมในบราวเซอร์เครื่องนี้ แต่ฐานข้อมูลคลาวด์ Supabase ยังว่างเปล่า คุณต้องการย้ายข้อมูลขึ้นระบบออนไลน์เพื่อให้เครื่องอื่นเห็นด้วยหรือไม่?',
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'โอนย้ายขึ้นออนไลน์ (แนะนำ)',
            cancelButtonText: 'ใช้งานในเครื่องไปก่อน',
            confirmButtonColor: 'var(--secondary)',
            cancelButtonColor: '#aaa',
            allowOutsideClick: false
          }).then((result) => {
            if (result.isConfirmed) {
              triggerDirectMigration();
            }
          });
        } else if (success) {
          // โหลดสเตทใหม่จาก LocalStorage ทันที
          refreshAllLocalStates();
          
          Swal.fire({
            icon: 'success',
            title: 'ซิงค์ข้อมูลสำเร็จ',
            text: 'ดาวน์โหลดข้อมูลล่าสุดจากคลาวด์เรียบร้อยแล้ว',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000
          });
        } else {
          Swal.fire({
            icon: 'warning',
            title: 'ซิงค์ข้อมูลล้มเหลว',
            text: 'ไม่สามารถซิงค์ข้อมูลจากคลาวด์ได้ กำลังใช้งานข้อมูลภายในเครื่องชั่วคราว',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3500
          });
        }
      } catch (e) {
        console.error('Initial sync error:', e);
        Swal.fire({
          icon: 'warning',
          title: 'ซิงค์ข้อมูลล้มเหลว',
          text: 'ไม่สามารถดึงข้อมูลล่าสุดได้: ' + e.message,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3500
        });
      }
      
      setTimeout(() => {
        // อัปเดตตัวติดตามค่าดั้งเดิมให้ตรงกับที่ดึงมาจากคลาวด์ เพื่อเตรียมตรวจหาเฉพาะส่วนต่าง (Delta) ในคำสั่งถัดไป
        lastClinicInfoRef.current = db.getClinicInfo();
        lastUsersRef.current = db.getUsers();
        lastTherapistsRef.current = db.getTherapists();
        lastServicesRef.current = db.getServices();
        lastPromotionsRef.current = db.getPromotions();
        lastBankAccountsRef.current = db.getBankAccounts();
        lastHolidaysRef.current = db.getHolidays();
        lastPatientsRef.current = db.getPatients();
        lastAppointmentsRef.current = db.getAppointments();
        lastReceiptsRef.current = db.getReceipts();
        lastAssessmentsRef.current = db.getAssessments();
        lastSalaryRulesRef.current = db.getSalaryRules();
        lastPayrollsRef.current = db.getPayrolls();
        lastTransactionsRef.current = db.getTransactions();
        lastOpdRecordsRef.current = db.getOpdRecords();
        lastRewardsRef.current = db.getRewards();
        lastReferralsRef.current = db.getReferrals();
        lastAssessmentTemplatesRef.current = db.getAssessmentTemplates();

        setIsSyncing(false);
        hasLoadedRef.current = true;
      }, 1500);
    };
    runInitialSync();
  }, []);

  // 1.2 ระบบสมัครติดตามอัปเดตเรียลไทม์ (Supabase Real-time Subscriptions)
  useEffect(() => {
    if (isSyncing || !hasLoadedRef.current) return;

    // ตารางหลักที่จำแนกไอดีและฟังก์ชันสเตท
    const tablesToSubscribe = [
      { name: 'patients', pk: 'hn', setState: setPatients, dbSet: db.setPatients, ref: lastPatientsRef },
      { name: 'appointments', pk: 'id', setState: setAppointments, dbSet: db.setAppointments, ref: lastAppointmentsRef },
      { name: 'receipts', pk: 'id', setState: setReceipts, dbSet: db.setReceipts, ref: lastReceiptsRef },
      { name: 'assessments', pk: 'id', setState: setAssessments, dbSet: db.setAssessments, ref: lastAssessmentsRef },
      { name: 'opd_records', pk: 'id', setState: setOpdRecords, dbSet: db.setOpdRecords, ref: lastOpdRecordsRef }
    ];

    const toCamelCase = (str) => {
      if (str === 'snap_iv') return 'snapIV';
      return str.replace(/_([a-z])/g, g => g[1].toUpperCase());
    };

    const safeJsonParse = (val) => {
      if (typeof val === 'string') {
        let trimmed = val.trim();
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
          try { trimmed = JSON.parse(trimmed); } catch (e) {}
        }
        if (typeof trimmed === 'string') {
          if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
            try { return JSON.parse(trimmed); } catch (e) { return val; }
          }
        } else {
          return trimmed;
        }
      }
      return val;
    };

    const subscriptions = tablesToSubscribe.map(table => {
      return supabase
        .channel(`public:${table.name}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: table.name }, payload => {
          const { eventType, new: newRow, old: oldRow } = payload;

          const mapRow = (row) => {
            if (!row) return null;
            const mapped = {};
            for (const k in row) {
              mapped[toCamelCase(k)] = safeJsonParse(row[k]);
            }
            return mapped;
          };

          const mappedNewRow = mapRow(newRow);
          const mappedOldRow = mapRow(oldRow);

          table.setState(prevList => {
            const list = Array.isArray(prevList) ? prevList : [];
            let updatedList = [...list];

            if (eventType === 'INSERT') {
              const exists = list.some(item => item[table.pk] === mappedNewRow[table.pk]);
              if (!exists) {
                updatedList = [...list, mappedNewRow];
              }
            } else if (eventType === 'UPDATE') {
              updatedList = list.map(item => item[table.pk] === mappedNewRow[table.pk] ? mappedNewRow : item);
            } else if (eventType === 'DELETE') {
              const deletePkValue = mappedOldRow ? mappedOldRow[table.pk] : (payload.errors ? null : oldRow[table.pk]);
              if (deletePkValue) {
                updatedList = list.filter(item => item[table.pk] !== deletePkValue);
              }
            }

            table.dbSet(updatedList);
            table.ref.current = updatedList;
            return updatedList;
          });
        })
        .subscribe();
    });

    return () => {
      subscriptions.forEach(sub => supabase.removeChannel(sub));
    };
  }, [isSyncing]);

  // 1.3 ระบบประมวลผลคิวค้างซิงค์ (Retry Pending Syncs Queue)
  const processPendingSyncs = async (currentQueue = pendingSyncs) => {
    if (currentQueue.length === 0) return;

    let queue = [...currentQueue];
    let successCount = 0;

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      try {
        await syncDeltaToSupabase(item.key, item.delta, true);
        successCount++;
      } catch (err) {
        console.warn(`[Retry Pending Failed] Key: ${item.key}`, err);
        break;
      }
    }

    if (successCount > 0) {
      const remainingQueue = queue.slice(successCount);
      setPendingSyncs(remainingQueue);
      
      Swal.fire({
        icon: 'success',
        title: 'ซิงค์ข้อมูลออฟไลน์สำเร็จ',
        text: `อัปโหลดข้อมูลที่ค้างอยู่ ${successCount} รายการขึ้นระบบคลาวด์เรียบร้อยแล้ว`,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000
      });
    }
  };

  // ดักจับเมื่ออินเทอร์เน็ตกลับมาออนไลน์
  useEffect(() => {
    const handleOnline = () => {
      console.log('Internet connected. Processing pending syncs...');
      processPendingSyncs();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [pendingSyncs]);

  const handleSyncDelta = async (key, pk, newValue, ref, setDbFunc) => {
    // 1. บันทึกลง LocalStorage เสมอเพื่อความเสถียรของระบบออฟไลน์
    setDbFunc(newValue);

    if (isSyncing || !hasLoadedRef.current) {
      ref.current = newValue;
      return;
    }

    const oldValue = ref.current || [];
    ref.current = newValue;

    // หาตัวที่เพิ่มหรืออัปเดต
    const toUpsert = newValue.filter(newItem => {
      const oldItem = oldValue.find(o => o && o[pk] === newItem[pk]);
      return !oldItem || !isObjectEqual(oldItem, newItem);
    });

    // หาตัวที่ถูกลบ
    const toDelete = oldValue.filter(oldItem => {
      return oldItem && !newValue.some(n => n && n[pk] === oldItem[pk]);
    });

    if (toUpsert.length > 0 || toDelete.length > 0) {
      const delta = { toUpsert, toDelete };
      try {
        await syncDeltaToSupabase(key, delta, true);
      } catch (error) {
        console.warn(`[Sync Delta Failed] Key: ${key}`, error);
        
        // บันทึกลงคิวรอซิงค์
        setPendingSyncs(prev => [...prev, { key, delta, timestamp: new Date().toISOString() }]);

        Swal.fire({
          icon: 'warning',
          title: 'การเชื่อมต่อคลาวด์ล้มเหลว',
          text: `ตาราง ${key} ซิงค์ล้มเหลว (บันทึกข้อมูลในคอมพิวเตอร์เครื่องนี้แล้ว และระบบจะพยายามอัปโหลดอีกครั้งเมื่อมีเน็ต)`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 6000
        });
      }
    }
  };

  const handleSyncSingleConfig = async (key, newValue, ref, setDbFunc) => {
    setDbFunc(newValue);

    if (isSyncing || !hasLoadedRef.current) {
      ref.current = newValue;
      return;
    }

    const oldValue = ref.current;
    ref.current = newValue;

    if (!isObjectEqual(oldValue, newValue)) {
      const delta = { toUpsert: [newValue] };
      try {
        await syncDeltaToSupabase(key, delta, true);
      } catch (error) {
        console.warn(`[Sync Config Failed] Key: ${key}`, error);
        
        // บันทึกลงคิวรอซิงค์
        setPendingSyncs(prev => [...prev, { key, delta, timestamp: new Date().toISOString() }]);

        Swal.fire({
          icon: 'warning',
          title: 'การเชื่อมต่อคลาวด์ล้มเหลว',
          text: `ตาราง ${key} ซิงค์ล้มเหลว (บันทึกข้อมูลในคอมพิวเตอร์เครื่องนี้แล้ว และระบบจะพยายามอัปโหลดอีกครั้งเมื่อมีเน็ต)`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 6000
        });
      }
    }
  };

  // บันทึก State ลง LocalStorage และ Supabase เมื่อมีค่าเปลี่ยนแปลงเฉพาะส่วนต่าง (Delta)
  useEffect(() => {
    handleSyncSingleConfig('hdh_clinic_info', clinicInfo, lastClinicInfoRef, db.setClinicInfo);
  }, [clinicInfo]);

  useEffect(() => {
    handleSyncDelta('hdh_users', 'username', users, lastUsersRef, db.setUsers);
  }, [users]);

  useEffect(() => {
    handleSyncDelta('hdh_therapists', 'id', therapists, lastTherapistsRef, db.setTherapists);
  }, [therapists]);

  useEffect(() => {
    handleSyncDelta('hdh_services', 'code', services, lastServicesRef, db.setServices);
  }, [services]);

  useEffect(() => {
    handleSyncDelta('hdh_promotions', 'code', promotions, lastPromotionsRef, db.setPromotions);
  }, [promotions]);

  useEffect(() => {
    handleSyncDelta('hdh_bank_accounts', 'id', bankAccounts, lastBankAccountsRef, db.setBankAccounts);
  }, [bankAccounts]);

  useEffect(() => {
    handleSyncDelta('hdh_holidays', 'id', holidays, lastHolidaysRef, db.setHolidays);
  }, [holidays]);

  useEffect(() => {
    handleSyncDelta('hdh_patients', 'hn', patients, lastPatientsRef, db.setPatients);
  }, [patients]);

  useEffect(() => {
    handleSyncDelta('hdh_appointments', 'id', appointments, lastAppointmentsRef, db.setAppointments);
  }, [appointments]);

  useEffect(() => {
    handleSyncDelta('hdh_receipts', 'id', receipts, lastReceiptsRef, db.setReceipts);
  }, [receipts]);

  useEffect(() => {
    handleSyncDelta('hdh_assessments', 'id', assessments, lastAssessmentsRef, db.setAssessments);
  }, [assessments]);

  useEffect(() => {
    handleSyncSingleConfig('hdh_salary_rules', salaryRules, lastSalaryRulesRef, db.setSalaryRules);
  }, [salaryRules]);

  useEffect(() => {
    handleSyncDelta('hdh_payrolls', 'id', payrolls, lastPayrollsRef, db.setPayrolls);
  }, [payrolls]);

  useEffect(() => {
    handleSyncDelta('hdh_transactions', 'id', transactions, lastTransactionsRef, db.setTransactions);
  }, [transactions]);

  useEffect(() => {
    handleSyncDelta('hdh_opd_records', 'id', opdRecords, lastOpdRecordsRef, db.setOpdRecords);
  }, [opdRecords]);

  useEffect(() => {
    handleSyncDelta('hdh_rewards', 'code', rewards, lastRewardsRef, db.setRewards);
  }, [rewards]);

  useEffect(() => {
    handleSyncDelta('hdh_referrals', 'id', referrals, lastReferralsRef, db.setReferrals);
  }, [referrals]);

  useEffect(() => {
    handleSyncDelta('hdh_assessment_templates', 'id', assessmentTemplates, lastAssessmentTemplatesRef, db.setAssessmentTemplates);
  }, [assessmentTemplates]);

  // 3. จัดการเรื่องหน้าเข้าใช้งาน / ล็อกอิน
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('hdh_logged_in_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Password reset states
  const [forgotPasswordStep, setForgotPasswordStep] = useState(null); // null, 'contact', 'reset'
  const [resetUsername, setResetUsername] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // ดึงค่าแอดมินหลักจาก localStorage (เผื่อมีการแก้ไข Username/Password)
    const adminOverride = localStorage.getItem('hdh_admin_override');
    const parsedOverride = adminOverride ? JSON.parse(adminOverride) : null;
    const adminUsername = parsedOverride ? parsedOverride.username : 'admin';
    
    let targetEmail = '';
    let localProfile = null;
    
    if (loginUsername === adminUsername) {
      targetEmail = parsedOverride?.email || 'admin@hugdeehome.com';
      localProfile = parsedOverride || {
        username: 'admin',
        fullname: 'ผู้ดูแลระบบหลัก',
        role: 'Admin',
        employeeId: 'HDH001',
        status: 'Active',
        avatarUrl: ''
      };
    } else {
      // เรียกใช้ RPC get_email_by_username เพื่อค้นหาอีเมลในฐานข้อมูลแบบปลอดภัย (PDPA)
      // เนื่องจากเรายังไม่ได้ล็อกอินและ RLS บล็อกการอ่านตาราง users
      try {
        const { data, error } = await supabase.rpc('get_email_by_username', { username_val: loginUsername });
        if (error) throw error;
        targetEmail = data;
      } catch (err) {
        console.error('Error fetching email via RPC:', err);
      }
      
      // ค้นหาในประวัติเครื่องเดิมด้วยเผื่อเป็นกรณีกำลังทำงานออฟไลน์
      if (!targetEmail) {
        const match = (users || []).find(u => u.username === loginUsername);
        if (match) {
          targetEmail = match.email;
          localProfile = match;
        }
      } else {
        const match = (users || []).find(u => u.username === loginUsername);
        if (match) localProfile = match;
      }
    }

    if (!targetEmail) {
      Swal.fire({
        icon: 'error',
        title: 'ล็อกอินล้มเหลว',
        text: 'ไม่พบบัญชีผู้ใช้งานหรืออีเมลในระบบ กรุณาตรวจสอบชื่อผู้ใช้อีกครั้ง!',
        confirmButtonColor: 'var(--secondary)'
      });
      return;
    }

    Swal.fire({
      title: 'กำลังตรวจสอบข้อมูล...',
      text: 'ระบบกำลังรักษาความปลอดภัยการเชื่อมต่อสิทธิ์การเข้าถึง',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      // 1. ตรวจสอบยืนยันตัวตนผ่าน Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: loginPassword
      });

      if (error) {
        throw new Error(error.message);
      }

      // สั่งให้ระบบทำการซิงค์ประวัติข้อมูลทั้งหมดในคลาวด์ทันทีหลังจากผ่านด่านความปลอดภัย RLS สำเร็จ
      setIsSyncing(true);
      await syncFromSupabase();
      
      // อัปเดตข้อมูลทุกอย่างใน React State ให้ตรงตามที่ซิงค์มาล่าสุดทันที
      refreshAllLocalStates();

      // ดึงสิทธิ์ที่แท้จริงจากฐานข้อมูลที่อัปเดตซิงค์เรียบร้อยแล้ว
      let finalProfile = localProfile;
      if (loginUsername !== adminUsername) {
        const freshUsers = db.getUsers();
        const freshProfile = (freshUsers || []).find(u => u.username === loginUsername);
        if (freshProfile) finalProfile = freshProfile;
      }

      setCurrentUser(finalProfile);
      localStorage.setItem('hdh_logged_in_user', JSON.stringify(finalProfile));
      setIsSyncing(false);
      
      Swal.fire({
        icon: 'success',
        title: 'ยินดีต้อนรับกลับมา!',
        text: `ล็อกอินสำเร็จในบทบาท ${finalProfile.role}`,
        timer: 1500,
        showConfirmButton: false
      });
      setActiveTab('dashboard');

    } catch (err) {
      console.error('Login auth error:', err);
      setIsSyncing(false);
      
      Swal.fire({
        icon: 'error',
        title: 'การเข้าสู่ระบบถูกปฏิเสธ',
        html: `
          <div style="font-family: var(--font-family); text-align: left; font-size: 0.9rem; line-height: 1.5;">
            ชื่อผู้ใช้หรือรหัสผ่านผิดพลาด!<br/><br/>
            <strong style="color:var(--danger)">หมายเหตุ:</strong> บัญชีผู้ใช้งานระบบนี้ต้องผ่านการเชื่อมโยงบนระบบ Supabase Auth ก่อนใช้งานจริง<br/>
            (รายละเอียดความผิดพลาด: ${err.message})
          </div>
        `,
        confirmButtonColor: 'var(--secondary)'
      });
    }
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    if (resetNewPassword !== resetConfirmPassword) {
      Swal.fire({
        icon: 'error',
        title: 'รหัสผ่านไม่ตรงกัน',
        text: 'รหัสผ่านใหม่และยืนยันรหัสผ่านใหม่ไม่ตรงกัน',
        confirmButtonColor: 'var(--secondary)'
      });
      return;
    }

    const usernameLower = resetUsername.trim().toLowerCase();
    const emailLower = resetEmail.trim().toLowerCase();

    // Check admin
    const adminOverride = localStorage.getItem('hdh_admin_override');
    const parsedOverride = adminOverride ? JSON.parse(adminOverride) : null;
    const adminEmail = (parsedOverride?.email || 'admin@hugdeehome.com').trim().toLowerCase();

    if (usernameLower === 'admin') {
      if (emailLower === adminEmail) {
        const updatedAdmin = parsedOverride ? { ...parsedOverride, password: resetNewPassword } : {
          username: 'admin',
          fullname: 'ผู้ดูแลระบบหลัก',
          role: 'Admin',
          employeeId: 'HDH001',
          status: 'Active',
          avatarUrl: '',
          email: 'admin@hugdeehome.com',
          password: resetNewPassword
        };
        localStorage.setItem('hdh_admin_override', JSON.stringify(updatedAdmin));
        
        Swal.fire({
          icon: 'success',
          title: 'เปลี่ยนรหัสผ่านสำเร็จ',
          text: 'รหัสผ่านใหม่เปิดใช้งานแล้ว สามารถเข้าสู่ระบบได้ทันที',
          confirmButtonColor: 'var(--secondary)'
        });
        setForgotPasswordStep(null);
        setResetUsername('');
        setResetEmail('');
        setResetNewPassword('');
        setResetConfirmPassword('');
      } else {
        Swal.fire({
          icon: 'error',
          title: 'ข้อมูลไม่ถูกต้อง',
          text: 'ชื่อบัญชีหรืออีเมลไม่ถูกต้อง',
          confirmButtonColor: 'var(--secondary)'
        });
      }
      return;
    }

    // Check other users
    const matchedUserIndex = users.findIndex(u => u.username.toLowerCase() === usernameLower && (u.email || '').trim().toLowerCase() === emailLower);
    if (matchedUserIndex !== -1) {
      const updatedUsers = users.map((u, idx) => idx === matchedUserIndex ? { ...u, password: resetNewPassword } : u);
      setUsers(updatedUsers);
      
      Swal.fire({
        icon: 'success',
        title: 'เปลี่ยนรหัสผ่านสำเร็จ',
        text: 'รหัสผ่านใหม่เปิดใช้งานแล้ว สามารถเข้าสู่ระบบได้ทันที',
        confirmButtonColor: 'var(--secondary)'
      });
      setForgotPasswordStep(null);
      setResetUsername('');
      setResetEmail('');
      setResetNewPassword('');
      setResetConfirmPassword('');
    } else {
      Swal.fire({
        icon: 'error',
        title: 'ข้อมูลไม่ถูกต้อง',
        text: 'ชื่อบัญชีหรืออีเมลไม่ถูกต้อง',
        confirmButtonColor: 'var(--secondary)'
      });
    }
  };

  const handleUpdateProfile = (updatedUser) => {
    if (currentUser && currentUser.username === 'admin') {
      setCurrentUser(updatedUser);
      localStorage.setItem('hdh_logged_in_user', JSON.stringify(updatedUser));
      localStorage.setItem('hdh_admin_override', JSON.stringify(updatedUser));
    } else {
      const updatedUsersList = users.map(u => u.username === currentUser.username ? { ...u, ...updatedUser } : u);
      setUsers(updatedUsersList);
      setCurrentUser(updatedUser);
      localStorage.setItem('hdh_logged_in_user', JSON.stringify(updatedUser));
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
    setCurrentUser(null);
    localStorage.removeItem('hdh_logged_in_user');
    setLoginUsername('');
    setLoginPassword('');
  };

  // ดึงค่าการยุบ Sidebar จาก LocalStorage
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('hdh_sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // สถานะเปิดหน้าสมัครงานออนไลน์สาธารณะ
  const [isApplyPage, setIsApplyPage] = useState(() => window.location.hash === '#/apply');

  useEffect(() => {
    const handleHash = () => {
      setIsApplyPage(window.location.hash === '#/apply');
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // แท็บหน้าจอหลักที่แสดง (SPA Router)
  const [activeTab, setActiveTab] = useState('dashboard');

  // 4. บันทึกข้อมูลคลังสินค้า POS Cart ชั่วคราว (สำหรับดึงบิลร่างกลับมาแก้ไข)
  const [posSelectedHn, setPosSelectedHn] = useState('');
  const [posCart, setPosCart] = useState([]);
  const [posDiscountType, setPosDiscountType] = useState('flat');
  const [posDiscountValue, setPosDiscountValue] = useState(0);
  const [posDiscountReason, setPosDiscountReason] = useState('');
  const [posPromoCode, setPosPromoCode] = useState('');
  const [posPaymentMethod, setPosPaymentMethod] = useState('เงินสด');
  const [posBankId, setPosBankId] = useState('');
  const [posSlipName, setPosSlipName] = useState('');
  const [posSlipAttached, setPosSlipAttached] = useState(false);

  // 5. สถานะพรีวิวและจัดทำเอกสารพิมพ์ PDF (Print View)
  const [printView, setPrintView] = useState({
    show: false,
    type: 'receipt', // patient, assessment, receipt
    data: null
  });

  // สร้างฟังก์ชัน Global ลอยบน Window เพื่อให้ POS เรียกเปิดพรีวิวพิมพ์ได้รวดเร็ว
  useEffect(() => {
    window.printReceiptById = (billId) => {
      const bill = receipts.find(r => r.id === billId);
      if (bill) {
        setPrintView({ show: true, type: 'receipt', data: bill });
      }
    };
    return () => {
      delete window.printReceiptById;
    };
  }, [receipts]);

  // --- ฟังก์ชันดำเนินงาน DB (สืบทอดไปให้ลูกๆ) ---
  const handleAddPatient = (data) => {
    setPatients([...patients, data]);
  };

  const handleUpdatePatient = (data) => {
    setPatients(patients.map(p => p.hn === data.hn ? data : p));
  };

  const handleDeletePatient = (hn) => {
    setPatients(patients.filter(p => p.hn !== hn));
  };

  const handleAddAppointment = (data) => {
    setAppointments([...appointments, data]);
  };

  const handleUpdateAppointmentStatus = (appId, newStatus) => {
    setAppointments(appointments.map(app => app.id === appId ? { ...app, status: newStatus } : app));
  };

  const handleDeleteAppointment = (appId) => {
    setAppointments(appointments.filter(app => app.id !== appId));
  };

  const handleUpdateAppointment = (updatedApp) => {
    setAppointments(appointments.map(app => app.id === updatedApp.id ? updatedApp : app));
  };

  const handleAddAssessment = (data) => {
    const filtered = assessments.filter(a => a.id !== data.id);
    setAssessments([...filtered, data]);
  };

  const handleDeleteAssessment = (id) => {
    setAssessments(assessments.filter(a => a.id !== id));
  };

  const handleSaveReceipt = (data) => {
    // กรองบิลเก่าออกถ้าเป็นการอัปเดต / บันทึกทับบิลเดิม (สำหรับบิลแจ้งหนี้ชำระเงินต่อ)
    const filtered = receipts.filter(r => r.id !== data.id);
    setReceipts([...filtered, data]);
  };

  const handleVoidReceipt = (id, reason) => {
    // ปรับสถานะเป็น "ยกเลิก" และบันทึกเหตุผล
    setReceipts(receipts.map(r => r.id === id ? { ...r, status: 'ยกเลิก', voidReason: reason || 'ไม่ได้ระบุเหตุผลในการยกเลิก' } : r));
  };

  const handleDeleteReceipt = (id, reason) => {
    // ดึงข้อมูลใบเสร็จก่อนลบ เพื่อทำบันทึก Audit Log
    const target = receipts.find(r => r.id === id);
    if (target) {
      const deletedLog = {
        id: target.id,
        hn: target.hn,
        date: target.date,
        totalAmount: target.totalAmount,
        reason: reason || 'ไม่ได้ระบุเหตุผลในการลบ',
        deletedBy: currentUser?.fullname || 'ผู้ดูแลระบบ',
        deletedAt: new Date().toISOString(),
        receiptData: target
      };
      try {
        const logs = JSON.parse(localStorage.getItem('hdh_deleted_receipts') || '[]');
        logs.push(deletedLog);
        localStorage.setItem('hdh_deleted_receipts', JSON.stringify(logs));
      } catch (e) {
        console.error('Error saving deleted receipt audit log:', e);
      }
    }
    setReceipts(receipts.filter(r => r.id !== id));
  };

  const handleEditDraftReceipt = (receipt) => {
    // 1. ดึงรายละเอียดเข้าตะกร้า POS ใน State กลาง
    setPosSelectedHn(receipt.hn);
    setPosCart(receipt.items.filter(item => item.code !== 'REWARD_REDEEM').map(item => {
      // ดึงรายละเอียดราคาและหมวดหมู่อ้างอิงกลับมา
      const orig = services.find(s => s.code === item.code);
      const isReward = item.name.includes('[แลก');
      const reward = isReward ? (rewards || []).find(r => r.code === receipt.rewardId) : null;
      return {
        code: item.code,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        category: item.type || (orig ? orig.category : 'บริการ'),
        isReward: isReward,
        rewardType: reward ? reward.type : (isReward ? (item.price > 0 ? 'สินค้า' : 'ส่วนลด') : ''),
        pointsCost: reward ? Number(reward.points) : 0,
        discountVal: reward ? Number(reward.value) : 0,
        rewardCondition: reward ? reward.condition : ''
      };
    }));
    setPosDiscountType(receipt.discountType);
    setPosDiscountValue(receipt.discountValue);
    setPosDiscountReason(receipt.discountReason);
    setPosPromoCode(receipt.promotionId);
    setPosPaymentMethod(receipt.paymentMethod);
    setPosBankId(receipt.bankAccountId);
    
    if (receipt.slipUrl) {
      setPosSlipAttached(true);
      setPosSlipName(receipt.slipUrl);
    } else {
      setPosSlipAttached(false);
      setPosSlipName('');
    }

    // 2. ลบบิลแจ้งหนี้ชั่วคราวฉบับร่างนี้ออกจากระบบ เพื่อให้ออกบิลเลขเดิมทับได้ไม่มีปัญหา
    setReceipts(receipts.filter(r => r.id !== receipt.id));

    // 3. เปลี่ยนหน้าไปที่หน้า POS เพื่อให้พนักงานเก็บเงินต่อ
    setActiveTab('pos');

    Swal.fire({
      icon: 'success',
      title: 'ดึงข้อมูลบิลร่างกลับเข้า POS',
      text: `ดึงผู้รับบริการและบริการจากบิล ${receipt.id} เรียบร้อยแล้ว`,
      timer: 2000,
      showConfirmButton: false
    });
  };

  // ปุ่มลัดเพิ่มคอร์สแบบแมนนวล (Manual)
  const handleManualAddCourse = (hn, sessions, remark) => {
    const today = new Date();
    const beYear = today.getFullYear() + 543;
    const yearSuffix = beYear.toString().slice(-2);
    
    // สร้างรหัสบิลแบบกำหนดปรับปรุง
    const billId = `M${yearSuffix}` + Math.floor(1000 + Math.random() * 9000);
    const localDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const manualReceipt = {
      id: billId,
      hn: hn,
      date: localDateStr,
      items: [
        { code: 'MANUAL_ADD', name: `ปรับปรุงเพิ่มคอร์สแมนนวล (${remark})`, price: 0, quantity: sessions, type: 'บริการ' }
      ],
      discountType: 'flat',
      discountValue: 0,
      discountReason: remark,
      promotionId: '',
      paymentMethod: 'เงินสด',
      bankAccountId: '',
      slipUrl: '',
      status: 'ชำระเงินแล้ว', // ชำระสำเร็จ (0 บาท)
      totalAmount: 0,
      created_at: new Date().toISOString(),
      createdBy: currentUser?.fullname || 'ผู้ดูแลระบบ สุดหล่อ'
    };

    setReceipts([...receipts, manualReceipt]);
  };

  // ปุ่มลัดโอนคอร์ส (Transfer): หักสิทธิ์จากผู้โอน และเพิ่มให้ผู้รับ (สร้างบิล 2 ใบอัตโนมัติ)
  const handleTransferCourse = (transferorHn, transfereeHn, sessions, remark) => {
    const today = new Date();
    const beYear = today.getFullYear() + 543;
    const yearSuffix = beYear.toString().slice(-2);
    const suffixRnd = Math.floor(1000 + Math.random() * 9000);
    
    const transferor = patients.find(p => p.hn === transferorHn);
    const transferee = patients.find(p => p.hn === transfereeHn);

    const billId1 = `TR${yearSuffix}A${suffixRnd}`;
    const billId2 = `TR${yearSuffix}B${suffixRnd}`;
    const localDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // ใบที่ 1: บิลหักยอดของครึ่งทางผู้โอน
    const receipt1 = {
      id: billId1,
      hn: transferorHn,
      date: localDateStr,
      items: [
        { code: 'TRANSFER_OUT', name: `โอนสิทธิ์คอร์สให้ น้อง${transferee.nickname} (${transferee.title}${transferee.firstname})`, price: 0, quantity: sessions, type: 'บริการ' }
      ],
      discountType: 'flat',
      discountValue: 0,
      discountReason: remark,
      promotionId: '',
      paymentMethod: 'เงินสด',
      bankAccountId: '',
      slipUrl: '',
      status: 'ชำระเงินแล้ว',
      totalAmount: 0,
      created_at: new Date().toISOString(),
      createdBy: currentUser?.fullname || 'ผู้ดูแลระบบ สุดหล่อ'
    };

    // ใบที่ 2: บิลเพิ่มยอดทางผู้รับโอน
    const receipt2 = {
      id: billId2,
      hn: transfereeHn,
      date: localDateStr,
      items: [
        { code: 'TRANSFER_IN', name: `รับโอนสิทธิ์คอร์สจาก น้อง${transferor.nickname} (${transferor.title}${transferor.firstname})`, price: 0, quantity: sessions, type: 'บริการ' }
      ],
      discountType: 'flat',
      discountValue: 0,
      discountReason: remark,
      promotionId: '',
      paymentMethod: 'เงินสด',
      bankAccountId: '',
      slipUrl: '',
      status: 'ชำระเงินแล้ว',
      totalAmount: 0,
      created_at: new Date().toISOString(),
      createdBy: currentUser?.fullname || 'ผู้ดูแลระบบ สุดหล่อ'
    };

    setReceipts([...receipts, receipt1, receipt2]);
  };

  // ปุ่มลัดเพิ่ม/ลดคะแนนสะสมแบบแมนนวล (Manual Points Adjust: add/deduct)
  const handleManualAdjustPoints = (hn, points, action, remark) => {
    const today = new Date();
    const beYear = today.getFullYear() + 543;
    const yearSuffix = beYear.toString().slice(-2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = `${today.getFullYear()}-${mm}-${dd}`;
    
    const billId = `PTS${yearSuffix}` + Math.floor(1000 + Math.random() * 9000);
    const isAdd = action === 'add';

    const manualReceipt = {
      id: billId,
      hn: hn,
      date: dateStr,
      items: [
        { 
          code: isAdd ? 'POINT_ADD_MANUAL' : 'POINT_DEDUCT_MANUAL', 
          name: `ปรับปรุงแต้มแมนนวล (${isAdd ? 'เพิ่ม' : 'ลด'}) (${remark})`, 
          price: 0, 
          quantity: points, 
          type: 'คะแนน' 
        }
      ],
      discountType: 'flat',
      discountValue: 0,
      discountReason: remark,
      promotionId: '',
      paymentMethod: 'เงินสด',
      bankAccountId: '',
      slipUrl: '',
      status: 'ชำระเงินแล้ว',
      totalAmount: 0,
      created_at: new Date().toISOString(),
      createdBy: currentUser?.fullname || 'ผู้ดูแลระบบ สุดหล่อ'
    };

    setReceipts([...receipts, manualReceipt]);
  };

  // ลบรายการคะแนนสะสมแบบกำหนดเอง (Delete Manual Points)
  const handleDeleteManualPoints = (id) => {
    setReceipts(receipts.filter(r => r.id !== id));
  };

  // แก้ไขรายการคะแนนสะสมแบบกำหนดเอง (Edit Manual Points)
  const handleEditManualPoints = (id, points, action, remark) => {
    const isAdd = action === 'add';
    setReceipts(receipts.map(r => {
      if (r.id === id) {
        return {
          ...r,
          items: [
            { 
              code: isAdd ? 'POINT_ADD_MANUAL' : 'POINT_DEDUCT_MANUAL', 
              name: `ปรับปรุงแต้มแมนนวล (${isAdd ? 'เพิ่ม' : 'ลด'}) (${remark})`, 
              price: 0, 
              quantity: points, 
              type: 'คะแนน' 
            }
          ],
          discountReason: remark
        };
      }
      return r;
    }));
  };

  // ปุ่มลัดโอนคะแนน (Transfer Points)
  const handleTransferPoints = (transferorHn, transfereeHn, points, remark) => {
    const today = new Date();
    const beYear = today.getFullYear() + 543;
    const yearSuffix = beYear.toString().slice(-2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = `${today.getFullYear()}-${mm}-${dd}`;
    const suffixRnd = Math.floor(1000 + Math.random() * 9000);

    const transferor = patients.find(p => p.hn === transferorHn);
    const transferee = patients.find(p => p.hn === transfereeHn);

    const billId1 = `TRP${yearSuffix}A${suffixRnd}`;
    const billId2 = `TRP${yearSuffix}B${suffixRnd}`;

    const receipt1 = {
      id: billId1,
      hn: transferorHn,
      date: dateStr,
      items: [
        { code: 'POINT_TRANSFER_OUT', name: `โอนคะแนนออกให้ น้อง${transferee.nickname} (${transferee.title}${transferee.firstname})`, price: 0, quantity: points, type: 'คะแนน' }
      ],
      discountType: 'flat',
      discountValue: 0,
      discountReason: remark,
      promotionId: '',
      paymentMethod: 'เงินสด',
      bankAccountId: '',
      slipUrl: '',
      status: 'ชำระเงินแล้ว',
      totalAmount: 0,
      created_at: new Date().toISOString(),
      createdBy: currentUser?.fullname || 'ผู้ดูแลระบบ สุดหล่อ'
    };

    const receipt2 = {
      id: billId2,
      hn: transfereeHn,
      date: dateStr,
      items: [
        { code: 'POINT_TRANSFER_IN', name: `รับโอนคะแนนจาก น้อง${transferor.nickname} (${transferor.title}${transferor.firstname})`, price: 0, quantity: points, type: 'คะแนน' }
      ],
      discountType: 'flat',
      discountValue: 0,
      discountReason: remark,
      promotionId: '',
      paymentMethod: 'เงินสด',
      bankAccountId: '',
      slipUrl: '',
      status: 'ชำระเงินแล้ว',
      totalAmount: 0,
      created_at: new Date().toISOString(),
      createdBy: currentUser?.fullname || 'ผู้ดูแลระบบ สุดหล่อ'
    };

    setReceipts([...receipts, receipt1, receipt2]);
  };

  // ปุ่มลัดแลกของรางวัล (Redeem Reward)
  const handleRedeemReward = (hn, rewardCode, pointsCost, rewardName) => {
    const today = new Date();
    const beYear = today.getFullYear() + 543;
    const yearSuffix = beYear.toString().slice(-2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = `${today.getFullYear()}-${mm}-${dd}`;
    
    const billId = `RWD${yearSuffix}` + Math.floor(1000 + Math.random() * 9000);

    const redemptionReceipt = {
      id: billId,
      hn: hn,
      date: dateStr,
      items: [
        { code: 'REWARD_REDEEM', name: `แลกของรางวัล: ${rewardName}`, price: 0, quantity: pointsCost, type: 'คะแนน' }
      ],
      discountType: 'flat',
      discountValue: 0,
      discountReason: `แลกรับของรางวัล ${rewardName} (${pointsCost} คะแนน)`,
      promotionId: rewardCode,
      rewardId: rewardCode,
      paymentMethod: 'เงินสด',
      bankAccountId: '',
      slipUrl: '',
      status: 'ชำระเงินแล้ว',
      totalAmount: 0,
      created_at: new Date().toISOString(),
      createdBy: currentUser?.fullname || 'ผู้ดูแลระบบ สุดหล่อ'
    };

    setReceipts([...receipts, redemptionReceipt]);
  };



  // 10. รันหน้าสมัครงานภายนอก (สาธารณะ) เข้าได้เลยไม่ต้องผ่านเมนูSidebar และ Logn
  if (isApplyPage) {
    return (
      <GuestRegister 
        clinicInfo={clinicInfo}
        users={users}
        onRegister={(newPendingUser) => {
          setUsers(prev => [...prev, newPendingUser]);
        }}
      />
    );
  }

  // รันวิวล็อกอินถ้าผู้ใช้งานยังไม่ได้ลงชื่อเข้าใช้ระบบ
  if (!currentUser) {
    return (
      <div className="login-container" style={{ position: 'relative' }}>
        <div className="card-3xl login-card">
          <div className="login-logo" style={{ overflow: 'hidden', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF8F1', border: '1px solid var(--border-light)' }}>
            {clinicInfo?.logoUrl ? (
              <img src={clinicInfo.logoUrl} alt="Clinic Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--secondary)' }}>ฮดี</span>
            )}
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem', color: 'var(--dark)' }}>
            {clinicInfo?.name || 'ฮักดีโฮม (Hug Dee Home)'}
          </h1>
          <div className="login-subtitle" style={{ fontSize: '0.85rem', color: 'var(--secondary)', fontWeight: 600 }}>
            {clinicInfo?.type || 'คลินิกการประกอบโรคศิลปะสาขากิจกรรมบำบัด'}
          </div>
          
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', textAlign: 'left' }}>
            <div className="form-group">
              <label className="form-label">ชื่อผู้ใช้งานระบบ (Username)</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="กรอกชื่อผู้ใช้งานระบบ" 
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">รหัสผ่าน (Password)</label>
              <input 
                type="password" 
                className="form-control" 
                placeholder="กรอกรหัสผ่าน" 
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-secondary" style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', marginTop: '0.5rem' }}>
              เข้าสู่ระบบบริหารคลินิก
            </button>
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <a 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  setForgotPasswordStep('contact');
                }}
                style={{ fontSize: '0.85rem', color: 'var(--secondary)', textDecoration: 'underline', fontWeight: 500 }}
              >
                ลืมรหัสผ่าน?
              </a>
            </div>
          </form>
        </div>

        {/* MODAL POPUPS FOR FORGOT PASSWORD */}
        {forgotPasswordStep === 'contact' && (
          <div className="modal-overlay" style={{ background: 'rgba(0, 0, 0, 0.45)', backdropFilter: 'blur(3px)', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000 }}>
            <div className="card-3xl" style={{ maxWidth: '400px', width: '90%', padding: '2.5rem 2rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)' }}>
              
              {/* Blue info icon */}
              <div style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '50%', 
                border: '4px solid #54B4EB', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 1.5rem',
                color: '#54B4EB',
                fontSize: '3.5rem',
                fontWeight: 700,
                fontFamily: 'serif'
              }}>
                i
              </div>

              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1rem', color: '#4A4036' }}>
                ลืมรหัสผ่าน?
              </h2>
              
              <div style={{ fontSize: '0.9rem', color: '#6e6052', lineHeight: '1.6', textAlign: 'left', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>กรุณาติดต่อผู้ดูแลระบบสูงสุด หรือช่องทางติดต่อหลักของคลินิกเพื่อขอเปลี่ยน/รีเซ็ตรหัสผ่าน:</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                  <span style={{ color: '#c19b6c', fontSize: '1.2rem' }}>📞</span>
                  <span><strong>เบอร์โทรศัพท์:</strong> 094-6753557</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                  <span style={{ color: '#9b59b6', fontSize: '1.2rem' }}>💬</span>
                  <span><strong>Line Official:</strong> @hugdeehome</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', fontWeight: 700, backgroundColor: '#c19b6c', border: 'none', borderRadius: 'var(--radius-lg)' }}
                  onClick={() => setForgotPasswordStep(null)}
                >
                  รับทราบ
                </button>
                <button 
                  type="button" 
                  style={{ background: 'none', border: 'none', color: 'var(--secondary)', fontSize: '0.85rem', textDecoration: 'underline', cursor: 'pointer', marginTop: '0.5rem' }}
                  onClick={() => setForgotPasswordStep('reset')}
                >
                  หรือเปลี่ยนรหัสผ่านออนไลน์ด้วยตนเอง
                </button>
              </div>
            </div>
          </div>
        )}

        {forgotPasswordStep === 'reset' && (
          <div className="modal-overlay" style={{ background: 'rgba(0, 0, 0, 0.45)', backdropFilter: 'blur(3px)', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000 }}>
            <div className="card-3xl" style={{ maxWidth: '420px', width: '90%', padding: '2.5rem 2rem', backgroundColor: '#fff', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.25rem', color: '#B0895A', textAlign: 'center' }}>
                ตั้งรหัสผ่านใหม่
              </h1>
              <div style={{ fontSize: '0.85rem', color: 'var(--dark-light)', fontWeight: 500, textAlign: 'center', marginBottom: '1.5rem' }}>
                กรอกข้อมูลเพื่อยืนยันตัวตนและตั้งรหัสผ่านใหม่
              </div>
              
              <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'left' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.9rem' }}>Username</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="กรอกชื่อผู้ใช้ระบบ"
                    value={resetUsername}
                    onChange={(e) => setResetUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.9rem' }}>Email</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    placeholder="กรอกอีเมลที่ผูกไว้กับบัญชี"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.9rem' }}>รหัสผ่านใหม่</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    placeholder="กรอกรหัสผ่านใหม่"
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.9rem' }}>ยืนยันรหัสผ่านใหม่</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    placeholder="กรอกยืนยันรหัสผ่านใหม่"
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-secondary" style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', marginTop: '1rem', fontWeight: 700, backgroundColor: '#c19b6c', border: 'none', borderRadius: 'var(--radius-lg)' }}>
                  ยืนยันการเปลี่ยนรหัสผ่าน
                </button>

                <button 
                  type="button" 
                  className="btn btn-light" 
                  onClick={() => {
                    setForgotPasswordStep('contact');
                    setResetUsername('');
                    setResetEmail('');
                    setResetNewPassword('');
                    setResetConfirmPassword('');
                  }}
                  style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', marginTop: '0.25rem', fontWeight: 700, borderRadius: 'var(--radius-lg)', color: '#4A4036', backgroundColor: '#fcfcfc', border: '1px solid var(--border)' }}
                >
                  กลับไปหน้าล็อกอิน
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // แสดงหน้าโหลดระหว่างซิงค์ข้อมูลเริ่มต้นเฉพาะผู้ใช้ที่เข้าสู่ระบบแล้ว
  if (isSyncing) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#FEF8F1',
        fontFamily: 'var(--font-family)',
        gap: '1rem'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid rgba(193, 155, 108, 0.2)',
          borderTop: '4px solid #c19b6c',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <div style={{ fontWeight: 600, color: '#4A4036', fontSize: '1.1rem' }}>
          กำลังเชื่อมต่อและซิงค์ข้อมูลกับคลาวด์...
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="app-container">
      
      {/* 6. แถบเมนูด้านซ้าย */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={currentUser} 
        onLogout={handleLogout}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        clinicInfo={clinicInfo}
      />



      {/* 7. ส่วนแสดงเนื้อหา SPA ตามเมนูย่อย */}
      <div className="main-content" style={{ position: 'relative' }}>
        {/* ปุ่มรีเฟรชลอยและตัวแสดงสถานะคลาวด์ */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', marginBottom: '-1.5rem', zIndex: 999 }}>
          <style>{`
            @keyframes pulse {
              0% { opacity: 0.4; }
              50% { opacity: 1; }
              100% { opacity: 0.4; }
            }
          `}</style>
          {pendingSyncs.length === 0 ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.35rem 0.75rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              borderRadius: '20px',
              border: '1px solid #d4edda',
              backgroundColor: '#e2f0d9',
              color: '#155724',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#28a745' }} />
              ออนไลน์ (คลาวด์ปกติ)
            </div>
          ) : (
            <button
              onClick={() => processPendingSyncs()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.75rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                borderRadius: '20px',
                border: '1px solid #ffeeba',
                backgroundColor: '#fff3cd',
                color: '#856404',
                boxShadow: 'var(--shadow-sm)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              title="มีข้อมูลที่บันทึกในเครื่องแต่ยังไม่อัปโหลดขึ้นคลาวด์เนื่องจากเน็ตหลุด กดเพื่อซิงค์ใหม่"
            >
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ffc107', animation: 'pulse 1.5s infinite' }} />
              ค้างซิงค์ {pendingSyncs.length} รายการ (กดซิงค์ใหม่)
            </button>
          )}

          <button 
            className="btn btn-light" 
            onClick={() => window.location.reload()} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.25rem', 
              padding: '0.35rem 0.75rem', 
              fontSize: '0.8rem', 
              borderRadius: '20px', 
              border: '1px solid var(--border)', 
              backgroundColor: 'white',
              boxShadow: 'var(--shadow-sm)',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} /> รีเฟรชหน้าจอ (Refresh)
          </button>
        </div>
        
        <ErrorBoundary key={activeTab}>
          {activeTab === 'dashboard' && (
          <Dashboard 
            patients={patients} 
            appointments={appointments} 
            receipts={receipts} 
            therapists={therapists}
            onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
            currentUser={currentUser}
            holidays={holidays}
          />
        )}

        {activeTab === 'patients' && (
          <PatientRegister 
            patients={patients}
            setPatients={setPatients}
            currentUser={currentUser}
            onAddPatient={handleAddPatient}
            onUpdatePatient={handleUpdatePatient}
            onDeletePatient={handleDeletePatient}
            onPrintPatient={(hn) => {
              const p = patients.find(item => item.hn === hn);
              setPrintView({ show: true, type: 'patient', data: p });
            }}
            appointments={appointments}
            therapists={therapists}
          />
        )}

        {activeTab === 'appointments' && (
          <Appointments 
            patients={patients}
            appointments={appointments}
            setAppointments={setAppointments}
            therapists={therapists}
            holidays={holidays}
            onAddAppointment={handleAddAppointment}
            onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
            onDeleteAppointment={handleDeleteAppointment}
            onUpdateAppointment={handleUpdateAppointment}
            currentUser={currentUser}
            clinicInfo={clinicInfo}
          />
        )}

        {activeTab === 'assessments' && (
          <DevelopmentalAssessment 
            patients={patients}
            assessments={assessments}
            setAssessments={setAssessments}
            therapists={therapists}
            templates={assessmentTemplates}
            onAddAssessment={handleAddAssessment}
            onDeleteAssessment={handleDeleteAssessment}
            onPrintAssessment={(id) => {
              const a = assessments.find(item => item.id === id);
              setPrintView({ show: true, type: 'assessment', data: a });
            }}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'opd' && (
          <OPD 
            patients={patients}
            therapists={therapists}
            opdRecords={opdRecords}
            setOpdRecords={setOpdRecords}
            onPrintOPD={(type, data) => {
              setPrintView({ show: true, type, data });
            }}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'referrals' && ['Admin', 'OT'].includes(currentUser?.role) && (
          <ReferralLetter 
            patients={patients}
            therapists={therapists}
            referrals={referrals}
            setReferrals={setReferrals}
            onPrintReferral={(data) => {
              setPrintView({ show: true, type: 'referral', data });
            }}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'courses' && (
          <CourseBalance 
            patients={patients}
            appointments={appointments}
            receipts={receipts}
            therapists={therapists}
            rewards={rewards}
            currentUser={currentUser}
            onManualAddCourse={handleManualAddCourse}
            onTransferCourse={handleTransferCourse}
            onManualAdjustPoints={handleManualAdjustPoints}
            onTransferPoints={handleTransferPoints}
            onRedeemReward={handleRedeemReward}
            onDeleteManualPoints={handleDeleteManualPoints}
            onEditManualPoints={handleEditManualPoints}
          />
        )}

        {activeTab === 'pos' && (
          <ReceiptPOS 
            patients={patients}
            services={services}
            promotions={promotions}
            bankAccounts={bankAccounts}
            receipts={receipts}
            onSaveReceipt={handleSaveReceipt}
            // เชื่อมโยง State กลางสำหรับการแก้ไขบิลร่าง
            selectedHn={posSelectedHn}
            setSelectedHn={setPosSelectedHn}
            cart={posCart}
            setCart={setPosCart}
            discountType={posDiscountType}
            setDiscountType={setPosDiscountType}
            discountValue={posDiscountValue}
            setDiscountValue={setPosDiscountValue}
            discountReason={posDiscountReason}
            setDiscountReason={setPosDiscountReason}
            selectedPromoCode={posPromoCode}
            setSelectedPromoCode={setPosPromoCode}
            paymentMethod={posPaymentMethod}
            setPaymentMethod={setPosPaymentMethod}
            selectedBankId={posBankId}
            setSelectedBankId={setPosBankId}
            slipName={posSlipName}
            setSlipName={setPosSlipName}
            slipAttached={posSlipAttached}
            setSlipAttached={setPosSlipAttached}
            currentUser={currentUser}
            rewards={rewards}
          />
        )}

        {activeTab === 'history' && (
          <ReceiptHistory 
            patients={patients}
            receipts={receipts}
            setReceipts={setReceipts}
            services={services}
            bankAccounts={bankAccounts}
            onVoidReceipt={handleVoidReceipt}
            onEditDraftReceipt={handleEditDraftReceipt}
            onDeleteReceipt={handleDeleteReceipt}
            onPrintReceipt={(id) => {
              const r = receipts.find(item => item.id === id);
              setPrintView({ show: true, type: 'receipt', data: r });
            }}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'summaries' && ['Admin', 'OT'].includes(currentUser.role) && (
          <ServiceSummary 
            patients={patients}
            appointments={appointments}
            therapists={therapists}
            currentUser={currentUser}
          />
        )}


        {activeTab === 'transactions' && currentUser.role === 'Admin' && (
          <Transactions 
            transactions={transactions}
            setTransactions={setTransactions}
            receipts={receipts}
            payrolls={payrolls}
            patients={patients}
          />
        )}

        {activeTab === 'users' && currentUser.role === 'Admin' && (
          <Users 
            users={users}
            setUsers={setUsers}
            setPrintView={setPrintView}
          />
        )}

        {activeTab === 'salary' && ['Admin', 'OT', 'Staff'].includes(currentUser.role) && (
          <Salary 
            currentUser={currentUser}
            users={users}
            salaryRules={salaryRules}
            payrolls={payrolls}
            setPayrolls={setPayrolls}
            clinicInfo={clinicInfo}
            setPrintView={setPrintView}
          />
        )}

        {activeTab === 'assessmentSettings' && currentUser.role === 'Admin' && (
          <AssessmentSettings 
            templates={assessmentTemplates}
            setTemplates={setAssessmentTemplates}
            therapists={therapists}
          />
        )}

        {activeTab === 'salarySettings' && currentUser.role === 'Admin' && (
          <SalarySettings 
            salaryRules={salaryRules}
            setSalaryRules={setSalaryRules}
          />
        )}

        {activeTab === 'settings' && currentUser.role === 'Admin' && (
          <Settings 
            clinicInfo={clinicInfo}
            setClinicInfo={setClinicInfo}
            services={services}
            setServices={setServices}
            promotions={promotions}
            setPromotions={setPromotions}
            rewards={rewards}
            setRewards={setRewards}
            bankAccounts={bankAccounts}
            setBankAccounts={setBankAccounts}
            therapists={therapists}
            setTherapists={setTherapists}
            holidays={holidays}
            setHolidays={setHolidays}
            onPrintAnnualHolidays={(year, list) => {
              setPrintView({ show: true, type: 'holidays_annual', data: { year, list } });
            }}
            receipts={receipts}
          />
        )}

        {activeTab === 'profile' && (
          <UserProfile 
            currentUser={currentUser}
            onUpdateProfile={handleUpdateProfile}
            users={users}
          />
        )}
        </ErrorBoundary>

      </div>

      {/* 8. หน้าพรีวิวจัดพิมพ์ PDF แบบลอยครอบหน้าจอ (Print Overlay) */}
      {printView.show && (
        <PDFViewer 
          documentType={printView.type}
          documentData={printView.data}
          clinicInfo={clinicInfo}
          patients={patients}
          therapists={therapists}
          templates={assessmentTemplates}
          bankAccounts={bankAccounts}
          users={users}
          onClose={() => setPrintView({ show: false, type: 'receipt', data: null })}
        />
      )}

    </div>
  );
}
