// ข้อมูลจำลองตั้งต้นสำหรับระบบบริหารจัดการคลินิก Hug Dee Home

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
    fullname: "พลัฏฐ์ กิตติรวรพงษ์",
    role: "Admin",
    employeeId: "HDH001",
    employeeType: "พนักงานประจำ",
    title: "นาย",
    nickname: "บอส",
    citizenId: "1234567890123",
    gender: "ชาย",
    dob: "1990-05-15",
    position: "ผู้ดูแลระบบสูงสุด",
    startDate: "2026-01-01",
    phone: "089-111-2222",
    email: "boss@hugdeehome.com",
    basicSalary: 25000,
    status: "Active",
    bankName: "กสิกรไทย",
    bankAccountNo: "123-4-56789-0",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80"
  },
  {
    username: "staff_oil",
    password: "123",
    fullname: "รัตติยากร งานดี",
    role: "Staff",
    employeeId: "HDH002",
    employeeType: "พนักงานประจำ",
    title: "นางสาว",
    nickname: "ออย",
    citizenId: "9876543210987",
    gender: "หญิง",
    dob: "1995-10-20",
    position: "ธุรการคลินิก",
    startDate: "2026-01-01",
    phone: "081-234-5678",
    email: "oil@hugdeehome.com",
    basicSalary: 7500,
    status: "Active",
    bankName: "ไทยพาณิชย์",
    bankAccountNo: "987-6-54321-0",
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80"
  },
  {
    username: "ot_fon",
    password: "123",
    fullname: "ฝนทิพย์ คงบุญแก้ว",
    role: "OT",
    employeeId: "HDH003",
    employeeType: "นักบำบัดอิสระ (Freelance)",
    title: "นางสาว",
    nickname: "ฝน",
    citizenId: "1112223334445",
    gender: "หญิง",
    dob: "1996-08-12",
    position: "นักกิจกรรมบำบัด",
    startDate: "2026-02-01",
    phone: "086-555-4433",
    email: "fon@hugdeehome.com",
    basicSalary: 0,
    status: "Active",
    bankName: "กรุงไทย",
    bankAccountNo: "555-5-55555-5",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150&q=80"
  },
  {
    username: "ot_pin",
    password: "123",
    fullname: "ปวิตรา ผ่องสวัสดิ์กุล",
    role: "OT",
    employeeId: "HDH004",
    employeeType: "นักบำบัดอิสระ (Freelance)",
    title: "นางสาว",
    nickname: "ปิ่น",
    citizenId: "5556667778889",
    gender: "หญิง",
    dob: "1994-03-25",
    position: "นักกิจกรรมบำบัด",
    startDate: "2026-01-01",
    phone: "089-876-5432",
    email: "pin@hugdeehome.com",
    basicSalary: 0,
    status: "Active",
    bankName: "กสิกรไทย",
    bankAccountNo: "111-2-33333-4",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80"
  }
];

export const INITIAL_THERAPISTS = [
  {
    id: "T1",
    nickname: "ครูปิ่น",
    fullname: "ปิ่นมณี แก้วใส",
    licenseNo: "ก.บ. 60102",
    workDays: ["Monday", "Tuesday", "Thursday", "Friday"],
    workHours: {
      Monday: ["09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", "13:00 - 14:00", "14:00 - 15:00", "15:00 - 16:00"],
      Tuesday: ["09:00 - 10:00", "10:00 - 11:00", "13:00 - 14:00", "14:00 - 15:00", "15:00 - 16:00"],
      Thursday: ["10:00 - 11:00", "11:00 - 12:00", "13:00 - 14:00", "14:00 - 15:00", "15:00 - 16:00"],
      Friday: ["09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", "14:00 - 15:00", "15:00 - 16:00"]
    }
  },
  {
    id: "T2",
    nickname: "ครูบาส",
    fullname: "ปกรณ์ กิ่งโพธิ์",
    licenseNo: "ก.บ. 60103",
    workDays: ["Monday", "Wednesday", "Thursday", "Saturday"],
    workHours: {
      Monday: ["09:00 - 10:00", "10:00 - 11:00", "13:00 - 14:00", "14:00 - 15:00"],
      Wednesday: ["09:00 - 10:00", "10:00 - 11:00", "13:00 - 14:00", "14:00 - 15:00", "15:00 - 16:00", "16:00 - 17:00"],
      Thursday: ["09:00 - 10:00", "10:00 - 11:00", "13:00 - 14:00", "14:00 - 15:00"],
      Saturday: ["09:00 - 10:00", "10:00 - 11:00", "13:00 - 14:00", "14:00 - 15:00", "15:00 - 16:00", "16:00 - 17:00"]
    }
  },
  {
    id: "T3",
    nickname: "ครูนก",
    fullname: "นภัสสร อ่อนหวาน",
    licenseNo: "ก.บ. 60205",
    workDays: ["Friday", "Saturday", "Sunday"],
    workHours: {
      Friday: ["09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", "13:00 - 14:00"],
      Saturday: ["13:00 - 14:00", "14:00 - 15:00", "15:00 - 16:00"],
      Sunday: ["09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", "13:00 - 14:00", "14:00 - 15:00", "15:00 - 16:00"]
    }
  }
];

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
  },
  {
    code: "SV03",
    name: "แพ็กเกจคอร์สกิจกรรมบำบัด 10 ครั้ง",
    description: "คอร์สบำบัดรักษา 10 ชั่วโมง แถมฟรี 1 ชั่วโมง",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    category: "บริการ",
    price: 7500
  },
  {
    code: "PD01",
    name: "ดินน้ำมันปลอดสารพิษ (Therapy Putty)",
    description: "ดินน้ำมันสำหรับบริหารกล้ามเนื้อมือและนิ้วมือ",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    category: "สินค้า",
    price: 350
  }
];

export const INITIAL_PROMOTIONS = [
  {
    code: "PM-WELCOME",
    name: "ส่วนลดลูกค้าใหม่แรกเข้า",
    description: "ส่วนลด 200 บาทสำหรับบริการครั้งแรก",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    maxUses: 100,
    type: "flat",
    value: 200
  },
  {
    code: "PM-SUMMER",
    name: "โปรต้อนรับซัมเมอร์ ลด 5%",
    description: "ลดราคา 5% สำหรับทุกบริการและสินค้า",
    startDate: "2026-03-01",
    endDate: "2026-08-31",
    maxUses: 200,
    type: "percentage",
    value: 5
  }
];

export const INITIAL_BANK_ACCOUNTS = [
  { id: "B1", bankName: "กสิกรไทย", accountNo: "123-4-56789-0", accountName: "บจก. ฮักดีโฮม เฮลท์แคร์" },
  { id: "B2", bankName: "ไทยพาณิชย์", accountNo: "987-6-54321-0", accountName: "บจก. ฮักดีโฮม เฮลท์แคร์" },
  { id: "B3", bankName: "กรุงไทย", accountNo: "555-5-55555-5", accountName: "บจก. ฮักดีโฮม เฮลท์แคร์" }
];

export const INITIAL_HOLIDAYS = [
  { date: "2026-01-01", name: "วันขึ้นปีใหม่", type: "วันหยุดคลินิก" },
  { date: "2026-04-13", name: "วันสงกรานต์", type: "วันหยุดคลินิก" },
  { date: "2026-04-14", name: "วันสงกรานต์", type: "วันหยุดคลินิก" },
  { date: "2026-04-15", name: "วันสงกรานต์", type: "วันหยุดคลินิก" },
  { date: "2026-05-01", name: "วันแรงงานแห่งชาติ", type: "วันหยุดคลินิก" },
  { date: "2026-06-03", name: "วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี", type: "วันหยุดคลินิก" }
];

// สมมติปี 2569 คือ 2026 ค.ศ.
export const INITIAL_PATIENTS = [
  {
    hn: "69001",
    status: "Active",
    gender: "ชาย",
    title: "เด็กชาย",
    firstname: "สมชาย",
    lastname: "ใจดี",
    nickname: "บี",
    dob: "2020-04-12", // 6 ปี ณ มิถุนายน 2026
    guardian: "นายประเสริษ ใจดี",
    phone: "0812345678",
    allergies: "มี",
    allergiesDetails: "ยาปฏิชีวนะกลุ่มเพนิซิลลิน",
    conditions: "ไม่มี",
    conditionsDetails: "",
    channels: ["Facebook", "เพื่อนแนะนำ"],
    channelsOtherDetails: "",
    worries: "สมาธิสั้น ซน ไม่นิ่ง พูดแทรกตลอดเวลา",
    created_at: "2026-01-10T10:00:00Z"
  },
  {
    hn: "69002",
    status: "Active",
    gender: "หญิง",
    title: "เด็กหญิง",
    firstname: "พัชรา",
    lastname: "สร้อยสุวรรณ",
    nickname: "เอมี่",
    dob: "2021-08-25", // 4 ปี 9 เดือน ณ มิถุนายน 2026
    guardian: "นางมารศรี สร้อยสุวรรณ",
    phone: "0898765432",
    allergies: "ปฏิเสธการแพ้ยา",
    allergiesDetails: "",
    conditions: "มี",
    conditionsDetails: "โรคภูมิแพ้อากาศ",
    channels: ["Line"],
    channelsOtherDetails: "",
    worries: "กล้ามเนื้อมืออ่อนแรง เขียนหนังสือช้ามาก และขี้อายมาก",
    created_at: "2026-02-15T09:30:00Z"
  },
  {
    hn: "69003",
    status: "Active",
    gender: "ชาย",
    title: "เด็กชาย",
    firstname: "ปกรณ์",
    lastname: "ดีสมใจ",
    nickname: "กาย",
    dob: "2018-11-05", // 7 ปี 7 เดือน ณ มิถุนายน 2026
    guardian: "นายเอกชัย ดีสมใจ",
    phone: "0865554433",
    allergies: "ปฏิเสธการแพ้ยา",
    allergiesDetails: "",
    conditions: "ไม่มี",
    conditionsDetails: "",
    channels: ["คลินิกเด็ก", "อื่นๆ"],
    channelsOtherDetails: "ส่งตัวจากโรงพยาบาลศูนย์",
    worries: "พูดช้า ภาษาไม่สบตา มีพฤติกรรมหมุนตัวและทำซ้ำๆ",
    created_at: "2026-03-20T14:20:00Z"
  },
  {
    hn: "69004",
    status: "Inactive",
    gender: "หญิง",
    title: "เด็กหญิง",
    firstname: "มนัสชนก",
    lastname: "ศรีสะอาด",
    nickname: "ครีม",
    dob: "2022-01-15", // 4 ปี 4 เดือน ณ มิถุนายน 2026
    guardian: "นางสาวศิริพร ศรีสะอาด",
    phone: "0841112222",
    allergies: "ปฏิเสธการแพ้ยา",
    allergiesDetails: "",
    conditions: "ไม่มี",
    conditionsDetails: "",
    channels: ["Walk-in"],
    channelsOtherDetails: "",
    worries: "ไม่ชอบสัมผัสทราย ไม่ชอบเสียงดัง ทรงตัวไม่ค่อยดี",
    created_at: "2026-04-05T11:15:00Z"
  }
];

export const INITIAL_RECEIPTS = [
  // บิลที่ชำระเงินแล้ว เพิ่มคอร์ส
  {
    id: "HDR690001",
    hn: "69001",
    date: "2026-05-10",
    items: [
      { code: "SV03", name: "แพ็กเกจคอร์สกิจกรรมบำบัด 10 ครั้ง", price: 7500, quantity: 1, type: "บริการ" }
    ],
    discountType: "flat",
    discountValue: 200,
    discountReason: "ส่วนลดต้อนรับแรกเข้า (คูปอง PM-WELCOME)",
    promotionId: "PM-WELCOME",
    paymentMethod: "โอนเงิน",
    bankAccountId: "B1",
    slipUrl: "temp_slip_url",
    status: "ชำระเงินแล้ว",
    totalAmount: 7300,
    created_at: "2026-05-10T10:15:00Z",
    createdBy: "พนักงาน อัญชลี"
  },
  {
    id: "HDR690002",
    hn: "69002",
    date: "2026-05-12",
    items: [
      { code: "SV01", name: "กิจกรรมบำบัดเดี่ยว (OT Session - 1 Hr)", price: 800, quantity: 5, type: "บริการ" }
    ],
    discountType: "percentage",
    discountValue: 5,
    discountReason: "โปรต้อนรับซัมเมอร์ ลด 5% (PM-SUMMER)",
    promotionId: "PM-SUMMER",
    paymentMethod: "เงินสด",
    bankAccountId: "",
    slipUrl: "",
    status: "ชำระเงินแล้ว",
    totalAmount: 3800, // (800 * 5) = 4000 - 5% = 3800
    created_at: "2026-05-12T11:00:00Z",
    createdBy: "พนักงาน อัญชลี"
  },
  // บิลร่าง รอชำระเงิน
  {
    id: "HDR690003",
    hn: "69003",
    date: "2026-06-05",
    items: [
      { code: "SV01", name: "กิจกรรมบำบัดเดี่ยว (OT Session - 1 Hr)", price: 800, quantity: 2, type: "บริการ" },
      { code: "PD01", name: "ดินน้ำมันปลอดสารพิษ (Therapy Putty)", price: 350, quantity: 1, type: "สินค้า" }
    ],
    discountType: "flat",
    discountValue: 0,
    discountReason: "",
    promotionId: "",
    paymentMethod: "เงินสด",
    bankAccountId: "",
    slipUrl: "",
    status: "รอชำระเงิน",
    totalAmount: 1950,
    created_at: "2026-06-05T09:00:00Z",
    createdBy: "พนักงาน อัญชลี"
  },
  // บิลที่ถูกยกเลิก (Voided)
  {
    id: "HDR690004",
    hn: "69001",
    date: "2026-05-15",
    items: [
      { code: "PD01", name: "ดินน้ำมันปลอดสารพิษ (Therapy Putty)", price: 350, quantity: 2, type: "สินค้า" }
    ],
    discountType: "flat",
    discountValue: 0,
    discountReason: "",
    promotionId: "",
    paymentMethod: "โอนเงิน",
    bankAccountId: "B2",
    slipUrl: "temp_slip_url",
    status: "ยกเลิก",
    totalAmount: 700,
    created_at: "2026-05-15T15:20:00Z",
    createdBy: "ผู้ดูแลระบบ สุดหล่อ"
  }
];

export const INITIAL_APPOINTMENTS = [
  // ประวัติการใช้บริการที่สถานะ "รับบริการแล้ว"
  {
    id: "A1",
    hn: "69001",
    therapistId: "T1",
    date: "2026-05-12",
    timeSlot: "09:00 - 10:00",
    status: "รับบริการแล้ว",
    created_at: "2026-05-10T10:30:00Z"
  },
  {
    id: "A2",
    hn: "69001",
    therapistId: "T1",
    date: "2026-05-19",
    timeSlot: "09:00 - 10:00",
    status: "รับบริการแล้ว",
    created_at: "2026-05-12T15:00:00Z"
  },
  {
    id: "A3",
    hn: "69002",
    therapistId: "T2",
    date: "2026-05-14",
    timeSlot: "13:00 - 14:00",
    status: "รับบริการแล้ว",
    created_at: "2026-05-12T12:00:00Z"
  },
  {
    id: "A4",
    hn: "69002",
    therapistId: "T2",
    date: "2026-05-21",
    timeSlot: "13:00 - 14:00",
    status: "รับบริการแล้ว",
    created_at: "2026-05-14T16:00:00Z"
  },
  // นัดหมายวันนี้ (สมมติวันนี้คือ 5 มิ.ย. 2026)
  {
    id: "A5",
    hn: "69001",
    therapistId: "T1",
    date: "2026-06-05",
    timeSlot: "10:00 - 11:00",
    status: "ยืนยันแล้ว",
    created_at: "2026-06-01T09:00:00Z"
  },
  {
    id: "A6",
    hn: "69002",
    therapistId: "T2",
    date: "2026-06-05",
    timeSlot: "13:00 - 14:00",
    status: "จองแล้ว",
    created_at: "2026-06-02T10:00:00Z"
  },
  {
    id: "A7",
    hn: "69003",
    therapistId: "T3",
    date: "2026-06-05",
    timeSlot: "15:00 - 16:00",
    status: "ยืนยันแล้ว",
    created_at: "2026-06-03T11:00:00Z"
  },
  // นัดหมายในอนาคต
  {
    id: "A8",
    hn: "69001",
    therapistId: "T1",
    date: "2026-06-12",
    timeSlot: "10:00 - 11:00",
    status: "จองแล้ว",
    created_at: "2026-06-04T10:00:00Z"
  }
];

export const INITIAL_ASSESSMENTS = [
  {
    id: "HDA69-69001",
    hn: "69001",
    date: "2026-05-12",
    gm: "สมวัย",
    fm: "สมวัย",
    language: "ล่าช้า",
    social: "ล่าช้า",
    sensoryScores: {
      tactile: 12,
      vestibular: 15,
      proprioceptive: 14,
      visual: 16,
      auditory: 10,
      movement: 13,
      total: 80
    },
    snapIV: {
      inattention: 18, // >=16 เสี่ยง
      hyperactivity: 15, // >=13 เสี่ยง
      oppositional: 10, // <15 ปกติ
      inattentionStatus: "เสี่ยง",
      hyperactivityStatus: "เสี่ยง",
      oppositionalStatus: "ปกติ"
    },
    created_at: "2026-05-12T10:00:00Z"
  }
];

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

export const INITIAL_PAYROLLS = [
  {
    id: "PAY-202605-staff_oil",
    year: "2026",
    month: "พฤษภาคม",
    employeeUsername: "staff_oil",
    employeeName: "รัตติยากร งานดี",
    employeeId: "HDH002",
    basicSalary: 7500,
    earningsList: [
      { name: "ล่วงเวลา (OT)", count: 2, rate: 46.88, amount: 93.76 }
    ],
    deductionsList: [
      { name: "ประกันสังคม (SS)", amount: 0 },
      { name: "ภาษี (Tax)", amount: 0 }
    ],
    specialEarnings: [],
    specialDeductions: [],
    totalEarnings: 7593.76,
    totalDeductions: 0,
    netPay: 7593.76,
    created_at: "2026-05-25T17:00:00Z"
  },
  {
    id: "PAY-202605-ot_pin",
    year: "2026",
    month: "พฤษภาคม",
    employeeUsername: "ot_pin",
    employeeName: "ปวิตรา ผ่องสวัสดิ์กุล",
    employeeId: "HDH004",
    basicSalary: 0,
    earningsList: [
      { name: "ค่าเคส (>1 เคส)", count: 6, rate: 250, amount: 1500 }
    ],
    deductionsList: [],
    specialEarnings: [],
    specialDeductions: [],
    totalEarnings: 1500,
    totalDeductions: 0,
    netPay: 1500,
    created_at: "2026-05-25T17:05:00Z"
  },
  {
    id: "PAY-202605-ot_fon",
    year: "2026",
    month: "พฤษภาคม",
    employeeUsername: "ot_fon",
    employeeName: "ฝนทิพย์ คงบุญแก้ว",
    employeeId: "HDH003",
    basicSalary: 0,
    earningsList: [
      { name: "ค่าเคส (>1 เคส)", count: 25, rate: 250, amount: 6250 }
    ],
    deductionsList: [],
    specialEarnings: [],
    specialDeductions: [],
    totalEarnings: 6250,
    totalDeductions: 0,
    netPay: 6250,
    created_at: "2026-05-25T17:10:00Z"
  },
  {
    id: "PAY-202604-staff_oil",
    year: "2026",
    month: "เมษายน",
    employeeUsername: "staff_oil",
    employeeName: "รัตติยากร งานดี",
    employeeId: "HDH002",
    basicSalary: 7500,
    earningsList: [
      { name: "ล่วงเวลา (OT)", count: 72, rate: 46.88, amount: 3375.36 }
    ],
    deductionsList: [],
    specialEarnings: [],
    specialDeductions: [
      { name: "หักเบิกเงินล่วงหน้า", amount: 1500 }
    ],
    totalEarnings: 10875.36,
    totalDeductions: 1500,
    netPay: 9375.36,
    created_at: "2026-04-25T17:00:00Z"
  },
  {
    id: "PAY-202604-ot_pin",
    year: "2026",
    month: "เมษายน",
    employeeUsername: "ot_pin",
    employeeName: "ปวิตรา ผ่องสวัสดิ์กุล",
    employeeId: "HDH004",
    basicSalary: 0,
    earningsList: [
      { name: "ล่วงเวลา (OT)", count: 36, rate: 46.88, amount: 1689 }
    ],
    deductionsList: [],
    specialEarnings: [],
    specialDeductions: [],
    totalEarnings: 1689,
    totalDeductions: 0,
    netPay: 1689,
    created_at: "2026-04-25T17:05:00Z"
  },
  {
    id: "PAY-202604-ot_fon",
    year: "2026",
    month: "เมษายน",
    employeeUsername: "ot_fon",
    employeeName: "ฝนทิพย์ คงบุญแก้ว",
    employeeId: "HDH003",
    basicSalary: 0,
    earningsList: [
      { name: "ล่วงเวลา (OT)", count: 35, rate: 46.88, amount: 1640.80 },
      { name: "ค่าเคส (>1 เคส)", count: 4.47, rate: 250, amount: 1117.70 }
    ],
    deductionsList: [],
    specialEarnings: [],
    specialDeductions: [],
    totalEarnings: 2758.50,
    totalDeductions: 0,
    netPay: 2758.50,
    created_at: "2026-04-25T17:10:00Z"
  },
  {
    id: "PAY-202603-staff_oil",
    year: "2026",
    month: "มีนาคม",
    employeeUsername: "staff_oil",
    employeeName: "รัตติยากร งานดี",
    employeeId: "HDH002",
    basicSalary: 7500,
    earningsList: [],
    deductionsList: [
      { name: "ประกันสังคม (SS)", amount: 375 }
    ],
    specialEarnings: [],
    specialDeductions: [],
    totalEarnings: 7500,
    totalDeductions: 375,
    netPay: 7125,
    created_at: "2026-03-25T17:00:00Z"
  },
  {
    id: "PAY-202603-ot_pin",
    year: "2026",
    month: "มีนาคม",
    employeeUsername: "ot_pin",
    employeeName: "ปวิตรา ผ่องสวัสดิ์กุล",
    employeeId: "HDH004",
    basicSalary: 0,
    earningsList: [
      { name: "ค่าเคส (>1 เคส)", count: 12, rate: 250, amount: 3000 }
    ],
    deductionsList: [
      { name: "ภาษี (Tax) (3%)", amount: 90 }
    ],
    specialEarnings: [],
    specialDeductions: [],
    totalEarnings: 3000,
    totalDeductions: 90,
    netPay: 2910,
    created_at: "2026-03-25T17:05:00Z"
  },
  {
    id: "PAY-202603-ot_fon",
    year: "2026",
    month: "มีนาคม",
    employeeUsername: "ot_fon",
    employeeName: "ฝนทิพย์ คงบุญแก้ว",
    employeeId: "HDH003",
    basicSalary: 0,
    earningsList: [
      { name: "ค่าเคส (>1 เคส)", count: 11, rate: 250, amount: 2750 }
    ],
    deductionsList: [
      { name: "ภาษี (Tax) (3%)", amount: 82.50 }
    ],
    specialEarnings: [],
    specialDeductions: [],
    totalEarnings: 2750,
    totalDeductions: 82.50,
    netPay: 2667.50,
    created_at: "2026-03-25T17:10:00Z"
  },
  {
    id: "PAY-202602-staff_oil",
    year: "2026",
    month: "กุมภาพันธ์",
    employeeUsername: "staff_oil",
    employeeName: "รัตติยากร งานดี",
    employeeId: "HDH002",
    basicSalary: 7500,
    earningsList: [],
    deductionsList: [
      { name: "ประกันสังคม (SS)", amount: 375 }
    ],
    specialEarnings: [],
    specialDeductions: [],
    totalEarnings: 7500,
    totalDeductions: 375,
    netPay: 7125,
    created_at: "2026-02-25T17:00:00Z"
  },
  {
    id: "PAY-202602-ot_pin",
    year: "2026",
    month: "กุมภาพันธ์",
    employeeUsername: "ot_pin",
    employeeName: "ปวิตรา ผ่องสวัสดิ์กุล",
    employeeId: "HDH004",
    basicSalary: 0,
    earningsList: [
      { name: "ค่าเคส (>1 เคส)", count: 14.4, rate: 250, amount: 3600 }
    ],
    deductionsList: [
      { name: "ภาษี (Tax) (3%)", amount: 108 }
    ],
    specialEarnings: [],
    specialDeductions: [],
    totalEarnings: 3600,
    totalDeductions: 108,
    netPay: 3492,
    created_at: "2026-02-25T17:05:00Z"
  },
  {
    id: "PAY-202602-ot_fon",
    year: "2026",
    month: "กุมภาพันธ์",
    employeeUsername: "ot_fon",
    employeeName: "ฝนทิพย์ คงบุญแก้ว",
    employeeId: "HDH003",
    basicSalary: 0,
    earningsList: [
      { name: "ค่าเคส (>1 เคส)", count: 17.8, rate: 250, amount: 4450 }
    ],
    deductionsList: [
      { name: "ภาษี (Tax) (3%)", amount: 133.50 }
    ],
    specialEarnings: [],
    specialDeductions: [],
    totalEarnings: 4450,
    totalDeductions: 133.50,
    netPay: 4316.50,
    created_at: "2026-02-25T17:10:00Z"
  },
  {
    id: "PAY-202601-staff_oil",
    year: "2026",
    month: "มกราคม",
    employeeUsername: "staff_oil",
    employeeName: "รัตติยากร งานดี",
    employeeId: "HDH002",
    basicSalary: 7500,
    earningsList: [],
    deductionsList: [
      { name: "ประกันสังคม (SS)", amount: 375 }
    ],
    specialEarnings: [],
    specialDeductions: [],
    totalEarnings: 7500,
    totalDeductions: 375,
    netPay: 7125,
    created_at: "2026-01-25T17:00:00Z"
  },
  {
    id: "PAY-202601-ot_pin",
    year: "2026",
    month: "มกราคม",
    employeeUsername: "ot_pin",
    employeeName: "ปวิตรา ผ่องสวัสดิ์กุล",
    employeeId: "HDH004",
    basicSalary: 0,
    earningsList: [
      { name: "ค่าเคส (>1 เคส)", count: 13, rate: 250, amount: 3250 }
    ],
    deductionsList: [
      { name: "ภาษี (Tax) (3%)", amount: 97.50 }
    ],
    specialEarnings: [],
    specialDeductions: [],
    totalEarnings: 3250,
    totalDeductions: 97.50,
    netPay: 3152.50,
    created_at: "2026-01-25T17:05:00Z"
  },
  {
    id: "PAY-202601-ot_fon",
    year: "2026",
    month: "มกราคม",
    employeeUsername: "ot_fon",
    employeeName: "ฝนทิพย์ คงบุญแก้ว",
    employeeId: "HDH003",
    basicSalary: 0,
    earningsList: [
      { name: "ค่าเคส (>1 เคส)", count: 12.8, rate: 250, amount: 3200 }
    ],
    deductionsList: [
      { name: "ภาษี (Tax) (3%)", amount: 96 }
    ],
    specialEarnings: [],
    specialDeductions: [],
    totalEarnings: 3200,
    totalDeductions: 96,
    netPay: 3104,
    created_at: "2026-01-25T17:10:00Z"
  }
];

export const INITIAL_TRANSACTIONS = [
  {
    id: "TX-001",
    date: "2026-06-05",
    type: "income",
    description: "อ้างอิงใบเสร็จ HDR202606-0005 ของ ด.ช.ธรากร แสงสกา (69037)",
    category: "ค่าเคส",
    amount: 3250.00,
    refId: "HDR202606-0005",
    slipUrl: ""
  },
  {
    id: "TX-002",
    date: "2026-06-05",
    type: "income",
    description: "อ้างอิงใบเสร็จ HDR202606-0004 ของ ด.ช.สุรเชษฐ์ แซ่เต็น (69044)",
    category: "ค่าเคส",
    amount: 600.00,
    refId: "HDR202606-0004",
    slipUrl: ""
  },
  {
    id: "TX-003",
    date: "2026-06-04",
    type: "income",
    description: "อ้างอิงใบเสร็จ HDR202606-0003 ของ ด.ช.ณดล เกศชาติ (69042)",
    category: "ค่าเคส",
    amount: 600.00,
    refId: "HDR202606-0003",
    slipUrl: ""
  },
  {
    id: "TX-004",
    date: "2026-06-02",
    type: "income",
    description: "อ้างอิงใบเสร็จ HDR202606-0001 ของ ด.ช.ณัฏฐวรรณ์ ตื่นค่า (69040)",
    category: "ค่าเคส",
    amount: 3250.00,
    refId: "HDR202606-0001",
    slipUrl: ""
  },
  {
    id: "TX-005",
    date: "2026-05-28",
    type: "expense",
    description: "เงินเดือน 5 ของคุณ ฝนทิพย์ คงบุญแก้ว",
    category: "รายจ่ายคงที่",
    amount: 6250.00,
    refId: "PAY-202605-ot_fon",
    slipUrl: ""
  },
  {
    id: "TX-006",
    date: "2026-05-28",
    type: "expense",
    description: "เงินเดือน 5 ของคุณ ปวิตรา ผ่องสวัสดิ์กุล",
    category: "รายจ่ายคงที่",
    amount: 1500.00,
    refId: "PAY-202605-ot_pin",
    slipUrl: ""
  },
  {
    id: "TX-007",
    date: "2026-05-28",
    type: "expense",
    description: "เงินเดือน 5 ของคุณ รัตติยากร งานดี",
    category: "รายจ่ายคงที่",
    amount: 7593.76,
    refId: "PAY-202605-staff_oil",
    slipUrl: ""
  },
  {
    id: "TX-008",
    date: "2026-05-28",
    type: "income",
    description: "อ้างอิงใบเสร็จ HDR202605-0012 ของ ด.ช.ณัฏฐภูมิ หอมนาน (69039)",
    category: "ค่าเคส",
    amount: 600.00,
    refId: "HDR202605-0012",
    slipUrl: ""
  },
  {
    id: "TX-009",
    date: "2026-05-26",
    type: "income",
    description: "อ้างอิงใบเสร็จ HDR202605-0011 ของ ด.ช.ธรากร แสงสกา (69037)",
    category: "ค่าเคส",
    amount: 600.00,
    refId: "HDR202605-0011",
    slipUrl: ""
  },
  {
    id: "TX-010",
    date: "2026-05-23",
    type: "expense",
    description: "ซื้อของถุงดำ น้ำยาต่างๆ",
    category: "รายจ่ายคงที่",
    amount: 203.00,
    refId: "",
    slipUrl: ""
  },
  {
    id: "TX-011",
    date: "2026-05-19",
    type: "income",
    description: "อ้างอิงใบเสร็จ HDR202605-0010 ของ ด.ช.ชฎาภา บุญป้อน (69036)",
    category: "ค่าเคส",
    amount: 600.00,
    refId: "HDR202605-0010",
    slipUrl: ""
  },
  {
    id: "TX-012",
    date: "2026-05-16",
    type: "expense",
    description: "ค่าน้ำ",
    category: "รายจ่ายคงที่",
    amount: 192.60,
    refId: "",
    slipUrl: ""
  },
  {
    id: "TX-013",
    date: "2026-05-16",
    type: "income",
    description: "อ้างอิงใบเสร็จ HDR202605-0009 ของ ด.ช.นัทธทวัฒน์ ใจวัง (69033)",
    category: "ค่าเคส",
    amount: 600.00,
    refId: "HDR202605-0009",
    slipUrl: ""
  },
  {
    id: "TX-014",
    date: "2026-05-16",
    type: "income",
    description: "อ้างอิงใบเสร็จ HDR202605-0008 ของ ด.ญ.ขวัญหทัย ใจแก้ว (69034)",
    category: "ค่าเคส",
    amount: 600.00,
    refId: "HDR202605-0008",
    slipUrl: ""
  },
  {
    id: "TX-015",
    date: "2026-05-13",
    type: "expense",
    description: "ค่าอินเตอร์เน็ต",
    category: "รายจ่ายผันแปร",
    amount: 192.60,
    refId: "",
    slipUrl: ""
  }
];

export const INITIAL_OPD_RECORDS = [
  {
    id: "OPD-001",
    hn: "69001",
    date: "2026-05-12",
    therapist: "ครูปิ่น",
    details: "ฝึกการทรงตัวบนลูกบอลโยคะ และฝึกกล้ามเนื้อมัดเล็กโดยการคีบตัวต่อ ฝึกสหสัมพันธ์ตาและมือผ่านกิจกรรมต่อเลโก้ เด็กให้ความร่วมมือดีมาก",
    fileUrl: "",
    isVisible: true
  },
  {
    id: "OPD-002",
    hn: "69001",
    date: "2026-05-19",
    therapist: "ครูปิ่น",
    details: "ฝึกการข้ามเส้นกึ่งกลางลำตัวผ่านการโยนรับห่วง ฝึกการควบคุมทิศทางในการเขียนเส้นตรงและเส้นซิกแซก มีสมาธิจดจ่อดีขึ้น ทำกิจกรรมได้จนสำเร็จ",
    fileUrl: "",
    isVisible: true
  },
  {
    id: "OPD-003",
    hn: "69002",
    date: "2026-05-14",
    therapist: "ครูบาส",
    details: "ฝึกความแข็งแรงของกล้ามเนื้อมือและนิ้วมือผ่านการบีบดินน้ำมันปลอดสารพิษ (Therapy Putty) ฝึกการเขียนลากเส้นตามรอยปะ เด็กมีอาการเหนื่อยล้าช่วงท้ายคาบเล็กน้อย",
    fileUrl: "",
    isVisible: true
  },
  {
    id: "OPD-004",
    hn: "69002",
    date: "2026-05-21",
    therapist: "ครูบาส",
    details: "ประเมินและฝึกทักษะการจับดินสอแบบจับสามนิ้ว (Tripod grasp) ร่วมกับกิจกรรมระบายสีรูปภาพขนาดใหญ่เพื่อส่งเสริมความอดทนในการทำงาน เด็กตั้งใจทำได้ดีขึ้น",
    fileUrl: "",
    isVisible: true
  }
];



