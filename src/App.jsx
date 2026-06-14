import { useState, useEffect } from 'react';
import { initDatabase, db, syncFromSupabase, syncToSupabase } from './utils/db';
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
import GuestRegister from './components/GuestRegister';
import UserProfile from './components/UserProfile';
import ErrorBoundary from './components/ErrorBoundary';
import { RefreshCw } from 'lucide-react';
import Swal from 'sweetalert2';

export default function App() {
  const [isSyncing, setIsSyncing] = useState(true);

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

  // 1. ตรวจสอบการรันระบบครั้งแรก และซิงค์ข้อมูลจาก Supabase (ถ้ามีการตั้งค่าไว้)
  useEffect(() => {
    const runInitialSync = async () => {
      initDatabase();
      const gasUrl = localStorage.getItem('hdh_gas_url') || import.meta.env.VITE_GAS_URL || 'https://script.google.com/macros/s/AKfycbw9t-DSskCxgPWNkR8bkOWabLgpSGuF6EqBRrM46rE-T2I9krkV1hz5Ao-d_WVQQ15Ueg/exec';
      
      const handleSyncFailurePrompt = (currentGasUrl, errorMsg) => {
        Swal.fire({
          icon: 'error',
          title: 'ซิงค์ข้อมูลล้มเหลว',
          text: errorMsg || 'ไม่สามารถดึงข้อมูลเริ่มต้นจากระบบคลาวด์ได้ โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ตหรือ URL',
          showCancelButton: true,
          confirmButtonText: 'ลองซิงค์ใหม่',
          cancelButtonText: 'ระบุ GAS URL ใหม่',
          confirmButtonColor: 'var(--secondary)',
          cancelButtonColor: '#b0895a',
          allowOutsideClick: false
        }).then((result) => {
          if (result.dismiss === Swal.DismissReason.cancel) {
            Swal.fire({
              title: 'ระบุ Google Apps Script Web App URL',
              input: 'text',
              inputValue: currentGasUrl || '',
              inputPlaceholder: 'https://script.google.com/macros/s/.../exec',
              showCancelButton: true,
              confirmButtonText: 'บันทึกและซิงค์ใหม่',
              cancelButtonText: 'ยกเลิก',
              confirmButtonColor: '#b0895a',
              allowOutsideClick: false,
              inputValidator: (value) => {
                if (!value) {
                  return 'กรุณาระบุ URL';
                }
                if (!value.trim().startsWith('https://script.google.com/')) {
                  return 'รูปแบบ URL ไม่ถูกต้อง (ต้องขึ้นต้นด้วย https://script.google.com/)';
                }
              }
            }).then((inputResult) => {
              if (inputResult.isConfirmed) {
                localStorage.setItem('hdh_gas_url', inputResult.value.trim());
                window.location.reload();
              }
            });
          } else if (result.isConfirmed) {
            window.location.reload();
          }
        });
      };

      if (gasUrl) {
        // เช็คว่าเป็นครั้งแรกที่มีข้อมูลไหม (ถ้าไม่มีข้อมูลเลย ให้บล็อกเพื่อรอซิงค์ครั้งแรก)
        const isFirstRun = db.getPatients().length === 0 && db.getReceipts().length === 0;
        
        if (isFirstRun) {
          Swal.fire({
            title: 'กำลังซิงค์ข้อมูล...',
            text: 'กำลังโหลดข้อมูลล่าสุดจากระบบคลาวด์เป็นครั้งแรก',
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
        
        try {
          const defaultUrl = 'https://script.google.com/macros/s/AKfycbw9t-DSskCxgPWNkR8bkOWabLgpSGuF6EqBRrM46rE-T2I9krkV1hz5Ao-d_WVQQ15Ueg/exec';
          const localUrl = localStorage.getItem('hdh_gas_url');
          
          let success = await syncFromSupabase();
          
          // หากใช้ URL ในเครื่องแล้วล้มเหลว แต่ URL ดังกล่าวไม่ใช่ค่าเริ่มต้น ให้ลองทดสอบซิงค์ด้วยลิงก์เริ่มต้นระบบดู
          if (!success && localUrl && localUrl !== defaultUrl) {
            console.log('Sync failed with localUrl, trying silent fallback to defaultUrl...');
            success = await syncFromSupabase(defaultUrl);
            if (success) {
              // หากการซิงค์ด้วย defaultUrl สำเร็จ ให้ทำการเขียนทับบันทึกความจำเครื่องเป็น defaultUrl ทันทีเพื่อความลื่นไหลในครั้งต่อไป
              localStorage.setItem('hdh_gas_url', defaultUrl);
            }
          }

          if (success) {
            // โหลดสเตทใหม่จาก LocalStorage ทันที
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
            const activeGasUrl = localStorage.getItem('hdh_gas_url') || defaultUrl;
            if (isFirstRun) {
              handleSyncFailurePrompt(activeGasUrl, 'ไม่สามารถดึงข้อมูลเริ่มต้นจากระบบคลาวด์ได้ โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ตหรือ URL');
            } else {
              Swal.fire({
                icon: 'warning',
                title: 'ซิงค์ข้อมูลล้มเหลว',
                text: 'ไม่สามารถซิงค์ข้อมูลล่าสุดได้ กำลังใช้งานข้อมูลภายในเครื่องชั่วคราว',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3500
              });
            }
          }
        } catch (e) {
          console.error('Initial sync error:', e);
          const defaultUrl = 'https://script.google.com/macros/s/AKfycbw9t-DSskCxgPWNkR8bkOWabLgpSGuF6EqBRrM46rE-T2I9krkV1hz5Ao-d_WVQQ15Ueg/exec';
          const activeGasUrl = localStorage.getItem('hdh_gas_url') || defaultUrl;
          if (isFirstRun) {
            handleSyncFailurePrompt(activeGasUrl, 'เกิดความล้มเหลวในการเชื่อมต่อ: ' + e.message);
          }
        }
        
        setTimeout(() => {
          setIsSyncing(false);
        }, 1000);
      } else {
        // ถ้าไม่มี gasUrl และไม่มีข้อมูลในเครื่องเลย (First Run ของเครื่องใหม่ที่ยังไม่ได้ตั้งค่าอะไรเลย)
        const isFirstRun = db.getPatients().length === 0 && db.getReceipts().length === 0;
        if (isFirstRun) {
          Swal.fire({
            icon: 'info',
            title: 'ต้องการการตั้งค่าเริ่มต้น',
            text: 'ไม่พบ URL เชื่อมต่อระบบคลาวด์ (Google Apps Script) กรุณาระบุเพื่อเริ่มต้นใช้งาน',
            confirmButtonText: 'ระบุ GAS URL',
            confirmButtonColor: '#b0895a',
            allowOutsideClick: false
          }).then((result) => {
            if (result.isConfirmed) {
              Swal.fire({
                title: 'ระบุ Google Apps Script Web App URL',
                input: 'text',
                inputPlaceholder: 'https://script.google.com/macros/s/.../exec',
                showCancelButton: false,
                confirmButtonText: 'บันทึกและซิงค์',
                confirmButtonColor: '#b0895a',
                allowOutsideClick: false,
                inputValidator: (value) => {
                  if (!value) {
                    return 'กรุณาระบุ URL';
                  }
                  if (!value.trim().startsWith('https://script.google.com/')) {
                    return 'รูปแบบ URL ไม่ถูกต้อง (ต้องขึ้นต้นด้วย https://script.google.com/)';
                  }
                }
              }).then((inputResult) => {
                if (inputResult.isConfirmed) {
                  localStorage.setItem('hdh_gas_url', inputResult.value.trim());
                  window.location.reload();
                }
              });
            }
          });
        } else {
          setIsSyncing(false);
        }
      }
    };
    runInitialSync();
  }, []);

  const syncData = async (key, value) => {
    if (isSyncing) return;
    const success = await syncToSupabase(key, value);
    if (!success) {
      console.warn(`[Sync Failed] Key: ${key}`);
      Swal.fire({
        icon: 'warning',
        title: 'การเชื่อมต่อคลาวด์ล้มเหลว',
        text: 'ระบบได้บันทึกข้อมูลไว้ในคอมพิวเตอร์เครื่องนี้แล้ว แต่ไม่สามารถอัปเดตไปยัง Google Sheets ได้ชั่วคราว (โปรดตรวจสอบอินเทอร์เน็ตหรือปิดตัวบล็อกโฆษณา)',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 5000
      });
    }
  };

  // บันทึก State ลง LocalStorage และ Supabase เมื่อมีค่าเปลี่ยนแปลง
  useEffect(() => { 
    db.setClinicInfo(clinicInfo); 
    syncData('hdh_clinic_info', clinicInfo);
  }, [clinicInfo]);

  useEffect(() => { 
    db.setUsers(users); 
    syncData('hdh_users', users);
  }, [users]);

  useEffect(() => { 
    db.setTherapists(therapists); 
    syncData('hdh_therapists', therapists);
  }, [therapists]);

  useEffect(() => { 
    db.setServices(services); 
    syncData('hdh_services', services);
  }, [services]);

  useEffect(() => { 
    db.setPromotions(promotions); 
    syncData('hdh_promotions', promotions);
  }, [promotions]);

  useEffect(() => { 
    db.setBankAccounts(bankAccounts); 
    syncData('hdh_bank_accounts', bankAccounts);
  }, [bankAccounts]);

  useEffect(() => { 
    db.setHolidays(holidays); 
    syncData('hdh_holidays', holidays);
  }, [holidays]);

  useEffect(() => { 
    db.setPatients(patients); 
    syncData('hdh_patients', patients);
  }, [patients]);

  useEffect(() => { 
    db.setAppointments(appointments); 
    syncData('hdh_appointments', appointments);
  }, [appointments]);

  useEffect(() => { 
    db.setReceipts(receipts); 
    syncData('hdh_receipts', receipts);
  }, [receipts]);

  useEffect(() => { 
    db.setAssessments(assessments); 
    syncData('hdh_assessments', assessments);
  }, [assessments]);

  useEffect(() => { 
    db.setSalaryRules(salaryRules); 
    syncData('hdh_salary_rules', salaryRules);
  }, [salaryRules]);

  useEffect(() => { 
    db.setPayrolls(payrolls); 
    syncData('hdh_payrolls', payrolls);
  }, [payrolls]);

  useEffect(() => { 
    db.setTransactions(transactions); 
    syncData('hdh_transactions', transactions);
  }, [transactions]);

  useEffect(() => { 
    db.setOpdRecords(opdRecords); 
    syncData('hdh_opd_records', opdRecords);
  }, [opdRecords]);

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

  const handleLogin = (e) => {
    e.preventDefault();
    let found = null;
    
    // ดึงค่าแอดมินหลักจาก localStorage (เผื่อมีการแก้ไข Username/Password)
    const adminOverride = localStorage.getItem('hdh_admin_override');
    const parsedOverride = adminOverride ? JSON.parse(adminOverride) : null;
    const adminUsername = parsedOverride ? parsedOverride.username : 'admin';
    const adminPassword = parsedOverride ? parsedOverride.password : 'admin0100';
    
    // หากเข้าสู่ระบบด้วย admin/admin0100 ให้รีเซ็ตรหัสผ่านแอดมินกลับมาและเข้าสู่ระบบทันทีเพื่อป้องกันปัญหารหัสค้างหรือ override ผิดพลาด
    if (loginUsername === 'admin' && loginPassword === 'admin0100') {
      if (adminOverride) {
        try {
          const parsed = JSON.parse(adminOverride);
          parsed.password = 'admin0100';
          localStorage.setItem('hdh_admin_override', JSON.stringify(parsed));
        } catch (err) {
          localStorage.removeItem('hdh_admin_override');
        }
      }
      
      const latestOverride = localStorage.getItem('hdh_admin_override');
      found = latestOverride ? JSON.parse(latestOverride) : {
        username: 'admin',
        fullname: 'ผู้ดูแลระบบหลัก',
        role: 'Admin',
        employeeId: 'HDH001',
        status: 'Active',
        avatarUrl: ''
      };
    } else if (loginUsername === adminUsername && loginPassword === adminPassword) {
      found = parsedOverride || {
        username: 'admin',
        fullname: 'ผู้ดูแลระบบหลัก',
        role: 'Admin',
        employeeId: 'HDH001',
        status: 'Active',
        avatarUrl: ''
      };
    } else {
      found = users.find(u => u.username === loginUsername && u.password === loginPassword);
    }

    if (found) {
      setCurrentUser(found);
      localStorage.setItem('hdh_logged_in_user', JSON.stringify(found));
      Swal.fire({
        icon: 'success',
        title: 'ยินดีต้อนรับกลับมา!',
        text: `ล็อกอินสำเร็จในบทบาท ${found.role}`,
        timer: 1500,
        showConfirmButton: false
      });
      setActiveTab('dashboard');
    } else {
      Swal.fire({
        icon: 'error',
        title: 'ล็อกอินล้มเหลว',
        text: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง!',
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

  const handleLogout = () => {
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

  const handleVoidReceipt = (id) => {
    // ปรับสถานะเป็น "ยกเลิก"
    setReceipts(receipts.map(r => r.id === id ? { ...r, status: 'ยกเลิก' } : r));
  };

  const handleDeleteReceipt = (id) => {
    setReceipts(receipts.filter(r => r.id !== id));
  };

  const handleEditDraftReceipt = (receipt) => {
    // 1. ดึงรายละเอียดเข้าตะกร้า POS ใน State กลาง
    setPosSelectedHn(receipt.hn);
    setPosCart(receipt.items.map(item => {
      // ดึงรายละเอียดราคาและหมวดหมู่อ้างอิงกลับมา
      const orig = services.find(s => s.code === item.code);
      return {
        code: item.code,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        category: item.type || (orig ? orig.category : 'บริการ')
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
    const today = new Date('2026-06-05');
    const beYear = today.getFullYear() + 543;
    const yearSuffix = beYear.toString().slice(-2);
    
    // สร้างรหัสบิลแบบกำหนดปรับปรุง
    const billId = `M${yearSuffix}` + Math.floor(1000 + Math.random() * 9000);

    const manualReceipt = {
      id: billId,
      hn: hn,
      date: '2026-06-05',
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
    const today = new Date('2026-06-05');
    const beYear = today.getFullYear() + 543;
    const yearSuffix = beYear.toString().slice(-2);
    const suffixRnd = Math.floor(1000 + Math.random() * 9000);
    
    const transferor = patients.find(p => p.hn === transferorHn);
    const transferee = patients.find(p => p.hn === transfereeHn);

    const billId1 = `TR${yearSuffix}A${suffixRnd}`;
    const billId2 = `TR${yearSuffix}B${suffixRnd}`;

    // ใบที่ 1: บิลหักยอดของครึ่งทางผู้โอน
    const receipt1 = {
      id: billId1,
      hn: transferorHn,
      date: '2026-06-05',
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
      date: '2026-06-05',
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
        {/* ปุ่มรีเฟรชลอยสำหรับทุกหน้าจอ */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-1.5rem', zIndex: 999 }}>
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
          />
        )}

        {activeTab === 'assessments' && (
          <DevelopmentalAssessment 
            patients={patients}
            assessments={assessments}
            setAssessments={setAssessments}
            therapists={therapists}
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

        {activeTab === 'courses' && (
          <CourseBalance 
            patients={patients}
            appointments={appointments}
            receipts={receipts}
            therapists={therapists}
            onManualAddCourse={handleManualAddCourse}
            onTransferCourse={handleTransferCourse}
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
          bankAccounts={bankAccounts}
          users={users}
          onClose={() => setPrintView({ show: false, type: 'receipt', data: null })}
        />
      )}

    </div>
  );
}
