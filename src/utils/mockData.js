// ข้อมูลจำลองตั้งต้นและโครงสร้างตารางระบบบริหารจัดการคลินิก Hug Dee Home (Production Baseline)

export const INITIAL_CLINIC_INFO = {
  name: "คลินิกกิจกรรมบำบัด ฮักดีโฮม (Hug Dee Home)",
  licenseNo: "บ.ป. 25690045",
  phone: "089-123-4567",
  email: "contact@hugdeehome.com",
  lineId: "@hugdeehome",
  address: "123/45 ถนนมิตรภาพ ต.ในเมือง อ.เมือง จ.ขอนแก่น 40000",
  logoUrl: "https://images.unsplash.com/photo-1594824813573-246434e33963?auto=format&fit=crop&w=150&h=150&q=80",
  stampUrl: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&w=120&h=120&q=80",
  receiptFooter: "ขอบคุณที่ไว้วางใจให้ Hug Dee Home ดูแลและพัฒนาทักษะชีวิตของบุตรหลานท่าน",
  folderId: "1A2B3C4D5E6F7G8H9I0J",
  folderUrl: "https://drive.google.com/drive/folders/1A2B3C4D5E6F7G8H9I0J"
};

export const INITIAL_USERS = [
  {
    username: "admin",
    password: "123",
    fullname: "ผู้ดูแลระบบ",
    role: "Admin",
    employeeId: "HDH001",
    employeeType: "พนักงานประจำ",
    title: "นาย",
    nickname: "แอดมิน",
    citizenId: "1234567890123",
    gender: "ชาย",
    dob: "1990-05-15",
    position: "ผู้ดูแลระบบสูงสุด",
    startDate: "2026-01-01",
    phone: "089-111-2222",
    email: "admin@hugdeehome.com",
    basicSalary: 25000,
    status: "Active",
    bankName: "กสิกรไทย",
    bankAccountNo: "123-4-56789-0",
    avatarUrl: ""
  }
];

export const INITIAL_THERAPISTS = [];

export const INITIAL_SERVICES = [
  {
    code: "SV01",
    name: "กิจกรรมบำบัดเดี่ยว (OT Session - 1 Hr)",
    description: "ฝึกกิจกรรมบำบัดรายบุคคลโดยนักกิจกรรมบำบัดวิชาชีพ",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    category: "บริการ",
    price: 800
  },
  {
    code: "SV02",
    name: "ประเมินพัฒนาการกิจกรรมบำบัด (Evaluation)",
    description: "ประเมินพัฒนาการและเขียนรายงานทางกิจกรรมบำบัด",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    category: "บริการ",
    price: 1200
  }
];

export const INITIAL_PROMOTIONS = [];
export const INITIAL_BANK_ACCOUNTS = [];

export const INITIAL_HOLIDAYS = [
  { date: "2026-01-01", name: "วันขึ้นปีใหม่", type: "วันหยุดคลินิก" },
  { date: "2026-04-13", name: "วันสงกรานต์", type: "วันหยุดคลินิก" },
  { date: "2026-04-14", name: "วันสงกรานต์", type: "วันหยุดคลินิก" },
  { date: "2026-04-15", name: "วันสงกรานต์", type: "วันหยุดคลินิก" },
  { date: "2026-05-01", name: "วันแรงงานแห่งชาติ", type: "วันหยุดคลินิก" },
  { date: "2026-06-03", name: "วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี", type: "วันหยุดคลินิก" }
];

export const INITIAL_PATIENTS = [];
export const INITIAL_RECEIPTS = [];
export const INITIAL_APPOINTMENTS = [];
export const INITIAL_ASSESSMENTS = [];

export const INITIAL_SALARY_RULES = {
  earnings: [
    { id: "earn-ot", name: "ล่วงเวลา (OT)", type: "คงที่", value: 46.88 },
    { id: "earn-case-gt1", name: "ค่าเคส (>1 เคส)", type: "คงที่", value: 250 },
    { id: "earn-case-lte1", name: "ค่าเคส (<=1 เคส)", type: "คงที่", value: 350 }
  ],
  deductions: [
    { id: "ded-ss", name: "ประกันสังคม (SS)", type: "เปอร์เซ็นต์ (%)", value: 5, maxLimit: 875 },
    { id: "ded-tax", name: "ภาษี (Tax)", type: "เปอร์เซ็นต์ (%)", value: 3, maxLimit: null }
  ]
};

export const INITIAL_PAYROLLS = [];
export const INITIAL_TRANSACTIONS = [];
export const INITIAL_OPD_RECORDS = [];
