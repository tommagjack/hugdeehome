import { useState, useEffect } from 'react';
import { initDatabase, db } from './utils/db';
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
import Swal from 'sweetalert2';

export default function App() {
  // 1. ตรวจสอบการรันระบบครั้งแรก (โหลดข้อมูลตัวอย่างลง LocalStorage)
  useEffect(() => {
    initDatabase();
  }, []);

  // 2. โหลดข้อมูลจาก LocalStorage เข้า State หลักของ React SPA
  const [clinicInfo, setClinicInfo] = useState(() => db.getClinicInfo());
  const [users, setUsers] = useState(() => db.getUsers());
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

  // บันทึก State ลง LocalStorage เมื่อมีค่าเปลี่ยนแปลง
  useEffect(() => { db.setClinicInfo(clinicInfo); }, [clinicInfo]);
  useEffect(() => { db.setUsers(users); }, [users]);
  useEffect(() => { db.setTherapists(therapists); }, [therapists]);
  useEffect(() => { db.setServices(services); }, [services]);
  useEffect(() => { db.setPromotions(promotions); }, [promotions]);
  useEffect(() => { db.setBankAccounts(bankAccounts); }, [bankAccounts]);
  useEffect(() => { db.setHolidays(holidays); }, [holidays]);
  useEffect(() => { db.setPatients(patients); }, [patients]);
  useEffect(() => { db.setAppointments(appointments); }, [appointments]);
  useEffect(() => { db.setReceipts(receipts); }, [receipts]);
  useEffect(() => { db.setAssessments(assessments); }, [assessments]);
  useEffect(() => { db.setSalaryRules(salaryRules); }, [salaryRules]);
  useEffect(() => { db.setPayrolls(payrolls); }, [payrolls]);
  useEffect(() => { db.setTransactions(transactions); }, [transactions]);
  useEffect(() => { db.setOpdRecords(opdRecords); }, [opdRecords]);

  // 3. จัดการเรื่องหน้าเข้าใช้งาน / ล็อกอิน
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('hdh_logged_in_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    const found = users.find(u => u.username === loginUsername && u.password === loginPassword);
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
        text: 'ชื่อผู้ใช้หรือรหัสผ่านจำลองไม่ถูกต้อง!',
        confirmButtonColor: 'var(--secondary)'
      });
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
      <div className="login-container">
        <div className="card-3xl login-card">
          {(() => {
            const matchedUser = users.find(u => u.username === loginUsername);
            if (matchedUser && matchedUser.avatarUrl) {
              return (
                <div className="login-logo" style={{ overflow: 'hidden', padding: 0 }}>
                  <img src={matchedUser.avatarUrl} alt="user profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              );
            }
            return <div className="login-logo">ฮดี</div>;
          })()}
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.25rem' }}>Hug Dee Home</h1>
          <div className="login-subtitle">ระบบบริหารจัดการคลินิกกิจกรรมบำบัดครบวงจร</div>
          
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
          </form>
        </div>
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
      <div className="main-content">
        
        {activeTab === 'dashboard' && (
          <Dashboard 
            patients={patients} 
            appointments={appointments} 
            receipts={receipts} 
            therapists={therapists}
            onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
          />
        )}

        {activeTab === 'patients' && (
          <PatientRegister 
            patients={patients}
            onAddPatient={handleAddPatient}
            onUpdatePatient={handleUpdatePatient}
            onDeletePatient={handleDeletePatient}
            onPrintPatient={(hn) => {
              const p = patients.find(item => item.hn === hn);
              setPrintView({ show: true, type: 'patient', data: p });
            }}
          />
        )}

        {activeTab === 'appointments' && (
          <Appointments 
            patients={patients}
            appointments={appointments}
            therapists={therapists}
            holidays={holidays}
            onAddAppointment={handleAddAppointment}
            onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
            onDeleteAppointment={handleDeleteAppointment}
            onUpdateAppointment={handleUpdateAppointment}
          />
        )}

        {activeTab === 'assessments' && (
          <DevelopmentalAssessment 
            patients={patients}
            assessments={assessments}
            therapists={therapists}
            onAddAssessment={handleAddAssessment}
            onDeleteAssessment={handleDeleteAssessment}
            onPrintAssessment={(id) => {
              const a = assessments.find(item => item.id === id);
              setPrintView({ show: true, type: 'assessment', data: a });
            }}
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
          />
        )}

        {activeTab === 'courses' && (
          <CourseBalance 
            patients={patients}
            appointments={appointments}
            receipts={receipts}
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
            onVoidReceipt={handleVoidReceipt}
            onEditDraftReceipt={handleEditDraftReceipt}
            onPrintReceipt={(id) => {
              const r = receipts.find(item => item.id === id);
              setPrintView({ show: true, type: 'receipt', data: r });
            }}
          />
        )}

        {activeTab === 'summaries' && currentUser.role === 'Admin' && (
          <ServiceSummary 
            patients={patients}
            appointments={appointments}
            therapists={therapists}
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
          />
        )}

      </div>

      {/* 8. หน้าพรีวิวจัดพิมพ์ PDF แบบลอยครอบหน้าจอ (Print Overlay) */}
      {printView.show && (
        <PDFViewer 
          documentType={printView.type}
          documentData={printView.data}
          clinicInfo={clinicInfo}
          patients={patients}
          therapists={therapists}
          onClose={() => setPrintView({ show: false, type: 'receipt', data: null })}
        />
      )}

    </div>
  );
}
