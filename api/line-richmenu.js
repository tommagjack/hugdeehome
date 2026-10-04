// Backend Serverless API Proxy for LINE OA Rich Menu Management
import fs from 'fs';
import path from 'path';

function loadEnv() {
  const env = {
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
  };
  
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
    try {
      const envPath = path.join(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
          const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
          if (match) {
            env[match[1]] = match[2].trim();
          }
        });
      }
    } catch (e) {
      console.warn('Could not load .env file:', e.message);
    }
  }
  
  if (!env.VITE_SUPABASE_URL) {
    env.VITE_SUPABASE_URL = 'https://bmplfuzkyyuqtlfgifvm.supabase.co';
  }
  if (!env.VITE_SUPABASE_ANON_KEY) {
    env.VITE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtcGxmdXpreXl1cXRsZmdpZnZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMTgwNjcsImV4cCI6MjA5Nzc5NDA2N30.mhegnIyPtEq9zFL70wb0W9Ivz7YP3wVU0OUR0fUR_BE';
  }
  
  return env;
}

// Helper to fetch clinic credentials
async function getClinicCredentials(env) {
  const dbKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;
  let token = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
  let liffId = '2008270606-7bkwSGyt';
  let phone = '0946753557';
  let appUrl = 'https://hugdeehome.vercel.app';

  try {
    const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/clinic_info?select=line_channel_access_token,phone,line_id,liff_id&limit=1`, {
      headers: {
        'apikey': dbKey,
        'Authorization': `Bearer ${dbKey}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data[0]) {
        token = data[0].line_channel_access_token || token;
        liffId = data[0].liff_id || liffId;
        phone = data[0].phone || phone;
      }
    }
  } catch (err) {
    console.error('Error fetching clinic credentials:', err);
  }

  return { token, liffId, phone, appUrl };
}

// 6 standard grid areas for 2500 x 1686 px (3 columns x 2 rows)
function getGridAreas(actions) {
  const areas = [
    { bounds: { x: 0, y: 0, width: 833, height: 843 }, action: actions[0] },
    { bounds: { x: 833, y: 0, width: 834, height: 843 }, action: actions[1] },
    { bounds: { x: 1667, y: 0, width: 833, height: 843 }, action: actions[2] },
    { bounds: { x: 0, y: 843, width: 833, height: 843 }, action: actions[3] },
    { bounds: { x: 833, y: 843, width: 834, height: 843 }, action: actions[4] },
    { bounds: { x: 1667, y: 843, width: 833, height: 843 }, action: actions[5] }
  ];
  return areas;
}

export default async function handler(req, res) {
  const env = loadEnv();
  const dbKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;
  const { action } = req.query;

  try {
    const { token, liffId, phone, appUrl } = await getClinicCredentials(env);
    const liffBase = liffId ? `https://liff.line.me/${liffId}` : appUrl;

    if (!token) {
      return res.status(400).json({ error: 'Missing LINE Channel Access Token in clinic settings' });
    }

    // 1. ACTION: LIST current Rich Menus in LINE
    if (action === 'list') {
      const listRes = await fetch('https://api.line.me/v2/bot/richmenu/list', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const listData = await listRes.json();

      let defaultMenuId = null;
      try {
        const defRes = await fetch('https://api.line.me/v2/bot/user/all/richmenu', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (defRes.ok) {
          const defData = await defRes.json();
          defaultMenuId = defData.richMenuId;
        }
      } catch (e) {}

      let aliases = [];
      try {
        const aliasRes = await fetch('https://api.line.me/v2/bot/richmenu/alias/list', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (aliasRes.ok) {
          const aliasData = await aliasRes.json();
          aliases = aliasData.aliases || [];
        }
      } catch (e) {}

      return res.status(200).json({
        success: true,
        richmenus: listData.richmenus || [],
        defaultMenuId,
        aliases
      });
    }

    // 1.1 ACTION: GET BUTTON CONFIG & CUSTOM IMAGES
    if (action === 'get-config') {
      const cfgPath = path.join(process.cwd(), 'public/richmenu_config.json');
      let configData = null;
      let imagesData = {};

      if (fs.existsSync(cfgPath)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
          if (parsed.config) {
            configData = parsed.config;
            imagesData = parsed.images || {};
          } else {
            configData = parsed;
          }
        } catch (e) {
          console.warn('Failed to parse richmenu_config.json:', e);
        }
      }

      // Check for any physical custom image files on disk
      const imgDir = path.join(process.cwd(), 'public/richmenu_images');
      ['guest', 'parent', 'staff', 'ot', 'admin'].forEach(k => {
        const customJpg = path.join(imgDir, `custom_${k}.jpg`);
        const customPng = path.join(imgDir, `custom_${k}.png`);
        if (fs.existsSync(customJpg)) {
          imagesData[k] = `/richmenu_images/custom_${k}.jpg?t=${fs.statSync(customJpg).mtimeMs}`;
        } else if (fs.existsSync(customPng)) {
          imagesData[k] = `/richmenu_images/custom_${k}.png?t=${fs.statSync(customPng).mtimeMs}`;
        }
      });

      return res.status(200).json({ success: true, config: configData, images: imagesData });
    }

    // 1.2 ACTION: SAVE BUTTON CONFIG & CUSTOM IMAGES
    if (action === 'save-config') {
      const { config, images } = req.body || {};
      if (!config) {
        return res.status(400).json({ error: 'Missing config payload' });
      }

      // Handle custom images if provided
      if (images && typeof images === 'object') {
        const imgDirs = [
          path.join(process.cwd(), 'public/richmenu_images'),
          path.join('/tmp', 'richmenu_images')
        ];

        for (const dir of imgDirs) {
          try {
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

            for (const [key, val] of Object.entries(images)) {
              const customPng = path.join(dir, `custom_${key}.png`);
              const customJpg = path.join(dir, `custom_${key}.jpg`);

              if (val === null || val === 'default') {
                if (fs.existsSync(customPng)) fs.unlinkSync(customPng);
                if (fs.existsSync(customJpg)) fs.unlinkSync(customJpg);
              } else if (typeof val === 'string' && val.includes('base64,')) {
                const isJpg = val.startsWith('data:image/jpeg');
                const base64Data = val.split('base64,').pop();
                const buffer = Buffer.from(base64Data, 'base64');
                const targetFile = isJpg ? customJpg : customPng;
                fs.writeFileSync(targetFile, buffer);
              }
            }
          } catch (e) {
            // Read-only fallback gracefully caught
          }
        }
      }

      // Save config to both public and /tmp
      const cfgPaths = [
        path.join(process.cwd(), 'public/richmenu_config.json'),
        path.join('/tmp', 'richmenu_config.json')
      ];
      for (const p of cfgPaths) {
        try {
          fs.writeFileSync(p, JSON.stringify(config, null, 2), 'utf8');
        } catch (e) {}
      }

      return res.status(200).json({ success: true, message: 'บันทึกการตั้งค่าปุ่มและรูปภาพ Rich Menu สำเร็จ' });
    }

    // 2. ACTION: DEPLOY ALL 5 RICH MENUS
    if (action === 'deploy-all') {
      console.log('Deploying all 5 Rich Menus to LINE...');

      let customConfig = req.body?.config || null;
      if (!customConfig) {
        const cfgPaths = [
          path.join(process.cwd(), 'public/richmenu_config.json'),
          path.join('/tmp', 'richmenu_config.json')
        ];
        for (const p of cfgPaths) {
          try {
            if (fs.existsSync(p)) {
              const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
              customConfig = parsed.config || parsed;
              break;
            }
          } catch (e) {}
        }
      }

      const resolveSlotAction = (slot, fallbackAction) => {
        if (!slot) return fallbackAction;
        if (slot.type === 'message') {
          return {
            type: 'message',
            label: (slot.label || fallbackAction.label || '').slice(0, 20),
            text: (slot.value || fallbackAction.text || slot.label || '').slice(0, 300)
          };
        }
        let rawVal = (slot.value || '').trim();
        rawVal = rawVal.replace('{phone}', phone);
        let finalUri = rawVal;

        // LINE Messaging API strictly enforces http:// or https:// (bans tel: scheme in Rich Menus)
        // Automatically convert any tel: or phone number into a valid HTTPS call redirector endpoint
        if (rawVal.startsWith('tel:') || rawVal.includes('tel:')) {
          const rawNum = rawVal.replace(/^.*tel:/, '').replace(/[{}]/g, '').trim() || phone || '0946753557';
          const cleanPhone = rawNum.replace(/\D/g, '') || '0946753557';
          finalUri = `${appUrl}/api/call?phone=${cleanPhone}`;
        } else if (rawVal === '?action=call' || rawVal.startsWith('?action=call')) {
          const cleanPhone = (phone || '0946753557').replace(/\D/g, '');
          finalUri = `${appUrl}/api/call?phone=${cleanPhone}`;
        } else if (rawVal.startsWith('alias:') || rawVal.includes('api/link')) {
          const aliasName = rawVal.replace(/^alias:/, '').replace(/^.*alias=/, '').split('&')[0].trim();
          finalUri = `${appUrl}/api/link?alias=${aliasName}`;
        } else if (rawVal.includes('salary')) {
          finalUri = `${appUrl}/#salary`;
        } else if (rawVal.includes('register-patient') || rawVal.includes('patient-form')) {
          finalUri = `${appUrl}/#/register-patient`;
        } else if (rawVal.includes('line-link')) {
          finalUri = liffId ? `https://liff.line.me/${liffId}?action=line-link` : `${appUrl}/#/line-link`;
        } else if (rawVal.includes('services')) {
          finalUri = `${appUrl}/#/services`;
        } else if (rawVal.includes('checkin')) {
          finalUri = `${appUrl}/#/checkin`;
        } else if (rawVal.includes('menu-switch')) {
          const roleMatch = rawVal.match(/role=([a-zA-Z0-9_-]+)/);
          const roleParam = roleMatch ? `&role=${roleMatch[1]}` : '';
          finalUri = liffId ? `https://liff.line.me/${liffId}?action=menu-switch${roleParam}` : `${appUrl}/#/line-link?action=menu-switch${roleParam}`;
        } else if (rawVal.includes('parent-appointments')) {
          finalUri = liffId ? `https://liff.line.me/${liffId}?action=parent-appointments` : `${appUrl}/#/line-link?tab=appointments`;
        } else if (rawVal.includes('parent-itp')) {
          finalUri = liffId ? `https://liff.line.me/${liffId}?action=parent-itp` : `${appUrl}/#/line-link?tab=itp`;
        } else if (rawVal.includes('parent-homeprogram')) {
          finalUri = liffId ? `https://liff.line.me/${liffId}?action=parent-homeprogram` : `${appUrl}/#/line-link?tab=homeprogram`;
        } else if (rawVal.includes('parent-courses')) {
          finalUri = liffId ? `https://liff.line.me/${liffId}?action=parent-courses` : `${appUrl}/#/line-link?tab=courses`;
        } else if (rawVal.includes('reception-intake')) {
          finalUri = `${appUrl}/#/register-patient`;
        } else if (rawVal.includes('batch-reminders')) {
          finalUri = `${appUrl}/#dashboard`;
        } else if (rawVal.includes('receipts')) {
          finalUri = `${appUrl}/#receipts`;
        } else if (rawVal.includes('dormant-tracker')) {
          finalUri = `${appUrl}/#dashboard`;
        } else if (rawVal.includes('my-cases')) {
          finalUri = `${appUrl}/#appointments`;
        } else if (rawVal.includes('opd-soap')) {
          finalUri = `${appUrl}/#opd`;
        } else if (rawVal.includes('itp-tracker') || rawVal.includes('home-program-planner')) {
          finalUri = `${appUrl}/#itp`;
        } else if (rawVal.includes('dashboard')) {
          finalUri = `${appUrl}/`;
        } else if (rawVal.includes('staff-attendance')) {
          finalUri = `${appUrl}/#attendance`;
        } else if (rawVal.includes('financial-payroll')) {
          finalUri = `${appUrl}/#salary`;
        } else if (rawVal.includes('line-manager')) {
          finalUri = `${appUrl}/#line-manager`;
        } else if (rawVal.startsWith('?action=') || rawVal.startsWith('action=')) {
          const act = rawVal.replace(/^\??action=/, '');
          finalUri = `${appUrl}/#/${act}`;
        } else if (!rawVal.startsWith('http://') && !rawVal.startsWith('https://')) {
          finalUri = `${appUrl}/${rawVal.replace(/^\/+/, '')}`;
        }

        // Safety fallback: Ensure URI is strictly https:// or http://
        if (!finalUri.startsWith('http://') && !finalUri.startsWith('https://')) {
          finalUri = `${appUrl}${finalUri.startsWith('/') ? finalUri : '/' + finalUri}`;
        }

        return {
          type: 'uri',
          label: (slot.label || fallbackAction.label || '').slice(0, 20),
          uri: finalUri
        };
      };

      // LINE Messaging API strictly enforces chatBarText <= 14 characters/graphemes
      const truncateChatBar = (str) => {
        if (!str) return 'เมนูหลัก';
        try {
          const segmenter = new Intl.Segmenter('th', { granularity: 'grapheme' });
          const graphemes = [...segmenter.segment(str.trim())].map(x => x.segment);
          if (graphemes.length > 14) {
            return graphemes.slice(0, 14).join('');
          }
          return str.trim();
        } catch (e) {
          return str.trim().slice(0, 14);
        }
      };

      const menuConfigs = [
        {
          key: 'guest',
          aliasId: 'rm-guest',
          name: 'HDH_RichMenu_1_Guest',
          imageFile: 'richmenu_1_guest.png',
          chatBarText: 'เมนูทั่วไป 🏡',
          isDefault: true,
          actions: [
            { type: 'uri', label: 'บริการของเรา', uri: `${appUrl}/#/services` },
            { type: 'uri', label: 'ลงทะเบียนคนไข้ใหม่', uri: `${appUrl}/#/register-patient` },
            { type: 'uri', label: 'แผนที่คลินิก', uri: 'https://maps.google.com/?q=Hug+Dee+Home+Clinic' },
            { type: 'uri', label: 'โทรติดต่อคลินิก', uri: `${appUrl}/api/call?phone=${(phone || '0946753557').replace(/\D/g, '')}` },
            { type: 'uri', label: 'เชื่อมต่อบัญชี / ตรวจสิทธิ์', uri: liffId ? `https://liff.line.me/${liffId}?action=line-link` : `${appUrl}/#/line-link` },
            { type: 'message', label: 'สิทธิประโยชน์ & โปรโมชัน', text: 'สนใจสอบถามแพ็กเกจคอร์สกิจกรรมบำบัดและโปรโมชันค่ะ 🤎' }
          ]
        },
        {
          key: 'parent',
          aliasId: 'rm-parent',
          name: 'HDH_RichMenu_2_Parent',
          imageFile: 'richmenu_2_parent.png',
          chatBarText: 'เมนูผู้ปกครอง 👶',
          isDefault: false,
          actions: [
            { type: 'uri', label: 'นัดหมายของน้อง', uri: liffId ? `https://liff.line.me/${liffId}?action=parent-appointments` : `${appUrl}/#/line-link?tab=appointments` },
            { type: 'uri', label: 'พัฒนาการ & แผน ITP', uri: liffId ? `https://liff.line.me/${liffId}?action=parent-itp` : `${appUrl}/#/line-link?tab=itp` },
            { type: 'uri', label: 'กิจกรรมฝึกที่บ้าน', uri: liffId ? `https://liff.line.me/${liffId}?action=parent-homeprogram` : `${appUrl}/#/line-link?tab=homeprogram` },
            { type: 'uri', label: 'คอร์ส & ยอดคงเหลือ', uri: liffId ? `https://liff.line.me/${liffId}?action=parent-courses` : `${appUrl}/#/line-link?tab=courses` },
            { type: 'message', label: 'แจ้งเลื่อนนัด / คุยกับครู', text: 'ขออนุญาตติดต่อเจ้าหน้าที่เรื่องวันนัดหมายของน้องค่ะ 🤎' },
            { type: 'uri', label: 'โปรไฟล์น้อง / สลับบัญชี', uri: liffId ? `https://liff.line.me/${liffId}?action=line-link` : `${appUrl}/#/line-link` }
          ]
        },
        {
          key: 'staff',
          aliasId: 'rm-staff',
          name: 'HDH_RichMenu_3_Staff',
          imageFile: 'richmenu_3_staff.png',
          chatBarText: 'เมนูเจ้าหน้าที่ 🛎️',
          isDefault: false,
          actions: [
            { type: 'uri', label: 'ลงเวลางาน GPS', uri: `${appUrl}/#/checkin` },
            { type: 'uri', label: 'Check-in รับคนไข้', uri: `${appUrl}/#/register-patient` },
            { type: 'uri', label: 'ส่ง LINE เตือนนัดกลุ่ม', uri: `${appUrl}/#dashboard` },
            { type: 'uri', label: 'ออกใบเสร็จ & ตัดคอร์ส', uri: `${appUrl}/#receipts` },
            { type: 'uri', label: 'คนไข้ขาดการติดต่อ', uri: `${appUrl}/#dashboard` },
            { type: 'uri', label: 'สลับมุมมอง', uri: liffId ? `https://liff.line.me/${liffId}?action=menu-switch&role=staff` : `${appUrl}/#/line-link?action=menu-switch&role=staff` }
          ]
        },
        {
          key: 'ot',
          aliasId: 'rm-ot',
          name: 'HDH_RichMenu_4_OT',
          imageFile: 'richmenu_4_ot.png',
          chatBarText: 'เมนูนักบำบัด 🧩',
          isDefault: false,
          actions: [
            { type: 'uri', label: 'ลงเวลางาน GPS', uri: `${appUrl}/#/checkin` },
            { type: 'uri', label: 'ตารางเคสของฉันวันนี้', uri: `${appUrl}/#appointments` },
            { type: 'uri', label: 'บันทึกผลการฝึก (OPD)', uri: `${appUrl}/#opd` },
            { type: 'uri', label: 'เป้าหมายบำบัด (ITP)', uri: `${appUrl}/#itp` },
            { type: 'uri', label: 'กิจกรรมฝึกที่บ้าน', uri: `${appUrl}/#itp` },
            { type: 'uri', label: 'สลับมุมมอง', uri: liffId ? `https://liff.line.me/${liffId}?action=menu-switch&role=ot` : `${appUrl}/#/line-link?action=menu-switch&role=ot` }
          ]
        },
        {
          key: 'admin',
          aliasId: 'rm-admin',
          name: 'HDH_RichMenu_5_Admin',
          imageFile: 'richmenu_5_admin.png',
          chatBarText: 'เมนูผู้บริหาร 👑',
          isDefault: false,
          actions: [
            { type: 'uri', label: 'แดชบอร์ดภาพรวมคลินิก', uri: `${appUrl}/` },
            { type: 'uri', label: 'ตรวจสอบเวลาบุคลากร', uri: `${appUrl}/#attendance` },
            { type: 'uri', label: 'สรุปการเงิน & Payroll', uri: `${appUrl}/#salary` },
            { type: 'uri', label: 'คนไข้ขาดการติดต่อ', uri: `${appUrl}/#dashboard` },
            { type: 'uri', label: 'ควบคุม LINE & ระบบ', uri: `${appUrl}/#line-manager` },
            { type: 'uri', label: 'สลับมุมมองอิสระ', uri: liffId ? `https://liff.line.me/${liffId}?action=menu-switch&role=admin` : `${appUrl}/#/line-link?action=menu-switch&role=admin` }
          ]
        }
      ];

      // Override with customConfig if present
      if (customConfig) {
        menuConfigs.forEach(cfg => {
          const customList = customConfig[cfg.key] || customConfig.config?.[cfg.key];
          if (Array.isArray(customList) && customList.length > 0) {
            cfg.actions = cfg.actions.map((fallbackAction, idx) => {
              const customSlot = customList[idx];
              return resolveSlotAction(customSlot, fallbackAction);
            });
          }
        });
      }

      const deployedResults = {};

      for (const cfg of menuConfigs) {
        // 1. Create Rich Menu
        const payload = {
          size: { width: 2500, height: 1686 },
          selected: true,
          name: cfg.name,
          chatBarText: truncateChatBar(cfg.chatBarText),
          areas: getGridAreas(cfg.actions)
        };

        const createRes = await fetch('https://api.line.me/v2/bot/richmenu', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!createRes.ok) {
          const errData = await createRes.json();
          throw new Error(`Failed to create rich menu ${cfg.name}: ${JSON.stringify(errData)}`);
        }

        const { richMenuId } = await createRes.json();
        console.log(`Created ${cfg.name} with ID: ${richMenuId}`);

        // 2. Upload Image (Prioritize memory payload first, then custom disk file, then default template)
        let imgBuffer = null;
        let contentType = 'image/png';

        if (req.body?.images?.[cfg.key] && typeof req.body.images[cfg.key] === 'string' && req.body.images[cfg.key].includes('base64,')) {
          const raw = req.body.images[cfg.key].split('base64,').pop();
          imgBuffer = Buffer.from(raw, 'base64');
          contentType = req.body.images[cfg.key].startsWith('data:image/jpeg') ? 'image/jpeg' : 'image/png';
        } else {
          const possiblePaths = [
            path.join(process.cwd(), 'public/richmenu_images', `custom_${cfg.key}.jpg`),
            path.join(process.cwd(), 'public/richmenu_images', `custom_${cfg.key}.png`),
            path.join(process.cwd(), 'public/richmenu_images', cfg.imageFile),
            path.join('/tmp/richmenu_images', `custom_${cfg.key}.jpg`),
            path.join('/tmp/richmenu_images', `custom_${cfg.key}.png`)
          ];
          for (const p of possiblePaths) {
            if (fs.existsSync(p) && fs.statSync(p).size > 1000) {
              imgBuffer = fs.readFileSync(p);
              contentType = p.endsWith('.jpg') ? 'image/jpeg' : 'image/png';
              break;
            }
          }
        }

        if (imgBuffer) {
          const uploadRes = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': contentType
            },
            body: imgBuffer
          });

          if (!uploadRes.ok) {
            const errTxt = await uploadRes.text();
            console.error(`Failed to upload image for ${richMenuId}: status ${uploadRes.status}`, errTxt);
          } else {
            console.log(`Uploaded image for ${cfg.name} (${contentType})`);
          }
        } else {
          console.warn(`No image buffer found for ${cfg.name}`);
        }

        // 3. Set Default if Guest
        if (cfg.isDefault) {
          await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          console.log(`Set ${richMenuId} as DEFAULT Rich Menu`);
        }

        // 4. Create / Update Alias
        try {
          // Delete existing alias if any
          await fetch(`https://api.line.me/v2/bot/richmenu/alias/${cfg.aliasId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });

          // Create alias
          await fetch('https://api.line.me/v2/bot/richmenu/alias', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              richMenuAliasId: cfg.aliasId,
              richMenuId: richMenuId
            })
          });
          console.log(`Created alias ${cfg.aliasId} -> ${richMenuId}`);
        } catch (aliasErr) {
          console.warn(`Could not set alias ${cfg.aliasId}:`, aliasErr.message);
        }

        deployedResults[cfg.key] = richMenuId;
      }

      // Save deployed IDs into Supabase clinic_info
      try {
        await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/clinic_info?id=not.is.null`, {
          method: 'PATCH',
          headers: {
            'apikey': dbKey,
            'Authorization': `Bearer ${dbKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            rich_menu_data: JSON.stringify(deployedResults)
          })
        });
      } catch (saveErr) {
        console.warn('Could not save rich_menu_data to clinic_info table:', saveErr.message);
      }

      return res.status(200).json({
        success: true,
        message: 'Deployed all 5 Rich Menus successfully',
        menus: deployedResults
      });
    }

    // 3. ACTION: LINK / UNLINK USER ROLE
    if (action === 'link-user') {
      const { lineUserId, role, status } = req.body || {};
      if (!lineUserId) {
        return res.status(400).json({ error: 'Missing lineUserId' });
      }

      // SECURITY RULE: If status is inactive, UNLINK immediately and reset to Default (Guest)
      if (status && status.toLowerCase() === 'inactive') {
        await fetch(`https://api.line.me/v2/bot/user/${lineUserId}/richmenu`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        return res.status(200).json({
          success: true,
          action: 'unlinked_inactive',
          message: 'ผู้ใช้มีสถานะ Inactive ระบบได้ปลด Rich Menu กลับเป็นบุคคลทั่วไปแล้ว'
        });
      }

      // Get deployed menus from LINE list
      const listRes = await fetch('https://api.line.me/v2/bot/richmenu/list', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const listData = await listRes.json();
      const richmenus = listData.richmenus || [];

      let targetMenu = null;
      const cleanRole = (role || 'guest').toLowerCase();

      if (cleanRole === 'admin') {
        targetMenu = richmenus.find(m => m.name.includes('Admin'));
      } else if (cleanRole === 'ot') {
        targetMenu = richmenus.find(m => m.name.includes('OT'));
      } else if (cleanRole === 'staff') {
        targetMenu = richmenus.find(m => m.name.includes('Staff'));
      } else if (cleanRole === 'parent') {
        targetMenu = richmenus.find(m => m.name.includes('Parent'));
      }

      if (targetMenu) {
        const linkRes = await fetch(`https://api.line.me/v2/bot/user/${lineUserId}/richmenu/${targetMenu.richMenuId}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (linkRes.ok) {
          return res.status(200).json({
            success: true,
            role: cleanRole,
            richMenuId: targetMenu.richMenuId,
            message: `ผูกเมนู ${targetMenu.name} ให้กับผู้ใช้สำเร็จ`
          });
        } else {
          const err = await linkRes.json();
          return res.status(500).json({ error: 'LINE link error', details: err });
        }
      } else {
        // If guest or role not found, unlink to return to default
        await fetch(`https://api.line.me/v2/bot/user/${lineUserId}/richmenu`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        return res.status(200).json({
          success: true,
          role: 'guest',
          message: 'ผู้ใช้ถูกตั้งเป็นบุคคลทั่วไป (Default Guest Menu)'
        });
      }
    }

    // 4. ACTION: SWITCH USER MENU (Self-Service or Switcher Button)
    if (action === 'switch-user-menu') {
      const { lineUserId, targetRole } = req.body || {};
      if (!lineUserId || !targetRole) {
        return res.status(400).json({ error: 'Missing lineUserId or targetRole' });
      }

      // Check user permission in DB
      let allowedRoles = ['guest'];
      let userStatus = 'active';

      // Check users table
      const uRes = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/users?line_user_id=eq.${lineUserId}&select=role,status&limit=1`, {
        headers: { 'apikey': dbKey, 'Authorization': `Bearer ${dbKey}` }
      });
      if (uRes.ok) {
        const uData = await uRes.json();
        if (uData && uData[0]) {
          userStatus = uData[0].status || 'active';
          const r = (uData[0].role || '').toLowerCase();
          if (r === 'admin') allowedRoles = ['guest', 'parent', 'staff', 'ot', 'admin'];
          else if (r === 'ot') allowedRoles = ['guest', 'ot'];
          else if (r === 'staff') allowedRoles = ['guest', 'staff'];
        }
      }

      // Check patients table if not found in users
      if (allowedRoles.length === 1) {
        const pRes = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/patients?line_user_id=eq.${lineUserId}&select=status&limit=1`, {
          headers: { 'apikey': dbKey, 'Authorization': `Bearer ${dbKey}` }
        });
        if (pRes.ok) {
          const pData = await pRes.json();
          if (pData && pData[0]) {
            userStatus = pData[0].status || 'active';
            allowedRoles = ['guest', 'parent'];
          }
        }
      }

      // Inactive check
      if (userStatus && userStatus.toLowerCase() === 'inactive') {
        await fetch(`https://api.line.me/v2/bot/user/${lineUserId}/richmenu`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        return res.status(403).json({ error: 'User is inactive. Reset to Guest.' });
      }

      if (!allowedRoles.includes(targetRole.toLowerCase())) {
        return res.status(403).json({ error: `Permission denied. Your role cannot switch to ${targetRole}.` });
      }

      // Switch
      const listRes = await fetch('https://api.line.me/v2/bot/richmenu/list', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const listData = await listRes.json();
      const richmenus = listData.richmenus || [];

      let targetMenu = null;
      const cleanTarget = targetRole.toLowerCase();
      if (cleanTarget === 'admin') targetMenu = richmenus.find(m => m.name.includes('Admin'));
      else if (cleanTarget === 'ot') targetMenu = richmenus.find(m => m.name.includes('OT'));
      else if (cleanTarget === 'staff') targetMenu = richmenus.find(m => m.name.includes('Staff'));
      else if (cleanTarget === 'parent') targetMenu = richmenus.find(m => m.name.includes('Parent'));

      if (targetMenu) {
        await fetch(`https://api.line.me/v2/bot/user/${lineUserId}/richmenu/${targetMenu.richMenuId}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } else {
        await fetch(`https://api.line.me/v2/bot/user/${lineUserId}/richmenu`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }

      return res.status(200).json({
        success: true,
        switchedTo: cleanTarget,
        message: `สลับมุมมองไปยัง ${cleanTarget} สำเร็จ`
      });
    }

    // 5. ACTION: SYNC ALL REGISTERED USERS TO APPROPRIATE RICH MENUS
    if (action === 'sync-all-users') {
      console.log('Syncing all users and applying role & inactive rules...');

      // 1. Get all Rich Menus
      const listRes = await fetch('https://api.line.me/v2/bot/richmenu/list', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const listData = await listRes.json();
      const richmenus = listData.richmenus || [];

      const adminMenu = richmenus.find(m => m.name.includes('Admin'))?.richMenuId;
      const otMenu = richmenus.find(m => m.name.includes('OT'))?.richMenuId;
      const staffMenu = richmenus.find(m => m.name.includes('Staff'))?.richMenuId;
      const parentMenu = richmenus.find(m => m.name.includes('Parent'))?.richMenuId;

      let linkedCount = 0;
      let unlinkedCount = 0;

      // 2. Sync Users (Staff, OT, Admin)
      const uRes = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/users?line_user_id=not.is.null&select=line_user_id,role,status`, {
        headers: { 'apikey': dbKey, 'Authorization': `Bearer ${dbKey}` }
      });
      if (uRes.ok) {
        const usersList = await uRes.json();
        for (const u of usersList) {
          if (!u.line_user_id) continue;
          const isInactive = u.status && u.status.toLowerCase() === 'inactive';
          if (isInactive) {
            await fetch(`https://api.line.me/v2/bot/user/${u.line_user_id}/richmenu`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            unlinkedCount++;
          } else {
            const r = (u.role || '').toLowerCase();
            let targetId = staffMenu;
            if (r === 'admin') targetId = adminMenu;
            else if (r === 'ot') targetId = otMenu;

            if (targetId) {
              await fetch(`https://api.line.me/v2/bot/user/${u.line_user_id}/richmenu/${targetId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
              });
              linkedCount++;
            }
          }
        }
      }

      // 3. Sync Patients (Parents)
      const pRes = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/patients?line_user_id=not.is.null&select=line_user_id,status`, {
        headers: { 'apikey': dbKey, 'Authorization': `Bearer ${dbKey}` }
      });
      if (pRes.ok) {
        const patientsList = await pRes.json();
        for (const p of patientsList) {
          if (!p.line_user_id) continue;
          const isInactive = p.status && p.status.toLowerCase() === 'inactive';
          if (isInactive) {
            await fetch(`https://api.line.me/v2/bot/user/${p.line_user_id}/richmenu`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            unlinkedCount++;
          } else if (parentMenu) {
            await fetch(`https://api.line.me/v2/bot/user/${p.line_user_id}/richmenu/${parentMenu}`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            linkedCount++;
          }
        }
      }

      return res.status(200).json({
        success: true,
        linkedCount,
        unlinkedCount,
        message: `ซิงค์เมนูสำเร็จ: เชื่อมโยง ${linkedCount} รายการ, ตัดสิทธิ์ Inactive ${unlinkedCount} รายการ`
      });
    }

    return res.status(400).json({ error: 'Invalid action parameter' });

  } catch (err) {
    console.error('LINE Rich Menu API error:', err);
    return res.status(500).json({ error: 'Internal Server Error: ' + err.message });
  }
}
