const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_DIR = path.join(__dirname, 'public/richmenu_images');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 5 Rich Menu Configurations
const MENUS = [
  {
    id: 'rm-guest',
    filename: 'richmenu_1_guest.png',
    title: 'บ้านฮักดี คลินิกกิจกรรมบำบัด | Hug Dee Home Clinic',
    subtitle: 'ยินดีต้อนรับทุกท่าน 🤎 บริการประเมินและส่งเสริมพัฒนาการเด็กครบวงจร',
    headerTheme: { bg: 'linear-gradient(135deg, #C19B6C, #9B784A)', color: '#FFFFFF', tag: 'บุคคลทั่วไป (Guest)' },
    gridTheme: { bg: '#FDFBF7', border: '#E7DDD0' },
    buttons: [
      {
        icon: '🏥',
        badge: 'แนะนำ',
        badgeBg: '#10B981',
        title: 'บริการของเรา',
        desc: 'กิจกรรมบำบัด ฝึกพูด ปรับพฤติกรรม',
        color: '#0E7490',
        bg: '#F0FDFA'
      },
      {
        icon: '👶',
        badge: 'ออนไลน์',
        badgeBg: '#3B82F6',
        title: 'ลงทะเบียนคนไข้ใหม่',
        desc: 'กรอกประวัติเบื้องต้นก่อนพบคุณครู',
        color: '#2563EB',
        bg: '#EFF6FF'
      },
      {
        icon: '📍',
        badge: 'พิกัด',
        badgeBg: '#8B5CF6',
        title: 'แผนที่ & เวลาทำการ',
        desc: 'Google Maps นำทาง & วันเวลาเปิด-ปิด',
        color: '#7C3AED',
        bg: '#FAF5FF'
      },
      {
        icon: '💬',
        badge: 'สายด่วน',
        badgeBg: '#EF4444',
        title: 'ปรึกษา / ติดต่อเรา',
        desc: 'โทร 094-675-3557 หรือแชทกับเจ้าหน้าที่',
        color: '#DC2626',
        bg: '#FEF2F2'
      },
      {
        icon: '🔑',
        badge: 'สิทธิพิเศษ',
        badgeBg: '#D97706',
        title: 'เชื่อมต่อบัญชี / ตรวจสิทธิ์',
        desc: 'ยืนยันเบอร์โทร/HN เพื่อเปิดเมนูเฉพาะคุณ',
        color: '#B45309',
        bg: '#FFFBEB'
      },
      {
        icon: '🎁',
        badge: 'โปรโมชัน',
        badgeBg: '#059669',
        title: 'โปรโมชัน & แพ็กเกจคอร์ส',
        desc: 'แพ็กเกจคอร์สพัฒนาการ & สิทธิพิเศษประจำเดือน',
        color: '#059669',
        bg: '#ECFDF5'
      }
    ]
  },
  {
    id: 'rm-parent',
    filename: 'richmenu_2_parent.png',
    title: 'Hug Dee Home | พอร์ทัลผู้ปกครอง (Parent Portal)',
    subtitle: 'ติดตามพัฒนาการ นัดหมาย และกิจกรรมฝึกที่บ้านของลูกน้อยอย่างใกล้ชิด',
    headerTheme: { bg: 'linear-gradient(135deg, #059669, #047857)', color: '#FFFFFF', tag: 'ผู้ปกครอง (Parent)' },
    gridTheme: { bg: '#F8FAF9', border: '#D1E7DD' },
    buttons: [
      {
        icon: '📅',
        badge: 'นัดถัดไป',
        badgeBg: '#10B981',
        title: 'นัดหมายของน้อง',
        desc: 'เช็กวัน-เวลา ห้องตรวจ กดยืนยันการมา',
        color: '#047857',
        bg: '#ECFDF5'
      },
      {
        icon: '📈',
        badge: 'อัปเดตใหม่',
        badgeBg: '#3B82F6',
        title: 'พัฒนาการ & แผน ITP',
        desc: 'เป้าหมายบำบัดรายบุคคล & กราฟความก้าวหน้า',
        color: '#1D4ED8',
        bg: '#EFF6FF'
      },
      {
        icon: '🧩',
        badge: 'การบ้าน',
        badgeBg: '#F59E0B',
        title: 'กิจกรรมฝึกที่บ้าน',
        desc: 'Home Program & Sensory Diet Card ล่าสุด',
        color: '#B45309',
        bg: '#FFFBEB'
      },
      {
        icon: '💳',
        badge: 'ยอด & แต้ม',
        badgeBg: '#6366F1',
        title: 'คอร์ส ยอดคงเหลือ & แต้มสะสม',
        desc: 'เช็กชั่วโมงคงเหลือ แต้มสะสม & ประวัติใบเสร็จ',
        color: '#4F46E5',
        bg: '#EEF2FF'
      },
      {
        icon: '📞',
        badge: 'แจ้งล่วงหน้า',
        badgeBg: '#EC4899',
        title: 'แจ้งเลื่อนนัด / คุยกับครู',
        desc: 'แจ้งธุรการขอย้ายวัน หรือฝากข้อความถึงนักบำบัด',
        color: '#BE185D',
        bg: '#FDF2F8'
      },
      {
        icon: '👤',
        badge: 'จัดการ',
        badgeBg: '#64748B',
        title: 'โปรไฟล์น้อง / สลับบัญชี',
        desc: 'สลับดูน้องคนที่ 1 หรือคนที่ 2 (Multi-Child)',
        color: '#334155',
        bg: '#F1F5F9'
      }
    ]
  },
  {
    id: 'rm-staff',
    filename: 'richmenu_3_staff.png',
    title: 'Hug Dee Home | เมนูเจ้าหน้าที่และธุรการ (Staff Portal)',
    subtitle: 'ระบบอำนวยความสะดวกสำหรับฝ่ายต้อนรับ บิล และการจัดการคิวหน้าคลินิก',
    headerTheme: { bg: 'linear-gradient(135deg, #0284C7, #0369A1)', color: '#FFFFFF', tag: 'เจ้าหน้าที่คลินิก (Staff)' },
    gridTheme: { bg: '#F8FAFC', border: '#BAE6FD' },
    buttons: [
      {
        icon: '🕒',
        badge: 'GPS',
        badgeBg: '#059669',
        title: 'ลงเวลางาน (GPS Check-in)',
        desc: 'บันทึกเวลาเข้างาน-ออกงาน ผ่านพิกัดคลินิก',
        color: '#0369A1',
        bg: '#F0F9FF'
      },
      {
        icon: '🛎️',
        badge: 'หน้าเคาน์เตอร์',
        badgeBg: '#3B82F6',
        title: 'Check-in รับคนไข้',
        desc: 'รับผู้รับบริการหน้าคลินิก ส่งเข้าห้องตรวจ',
        color: '#1D4ED8',
        bg: '#EFF6FF'
      },
      {
        icon: '📢',
        badge: 'คลิกเดียว',
        badgeBg: '#10B981',
        title: 'ส่ง LINE เตือนนัดกลุ่ม',
        desc: 'ยิงการ์ดเตือนนัดหมายพรุ่งนี้เข้า LINE ผู้ปกครอง',
        color: '#047857',
        bg: '#ECFDF5'
      },
      {
        icon: '🧾',
        badge: 'POS บิล',
        badgeBg: '#F59E0B',
        title: 'ออกใบเสร็จ & ตัดคอร์ส',
        desc: 'ออกใบเสร็จรับเงิน คิดเงิน และตัดรอบคอร์ส',
        color: '#B45309',
        bg: '#FFFBEB'
      },
      {
        icon: '📞',
        badge: '≥ 30 วัน',
        badgeBg: '#EF4444',
        title: 'คนไข้ขาดการติดต่อ (Dormant)',
        desc: 'รายชื่อเคสที่ควรโทรติดตามอาการ พร้อมปุ่มโทร',
        color: '#DC2626',
        bg: '#FEF2F2'
      },
      {
        icon: '🔄',
        badge: 'สลับ 1, 3',
        badgeBg: '#6366F1',
        title: 'สลับมุมมอง (Switch View)',
        desc: 'สลับดู: [1] ทั่วไป ↔ [3] เจ้าหน้าที่',
        color: '#4F46E5',
        bg: '#EEF2FF'
      }
    ]
  },
  {
    id: 'rm-ot',
    filename: 'richmenu_4_ot.png',
    title: 'Hug Dee Home | เมนูกิจกรรมบำบัด (Therapist Portal)',
    subtitle: 'เครื่องมือคลินิกสำหรับนักกิจกรรมบำบัด: ตารางสอน บันทึก OPD แผน ITP',
    headerTheme: { bg: 'linear-gradient(135deg, #EA580C, #C2410C)', color: '#FFFFFF', tag: 'นักกิจกรรมบำบัด (OT)' },
    gridTheme: { bg: '#FFFBF7', border: '#FED7AA' },
    buttons: [
      {
        icon: '🕒',
        badge: 'GPS',
        badgeBg: '#059669',
        title: 'ลงเวลางาน (GPS Check-in)',
        desc: 'บันทึกเวลาเข้างาน-ออกงาน ผ่านพิกัดคลินิก',
        color: '#C2410C',
        bg: '#FFF7ED'
      },
      {
        icon: '📋',
        badge: 'เคสวันนี้',
        badgeBg: '#3B82F6',
        title: 'ตารางเคสของฉันวันนี้',
        desc: 'ดูรายชื่อน้องและชั่วโมงบำบัดที่ต้องสอนวันนี้',
        color: '#1D4ED8',
        bg: '#EFF6FF'
      },
      {
        icon: '📝',
        badge: 'SOAP Notes',
        badgeBg: '#10B981',
        title: 'บันทึกผลการฝึก (OPD)',
        desc: 'บันทึก Subjective, Objective, Assessment, Plan',
        color: '#047857',
        bg: '#ECFDF5'
      },
      {
        icon: '🎯',
        badge: 'Milestone',
        badgeBg: '#8B5CF6',
        title: 'เป้าหมายบำบัด (ITP)',
        desc: 'ตั้งเป้าหมายรายบุคคล & เลื่อนแถบความก้าวหน้า',
        color: '#7C3AED',
        bg: '#FAF5FF'
      },
      {
        icon: '🧩',
        badge: 'Home Diet',
        badgeBg: '#F59E0B',
        title: 'กิจกรรมฝึกที่บ้าน (Home Program)',
        desc: 'ออกแบบชุดฝึก คัดลอกส่ง LINE หรือพิมพ์การ์ด',
        color: '#B45309',
        bg: '#FFFBEB'
      },
      {
        icon: '🔄',
        badge: 'สลับ 1, 4',
        badgeBg: '#6366F1',
        title: 'สลับมุมมอง (Switch View)',
        desc: 'สลับดู: [1] ทั่วไป ↔ [4] นักบำบัด',
        color: '#4F46E5',
        bg: '#EEF2FF'
      }
    ]
  },
  {
    id: 'rm-admin',
    filename: 'richmenu_5_admin.png',
    title: 'Hug Dee Home | ศูนย์บัญชาการผู้บริหาร (Executive Admin)',
    subtitle: 'แดชบอร์ดสถิติ การเงิน ตรวจสอบเวลาทำงาน และระบบควบคุม LINE OA',
    headerTheme: { bg: 'linear-gradient(135deg, #7C3AED, #4C1D95)', color: '#FFFFFF', tag: 'ผู้ดูแลระบบ (Admin)' },
    gridTheme: { bg: '#FAF8FD', border: '#DDD6FE' },
    buttons: [
      {
        icon: '📊',
        badge: 'Real-time',
        badgeBg: '#10B981',
        title: 'แดชบอร์ดภาพรวมคลินิก',
        desc: 'ยอดเคสวันนี้ รายได้รวม อัตราครองห้อง',
        color: '#5B21B6',
        bg: '#F5F3FF'
      },
      {
        icon: '👥',
        badge: 'ทุกคน',
        badgeBg: '#3B82F6',
        title: 'ตรวจสอบเวลาบุคลากร',
        desc: 'มอนิเตอร์เวลาเข้า-ออกงานของพนักงานทุกคน',
        color: '#1D4ED8',
        bg: '#EFF6FF'
      },
      {
        icon: '💰',
        badge: 'Payroll',
        badgeBg: '#F59E0B',
        title: 'สรุปการเงิน & เงินเดือน',
        desc: 'รายงานรายรับ บิลค้างจ่าย ค่าตอบแทนนักบำบัด',
        color: '#B45309',
        bg: '#FFFBEB'
      },
      {
        icon: '🔔',
        badge: 'Retention',
        badgeBg: '#EF4444',
        title: 'คนไข้ขาดการติดต่อ (Dormant)',
        desc: 'มอนิเตอร์อัตราการรักษาต่อเนื่องของคนไข้',
        color: '#DC2626',
        bg: '#FEF2F2'
      },
      {
        icon: '⚙️',
        badge: 'Management',
        badgeBg: '#059669',
        title: 'ควบคุม LINE & ระบบคลินิก',
        desc: 'จัดการ Rich Menu, ตั้งค่าระบบ และสิทธิ์ผู้ใช้',
        color: '#047857',
        bg: '#ECFDF5'
      },
      {
        icon: '🔀',
        badge: 'สลับทุกแบบ',
        badgeBg: '#D97706',
        title: 'สลับมุมมองอิสระ (Master Switch)',
        desc: 'สลับดูได้ทุกโหมด: [1] [2] [3] [4] [5] ในคลิกเดียว',
        color: '#92400E',
        bg: '#FEF3C7'
      }
    ]
  }
];

function generateHTML(menu) {
  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&family=Prompt:wght@400;500;600;700;800&display=swap');

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      width: 2500px;
      height: 1686px;
      overflow: hidden;
      background: ${menu.gridTheme.bg};
      font-family: 'Prompt', 'Sarabun', 'Leelawadee UI', Tahoma, sans-serif;
      display: flex;
      flex-direction: column;
    }

    /* Top Brand & Role Header Bar (Height: 140px) */
    .header-bar {
      height: 140px;
      background: ${menu.headerTheme.bg};
      color: ${menu.headerTheme.color};
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 50px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.15);
      z-index: 10;
      position: relative;
    }

    .header-title-box {
      display: flex;
      flex-direction: column;
    }

    .header-main-title {
      font-size: 42px;
      font-weight: 800;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .header-subtitle {
      font-size: 26px;
      font-family: 'Sarabun', sans-serif;
      opacity: 0.92;
      margin-top: 4px;
    }

    .role-tag {
      background: rgba(255, 255, 255, 0.22);
      border: 2px solid rgba(255, 255, 255, 0.4);
      padding: 10px 28px;
      border-radius: 9999px;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 1px;
      backdrop-filter: blur(10px);
    }

    /* Grid Layout: 3 Columns x 2 Rows (Total Height: 1546px => 773px per row) */
    .grid-container {
      width: 2500px;
      height: 1546px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-template-rows: repeat(2, 1fr);
      gap: 14px;
      padding: 14px;
      background: #CBD5E1;
    }

    .menu-card {
      background: #FFFFFF;
      border-radius: 28px;
      padding: 40px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 6px 16px rgba(0,0,0,0.04);
      position: relative;
      border: 3px solid #F1F5F9;
    }

    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .icon-box {
      width: 130px;
      height: 130px;
      border-radius: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 74px;
      box-shadow: 0 8px 20px rgba(0,0,0,0.06);
    }

    .badge-pill {
      font-size: 24px;
      font-weight: 700;
      padding: 8px 22px;
      border-radius: 9999px;
      color: #FFFFFF;
      box-shadow: 0 4px 12px rgba(0,0,0,0.12);
    }

    .card-bottom {
      margin-top: auto;
    }

    .btn-title {
      font-size: 48px;
      font-weight: 800;
      line-height: 1.25;
      margin-bottom: 12px;
    }

    .btn-desc {
      font-size: 28px;
      font-family: 'Sarabun', sans-serif;
      color: #64748B;
      line-height: 1.45;
      font-weight: 500;
    }

    .action-indicator {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 24px;
      font-weight: 700;
      margin-top: 14px;
      padding: 6px 18px;
      border-radius: 12px;
      background: #F8FAFC;
      border: 1.5px solid #E2E8F0;
    }
  </style>
</head>
<body>
  <div class="header-bar">
    <div class="header-title-box">
      <div class="header-main-title">
        <span>🏡</span>
        <span>${menu.title}</span>
      </div>
      <div class="header-subtitle">${menu.subtitle}</div>
    </div>
    <div class="role-tag">${menu.headerTheme.tag}</div>
  </div>

  <div class="grid-container">
    ${menu.buttons.map(btn => `
      <div class="menu-card">
        <div class="card-top">
          <div class="icon-box" style="background: ${btn.bg}; border: 3px solid ${btn.color}30;">
            ${btn.icon}
          </div>
          <div class="badge-pill" style="background: ${btn.badgeBg};">
            ${btn.badge}
          </div>
        </div>
        <div class="card-bottom">
          <div class="btn-title" style="color: ${btn.color};">
            ${btn.title}
          </div>
          <div class="btn-desc">
            ${btn.desc}
          </div>
          <div class="action-indicator" style="color: ${btn.color};">
            <span>แตะเพื่อเลือก</span>
            <span>➔</span>
          </div>
        </div>
      </div>
    `).join('')}
  </div>
</body>
</html>`;
}

function renderAll() {
  console.log('Rendering 5 Rich Menu PNGs using Headless Chrome CLI (2500 x 1686 px)...');

  const tempHtmlPath = path.join(__dirname, 'temp_richmenu.html');

  for (const menu of MENUS) {
    const html = generateHTML(menu);
    fs.writeFileSync(tempHtmlPath, html, 'utf8');

    const outPath = path.join(OUTPUT_DIR, menu.filename);
    const cmd = `"${CHROME_PATH}" --headless --disable-gpu --hide-scrollbars --window-size=2500,1686 --screenshot="${outPath}" "file:///${tempHtmlPath.replace(/\\/g, '/')}"`;

    console.log(`Generating ${menu.filename}...`);
    execSync(cmd, { stdio: 'inherit' });

    if (fs.existsSync(outPath)) {
      const stats = fs.statSync(outPath);
      console.log(`✓ Created: ${menu.filename} (${stats.size} bytes)`);
    } else {
      console.error(`Failed to create: ${menu.filename}`);
    }
  }

  if (fs.existsSync(tempHtmlPath)) {
    fs.unlinkSync(tempHtmlPath);
  }

  console.log('All 5 Rich Menu images successfully generated!');
}

renderAll();
