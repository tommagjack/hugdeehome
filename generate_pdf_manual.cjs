const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ARTIFACT_DIR = 'C:/Users/Asus/.gemini/antigravity/brain/916f3fe8-d142-4623-9990-77fb93134cf4';
const WORKSPACE_DIR = 'C:/Users/Asus/.gemini/antigravity/scratch/hug-dee-home';

// Images
const HERO_PATH = path.join(ARTIFACT_DIR, 'clinic_manual_hero_1791019867050.jpg');
const REAL_UI_DASHBOARD_PATH = path.join(ARTIFACT_DIR, 'ui_screenshot_1_dashboard.png');
const REAL_UI_PATIENT_MODAL_PATH = path.join(ARTIFACT_DIR, 'ui_screenshot_2_patient_modal.png');
const REAL_UI_PARENT_FORM_PATH = path.join(ARTIFACT_DIR, 'real_ui_parent_registration_form.png');
const REAL_UI_SIGNATURE_MODAL_PATH = path.join(ARTIFACT_DIR, 'real_ui_digital_signature_modal.png');
const REAL_UI_BATCH_LINE_PATH = path.join(ARTIFACT_DIR, 'ui_screenshot_3_batch_line.png');
const REAL_UI_ITP_TRACKER_PATH = path.join(ARTIFACT_DIR, 'real_ui_itp_tracker_modal.png');
const REAL_UI_HOME_PROGRAM_PATH = path.join(ARTIFACT_DIR, 'real_ui_home_program_modal.png');
const OT_PATH = path.join(ARTIFACT_DIR, 'ot_guide_img_1791020055530.jpg');
const ADMIN_PATH = path.join(ARTIFACT_DIR, 'admin_guide_img_1791020073654.jpg');

function toBase64(filePath) {
  if (!fs.existsSync(filePath)) return '';
  const data = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${data.toString('base64')}`;
}

const heroB64 = toBase64(HERO_PATH);
const dashboardB64 = toBase64(REAL_UI_DASHBOARD_PATH);
const patientModalB64 = toBase64(REAL_UI_PATIENT_MODAL_PATH);
const parentFormB64 = toBase64(REAL_UI_PARENT_FORM_PATH);
const signatureModalB64 = toBase64(REAL_UI_SIGNATURE_MODAL_PATH);
const batchLineB64 = toBase64(REAL_UI_BATCH_LINE_PATH);
const itpTrackerB64 = toBase64(REAL_UI_ITP_TRACKER_PATH);
const homeProgramB64 = toBase64(REAL_UI_HOME_PROGRAM_PATH);
const otB64 = toBase64(OT_PATH);
const adminB64 = toBase64(ADMIN_PATH);

console.log('All real UI screenshots converted to Base64.');

const htmlContent = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>คู่มือการใช้งานระบบคลินิกกิจกรรมบำบัด ฮักดีโฮม (ภาพหน้าจอจริงพร้อมขั้นตอนคลิก)</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap');

    @page {
      size: A4 portrait;
      margin: 15mm 13mm 15mm 13mm;
      @bottom-right {
        content: counter(page);
        font-family: 'Sarabun', sans-serif;
        font-size: 10pt;
        color: #64748b;
      }
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Sarabun', 'TH Sarabun New', 'Leelawadee UI', 'Segoe UI', Tahoma, sans-serif;
      font-size: 13pt;
      line-height: 1.55;
      color: #1e293b;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }

    .cover-page {
      page-break-after: always;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      min-height: 90vh;
      padding: 10px;
    }

    .badge-pill {
      display: inline-block;
      padding: 5px 16px;
      background: #e0f2fe;
      color: #0284c7;
      font-weight: 700;
      font-size: 11pt;
      border-radius: 9999px;
      margin-bottom: 12px;
      letter-spacing: 0.5px;
    }

    h1.main-title {
      font-size: 26pt;
      font-weight: 800;
      color: #0e7490;
      line-height: 1.25;
      margin: 0 0 8px 0;
    }

    .subtitle {
      font-size: 15pt;
      color: #0284c7;
      font-weight: 600;
      margin-bottom: 16px;
    }

    .desc {
      font-size: 12.5pt;
      color: #64748b;
      max-width: 650px;
      margin: 0 auto 24px auto;
    }

    .hero-img-wrap {
      width: 100%;
      max-width: 700px;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(14, 116, 144, 0.15);
      margin: 0 auto 20px auto;
      border: 2px solid #e2e8f0;
    }

    .hero-img-wrap img {
      width: 100%;
      display: block;
    }

    .meta-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 24px;
      display: flex;
      justify-content: space-around;
      width: 100%;
      max-width: 650px;
      font-size: 11.5pt;
      color: #475569;
    }

    .chapter-break {
      page-break-before: always;
      padding-top: 10px;
    }

    h2.chapter-title {
      font-size: 19pt;
      font-weight: 800;
      color: #0e7490;
      border-bottom: 3px solid #0891b2;
      padding-bottom: 6px;
      margin-top: 20px;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    h3.section-title {
      font-size: 15pt;
      font-weight: 700;
      color: #0284c7;
      margin-top: 18px;
      margin-bottom: 8px;
    }

    p {
      margin: 0 0 10px 0;
      color: #334155;
    }

    .ui-screenshot-card {
      width: 100%;
      margin: 16px 0;
      border-radius: 14px;
      overflow: hidden;
      border: 2px solid #0891b2;
      background: #ffffff;
      box-shadow: 0 8px 16px -2px rgba(14, 116, 144, 0.12);
      page-break-inside: avoid;
    }

    .ui-screenshot-card img {
      width: 100%;
      display: block;
    }

    .ui-caption-bar {
      padding: 10px 16px;
      background: #f0fdfa;
      border-top: 1px solid #ccfbf1;
    }

    .ui-caption-title {
      font-weight: 700;
      font-size: 12.5pt;
      color: #0e7490;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .ui-click-step {
      font-size: 11.5pt;
      color: #b45309;
      font-weight: 600;
      margin-top: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .callout {
      border-left: 5px solid #0891b2;
      background: #f0fdfa;
      border-radius: 0 10px 10px 0;
      padding: 12px 16px;
      margin: 14px 0;
      page-break-inside: avoid;
    }

    .callout.tip {
      border-left-color: #10b981;
      background: #ecfdf5;
    }

    .callout-title {
      font-weight: 700;
      font-size: 13pt;
      margin-bottom: 4px;
      color: #0f766e;
    }
    .callout.tip .callout-title { color: #047857; }

    .callout-content {
      font-size: 12pt;
      color: #334155;
      margin: 0;
    }

    ul, ol {
      margin: 6px 0 12px 20px;
      padding: 0;
    }

    li {
      margin-bottom: 6px;
      color: #334155;
    }

    li strong {
      color: #0f172a;
    }

    .step-badge {
      display: inline-block;
      width: 22px;
      height: 22px;
      background: #0284c7;
      color: white;
      border-radius: 50%;
      text-align: center;
      line-height: 22px;
      font-size: 10.5pt;
      font-weight: 700;
      margin-right: 6px;
    }
  </style>
</head>
<body>

  <!-- COVER PAGE -->
  <div class="cover-page">
    <div class="badge-pill">HUG DEE HOME CLINIC INFORMATION SYSTEM</div>
    <h1 class="main-title">คู่มือการใช้งานระบบคลินิกกิจกรรมบำบัด<br>(ฉบับแสดงภาพหน้าจอระบบจริง)</h1>
    <div class="subtitle">พร้อมระบุแถบเมนู ปุ่มคลิก และหน้าต่าง Modal กรอกข้อมูลทุกขั้นตอนอย่างชัดเจน</div>
    <div class="desc">
      รวบรวมภาพถ่ายหน้าจอจริงจากระบบ Hug Dee Home Clinic ครอบคลุมการลงทะเบียนประวัติ, หน้าต่าง Modal กรอกข้อมูล, ระบบเซ็นชื่อดิจิทัลสด, ตารางนัดหมายและระบบส่ง LINE เตือนกลุ่ม
    </div>

    <div class="hero-img-wrap">
      <img src="${heroB64}" alt="Hug Dee Home Clinic Overview">
    </div>

    <div class="meta-box">
      <div><strong>เวอร์ชัน:</strong> 2026.10 Real-Screen Edition</div>
      <div><strong>ความละเอียด:</strong> 100% Native Embedded</div>
      <div><strong>ระบบ:</strong> Hug Dee Home Cloud System</div>
    </div>
  </div>

  <!-- CHAPTER 1 -->
  <div class="chapter-break">
    <h2 class="chapter-title">บทที่ 1: แถบเมนูนำทางหลักและหน้าหลักแดชบอร์ด (Dashboard & Sidebar Layout)</h2>
    <p>
      ระบบคลินิก ฮักดีโฮม จัดวางเมนูการทำงานไว้ทาง <strong>แถบด้านซ้าย (Sidebar)</strong> อย่างเป็นหมวดหมู่ เมื่อคลิกที่เมนูใด หน้าจอหลักจะสลับไปแสดงเนื้อหานั้นทันที:
    </p>

    <div class="ui-screenshot-card">
      <img src="${dashboardB64}" alt="Real System Dashboard and Sidebar">
      <div class="ui-caption-bar">
        <div class="ui-caption-title">📷 ภาพหน้าจอจริงที่ 1: หน้าหลักแดชบอร์ด (Dashboard) พร้อมโครงสร้างแถบเมนูด้านซ้าย</div>
        <div class="ui-click-step">👉 ไปที่แถบ: คลิกแถบเมนู "หน้าหลัก" (ไอคอนสี่เหลี่ยมด้านซ้ายบนสุด)</div>
      </div>
    </div>

    <h3 class="section-title">โครงสร้างเมนูในแถบด้านซ้าย (Sidebar):</h3>
    <ul>
      <li><strong>หมวดการจัดการผู้รับบริการ:</strong> เมนู <em>"ทะเบียนประวัติ"</em> (จัดการข้อมูลคนไข้), <em>"ตารางนัดหมาย"</em> (ปฏิทินนัดและส่ง LINE เตือน), และ <em>"คอร์สลูกค้า"</em> (ตรวจสอบชั่วโมงและคอร์สคงเหลือ)</li>
      <li><strong>หมวดพัฒนาการและการประเมิน:</strong> เมนู <em>"ประเมินพัฒนาการ"</em> (แบบประเมิน DSPM/Sensory Profile), <em>"เป้าหมาย ITP"</em> (แผนบำบัดรายบุคคล), <em>"บันทึกผลการฝึก"</em> (OPD SOAP Note), และ <em>"หนังสือส่งตัว"</em></li>
      <li><strong>หมวดการเงินและบริการ:</strong> เมนู <em>"ออกใบเสร็จ"</em> (ระบบ POS บิลและตัดคอร์ส) และ <em>"ประวัติใบเสร็จ"</em></li>
      <li><strong>สถานะออนไลน์ด้านบนขวา:</strong> แสดงปุ่ม <em>"ออนไลน์ (คลาวด์ปกติ)"</em> หากมีข้อมูลค้างซิงค์จะแสดงตัวเลขและปุ่มกดให้อัตโนมัติ</li>
    </ul>
  </div>

  <!-- CHAPTER 2 -->
  <div class="chapter-break">
    <h2 class="chapter-title">บทที่ 2: ขั้นตอนการลงทะเบียนผู้รับบริการ และหน้าต่าง Modal กรอกข้อมูล</h2>
    <p>
      เมื่อมีผู้รับบริการรายใหม่เดินทางมายังคลินิก เจ้าหน้าที่ธุรการสามารถเปิดหน้าต่าง Modal เพื่อกรอกประวัติได้อย่างรวดเร็ว:
    </p>

    <div class="ui-screenshot-card">
      <img src="${patientModalB64}" alt="Real System Patient Registration Modal">
      <div class="ui-caption-bar">
        <div class="ui-caption-title">📷 ภาพหน้าจอจริงที่ 2: หน้าต่าง Modal "ลงทะเบียนรายใหม่" พร้อมช่องกรอกข้อมูลครบถ้วน</div>
        <div class="ui-click-step">👉 ขั้นตอนการเปิด: คลิกเมนู "ทะเบียนประวัติ" ในแถบด้านซ้าย -> คลิกปุ่มสีน้ำเงิน "+ ลงทะเบียนรายใหม่" ด้านบนขวา</div>
      </div>
    </div>

    <h3 class="section-title">รายละเอียดช่องกรอกข้อมูลในหน้าต่าง Modal:</h3>
    <ul>
      <li><strong>HN (รันอัตโนมัติ):</strong> ระบบสร้างรหัสประจำตัวผู้ป่วยให้อัตโนมัติ เช่น 69001, 69055 โดยไม่ต้องพิมพ์เอง</li>
      <li><strong>สถานะ:</strong> ตั้งค่าเป็น "Active" สำหรับผู้รับบริการที่มาฝึกต่อเนื่อง</li>
      <li><strong>เพศ และ คำนำหน้า:</strong> ชาย/หญิง (เด็กชาย, เด็กหญิง, นาย, นางสาว)</li>
      <li><strong>ชื่อ-นามสกุลผู้ป่วย * และ ชื่อเล่น:</strong> ระบุชื่อจริง นามสกุล และชื่อเล่นของน้องอย่างถูกต้อง</li>
      <li><strong>วันเกิด (พ.ศ.) *:</strong> เลือก วัน / เดือน / ปี พ.ศ. เกิด ระบบจะคำนวณอายุปีและเดือนให้อัตโนมัติ</li>
      <li><strong>ชื่อผู้ปกครอง และ เบอร์โทรติดต่อ *:</strong> ระบุชื่อบิดา/มารดา และเบอร์โทรศัพท์ที่ติดต่อได้จริง</li>
      <li><strong>รหัส LINE User ID ผู้ปกครอง:</strong> สำหรับส่งผลการรักษาและการแจ้งเตือนอัตโนมัติ</li>
      <li><strong>แพ้ยา / โรคประจำตัว:</strong> บันทึกประวัติเพื่อความปลอดภัยสูงสุดของน้องในระหว่างทำกิจกรรม</li>
      <li><strong>ช่องทางรู้จักคลินิก:</strong> เลือกช่องทางที่ผู้ปกครองทราบข่าวสาร เช่น Facebook, Line, Walk-in</li>
    </ul>
  </div>

  <!-- CHAPTER 3 -->
  <div class="chapter-break">
    <h2 class="chapter-title">บทที่ 3: ระบบลงทะเบียนสำหรับผู้ปกครอง และระบบเซ็นชื่อดิจิทัลสด (Digital Signature Pad)</h2>
    <p>
      ผู้ปกครองสามารถสแกน QR Code หน้าเคาน์เตอร์คลินิกเพื่อกรอกข้อมูลด้วยตนเองผ่านมือถือได้อย่างสะดวกสบาย:
    </p>

    <div class="ui-screenshot-card">
      <img src="${parentFormB64}" alt="Real System Parent Registration Form">
      <div class="ui-caption-bar">
        <div class="ui-caption-title">📷 ภาพหน้าจอจริงที่ 3: แบบฟอร์มลงทะเบียนออนไลน์สำหรับผู้ปกครอง (Parent Form)</div>
        <div class="ui-click-step">👉 การเข้าใช้งาน: สแกน QR Code หน้าคลินิก หรือเข้าผ่านลิงก์สาธารณะ #/register-patient</div>
      </div>
    </div>

    <p>
      เมื่อผู้ปกครองกรอกข้อมูลเสร็จและกดปุ่ม <strong>"ตรวจทานและส่งข้อมูลลงทะเบียน"</strong> ระบบจะเปิดหน้าต่าง <strong>Modal ตรวจทานข้อมูลและยินยอมการจัดเก็บข้อมูล</strong> พร้อมแคนวาสเซ็นชื่อดิจิทัลสด:
    </p>

    <div class="ui-screenshot-card">
      <img src="${signatureModalB64}" alt="Real System Digital Signature Pad Modal">
      <div class="ui-caption-bar">
        <div class="ui-caption-title">📷 ภาพหน้าจอจริงที่ 4: หน้าต่าง Modal ตรวจทานข้อมูล และระบบเซ็นชื่อดิจิทัลสด (Digital Signature Pad)</div>
        <div class="ui-click-step">👉 ขั้นตอน: ตรวจทานสรุปข้อมูล -> ติ๊กถูกยินยอม PDPA -> ใช้นิ้วมือหรือปากกาเซ็นสดลงบนกรอบสีขาว -> กดยืนยัน</div>
      </div>
    </div>

    <div class="callout tip">
      <div class="callout-title">💡 จุดเด่นของระบบลายเซ็นดิจิทัล (Digital Signature Pad)</div>
      <div class="callout-content">
        • รองรับทั้งการใช้นิ้วมือลากบนหน้าจอสัมผัส (มือถือ, iPad, Tablet) และปากกา Apple Pencil/Stylus<br>
        • มีปุ่ม <strong>"× ล้างลายเซ็น"</strong> เพื่อเริ่มเซ็นใหม่ได้หากเซ็นผิดพลาด<br>
        • ลายเซ็นจะถูกฝังลงในเอกสารเวชระเบียนทางการแพทย์ (PDF Intake Form) อัตโนมัติทันที
      </div>
    </div>
  </div>

  <!-- CHAPTER 4 -->
  <div class="chapter-break">
    <h2 class="chapter-title">บทที่ 4: ตารางนัดหมาย และระบบส่ง LINE เตือนล่วงหน้าแบบกลุ่ม (Batch LINE Reminders)</h2>
    <p>
      ฟังก์ชันใหม่ล่าสุดช่วยลดอัตราการลืมนัดหมาย และช่วยให้ธุรการส่งข้อความเตือนนัดวันพรุ่งนี้ทุกคนได้ในคลิกเดียว:
    </p>

    <div class="ui-screenshot-card">
      <img src="${batchLineB64}" alt="Real System Batch LINE Reminders Modal">
      <div class="ui-caption-bar">
        <div class="ui-caption-title">📷 ภาพหน้าจอจริงที่ 5: หน้าต่าง Modal ส่งแจ้งเตือนนัดหมายผ่าน LINE OA (แบบกลุ่ม)</div>
        <div class="ui-click-step">👉 ขั้นตอน: คลิกแถบ "ตารางนัดหมาย" ด้านซ้าย -> คลิกปุ่มสีเขียว "ส่ง LINE เตือนวันพรุ่งนี้" ด้านบน</div>
      </div>
    </div>

    <h3 class="section-title">ขั้นตอนการส่ง LINE เตือนนัดแบบกลุ่ม:</h3>
    <ol>
      <li><strong>เลือกวันที่นัดหมาย:</strong> ระบบตั้งค่าเป็นวันพรุ่งนี้ให้อัตโนมัติ หรือคลิกปุ่ม <em>"วันพรุ่งนี้"</em> / <em>"วันนี้"</em> หรือเลือกวันที่ในปฏิทิน</li>
      <li><strong>ตรวจสอบการ์ดสถิติ:</strong> ระบบแสดงจำนวนนัดหมายทั้งหมด, จำนวนที่ผูก LINE แล้ว, และจำนวนเคสที่ยังไม่ผูก LINE</li>
      <li><strong>เลือกส่งรายคนหรือส่งทุกคน:</strong> มี Checkbox ให้ติ๊กเลือกส่งทุกคน หรือเลือกเฉพาะบางเคสได้</li>
      <li><strong>กดปุ่มสีเขียว "ส่งการ์ดแจ้งเตือน":</strong> ระบบจะทยอยส่งข้อความแจ้งเตือนเข้าแชท LINE ของผู้ปกครองทีละคน พร้อมแสดง Progress Bar แบบเรียลไทม์</li>
    </ol>
  </div>

  <!-- CHAPTER 5 -->
  <div class="chapter-break">
    <h2 class="chapter-title">บทที่ 5: คู่มือสำหรับนักกิจกรรมบำบัด (OT) และผู้บริหาร (Admin)</h2>
    <p>
      ระบบรองรับกระบวนการบำบัดรักษาเด็กอย่างครบวงจร ตั้งแต่การวางแผนไปจนถึงการวิเคราะห์ผลการดำเนินงาน:
    </p>

    <div class="ui-screenshot-card">
      <img src="${otB64}" alt="OT Clinical Workflow">
      <div class="ui-caption-bar">
        <div class="ui-caption-title">📷 ภาพการปฏิบัติงาน: นักกิจกรรมบำบัดจัดกิจกรรม Sensory Integration เสริมสร้างพัฒนาการ</div>
      </div>
    </div>

    <h3 class="section-title">ฟังก์ชันสำคัญของนักกิจกรรมบำบัด:</h3>
    <ul>
      <li><strong>แผนบำบัดรายบุคคล (ITP Tracker):</strong> คลิกแถบ <em>"เป้าหมาย ITP"</em> ด้านซ้าย เพื่อตั้งเป้าหมายการบำบัด (Gross Motor, Fine Motor, Sensory Integration, Self-Care) ปรับระดับความก้าวหน้า 0-100% และพิมพ์รายงานความก้าวหน้า (PDF)</li>
    </ul>

    <div class="ui-screenshot-card">
      <img src="${itpTrackerB64}" alt="Real System ITP Milestone Tracker">
      <div class="ui-caption-bar">
        <div class="ui-caption-title">📷 ภาพหน้าจอจริงที่ 6: หน้าต่างจัดการแผนบำบัดรายบุคคล (ITP Milestone Tracker)</div>
        <div class="ui-click-step">👉 ไปที่แถบ: คลิกแถบเมนู "เป้าหมาย ITP" -> เลือกผู้รับบริการ -> คลิก "+ เพิ่มเป้าหมายใหม่" หรือเลื่อนแถบความคืบหน้า</div>
      </div>
    </div>

    <ul>
      <li><strong>บันทึกผลการฝึก (OPD SOAP Notes) & Home Program:</strong> คลิกแถบ <em>"บันทึกผลการฝึก"</em> บันทึกรายละเอียดการรักษา และกดปุ่ม <em>"กิจกรรมฝึกที่บ้าน (Home Program)"</em> เพื่อจัดชุดกิจกรรมพร้อมคัดลอกส่ง LINE หรือพิมพ์การ์ด PDF</li>
    </ul>

    <div class="ui-screenshot-card">
      <img src="${homeProgramB64}" alt="Real System Home Program Planner">
      <div class="ui-caption-bar">
        <div class="ui-caption-title">📷 ภาพหน้าจอจริงที่ 7: หน้าต่างจัดชุดกิจกรรมฝึกที่บ้าน (Home Program & Sensory Diet Planner)</div>
        <div class="ui-click-step">👉 ขั้นตอน: คลิกเมนู "บันทึกผลการฝึก" -> เลือกผู้รับบริการ -> คลิกปุ่มสีเขียว "กิจกรรมฝึกที่บ้าน (Home Program)"</div>
      </div>
    </div>

    <div class="ui-screenshot-card">
      <img src="${adminB64}" alt="Admin Executive Dashboard">
      <div class="ui-caption-bar">
        <div class="ui-caption-title">📷 ภาพการบริหารงาน: ผู้บริหารตรวจสอบแดชบอร์ดสถิติและการเงินผ่านหน้าจอแบบเรียลไทม์</div>
      </div>
    </div>

    <h3 class="section-title">ฟังก์ชันสำคัญของผู้บริหารและผู้ดูแลระบบ (Admin):</h3>
    <ul>
      <li><strong>ระบบเงินเดือนและค่าตอบแทน (Payroll):</strong> ดึงข้อมูลเคสที่ให้บริการจริงจาก OPD มาคำนวณค่าเวรและค่าคอมมิชชันให้อัตโนมัติ</li>
      <li><strong>ประวัติการทำงาน (Activity Logs):</strong> บันทึกประวัติการทำรายการทุกขั้นตอนตามมาตรฐาน PDPA ป้องกันการแก้ไขข้อมูลย้อนหลัง</li>
    </ul>
  </div>

</body>
</html>
`;

const htmlPath = path.join(WORKSPACE_DIR, 'คู่มือการใช้งานระบบ_HugDeeHome_Clinic.html');
fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('HTML written to:', htmlPath);

const pdfOutWorkspace = path.join(WORKSPACE_DIR, 'คู่มือการใช้งานระบบ_HugDeeHome_Clinic.pdf');
const pdfOutArtifact = path.join(ARTIFACT_DIR, 'คู่มือการใช้งานระบบ_HugDeeHome_Clinic.pdf');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browserExe = fs.existsSync(chromePath) ? chromePath : edgePath;

console.log('Using browser:', browserExe);

const cmd = `"${browserExe}" --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${pdfOutWorkspace}" --no-pdf-header-footer "file:///${htmlPath.replace(/\\\\/g, '/')}"`;

console.log('Executing PDF export command...');
try {
  execSync(cmd, { stdio: 'inherit' });
  console.log('PDF generated at workspace:', pdfOutWorkspace);
  
  if (fs.existsSync(pdfOutWorkspace)) {
    fs.copyFileSync(pdfOutWorkspace, pdfOutArtifact);
    console.log('PDF copied to artifact dir:', pdfOutArtifact);
  }
} catch (e) {
  console.error('Error generating PDF:', e);
}
