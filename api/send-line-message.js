// Backend Serverless API Proxy for sending LINE messages safely without leaking the Channel Access Token to the frontend.
import fs from 'fs';
import path from 'path';

// Helper to load environment variables when running locally
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
  
  // Fallbacks if env is still missing
  if (!env.VITE_SUPABASE_URL) {
    env.VITE_SUPABASE_URL = 'https://bmplfuzkyyuqtlfgifvm.supabase.co';
  }
  if (!env.VITE_SUPABASE_ANON_KEY) {
    env.VITE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtcGxmdXpreXl1cXRsZmdpZnZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMTgwNjcsImV4cCI6MjA5Nzc5NDA2N30.mhegnIyPtEq9zFL70wb0W9Ivz7YP3wVU0OUR0fUR_BE';
  }
  
  return env;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const env = loadEnv();
    const dbKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;
    const { 
      type, appId, patientHn, nickname, date, time, therapist, lineUserId, phone, patients,
      employeeId, employeeName, checkType, mapsUrl, workHours, note, channelAccessToken: bodyToken
    } = req.body;

    // 1. ดึงข้อมูลคลินิกและ Token จาก Supabase (clinic_info) หรือจาก Parameter ที่ส่งมา
    let channelAccessToken = bodyToken || process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
    let clinicPhone = '0946753557';
    let clinicLineOaId = '@hugdeehome';
    let liffId = '';
    let heroImageUrl = 'https://bmplfuzkyyuqtlfgifvm.supabase.co/storage/v1/object/public/public_assets/hugdee_banner.png';

    try {
      let clinicRes = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/clinic_info?select=line_channel_access_token,phone,line_id,liff_id,hero_image_url&limit=1`, {
        headers: {
          'apikey': dbKey,
          'Authorization': 'Bearer ' + dbKey
        }
      });
      
      // Fallback ถ้าคอลัมน์ hero_image_url ยังไม่ได้ถูกสร้างขึ้น
      if (!clinicRes.ok) {
        clinicRes = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/clinic_info?select=line_channel_access_token,phone,line_id,liff_id&limit=1`, {
          headers: {
            'apikey': dbKey,
            'Authorization': 'Bearer ' + dbKey
          }
        });
      }

      if (clinicRes.ok) {
        const clinicData = await clinicRes.json();
        if (clinicData && clinicData[0]) {
          channelAccessToken = clinicData[0].line_channel_access_token || channelAccessToken;
          clinicPhone = clinicData[0].phone || clinicPhone;
          clinicLineOaId = clinicData[0].line_id || clinicLineOaId;
          liffId = clinicData[0].liff_id || '';
          heroImageUrl = clinicData[0].hero_image_url || heroImageUrl;
        }
      }
    } catch (e) {
      console.error('Error fetching clinic settings in backend:', e);
    }

    if (!channelAccessToken) {
      return res.status(400).json({ error: 'Missing LINE OA Channel Access Token in clinic settings' });
    }

    let targetLineUserId = lineUserId;

    // 2. ถ้าเป็นโหมดการแจ้งเตือนนัดหมาย ค้นหา line_user_id ของคนไข้รายนั้นจากตาราง patients
    if (type === 'appointment') {
      if (!patientHn) {
        return res.status(400).json({ error: 'Missing patientHn' });
      }

      try {
        const patientRes = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/patients?hn=eq.${patientHn}&select=line_user_id`, {
          headers: {
            'apikey': dbKey,
            'Authorization': 'Bearer ' + dbKey
          }
        });
        if (patientRes.ok) {
          const patientData = await patientRes.json();
          if (patientData && patientData[0]) {
            targetLineUserId = patientData[0].line_user_id || '';
          }
        }
      } catch (e) {
        console.error('Error fetching patient LINE User ID in backend:', e);
      }

      if (!targetLineUserId) {
        return res.status(200).json({ 
          success: false, 
          status: 'not_linked', 
          message: 'ผู้ปกครองของคนไข้คนนี้ยังไม่ได้ผูกบัญชี LINE เข้ากับระบบ',
          liffUrl: liffId ? `https://liff.line.me/${liffId}` : ''
        });
      }
    } else if (['attendance', 'attendance_reminder', 'employee_welcome'].includes(type) && !targetLineUserId && employeeId) {
      // ค้นหา line_user_id ของพนักงานจากตาราง users หรือ attendance
      const empClean = String(employeeId).trim().toUpperCase();
      try {
        let userRes = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/users?or=(employee_id.eq.${encodeURIComponent(empClean)},username.eq.${encodeURIComponent(empClean)})&select=line_user_id,avatar_file&limit=1`, {
          headers: {
            'apikey': dbKey,
            'Authorization': 'Bearer ' + dbKey
          }
        });
        if (!userRes.ok) {
          userRes = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/users?or=(employee_id.eq.${encodeURIComponent(empClean)},username.eq.${encodeURIComponent(empClean)})&select=avatar_file&limit=1`, {
            headers: {
              'apikey': dbKey,
              'Authorization': 'Bearer ' + dbKey
            }
          });
        }
        if (userRes.ok) {
          const uData = await userRes.json();
          if (uData && uData[0]) {
            if (uData[0].line_user_id) {
              targetLineUserId = uData[0].line_user_id;
            } else if (uData[0].avatar_file) {
              try {
                const parsed = typeof uData[0].avatar_file === 'string' ? JSON.parse(uData[0].avatar_file) : uData[0].avatar_file;
                if (parsed?.line_user_id) targetLineUserId = parsed.line_user_id;
              } catch (e) {}
            }
          }
        }
      } catch (e) {
        // ignore
      }

      if (!targetLineUserId) {
        try {
          const attRes = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/attendance?employee_id=eq.${encodeURIComponent(empClean)}&line_user_id=not.is.null&select=line_user_id&order=created_at.desc&limit=1`, {
            headers: {
              'apikey': dbKey,
              'Authorization': 'Bearer ' + dbKey
            }
          });
          if (attRes.ok) {
            const attData = await attRes.json();
            if (attData && attData[0] && attData[0].line_user_id) {
              targetLineUserId = attData[0].line_user_id;
            }
          }
        } catch (e) {
          // ignore
        }
      }
    }

    if (!targetLineUserId) {
      return res.status(400).json({ error: 'LINE User ID is required' });
    }

    // 3. จัดการโครงสร้างข้อความที่จะยิงส่ง (Message Payloads)
    let messages = [];

    if (type === 'appointment') {
      const confirmUri = liffId 
        ? `https://liff.line.me/${liffId}?action=confirm&appId=${encodeURIComponent(appId || '')}`
        : "https://line.me/";

      const flexPayload = {
        type: "flex",
        altText: `ใบนัดหมายกิจกรรมบำบัด น้อง${nickname}`,
        contents: {
          type: "bubble",
          hero: {
            type: "image",
            url: heroImageUrl,
            size: "full",
            aspectRatio: "20:13",
            aspectMode: "cover"
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: "ใบนัดหมายกิจกรรมบำบัด", weight: "bold", size: "xl", color: "#4A4036" },
              {
                type: "box",
                layout: "vertical",
                margin: "lg",
                spacing: "sm",
                contents: [
                  {
                    type: "box",
                    layout: "baseline",
                    spacing: "sm",
                    contents: [
                      { type: "text", text: "คนไข้", color: "#aaaaaa", size: "sm", flex: 2 },
                      { type: "text", text: `น้อง${nickname}`, wrap: true, color: "#666666", size: "sm", flex: 5, weight: "bold" }
                    ]
                  },
                  {
                    type: "box",
                    layout: "baseline",
                    spacing: "sm",
                    contents: [
                      { type: "text", text: "วันที่ฝึก", color: "#aaaaaa", size: "sm", flex: 2 },
                      { type: "text", text: date, wrap: true, color: "#666666", size: "sm", flex: 5 }
                    ]
                  },
                  {
                    type: "box",
                    layout: "baseline",
                    spacing: "sm",
                    contents: [
                      { type: "text", text: "เวลาฝึก", color: "#aaaaaa", size: "sm", flex: 2 },
                      { type: "text", text: `${time} น.`, wrap: true, color: "#666666", size: "sm", flex: 5 }
                    ]
                  },
                  {
                    type: "box",
                    layout: "baseline",
                    spacing: "sm",
                    contents: [
                      { type: "text", text: "ผู้สอน", color: "#aaaaaa", size: "sm", flex: 2 },
                      { type: "text", text: `ครู${therapist || 'ผู้บำบัด'}`, wrap: true, color: "#666666", size: "sm", flex: 5 }
                    ]
                  }
                ]
              }
            ]
          },
          footer: {
            type: "box",
            layout: "vertical",
            spacing: "sm",
            contents: [
              {
                type: "button",
                style: "primary",
                height: "sm",
                color: "#C19B6C",
                action: { type: "uri", label: "ยืนยันวัน-เวลาเข้ารับการฝึก", uri: confirmUri }
              },
              {
                type: "button",
                style: "secondary",
                height: "sm",
                action: { type: "uri", label: "โทรติดต่อคลินิก", uri: `tel:${clinicPhone}` }
              }
            ]
          }
        }
      };
      messages = [flexPayload];
    } else if (type === 'welcome') {
      const patientNames = Array.isArray(patients) ? patients.join(', ') : 'บุตรหลาน';
      messages = [{
        type: 'text',
        text: `เชื่อมต่อระบบแจ้งเตือนนัดหมาย คลินิกเด็กบ้านฮักดี สำเร็จเรียบร้อยแล้วค่ะ!\n\nข้อมูลผู้ป่วยที่เชื่อมโยง:\n- ${patientNames}\n\nเมื่อใกล้ถึงวันนัดหมาย คุณพ่อคุณแม่จะได้รับการแจ้งเตือนและบัตรยืนยันนัดส่งเข้าสู่ห้องแชทนี้โดยตรงจากทางคลินิกค่ะ 🤎`
      }];
    } else if (type === 'employee_welcome') {
      if (employeeId && lineUserId) {
        try {
          const empClean = String(employeeId).trim().toUpperCase();
          const avatarPayload = JSON.stringify({ line_user_id: lineUserId });
          await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/users?employee_id=eq.${empClean}`, {
            method: 'PATCH',
            headers: {
              'apikey': dbKey,
              'Authorization': 'Bearer ' + dbKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ avatar_file: avatarPayload })
          });
        } catch (dbErr) {
          console.warn('Could not persist line_user_id to Supabase in employee_welcome:', dbErr);
        }
      }

      messages = [{
        type: 'text',
        text: `✅ เชื่อมต่อระบบแจ้งเตือนการลงเวลาสำเร็จ!\n\nสวัสดีค่ะ คุณ${employeeName || ''} (${employeeId || ''})\nท่านได้ผูกบัญชี LINE กับระบบลงเวลาเข้า-ออกงาน คลินิกบ้านฮักดี เรียบร้อยแล้ว\n\nเมื่อท่านทำการลงเวลาเข้างานหรือเลิกงาน ระบบจะส่งการแจ้งเตือนสรุปมายังห้องแชทนี้โดยอัตโนมัติค่ะ 🤎`
      }];
    } else if (type === 'attendance_reminder') {
      messages = [{
        type: 'text',
        text: `🔔 แจ้งเตือนการลงเวลา - คลินิกบ้านฮักดี\n-------------------------\nสวัสดีค่ะ คุณ${employeeName || employeeId}\nขณะนี้เลยเวลาเลิกงานมาตรฐาน (17:30 น.) แล้ว แต่ระบบยังไม่พบบันทึกการกด "เลิกงาน" ของท่านในวันนี้\n\nกรุณาเปิดระบบลงเวลาเพื่อกดบันทึกเวลาเลิกงานนะคะ 🤎\n👉 https://hugdeehome.vercel.app/#/checkin`
      }];
    } else if (type === 'attendance') {
      const isCheckIn = checkType === 'เข้างาน';
      const headerBg = isCheckIn ? "#2E7D32" : "#C19B6C";
      const headerTitle = isCheckIn ? "🕒 บันทึกเวลาเข้างานสำเร็จ" : "🏁 บันทึกเวลาเลิกงานสำเร็จ";
      
      const bodyContents = [
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "พนักงาน", color: "#8E7F70", size: "sm", flex: 3 },
            { type: "text", text: `${employeeName || ''} (${employeeId || ''})`, weight: "bold", color: "#4A4036", size: "sm", flex: 6, wrap: true }
          ]
        },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "สถานะ", color: "#8E7F70", size: "sm", flex: 3 },
            { type: "text", text: checkType || "-", weight: "bold", color: isCheckIn ? "#2E7D32" : "#B0895A", size: "sm", flex: 6 }
          ]
        },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "วันที่", color: "#8E7F70", size: "sm", flex: 3 },
            { type: "text", text: date || "-", color: "#4A4036", size: "sm", flex: 6 }
          ]
        },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "เวลา", color: "#8E7F70", size: "sm", flex: 3 },
            { type: "text", text: `${time || "-"} น.`, weight: "bold", color: "#4A4036", size: "sm", flex: 6 }
          ]
        }
      ];

      if (workHours) {
        bodyContents.push({
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "ชั่วโมงทำงาน", color: "#8E7F70", size: "sm", flex: 3 },
            { type: "text", text: `${workHours} ชั่วโมง`, weight: "bold", color: "#2E7D32", size: "sm", flex: 6 }
          ]
        });
      }

      const bubble = {
        type: "bubble",
        header: {
          type: "box",
          layout: "vertical",
          backgroundColor: headerBg,
          paddingAll: "16px",
          contents: [
            { type: "text", text: headerTitle, color: "#ffffff", weight: "bold", size: "md" },
            { type: "text", text: "ระบบลงเวลา คลินิกบ้านฮักดี", color: "#ffffff", size: "xs", margin: "xs", opacity: 0.85 }
          ]
        },
        body: {
          type: "box",
          layout: "vertical",
          spacing: "md",
          paddingAll: "16px",
          contents: bodyContents
        }
      };

      if (mapsUrl) {
        bubble.footer = {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            {
              type: "button",
              style: "secondary",
              height: "sm",
              action: { type: "uri", label: "📍 ดูพิกัดบน Google Maps", uri: mapsUrl }
            }
          ]
        };
      }

      messages = [{
        type: "flex",
        altText: `ลงเวลา${checkType}: ${employeeName || employeeId} (${time || ''} น.)`,
        contents: bubble
      }];
    } else {
      return res.status(400).json({ error: 'Invalid message type' });
    }

    // 4. ส่ง Push Message ไปยัง LINE Messaging API
    if (!targetLineUserId) {
      return res.status(200).json({ 
        success: false, 
        status: 'not_linked', 
        message: 'ยังไม่พบ LINE User ID สำหรับการแจ้งเตือนนี้ (กรุณาให้พนักงานผูก LINE OA ก่อน)' 
      });
    }

    const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${channelAccessToken}`
      },
      body: JSON.stringify({
        to: targetLineUserId,
        messages: messages
      })
    });

    if (lineResponse.ok) {
      return res.status(200).json({ success: true });
    } else {
      const lineError = await lineResponse.json();
      console.error('Error response from LINE API:', lineError);
      return res.status(500).json({ error: 'LINE API error', details: lineError });
    }

  } catch (err) {
    console.error('Backend Send LINE Message Proxy error:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
}
