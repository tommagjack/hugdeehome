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

export const INITIAL_USERS = [];

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

export const INITIAL_ASSESSMENT_TEMPLATES = [
  {
    id: "temp-dev-4",
    name: "แบบประเมินพัฒนาการ 4 ด้านพื้นฐาน",
    description: "ประเมินพัฒนาการ 4 ด้านหลัก: ส่วนบุคคลและสังคม, กล้ามเนื้อมัดเล็ก, ภาษา, และกล้ามเนื้อมัดใหญ่",
    type: "dynamic_checklist",
    chartType: "bar",
    status: "Active",
    categories: [
      { id: "social", name: "ด้านส่วนบุคคลและสังคม (Personal-Social)" },
      { id: "fine-motor", name: "ด้านกล้ามเนื้อมัดเล็กและสติปัญญา (Fine Motor-Adaptive)" },
      { id: "language", name: "ด้านภาษา (Language)" },
      { id: "gross-motor", name: "ด้านกล้ามเนื้อมัดใหญ่ (Gross Motor)" }
    ],
    questions: [
      { id: "dev_s1", categoryId: "social", text: "มองหน้าสบตาขณะพูดคุยด้วย" },
      { id: "dev_s2", categoryId: "social", text: "เล่นเลียนแบบหรือเล่นร่วมกับผู้อื่นตามวัย" },
      { id: "dev_f1", categoryId: "fine-motor", text: "ขีดเขียนเป็นเส้นหรือใช้นิ้วหยิบของชิ้นเล็ก" },
      { id: "dev_f2", categoryId: "fine-motor", text: "ต่อบล็อกไม้หรือใช้กรรไกรตัดกระดาษเบื้องต้น" },
      { id: "dev_l1", categoryId: "language", text: "หันตามเสียงเรียกหรือเข้าใจคำสั่งง่ายๆ" },
      { id: "dev_l2", categoryId: "language", text: "พูดเป็นคำเดี่ยวหรือประโยคสั้นๆ เพื่อสื่อความต้องการ" },
      { id: "dev_g1", categoryId: "gross-motor", text: "ทรงตัวยืนขาเดียวหรือเดินต่อเท้า" },
      { id: "dev_g2", categoryId: "gross-motor", text: "กระโดดข้ามสิ่งกีดขวางหรือวิ่งได้มั่นคง" }
    ],
    scoringRules: {
      interpretations: [
        { min: 0, max: 50, resultText: "ควรเฝ้าติดตามระวังเป็นพิเศษ (Needs Supervision)", color: "#e74c3c" },
        { min: 51, max: 100, resultText: "สมวัยตามเกณฑ์พัฒนาการทั่วไป (Normal)", color: "#2ecc71" }
      ]
    }
  },
  {
    id: "temp-sensory-6",
    name: "แบบประเมิน Sensory Test 6 ด้าน",
    description: "แบบสำรวจการประมวลผลความรู้สึกทางระบบประสาทสัมผัส 6 ด้านหลัก",
    type: "dynamic_scale",
    chartType: "radar",
    status: "Active",
    categories: [
      { id: "tactile", name: "การรับสัมผัส (Tactile)" },
      { id: "vestibular", name: "การทรงตัว (Vestibular)" },
      { id: "proprio", name: "การรับรู้ตำแหน่งข้อต่อ (Proprioceptive)" },
      { id: "visual", name: "การมองเห็น (Visual)" },
      { id: "auditory", name: "การได้ยิน (Auditory)" },
      { id: "movement", name: "การรับรู้ความรู้สึกเคลื่อนไหว (Movement)" }
    ],
    questions: [
      { id: "sen_t1", categoryId: "tactile", text: "แสดงความรำคาญหรือหลีกเลี่ยงเมื่อผิวหนังถูกสัมผัสเบาๆ" },
      { id: "sen_t2", categoryId: "tactile", text: "ไม่ชอบเดินเท้าเปล่าบนหญ้าหรือพื้นทราย" },
      { id: "sen_v1", categoryId: "vestibular", text: "กลัวหรือหลีกเลี่ยงกิจกรรมเล่นระดับสูง เช่น ชิงช้า หรือปีนป่าย" },
      { id: "sen_v2", categoryId: "vestibular", text: "ชอบทำตัวโคลงเคลง หรือหมุนรอบตัวเองอยู่บ่อยครั้ง" },
      { id: "sen_p1", categoryId: "proprio", text: "ลงน้ำหนักหนาเกินไปขณะเขียนหนังสือหรือกระแทกของแรงๆ" },
      { id: "sen_p2", categoryId: "proprio", text: "ชอบเดินกระโดดกระแทกส้นเท้าหรือทิ้งตัวชนเบาะ" },
      { id: "sen_vi1", categoryId: "visual", text: "ไวต่อแสงสว่างมากเกินไป หรือมองตามสิ่งของที่เคลื่อนไหวไม่ต่อเนื่อง" },
      { id: "sen_vi2", categoryId: "visual", text: "ชอบมองวัตถุที่หมุน หรือชอบจ้องเพ่งมองไฟ" },
      { id: "sen_a1", categoryId: "auditory", text: "เอามือปิดหูเมื่อได้ยินเสียงดังกระทันหัน เช่น เครื่องดูดฝุ่น" },
      { id: "sen_a2", categoryId: "auditory", text: "ดูเหมือนไม่ได้ยินเมื่อมีเสียงเรียกชื่อ ทั้งที่ได้ยินเสียงอื่นปกติ" },
      { id: "sen_m1", categoryId: "movement", text: "ไม่ชอบการเดินทางด้วยพาหนะ หรือไวต่อเมารถเมาเรือ" },
      { id: "sen_m2", categoryId: "movement", text: "ชอบทำกิจกรรมท้าทายที่มีความเสี่ยงล้ม เช่น ห้อยโหน หรือหงายหลัง" }
    ],
    scoringRules: {
      interpretations: [
        { min: 12, max: 24, resultText: "ตอบสนองต่ำกว่าปกติ (Under-Responsive / Seeking)", color: "#3498db" },
        { min: 25, max: 48, resultText: "การประมวลผลปกติ (Normal)", color: "#2ecc71" },
        { min: 49, max: 60, resultText: "ตอบสนองไวผิดปกติ/หลีกเลี่ยง (Over-Responsive / Avoidance)", color: "#e74c3c" }
      ]
    }
  },
  {
    id: "temp-snap-iv",
    name: "แบบประเมินพฤติกรรม SNAP-IV",
    description: "แบบคัดกรองสมาธิสั้นและพฤติกรรมเด็กสมาธิสั้นซนดื้อตามเกณฑ์ DSM-V",
    type: "dynamic_scale",
    chartType: "bar",
    status: "Active",
    categories: [
      { id: "inattention", name: "ด้านสมาธิสั้น (Inattention)" },
      { id: "hyperactive", name: "ด้านความซน/หุนหันพลันแล่น (Hyperactivity/Impulsivity)" },
      { id: "oppositional", name: "ด้านดื้อดึง/ต่อต้าน (Oppositional)" }
    ],
    questions: [
      { id: "snap_1", categoryId: "inattention", text: "มักไม่ละเอียดรอบคอบหรือเลินเล่อในการทำกิจกรรม" },
      { id: "snap_2", categoryId: "inattention", text: "มักไม่มีสมาธิในการทำงานหรือในการเล่น" },
      { id: "snap_3", categoryId: "inattention", text: "มักดูเหมือนไม่ฟังเวลาคนอื่นพูดคุยด้วย" },
      { id: "snap_4", categoryId: "hyperactive", text: "มักขยับมือขยับเท้าไปมา หรือบิดตัวไปมาบนที่นั่ง" },
      { id: "snap_5", categoryId: "hyperactive", text: "มักลุกจากที่นั่งในห้องเรียนหรือในสถานการณ์ที่ควรนั่งนิ่งๆ" },
      { id: "snap_6", categoryId: "hyperactive", text: "มักวิ่งวุ่นหรือปีนป่ายมากเกินสมควรแก่กาลเทศะ" },
      { id: "snap_7", categoryId: "oppositional", text: "มักอารมณ์เสีย/ฉุนเฉียวได้ง่าย" },
      { id: "snap_8", categoryId: "oppositional", text: "มักโต้เถียงกับผู้ใหญ่หรือผู้ปกครอง" }
    ],
    scoringRules: {
      interpretations: [
        { min: 0, max: 1.0, resultText: "ระดับพฤติกรรมปกติทั่วไป (Normal)", color: "#2ecc71" },
        { min: 1.1, max: 2.0, resultText: "สุ่มเสี่ยงระดับปานกลาง (Borderline)", color: "#f39c12" },
        { min: 2.1, max: 3.0, resultText: "ระดับความเสี่ยงสูง (Significant Symptoms)", color: "#e74c3c" }
      ]
    }
  },
  {
    id: "temp-beery-vmi",
    name: "แบบประเมิน Beery VMI",
    description: "การทดสอบบูรณาการสายตากับการเคลื่อนไหวของมือ (Visual-Motor Integration)",
    type: "custom_vmi",
    chartType: "line",
    status: "Active",
    scoringRules: {
      normTable: [
        { ageMinMonths: 48, ageMaxMonths: 59, rawScore: 5, standardScore: 88, percentile: 21 },
        { ageMinMonths: 48, ageMaxMonths: 59, rawScore: 10, standardScore: 100, percentile: 50 },
        { ageMinMonths: 48, ageMaxMonths: 59, rawScore: 15, standardScore: 112, percentile: 79 },
        { ageMinMonths: 60, ageMaxMonths: 71, rawScore: 5, standardScore: 78, percentile: 7 },
        { ageMinMonths: 60, ageMaxMonths: 71, rawScore: 10, standardScore: 92, percentile: 30 },
        { ageMinMonths: 60, ageMaxMonths: 71, rawScore: 15, standardScore: 104, percentile: 61 }
      ]
    }
  },
  {
    id: "temp-denver-ii",
    name: "แบบประเมิน Denver II",
    description: "แม่แบบแบบคัดกรองพัฒนาการเด็กปฐมวัยครอบคลุม 4 ด้านหลักตามเกณฑ์ช่วงอายุ",
    type: "custom_denver",
    chartType: "none",
    status: "Active",
    scoringRules: {
      milestones: [
        { id: "d_s1", sector: "personal-social", text: "จ้องหน้าสบตา (Regard Face)", age25: 0.5, age50: 1, age75: 1.5, age90: 2 },
        { id: "d_s2", sector: "personal-social", text: "ยิ้มตอบรับ (Smile Responsively)", age25: 1, age50: 1.5, age75: 2, age90: 2.5 },
        { id: "d_f1", sector: "fine-motor-adaptive", text: "กวาดตามองผ่านจุดศูนย์กลาง (Follow to Midline)", age25: 1, age50: 2, age75: 2.5, age90: 3 },
        { id: "d_f2", sector: "fine-motor-adaptive", text: "กำนิ้วสู้แรงสัมผัส (Grasp Rattle)", age25: 2.5, age50: 3.5, age75: 4, age90: 4.5 },
        { id: "d_l1", sector: "language", text: "สะดุ้งตัวตามเสียงเคาะ (Respond to Bell)", age25: 0, age50: 0.5, age75: 1, age90: 1.5 },
        { id: "d_l2", sector: "language", text: "ส่งเสียงอ้อแอ้ (Vocalize)", age25: 1, age50: 1.5, age75: 2.5, age90: 3 },
        { id: "d_g1", sector: "gross-motor", text: "ขยับแขนขาท่าทางสมดุล (Symmetrical Movements)", age25: 0, age50: 0.5, age75: 1, age90: 1.5 },
        { id: "d_g2", sector: "gross-motor", text: "ชันคอตั้งชั่วครู่ (Lift Head)", age25: 1, age50: 1.5, age75: 2.5, age90: 3 }
      ]
    }
  }
];
