const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ImageRun,
  Header,
  Footer,
  PageNumber,
  ShadingType
} = require('docx');

const ARTIFACT_DIR = 'C:/Users/Asus/.gemini/antigravity/brain/916f3fe8-d142-4623-9990-77fb93134cf4';
const WORKSPACE_DIR = 'C:/Users/Asus/.gemini/antigravity/scratch/hug-dee-home';

// Images
const HERO_IMG = path.join(ARTIFACT_DIR, 'clinic_manual_hero_1791019867050.jpg');
const REAL_UI_DASHBOARD = path.join(ARTIFACT_DIR, 'ui_screenshot_1_dashboard.png');
const REAL_UI_PATIENT_MODAL = path.join(ARTIFACT_DIR, 'ui_screenshot_2_patient_modal.png');
const REAL_UI_PARENT_FORM = path.join(ARTIFACT_DIR, 'real_ui_parent_registration_form.png');
const REAL_UI_SIGNATURE_MODAL = path.join(ARTIFACT_DIR, 'real_ui_digital_signature_modal.png');
const REAL_UI_BATCH_LINE = path.join(ARTIFACT_DIR, 'ui_screenshot_3_batch_line.png');
const REAL_UI_ITP_TRACKER = path.join(ARTIFACT_DIR, 'real_ui_itp_tracker_modal.png');
const REAL_UI_HOME_PROGRAM = path.join(ARTIFACT_DIR, 'real_ui_home_program_modal.png');
const OT_IMG = path.join(ARTIFACT_DIR, 'ot_guide_img_1791020055530.jpg');
const ADMIN_IMG = path.join(ARTIFACT_DIR, 'admin_guide_img_1791020073654.jpg');

const COLOR_PRIMARY = '0E7490';
const COLOR_SECONDARY = '0891B2';
const COLOR_ACCENT = 'D97706';
const COLOR_TEXT = '1E293B';
const COLOR_MUTED = '64748B';
const FONT_FAMILY = 'TH Sarabun New';

function p(text, opts = {}) {
  return new Paragraph({
    alignment: opts.align || AlignmentType.LEFT,
    spacing: { before: opts.spaceBefore || 100, after: opts.spaceAfter || 100, line: 300 },
    children: [
      new TextRun({
        text: text,
        font: FONT_FAMILY,
        size: opts.size || 28,
        bold: !!opts.bold,
        color: opts.color || COLOR_TEXT,
        italics: !!opts.italics
      })
    ]
  });
}

function h1(title) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 160 },
    children: [
      new TextRun({ text: title, font: FONT_FAMILY, size: 38, bold: true, color: COLOR_PRIMARY })
    ]
  });
}

function h2(title) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({ text: title, font: FONT_FAMILY, size: 32, bold: true, color: COLOR_SECONDARY })
    ]
  });
}

function h3(title) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 80 },
    children: [
      new TextRun({ text: title, font: FONT_FAMILY, size: 28, bold: true, color: COLOR_ACCENT })
    ]
  });
}

function bullet(prefix, text) {
  return new Paragraph({
    spacing: { before: 60, after: 60, line: 280 },
    indent: { left: 360 },
    children: [
      new TextRun({ text: '• ' + prefix + (prefix ? ' ' : ''), font: FONT_FAMILY, size: 28, bold: true, color: COLOR_PRIMARY }),
      new TextRun({ text: text, font: FONT_FAMILY, size: 28, color: COLOR_TEXT })
    ]
  });
}

function callout(title, text, type = 'info') {
  const bg = type === 'tip' ? 'EFF6FF' : type === 'warn' ? 'FEF2F2' : 'F0FDF4';
  const borderColor = type === 'tip' ? '3B82F6' : type === 'warn' ? 'EF4444' : '10B981';

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      left: { style: BorderStyle.SINGLE, size: 24, color: borderColor }
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: bg },
            margins: { top: 120, bottom: 120, left: 200, right: 200 },
            children: [
              new Paragraph({
                spacing: { before: 0, after: 40 },
                children: [
                  new TextRun({ text: title, font: FONT_FAMILY, size: 28, bold: true, color: borderColor })
                ]
              }),
              new Paragraph({
                spacing: { before: 0, after: 0, line: 280 },
                children: [
                  new TextRun({ text: text, font: FONT_FAMILY, size: 26, color: COLOR_TEXT })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}

function imageBlock(imagePath, caption, clickSteps = '') {
  if (!fs.existsSync(imagePath)) {
    return [p(`[ภาพประกอบ: ${caption}]`, { italics: true, color: COLOR_MUTED })];
  }
  const imgData = fs.readFileSync(imagePath);
  const elements = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 180, after: 80 },
      children: [
        new ImageRun({
          data: imgData,
          transformation: {
            width: 580,
            height: 360
          }
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 20, after: clickSteps ? 40 : 160 },
      children: [
        new TextRun({ text: `📷 ${caption}`, font: FONT_FAMILY, size: 24, bold: true, color: COLOR_PRIMARY })
      ]
    })
  ];

  if (clickSteps) {
    elements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 160 },
        children: [
          new TextRun({ text: `👉 ตำแหน่งการใช้งาน: ${clickSteps}`, font: FONT_FAMILY, size: 22, italics: true, color: COLOR_ACCENT })
        ]
      })
    );
  }

  return elements;
}

function tableBlock(headers, rows) {
  const headerCells = headers.map(h => new TableCell({
    shading: { type: ShadingType.CLEAR, fill: COLOR_PRIMARY },
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [
          new TextRun({ text: h, font: FONT_FAMILY, size: 26, bold: true, color: 'FFFFFF' })
        ]
      })
    ]
  }));

  const dataRows = rows.map((row, idx) => {
    const bg = idx % 2 === 0 ? 'FFFFFF' : 'F8FAFC';
    const cells = row.map(cellText => new TableCell({
      shading: { type: ShadingType.CLEAR, fill: bg },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
        left: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
        right: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' }
      },
      children: [
        new Paragraph({
          spacing: { before: 0, after: 0, line: 260 },
          children: [
            new TextRun({ text: cellText, font: FONT_FAMILY, size: 24, color: COLOR_TEXT })
          ]
        })
      ]
    }));
    return new TableRow({ children: cells });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({ children: headerCells }), ...dataRows]
  });
}

async function buildDoc() {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT_FAMILY, size: 28, color: COLOR_TEXT }
        }
      }
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }
          }
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'คู่มือการใช้งานระบบคลินิกกิจกรรมบำบัด ฮักดีโฮม (ภาพหน้าจอจริงพร้อมขั้นตอนคลิก)',
                    font: FONT_FAMILY,
                    size: 20,
                    color: COLOR_MUTED
                  })
                ]
              })
            ]
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'หน้าที่ ', font: FONT_FAMILY, size: 22, color: COLOR_MUTED }),
                  new TextRun({ children: [PageNumber.CURRENT], font: FONT_FAMILY, size: 22, color: COLOR_MUTED }),
                  new TextRun({ text: ' จากทั้งหมด ', font: FONT_FAMILY, size: 22, color: COLOR_MUTED }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT_FAMILY, size: 22, color: COLOR_MUTED })
                ]
              })
            ]
          })
        },
        children: [
          // หน้าปก
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 180, after: 100 },
            children: [
              new TextRun({ text: 'HUG DEE HOME CLINIC', font: FONT_FAMILY, size: 30, bold: true, color: COLOR_ACCENT })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 100 },
            children: [
              new TextRun({ text: 'คู่มือการใช้งานระบบคลินิกกิจกรรมบำบัด (ฉบับแสดงภาพหน้าจอจริง)', font: FONT_FAMILY, size: 44, bold: true, color: COLOR_PRIMARY })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 240 },
            children: [
              new TextRun({ text: 'พร้อมระบุตำแหน่งแถบเมนู ปุ่มคลิก และหน้าต่าง Modal กรอกข้อมูลทุกขั้นตอน', font: FONT_FAMILY, size: 26, italics: true, color: COLOR_MUTED })
            ]
          }),

          ...imageBlock(HERO_IMG, 'ภาพรวมศูนย์บริการและระบบการทำงาน ฮักดีโฮม คลินิก'),

          callout(
            '🌟 คู่มือฉบับปรับปรุงใหม่พร้อมภาพหน้าจอระบบจริง 100%',
            'เอกสารนี้ได้รับการปรับปรุงเพื่อแสดงภาพถ่ายหน้าจอจริง (Actual System Screenshots) ประกอบทุกขั้นตอนการใช้งาน ทั้งตำแหน่งแถบเมนูในแถบด้านซ้าย (Sidebar), ปุ่มกดฟังก์ชันสำคัญ, และหน้าต่างป๊อปอัป (Modal Dialog) สำหรับกรอกข้อมูลอย่างชัดเจน เพื่อให้ผู้ใช้งานทุกระดับสามารถปฏิบัติตามได้ทันทีโดยไม่สับสน',
            'info'
          ),

          p(''),

          // บทที่ 1: ภาพรวมระบบและแถบเมนูหลัก
          h1('บทที่ 1: แถบเมนูนำทางหลักและโครงสร้างระบบ (Navigation & Sidebar Layout)'),
          p('ระบบคลินิก ฮักดีโฮม จัดวางเมนูการใช้งานไว้ทางแถบด้านซ้าย (Sidebar) อย่างเป็นหมวดหมู่ ช่วยให้ผู้ใช้งานสามารถคลิกเข้าสู่ฟังก์ชันต่างๆ ได้อย่างสะดวกรวดเร็วในทุกอุปกรณ์:'),

          ...imageBlock(
            REAL_UI_DASHBOARD,
            'ภาพหน้าจอจริงที่ 1: หน้าหลักแดชบอร์ด (Dashboard) พร้อมโครงสร้างแถบเมนูด้านซ้าย',
            'คลิกแถบเมนู "หน้าหลัก" เพื่อเข้าดูสถิติภาพรวม ผู้รับบริการทั้งหมด นัดหมายวันนี้ และคิวครูผู้สอน'
          ),

          bullet('หมวดการจัดการผู้รับบริการ:', 'ประกอบด้วย เมนู "ทะเบียนประวัติ" (จัดการข้อมูลคนไข้), "ตารางนัดหมาย" (ปฏิทินนัดและส่ง LINE เตือน), และ "คอร์สลูกค้า" (เช็กจำนวนครั้งคงเหลือ)'),
          bullet('หมวดพัฒนาการและการประเมิน:', 'ประกอบด้วย เมนู "ประเมินพัฒนาการ" (DSPM/Sensory Profile), "เป้าหมาย ITP" (แผนการบำบัดรายบุคคล), "บันทึกผลการฝึก" (OPD), และ "หนังสือส่งตัว"'),
          bullet('หมวดการเงินและบริการ:', 'ประกอบด้วย เมนู "ออกใบเสร็จ" (ระบบ POS บิลและตัดคอร์ส) และ "ประวัติใบเสร็จ"'),
          bullet('สถานะการเชื่อมต่อคลาวด์:', 'ด้านบนขวาจะแสดงไอคอนสถานะออนไลน์ "ออนไลน์ (คลาวด์ปกติ)" หากมีข้อมูลที่รออัปโหลดจะแสดงตัวเลขอัตโนมัติ'),

          p(''),

          // บทที่ 2: การลงทะเบียนประวัติและหน้าต่าง Modal
          h1('บทที่ 2: ขั้นตอนการลงทะเบียนผู้รับบริการและหน้าต่าง Modal กรอกข้อมูล'),
          p('สำหรับเจ้าหน้าที่ธุรการและฝ่ายต้อนรับ การเพิ่มประวัติผู้รับบริการรายใหม่สามารถทำได้ผ่านหน้าต่าง Modal ที่ถูกออกแบบให้กระชับและครบถ้วน:'),

          ...imageBlock(
            REAL_UI_PATIENT_MODAL,
            'ภาพหน้าจอจริงที่ 2: หน้าต่าง Modal "ลงทะเบียนรายใหม่" เมื่อคลิกเมนูทะเบียนประวัติ',
            'แถบด้านซ้ายคลิก "ทะเบียนประวัติ" -> ด้านบนขวาคลิกปุ่มสีน้ำเงิน "+ ลงทะเบียนรายใหม่"'
          ),

          h2('ขั้นตอนการกรอกข้อมูลในหน้าต่าง Modal ลงทะเบียนรายใหม่:'),
          bullet('1. รหัส HN (รันอัตโนมัติ):', 'ระบบจะสร้างรหัสประจำตัวผู้ป่วยให้โดยอัตโนมัติ เช่น 69055 โดยไม่ต้องพิมพ์เอง'),
          bullet('2. สถานะผู้ป่วย:', 'เลือกสถานะ "Active" สำหรับผู้รับบริการที่กำลังเข้ารับการรักษาต่อเนื่อง'),
          bullet('3. เพศและคำนำหน้าชื่อ:', 'เลือกเพศ ชาย/หญิง และคำนำหน้า เช่น เด็กชาย, เด็กหญิง, นาย, นางสาว'),
          bullet('4. ชื่อ-นามสกุล และชื่อเล่น:', 'กรอกชื่อจริง นามสกุล และชื่อเล่นของน้องอย่างถูกต้อง'),
          bullet('5. วันเกิด (พ.ศ.):', 'เลือก วัน เดือน และปี พ.ศ. เกิด ระบบจะคำนวณอายุปีและเดือนให้อัตโนมัติ'),
          bullet('6. ข้อมูลผู้ปกครองและเบอร์โทร:', 'ระบุชื่อ-นามสกุล บิดา/มารดา/ผู้ดูแล พร้อมเบอร์โทรศัพท์ติดต่อที่ถูกต้องเพื่อใช้ในการรับสายและแจ้งเตือน'),
          bullet('7. ประวัติแพ้ยาและโรคประจำตัว:', 'เลือก "ปฏิเสธการแพ้ยา" หรือระบุชื่อยา/อาหารที่แพ้ และโรคประจำตัว เพื่อความปลอดภัยสูงสุดในชั่วโมงบำบัด'),
          bullet('8. ช่องทางที่รู้จักคลินิก:', 'เลือกช่องทาง เช่น Facebook, Line, Walk-in, เพื่อนแนะนำ หรือคลินิกเด็ก'),

          p(''),

          // บทที่ 3: ระบบลงทะเบียนผู้ปกครองและลายเซ็นดิจิทัล
          h1('บทที่ 3: ระบบลงทะเบียนสำหรับผู้ปกครอง และระบบเซ็นชื่อดิจิทัล (Digital Signature Pad)'),
          p('ผู้ปกครองสามารถเปิดแบบฟอร์มลงทะเบียนผ่านการสแกน QR Code หน้าเคาน์เตอร์คลินิก หรือเข้าผ่านลิงก์สาธารณะบนสมาร์ทโฟนของท่านเอง:'),

          ...imageBlock(
            REAL_UI_PARENT_FORM,
            'ภาพหน้าจอจริงที่ 3: แบบฟอร์มลงทะเบียนออนไลน์สำหรับผู้ปกครอง (Parent Self-Service Form)',
            'สแกน QR Code หน้าคลินิก หรือเปิดลิงก์ #/register-patient'
          ),

          p('เมื่อผู้ปกครองกรอกข้อมูลสุขภาพและพัฒนาการของน้องเรียบร้อยแล้ว กดปุ่ม "ตรวจทานและส่งข้อมูลลงทะเบียน" ด้านล่าง ระบบจะเปิดหน้าต่าง **Modal ตรวจทานข้อมูลและยินยอมการจัดเก็บข้อมูล (Consent Modal)**:'),

          ...imageBlock(
            REAL_UI_SIGNATURE_MODAL,
            'ภาพหน้าจอจริงที่ 4: หน้าต่าง Modal ตรวจทานข้อมูล และแคนวาสเซ็นชื่อดิจิทัลสด (Digital Signature Pad)',
            'กดปุ่ม "ตรวจทานและส่งข้อมูล" -> ตรวจสอบข้อมูล -> ติ๊กยินยอม PDPA -> ใช้นิ้วมือ/ปากกาเซ็นสดบนหน้าจอ'
          ),

          h2('จุดสำคัญในหน้าต่างเซ็นชื่อดิจิทัล:'),
          bullet('กล่องสรุปข้อมูลตรวจทาน:', 'แสดงชื่อ-นามสกุลน้อง, ชื่อเล่น, เพศ, วันเกิด พ.ศ., อายุคำนวณ, ชื่อผู้ปกครอง และเบอร์โทร เพื่อให้ตรวจสอบความถูกต้องก่อนบันทึก'),
          bullet('ข้อความยินยอมตามมาตรฐาน PDPA:', 'มีกล่องติ๊กถูก "ข้าพเจ้ายินยอมให้คลินิกบ้านฮักดีจัดเก็บและประมวลผลข้อมูล..." เพื่อความถูกต้องตามกฎหมายคุ้มครองข้อมูลส่วนบุคคล'),
          bullet('แคนวาสลายมือชื่อสด (Digital Signature Canvas):', 'ผู้ปกครองสามารถใช้นิ้วมือลาก หรือใช้ปากกา Apple Pencil / Stylus เซ็นชื่อสดลงบนกรอบสีขาวได้ทันที ลายเส้นจะนุ่มนวล คมชัด หากเซ็นผิดสามารถกดปุ่ม "× ล้างลายเซ็น" เพื่อเซ็นใหม่ได้'),
          bullet('ปุ่มยืนยันและส่งข้อมูล:', 'เมื่อกดปุ่มสีทอง "ยืนยันและส่งข้อมูล" ลายเซ็นจะถูกแนบลงในระบบเวชระเบียน และนำไปประทับลงในเอกสารประวัติคนไข้ (PDF Viewer) โดยอัตโนมัติ'),

          p(''),

          // บทที่ 4: ระบบนัดหมายและส่ง LINE เตือนกลุ่ม
          h1('บทที่ 4: ตารางนัดหมายและระบบส่ง LINE เตือนล่วงหน้าแบบกลุ่ม (Batch LINE Reminders)'),
          p('เพื่อลดภาระงานของเจ้าหน้าที่ธุรการ และป้องกันปัญหาคนไข้ลืมนัด (No-Show) ระบบมีฟังก์ชันส่งข้อความเตือนนัดหมายเข้า LINE ผู้ปกครองได้ทุกคนในคลิกเดียว:'),

          ...imageBlock(
            REAL_UI_BATCH_LINE,
            'ภาพหน้าจอจริงที่ 5: หน้าต่าง Modal ส่งแจ้งเตือนนัดหมายผ่าน LINE OA (แบบกลุ่ม)',
            'แถบด้านซ้ายคลิก "ตารางนัดหมาย" -> ด้านบนคลิกปุ่มสีเขียว "ส่ง LINE เตือนวันพรุ่งนี้"'
          ),

          h2('ขั้นตอนการทำงานของระบบ Batch LINE Reminders:'),
          bullet('1. การเลือกวันที่นัดหมาย:', 'ระบบจะตั้งต้นเป็นวันพรุ่งนี้ให้อัตโนมัติ หรือสามารถคลิกปุ่ม "วันนี้" หรือเลือกวันที่ในปฏิทินได้ตามต้องการ'),
          bullet('2. การ์ดสถิติความพร้อม:', 'ระบบจะคำนวณและแสดงผลทันที ได้แก่: จำนวนนัดหมายทั้งหมด, จำนวนเคสที่ผูก LINE แล้ว (พร้อมส่ง), จำนวนเคสที่ยังไม่ผูก LINE, และจำนวนเคสที่เลือกส่งในครั้งนี้'),
          bullet('3. ตารางรายชื่อผู้รับบริการ:', 'แสดงตารางพร้อม Checkbox ให้เลือกส่งทุกคน หรือติ๊กเลือกเฉพาะบางเคสได้ พร้อมระบุเวลา ครูผู้บำบัด และสถานะ LINE'),
          bullet('4. ปุ่มส่งการ์ดแจ้งเตือน:', 'เมื่อกดปุ่มสีเขียว "ส่งการ์ดแจ้งเตือน (X)" ระบบจะทยอยยิงข้อความพร้อมการ์ดนัดหมายเข้าแชท LINE ของผู้ปกครองทีละคน พร้อมแถบ Progress Bar แสดงผลแบบเรียลไทม์'),

          p(''),

          // บทที่ 5: นักกิจกรรมบำบัดและผู้บริหาร
          h1('บทที่ 5: คู่มือสำหรับนักกิจกรรมบำบัด (OT) และผู้บริหารคลินิก (Admin)'),
          p('ระบบสนับสนุนการทำงานทางคลินิกอย่างครบวงจร ทั้งการบันทึกเวชระเบียน การวางแผนบำบัดรายบุคคล และการบริหารจัดการ:'),

          ...imageBlock(OT_IMG, 'ภาพการปฏิบัติงาน: นักกิจกรรมบำบัดจัดกิจกรรม Sensory Integration เสริมทักษะเด็ก'),

          h2('5.1 เมนู "เป้าหมาย ITP" (แผนการบำบัดฟื้นฟูรายบุคคล):'),
          bullet('การเลือกผู้รับบริการ:', 'คลิกแถบด้านซ้าย "เป้าหมาย ITP" -> พิมพ์รหัส HN หรือชื่อน้องในช่องค้นหาด้านบนเพื่อเปิดแฟ้มเป้าหมาย'),
          bullet('การเพิ่มเป้าหมายใหม่:', 'กดปุ่ม "+ เพิ่มเป้าหมายใหม่" สามารถเลือกจากหมวดหมู่: กล้ามเนื้อมัดใหญ่, กล้ามเนื้อมัดเล็ก, การดูแลตนเอง, การบูรณาการประสาทความรู้สึก, หรือทักษะสังคม'),
          bullet('การปรับแถบความคืบหน้า (Progress Slider):', 'เลื่อนปรับเปอร์เซ็นต์ความสำเร็จ 0% - 100% หรือกดปุ่มด่วน (0%, 25%, 50%, 75%, 100%) พร้อมบันทึกข้อคิดเห็นของนักบำบัด'),
          bullet('การพิมพ์รายงานความก้าวหน้า (PDF):', 'กดปุ่ม "พิมพ์รายงานความก้าวหน้า (PDF)" เพื่อสร้างเอกสารรายงานทางการแพทย์มอบให้ผู้ปกครอง'),

          ...imageBlock(
            REAL_UI_ITP_TRACKER,
            'ภาพหน้าจอจริงที่ 6: หน้าต่างจัดการแผนบำบัดรายบุคคล (ITP Milestone Tracker)',
            'แถบด้านซ้ายคลิก "เป้าหมาย ITP" -> เลือกผู้รับบริการ -> คลิก "+ เพิ่มเป้าหมายใหม่" หรือปรับแถบเปอร์เซ็นต์ความก้าวหน้า'
          ),

          h2('5.2 เมนู "บันทึกผลการฝึก" (OPD SOAP Notes) & Home Program:'),
          bullet('บันทึก SOAP:', 'บันทึก Subjective, Objective, Assessment, Plan ในแต่ละคาบเรียน'),
          bullet('ปุ่ม "กิจกรรมฝึกที่บ้าน (Home Program)":', 'จัดเซ็ตกิจกรรมฝึกที่บ้าน เช่น ฝึกกล้ามเนื้อมัดเล็ก หรือไดเอทประสาทสัมผัส พร้อมปุ่ม "คัดลอกสรุปส่ง LINE" และ "พิมพ์การ์ดกิจกรรม (PDF)" แจกผู้ปกครอง'),

          ...imageBlock(
            REAL_UI_HOME_PROGRAM,
            'ภาพหน้าจอจริงที่ 7: หน้าต่างจัดชุดกิจกรรมฝึกที่บ้าน (Home Program & Sensory Diet Planner)',
            'แถบด้านซ้ายคลิก "บันทึกผลการฝึก" -> เลือกผู้รับบริการ -> คลิกปุ่มสีเขียว "กิจกรรมฝึกที่บ้าน (Home Program)"'
          ),

          ...imageBlock(ADMIN_IMG, 'ภาพการบริหารงาน: ผู้บริหารตรวจสอบแดชบอร์ดสถิติและการเงินผ่านหน้าจอแบบเรียลไทม์'),

          h2('5.3 การบริหารและตรวจสอบสำหรับผู้บริหาร (Admin):'),
          bullet('ระบบเงินเดือนและค่าตอบแทน (Payroll):', 'คลิกเมนู "เงินเดือน" ระบบจะดึงเคสที่นักบำบัดให้บริการจริงมาคำนวณค่าเวรและค่าคอมมิชชันให้อัตโนมัติ'),
          bullet('การตรวจสอบประวัติการทำงาน (Activity Logs):', 'ตรวจสอบย้อนหลังได้ว่า ผู้ใช้งานท่านใดทำรายการเพิ่ม แก้ไข หรือลบข้อมูลใด เมื่อเวลาใด เพื่อความโปร่งใสและปลอดภัยสูงสุดตามกฎหมาย PDPA')
        ]
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  
  const rootPath = path.join(WORKSPACE_DIR, 'คู่มือการใช้งานระบบ_HugDeeHome_Clinic.docx');
  fs.writeFileSync(rootPath, buffer);
  console.log('Saved Word document to root:', rootPath, buffer.length, 'bytes');

  const artifactPath = path.join(ARTIFACT_DIR, 'คู่มือการใช้งานระบบ_HugDeeHome_Clinic.docx');
  fs.writeFileSync(artifactPath, buffer);
  console.log('Saved Word document to artifact dir:', artifactPath, buffer.length, 'bytes');
}

buildDoc().catch(err => {
  console.error('Error building docx:', err);
  process.exit(1);
});
