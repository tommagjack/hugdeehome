import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Clock, Calendar, MapPin, User, LogIn, LogOut, CheckCircle2, 
  AlertCircle, Smartphone, ExternalLink, History, RefreshCw, 
  Check, X, ChevronRight, ShieldCheck, MessageCircle, AlertTriangle,
  QrCode, Copy
} from 'lucide-react';
import Swal from 'sweetalert2';
import { db, syncDeltaToSupabase, sendAttendanceLineNotification, saveEmployeeLineUser, toCamelCase, safeJsonParse } from '../utils/db';
import { supabase } from '../utils/supabaseClient';
import { DEFAULT_CLINIC_LOGO } from '../utils/defaultAssets';

// ฟังก์ชันแปลงวันที่แบบไทย (พ.ศ.)
const formatThaiDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  const months = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  return `วัน${days[d.getDay()]}ที่ ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
};

// ฟังก์ชันคำนวณรอบเงินเดือน (วันที่ 26 ของเดือนก่อนหน้า ถึง 25 ของเดือนปัจจุบัน)
const getPayPeriodRange = (refDate = new Date()) => {
  const d = new Date(refDate);
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-11
  const dateNum = d.getDate();

  let startYear, startMonth, endYear, endMonth;
  if (dateNum >= 26) {
    // กำลังอยู่ในรอบของ 26 เดือนนี้ ถึง 25 เดือนหน้า
    startYear = year;
    startMonth = month;
    if (month === 11) {
      endYear = year + 1;
      endMonth = 0;
    } else {
      endYear = year;
      endMonth = month + 1;
    }
  } else {
    // กำลังอยู่ในรอบของ 26 เดือนก่อน ถึง 25 เดือนนี้
    if (month === 0) {
      startYear = year - 1;
      startMonth = 11;
    } else {
      startYear = year;
      startMonth = month - 1;
    }
    endYear = year;
    endMonth = month;
  }

  const startDateStr = `${startYear}-${String(startMonth + 1).padStart(2, '0')}-26`;
  const endDateStr = `${endYear}-${String(endMonth + 1).padStart(2, '0')}-25`;

  const monthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const label = `26 ${monthsShort[startMonth]} ${startYear + 543} - 25 ${monthsShort[endMonth]} ${endYear + 543}`;

  return { startDateStr, endDateStr, label };
};

export default function CheckIn({ clinicInfo, users = [], setUsers }) {
  // เวลาปัจจุบันเดินแบบ Real-time
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lineUpdatedTick, setLineUpdatedTick] = useState(0);

  // รหัสพนักงานที่พิมพ์ (บังคับตัวพิมพ์ใหญ่)
  const [employeeId, setEmployeeId] = useState(() => {
    return localStorage.getItem('hdh_checkin_saved_emp_id') || '';
  });
  const [rememberId, setRememberId] = useState(() => {
    return !!localStorage.getItem('hdh_checkin_saved_emp_id');
  });

  // บันทึกการลงเวลาทั้งหมด
  const [attendanceLogs, setAttendanceLogs] = useState(() => db.getAttendance());
  const [isProcessing, setIsProcessing] = useState(false);

  // สถานะแท็บแสดงผลประวัติ (today / period)
  const [historyTab, setHistoryTab] = useState('today');

  // สำหรับ PWA Add to Home Screen
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // Modal เชื่อมต่อ LINE OA
  const [showLineModal, setShowLineModal] = useState(false);
  const [lineUserIdInput, setLineUserIdInput] = useState('');
  const [isLinkingLine, setIsLinkingLine] = useState(false);
  const [showLineQr, setShowLineQr] = useState(false);

  // โหลดข้อมูลล่าสุดจาก Supabase (เป็นแหล่งข้อมูลหลัก เพื่อให้การลบจาก Admin ซิงค์ถึงพนักงานทันที)
  const reloadData = async () => {
    try {
      const localLogs = db.getAttendance() || [];
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);

      if (!error && Array.isArray(data)) {
        // แปลงรูปแบบคีย์จาก snake_case เป็น camelCase
        const remoteLogs = data.map(row => {
          const mapped = {};
          for (const k in row) {
            mapped[toCamelCase(k)] = safeJsonParse(row[k]);
          }
          return mapped;
        });

        const remoteIds = new Set(remoteLogs.map(r => String(r.id)));

        // เฉพาะเรคคอร์ดที่สร้างตอนออฟไลน์เท่านั้น (_isOffline === true) ที่จะรอส่งขึ้น Supabase
        const offlinePendingLogs = localLogs.filter(l => l && l.id && l._isOffline === true && !remoteIds.has(String(l.id)));

        if (offlinePendingLogs.length > 0) {
          console.log(`[CheckIn] Uploading ${offlinePendingLogs.length} offline attendance records to Supabase...`);
          syncDeltaToSupabase('hdh_attendance', { toUpsert: offlinePendingLogs }).then(() => {
            const currentLocal = db.getAttendance() || [];
            const cleaned = currentLocal.map(l => offlinePendingLogs.some(p => p.id === l.id) ? { ...l, _isOffline: false } : l);
            db.setAttendance(cleaned);
          }).catch(err => {
            console.warn('Auto-sync offline attendance failed:', err);
          });
        }

        // ใช้ข้อมูลจาก Supabase เป็นหลัก (หาก Admin ลบ รายการจะหายไปด้วยทันที ไม่เกิดปัญหาฟื้นคืนชีพ)
        const finalLogs = [...remoteLogs, ...offlinePendingLogs].sort((a, b) => {
          const dtA = `${a.date || ''} ${a.time || ''}`;
          const dtB = `${b.date || ''} ${b.time || ''}`;
          return dtB.localeCompare(dtA);
        });

        db.setAttendance(finalLogs);
        setAttendanceLogs(finalLogs);
      }
    } catch (e) {
      console.warn('Attendance reloadData error:', e);
    }
  };

  useEffect(() => {
    reloadData();

    // ฟัง Event เมื่อมีการผูก LINE สำเร็จจากส่วนอื่น
    const handleLineUserUpdated = () => {
      setLineUpdatedTick(t => t + 1);
      setUsers(db.getUsers());
    };
    window.addEventListener('hdh_line_user_updated', handleLineUserUpdated);

    // สมัคร Realtime Subscription สำหรับตาราง attendance เพื่อให้อัปเดต/ลบแบบทันทีข้ามเครื่อง
    const channel = supabase
      .channel('realtime-checkin-attendance')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance' },
        (payload) => {
          console.log('[CheckIn Realtime Attendance]', payload.eventType, payload.old, payload.new);
          if (payload.eventType === 'DELETE') {
            const deletedId = payload.old?.id;
            if (deletedId) {
              setAttendanceLogs(prev => {
                const remaining = prev.filter(l => l && l.id !== deletedId);
                db.setAttendance(remaining);
                return remaining;
              });
            }
          } else if (payload.eventType === 'INSERT') {
            const mapped = {};
            for (const k in payload.new) {
              mapped[toCamelCase(k)] = safeJsonParse(payload.new[k]);
            }
            setAttendanceLogs(prev => {
              if (prev.some(l => l && l.id === mapped.id)) return prev;
              const updated = [mapped, ...prev];
              db.setAttendance(updated);
              return updated;
            });
          } else if (payload.eventType === 'UPDATE') {
            const mapped = {};
            for (const k in payload.new) {
              mapped[toCamelCase(k)] = safeJsonParse(payload.new[k]);
            }
            setAttendanceLogs(prev => {
              const updated = prev.map(l => (l && l.id === mapped.id) ? mapped : l);
              db.setAttendance(updated);
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('hdh_line_user_updated', handleLineUserUpdated);
      supabase.removeChannel(channel);
    };
  }, []);

  // ตรวจจับผลลัพธ์การผูกบัญชี LINE OA อัตโนมัติ (1-Click Auto Link Return)
  useEffect(() => {
    try {
      const urlObj = new URL(window.location.href);
      const urlParams = urlObj.searchParams;
      const hashParts = window.location.hash.split('?');
      const hashParams = new URLSearchParams(hashParts[1] || '');

      const isLinked = urlParams.get('line_linked') === 'true' || hashParams.get('line_linked') === 'true';
      const empFromUrl = urlParams.get('emp') || hashParams.get('emp');
      const lineIdFromUrl = urlParams.get('line_id') || hashParams.get('line_id');
      const lineNameFromUrl = urlParams.get('name') || hashParams.get('name');

      if (isLinked) {
        const targetEmp = (empFromUrl || employeeId || '').toUpperCase().trim();
        if (targetEmp && lineIdFromUrl) {
          saveEmployeeLineUser(targetEmp, lineIdFromUrl);
          setEmployeeId(targetEmp);
          localStorage.setItem('hdh_checkin_saved_emp_id', targetEmp);
        }

        Swal.fire({
          icon: 'success',
          title: 'ผูกบัญชี LINE OA สำเร็จ! 🎉',
          html: `
            <div style="text-align: center; padding: 0.5rem;">
              ${lineNameFromUrl ? `<div style="font-size: 1.15rem; font-weight: bold; color: #166534; margin-bottom: 4px;">${decodeURIComponent(lineNameFromUrl)}</div>` : ''}
              <div style="font-size: 0.95rem; color: #4A4036; margin-bottom: 8px;">
                รหัสพนักงาน: <b>${targetEmp}</b>
              </div>
              <div style="font-size: 0.85rem; color: #6B7280; line-height: 1.5;">
                ผูกบัญชีสำเร็จเรียบร้อยแล้วค่ะ ระบบจะส่งการแจ้งเตือนเวลาเข้างานและเลิกงานเข้า LINE ของท่านโดยอัตโนมัติ ⏰
              </div>
            </div>
          `,
          confirmButtonColor: '#16A34A'
        });

        // ล้าง parameter ออกจาก URL
        const cleanUrl = window.location.origin + window.location.pathname + window.location.hash.split('?')[0];
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch(err) {
      console.warn('Error reading line link return params:', err);
    }
  }, []);

  // จับเวลาทุก 1 วินาที
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ตรวจจับ PWA Event
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // ตรวจสอบว่าเปิดในโหมด standalone หรือไม่
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    setIsStandalone(!!checkStandalone);

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // บันทึกรหัสพนักงานลง localStorage
  const handleIdChange = (e) => {
    const val = e.target.value.toUpperCase().replace(/\s/g, '');
    setEmployeeId(val);
    if (rememberId) {
      localStorage.setItem('hdh_checkin_saved_emp_id', val);
    }
  };

  const handleRememberToggle = (checked) => {
    setRememberId(checked);
    if (checked && employeeId) {
      localStorage.setItem('hdh_checkin_saved_emp_id', employeeId);
    } else {
      localStorage.removeItem('hdh_checkin_saved_emp_id');
    }
  };

  // ค้นหาข้อมูลพนักงานปัจจุบัน พร้อมดึงการผูก LINE OA ที่บันทึกไว้
  const currentEmployee = useMemo(() => {
    if (!employeeId) return null;
    const empClean = employeeId.trim().toUpperCase();
    const found = users.find(u => 
      u && (
        String(u.employeeId || '').trim().toUpperCase() === empClean ||
        String(u.employee_id || '').trim().toUpperCase() === empClean ||
        String(u.username || '').trim().toUpperCase() === empClean
      )
    ) || null;

    const savedLine = localStorage.getItem(`hdh_line_user_${empClean}`) || '';
    if (!found) {
      if (savedLine) {
        return {
          employeeId: empClean,
          fullname: empClean,
          line_user_id: savedLine,
          lineUserId: savedLine
        };
      }
      return null;
    }

    const resolvedLineId = found.line_user_id || found.lineUserId || savedLine || '';
    return {
      ...found,
      line_user_id: resolvedLineId,
      lineUserId: resolvedLineId
    };
  }, [employeeId, users, lineUpdatedTick]);

  // ตรวจสอบสถานะการผูก LINE OA ของพนักงานคนนี้
  const isEmployeeLineLinked = useMemo(() => {
    if (!employeeId) return false;
    const empClean = employeeId.trim().toUpperCase();
    return !!(
      currentEmployee?.line_user_id || 
      currentEmployee?.lineUserId || 
      localStorage.getItem(`hdh_line_user_${empClean}`)
    );
  }, [employeeId, currentEmployee, lineUpdatedTick]);

  // ประวัติการลงเวลาของพนักงานคนนี้
  const employeeLogs = useMemo(() => {
    if (!employeeId) return [];
    return attendanceLogs.filter(log => 
      String(log.employeeId || log.employee_id || '').toUpperCase() === employeeId
    );
  }, [attendanceLogs, employeeId]);

  // ประวัติวันนี้ (YYYY-MM-DD)
  const todayStr = useMemo(() => {
    const y = currentTime.getFullYear();
    const m = String(currentTime.getMonth() + 1).padStart(2, '0');
    const d = String(currentTime.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [currentTime]);

  const todayLogs = useMemo(() => {
    return employeeLogs.filter(log => log.date === todayStr);
  }, [employeeLogs, todayStr]);

  // บันทึกเข้างานล่าสุดวันนี้ และเลิกงานล่าสุดวันนี้
  const latestCheckInToday = useMemo(() => {
    return todayLogs
      .filter(l => l.type === 'เข้างาน' || l.type === 'IN')
      .sort((a, b) => (b.time || '').localeCompare(a.time || ''))[0] || null;
  }, [todayLogs]);

  const latestCheckOutToday = useMemo(() => {
    return todayLogs
      .filter(l => l.type === 'เลิกงาน' || l.type === 'OUT')
      .sort((a, b) => (b.time || '').localeCompare(a.time || ''))[0] || null;
  }, [todayLogs]);

  // คำนวณชั่วโมงทำงานวันนี้
  const todayWorkHours = useMemo(() => {
    if (!latestCheckInToday) return 0;
    if (latestCheckOutToday) {
      return Number(latestCheckOutToday.workHours || latestCheckOutToday.work_hours || 0);
    }
    // กำลังทำงานอยู่ (นับตั้งแต่เข้างานถึงเวลาปัจจุบัน)
    const [inH, inM, inS] = (latestCheckInToday.time || '00:00:00').split(':').map(Number);
    const inDate = new Date();
    inDate.setHours(inH || 0, inM || 0, inS || 0, 0);
    const diffMs = Math.max(0, currentTime.getTime() - inDate.getTime());
    return Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
  }, [latestCheckInToday, latestCheckOutToday, currentTime]);

  // คำนวณตามรอบเงินเดือน (26 ถึง 25)
  const payPeriod = useMemo(() => {
    return getPayPeriodRange(currentTime);
  }, [currentTime]);

  const periodLogs = useMemo(() => {
    return employeeLogs.filter(l => l.date >= payPeriod.startDateStr && l.date <= payPeriod.endDateStr);
  }, [employeeLogs, payPeriod]);

  // สรุปยอดรวมในรอบเงินเดือน
  const periodSummary = useMemo(() => {
    const datesSet = new Set();
    let totalHours = 0;

    periodLogs.forEach(l => {
      datesSet.add(l.date);
      if (l.type === 'เลิกงาน' || l.type === 'OUT') {
        totalHours += Number(l.workHours || l.work_hours || 0);
      }
    });

    return {
      daysWorked: datesSet.size,
      totalHours: Math.round(totalHours * 10) / 10
    };
  }, [periodLogs]);

  // ข้อมูลเวลาปิดทำการของคลินิกในวันนี้ (จาก operatingHours ที่ตั้งค่าไว้)
  const todayOperatingConfig = useMemo(() => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = dayNames[currentTime.getDay()];
    const config = clinicInfo?.operatingHours?.[todayName];
    const closeTime = config?.closeTime || '17:30';
    const openTime = config?.openTime || '08:30';
    const isOpen = config ? config.isOpen : true;
    return { todayName, isOpen, openTime, closeTime };
  }, [clinicInfo, currentTime]);

  // ตรวจจับเงื่อนไขเตือนลงเวลาออกงาน (หลังเวลาเลิกงานของวันนี้แล้วยังไม่ได้กดเลิกงาน)
  const showMissingCheckOutWarning = useMemo(() => {
    if (!currentEmployee || !latestCheckInToday || latestCheckOutToday) return false;
    const currentHour = currentTime.getHours();
    const currentMin = currentTime.getMinutes();
    
    let closeH = 17;
    let closeM = 30;
    if (todayOperatingConfig.closeTime) {
      const [h, m] = todayOperatingConfig.closeTime.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        closeH = h;
        closeM = m;
      }
    }
    return (currentHour > closeH) || (currentHour === closeH && currentMin >= closeM);
  }, [currentEmployee, latestCheckInToday, latestCheckOutToday, currentTime, todayOperatingConfig]);

  // ฟังก์ชันดึงพิกัดตำแหน่ง GPS
  const getCoordinates = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ latitude: null, longitude: null, accuracy: null });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: Math.round(position.coords.accuracy)
          });
        },
        (error) => {
          console.warn('Geolocation error:', error.message);
          resolve({ latitude: null, longitude: null, accuracy: null, geoError: error.message });
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    });
  };

  // ดำเนินการลงเวลา (เข้างาน หรือ เลิกงาน)
  const handleRecordAttendance = async (recordType) => {
    if (!employeeId) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาระบุรหัสพนักงาน',
        text: 'โปรดกรอกรหัสพนักงานของท่านก่อนกดลงเวลา (เช่น HDH001)',
        confirmButtonColor: 'var(--secondary)'
      });
      return;
    }

    if (!currentEmployee) {
      const confirmUnknown = await Swal.fire({
        icon: 'question',
        title: `ไม่พบชื่อพนักงานรหัส ${employeeId}`,
        text: 'ต้องการลงเวลาด้วยรหัสนี้ต่อไปหรือไม่?',
        showCancelButton: true,
        confirmButtonText: 'ยืนยันลงเวลา',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: 'var(--secondary)'
      });
      if (!confirmUnknown.isConfirmed) return;
    }

    // ป้องกันการกดซ้ำซ้อน
    if (recordType === 'เข้างาน' && latestCheckInToday && !latestCheckOutToday) {
      const reConfirm = await Swal.fire({
        icon: 'warning',
        title: 'คุณได้ลงเวลาเข้างานวันนี้แล้ว',
        html: `เวลาเข้างานล่าสุดคือ <b>${latestCheckInToday.time} น.</b><br/>ต้องการลงเวลาเข้างานซ้ำอีกครั้งหรือไม่?`,
        showCancelButton: true,
        confirmButtonText: 'ยืนยันลงเวลาซ้ำ',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: 'var(--secondary)'
      });
      if (!reConfirm.isConfirmed) return;
    }

    if (recordType === 'เลิกงาน' && !latestCheckInToday) {
      const noInConfirm = await Swal.fire({
        icon: 'warning',
        title: 'ยังไม่พบบันทึกเข้างานของวันนี้',
        text: 'ต้องการลงเวลาเลิกงานเลยหรือไม่?',
        showCancelButton: true,
        confirmButtonText: 'ยืนยันลงเวลาเลิกงาน',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: 'var(--secondary)'
      });
      if (!noInConfirm.isConfirmed) return;
    }

    setIsProcessing(true);

    try {
      // 1. ดึงพิกัด GPS
      const coords = await getCoordinates();
      const hasCoords = coords.latitude && coords.longitude;
      const mapsUrl = hasCoords ? `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}` : '';

      // 2. จัดเตรียมเวลา
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0]; // HH:mm:ss
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;

      // 3. คำนวณชั่วโมงทำงานถ้าเป็นเลิกงาน
      let calculatedHours = 0;
      if (recordType === 'เลิกงาน' && latestCheckInToday) {
        const [inH, inM, inS] = (latestCheckInToday.time || '00:00:00').split(':').map(Number);
        const inDate = new Date();
        inDate.setHours(inH || 0, inM || 0, inS || 0, 0);
        const diffMs = Math.max(0, now.getTime() - inDate.getTime());
        calculatedHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
      }

      // 4. บันทึกข้อมูล
      const empClean = (employeeId || '').trim().toUpperCase();
      const empName = currentEmployee ? (currentEmployee.fullname || currentEmployee.name || '') : empClean;
      const empLineId = currentEmployee?.line_user_id || 
                        currentEmployee?.lineUserId || 
                        localStorage.getItem(`hdh_line_user_${empClean}`) || 
                        localStorage.getItem(`hdh_line_user_${(employeeId || '').trim()}`) || 
                        '';

      const newRecord = {
        id: `att_${Date.now()}_${empClean}`,
        employeeId: empClean,
        employeeName: empName,
        date: dateStr,
        time: timeStr,
        type: recordType,
        latitude: coords.latitude || null,
        longitude: coords.longitude || null,
        accuracy: coords.accuracy || null,
        mapsUrl,
        workHours: calculatedHours,
        lineUserId: empLineId,
        notes: hasCoords ? `GPS Accuracy: ±${coords.accuracy}m` : 'ไม่มีข้อมูลพิกัด GPS',
        createdAt: now.toISOString(),
        _isOffline: true
      };

      // บันทึกลง LocalStorage
      const updatedList = [newRecord, ...attendanceLogs.filter(l => l && l.id !== newRecord.id)];
      db.setAttendance(updatedList);
      setAttendanceLogs(updatedList);

      // ซิงค์ไปยัง Supabase
      try {
        const syncRes = await syncDeltaToSupabase('hdh_attendance', { toUpsert: [newRecord] });
        if (syncRes !== false) {
          const confirmedRec = { ...newRecord, _isOffline: false };
          const list = (db.getAttendance() || []).map(l => l.id === newRecord.id ? confirmedRec : l);
          db.setAttendance(list);
          setAttendanceLogs(list);
        }
      } catch (err) {
        console.warn('Could not sync attendance to Supabase immediately (offline or table not ready):', err);
      }

      // 5. ส่งการแจ้งเตือนเข้า LINE OA (ถ้าผูกไว้)
      if (empLineId) {
        sendAttendanceLineNotification({
          type: 'attendance',
          lineUserId: empLineId,
          employeeId: empClean,
          employeeName: empName,
          checkType: recordType,
          date: formatThaiDate(now),
          time: timeStr,
          mapsUrl,
          workHours: calculatedHours > 0 ? calculatedHours : undefined
        }).then(res => {
          console.log('Attendance LINE notification result:', res);
        }).catch(err => {
          console.warn('LINE push notification error:', err);
        });
      } else {
        console.log('Employee', empClean, 'has not linked LINE OA, skipping notification');
      }

      // 6. แสดงผลลัพธ์สำเร็จ
      const isCheckIn = recordType === 'เข้างาน';
      await Swal.fire({
        icon: 'success',
        title: `ลงเวลา${recordType}สำเร็จ!`,
        html: `
          <div style="text-align: left; padding: 0.5rem; font-size: 0.95rem; line-height: 1.6;">
            <div><b>👤 พนักงาน:</b> ${empName} (${employeeId})</div>
            <div><b>📅 วันที่:</b> ${formatThaiDate(now)}</div>
            <div><b>🕒 เวลา:</b> <span style="font-size: 1.15rem; font-weight: bold; color: ${isCheckIn ? '#2E7D32' : '#C19B6C'}">${timeStr} น.</span></div>
            ${calculatedHours > 0 ? `<div><b>⏱️ เวลาทำงานวันนี้:</b> <span style="color: #2E7D32; font-weight: bold;">${calculatedHours} ชั่วโมง</span></div>` : ''}
            <div><b>📍 พิกัด:</b> ${hasCoords ? `<a href="${mapsUrl}" target="_blank" style="color: #0284c7; text-decoration: underline;">เปิดดูใน Google Maps (±${coords.accuracy} ม.)</a>` : '<span style="color: #888;">ไม่สามารถระบุพิกัดได้</span>'}</div>
            ${empLineId ? '<div style="margin-top: 6px; color: #2E7D32; font-size: 0.85rem;">✅ ส่งการแจ้งเตือนไปยัง LINE ของคุณแล้ว</div>' : ''}
          </div>
        `,
        confirmButtonColor: isCheckIn ? '#2E7D32' : 'var(--secondary)'
      });

    } catch (e) {
      console.error('Error recording attendance:', e);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาดในการลงเวลา',
        text: e.message || 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
        confirmButtonColor: 'var(--secondary)'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // จัดการการติดตั้ง Add to Home Screen
  const handleAddToHomeScreen = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      // ตรวจจับระบบปฏิบัติการว่าเป็น iOS หรือไม่
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      if (isIos) {
        setShowIosGuide(true);
      } else {
        Swal.fire({
          icon: 'info',
          title: 'วิธีเพิ่มไอคอนทางลัด',
          html: `
            <div style="text-align: left; font-size: 0.95rem; line-height: 1.6;">
              <p>หากบราวเซอร์ไม่แสดงป๊อปอัปติดตั้งอัตโนมัติ ท่านสามารถทำได้ง่ายๆ ดังนี้:</p>
              <ol style="padding-left: 1.25rem;">
                <li>กดปุ่ม <b>เมนู 3 จุด (⋮)</b> ที่มุมขวาบนของบราวเซอร์ Chrome</li>
                <li>เลือกเมนู <b>"เพิ่มลงในหน้าจอหลัก"</b> หรือ <b>"ติดตั้งแอป"</b></li>
                <li>กด <b>"เพิ่ม" (Add)</b> เพื่อสร้างไอคอนทางลัดบนหน้าจอมือถือ/แท็บเล็ต</li>
              </ol>
            </div>
          `,
          confirmButtonColor: 'var(--secondary)'
        });
      }
    }
  };

  // ผูกบัญชี LINE OA สำหรับพนักงาน
  const handleAutoLinkLine = () => {
    if (!employeeId) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาระบุรหัสพนักงาน',
        text: 'โปรดกรอกรหัสพนักงานของท่าน (เช่น HDH001) ก่อนทำการผูกบัญชี LINE OA',
        confirmButtonColor: 'var(--secondary)'
      });
      return;
    }

    const empClean = employeeId.trim().toUpperCase();
    const currentLineId = currentEmployee?.line_user_id || currentEmployee?.lineUserId || localStorage.getItem(`hdh_line_user_${empClean}`) || '';

    setLineUserIdInput(currentLineId);
    setShowLineModal(true);
  };

  // เชื่อมต่อ LINE OA แบบกรอกรหัสด้วยตนเอง
  const handleSaveLineId = async () => {
    if (!lineUserIdInput.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาระบุ LINE User ID',
        text: 'โปรดระบุ LINE User ID ของท่าน เช่น U1a2b3c4d5e...',
        confirmButtonColor: 'var(--secondary)'
      });
      return;
    }

    setIsLinkingLine(true);
    const trimmedId = lineUserIdInput.trim();
    const empClean = employeeId.trim().toUpperCase();

    try {
      // 1. บันทึกเข้าข้อมูลพนักงาน
      await saveEmployeeLineUser(empClean, trimmedId);

      // อัปเดต state users หากมี
      if (typeof setUsers === 'function') {
        setUsers(prev => prev.map(u => {
          if (String(u.employeeId || u.employee_id || u.username).toUpperCase() === empClean) {
            return { ...u, lineUserId: trimmedId, line_user_id: trimmedId };
          }
          return u;
        }));
      }
      setLineUpdatedTick(t => t + 1);

      // 2. ส่งข้อความยินดีต้อนรับทดสอบการเชื่อมต่อ
      const notifyResult = await sendAttendanceLineNotification({
        type: 'employee_welcome',
        lineUserId: trimmedId,
        employeeId: empClean,
        employeeName: currentEmployee?.fullname || empClean
      });

      setShowLineModal(false);

      if (notifyResult?.success) {
        await Swal.fire({
          icon: 'success',
          title: 'เชื่อมต่อ LINE OA สำเร็จ! 🎉',
          text: `ระบบได้ผูก LINE กับพนักงานรหัส ${empClean} และส่งข้อความยืนยันเรียบร้อยแล้วค่ะ`,
          confirmButtonColor: '#16A34A'
        });
      } else {
        await Swal.fire({
          icon: 'success',
          title: 'บันทึก LINE User ID สำเร็จ',
          text: `ผูกข้อมูลกับพนักงานรหัส ${empClean} เรียบร้อยแล้ว (หากยังไม่ได้รับข้อความ กรุณาเพิ่มเพื่อน LINE OA ของคลินิกก่อนนะคะ)`,
          confirmButtonColor: '#16A34A'
        });
      }

      // รีเฟรชข้อมูลในหน้าจอ
      reloadData();
    } catch (e) {
      console.error('Error linking LINE:', e);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: e.message || 'ไม่สามารถผูกบัญชี LINE ได้',
        confirmButtonColor: 'var(--secondary)'
      });
    } finally {
      setIsLinkingLine(false);
    }
  };

  // เวลาดิจิทัลแบบแยกส่วน
  const hours = String(currentTime.getHours()).padStart(2, '0');
  const minutes = String(currentTime.getMinutes()).padStart(2, '0');
  const seconds = String(currentTime.getSeconds()).padStart(2, '0');

  return (
    <div className="checkin-container" style={{
      minHeight: '100vh',
      backgroundColor: '#FEF8F1',
      color: '#4A4036',
      fontFamily: "'Noto Sans Thai', var(--font-family), -apple-system, sans-serif",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '1.25rem 1rem 3rem 1rem',
      boxSizing: 'border-box'
    }}>
      {/* ส่วนหัวของหน้า Check-in */}
      <div style={{
        width: '100%',
        maxWidth: '540px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img 
            src={clinicInfo?.logoUrl || DEFAULT_CLINIC_LOGO} 
            alt="Clinic Logo" 
            style={{ 
              width: '46px', 
              height: '46px', 
              borderRadius: '12px', 
              objectFit: 'cover', 
              border: '2px solid #C19B6C',
              backgroundColor: '#fff',
              boxShadow: '0 2px 8px rgba(193, 155, 108, 0.2)'
            }} 
          />
          <div>
            <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#4A4036' }}>
              {clinicInfo?.name || 'คลินิกบ้านฮักดี'}
            </h1>
            <div style={{ fontSize: '0.75rem', color: '#8E7F70', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={14} color="#C19B6C" />
              <span>ระบบลงเวลาเข้า-ออกงาน (Time Attendance)</span>
            </div>
          </div>
        </div>

        {/* ปุ่มกลับเข้าระบบหลักคลินิก */}
        <a 
          href="/" 
          style={{
            fontSize: '0.8rem',
            color: '#8E7F70',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 10px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            border: '1px solid #E5D5C5',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
        >
          <span>ระบบหลัก</span>
          <ChevronRight size={14} />
        </a>
      </div>

      {/* บัตรหลัก: นาฬิกา Real-time และการลงเวลา */}
      <div style={{
        width: '100%',
        maxWidth: '540px',
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        padding: '1.75rem 1.5rem',
        boxShadow: '0 10px 30px rgba(74, 64, 54, 0.08)',
        border: '1px solid #F5EAE1',
        boxSizing: 'border-box'
      }}>

        {/* ส่วนแสดงวันที่และนาฬิกา Real-time */}
        <div style={{
          backgroundColor: '#FAF5EE',
          borderRadius: '18px',
          padding: '1.25rem 1rem',
          textAlign: 'center',
          marginBottom: '1.5rem',
          border: '1px solid #EFE4D6'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#8E7F70', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 500 }}>
            <Calendar size={18} color="#C19B6C" />
            <span>{formatThaiDate(currentTime)}</span>
          </div>

          {/* นาฬิกาเดินวินาทีต่อวินาที */}
          <div style={{
            fontSize: '3rem',
            fontWeight: 800,
            fontFamily: "'Noto Sans Thai', monospace",
            fontVariantNumeric: 'tabular-nums',
            color: '#4A4036',
            letterSpacing: '2px',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}>
            <span>{hours}</span>
            <span style={{ color: '#C19B6C', animation: 'blink 1s infinite' }}>:</span>
            <span>{minutes}</span>
            <span style={{ color: '#C19B6C', animation: 'blink 1s infinite' }}>:</span>
            <span style={{ color: '#C19B6C' }}>{seconds}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#A09383', marginTop: '6px' }}>เวลามาตรฐานประเทศไทย (ICT)</div>
        </div>

        {/* แถบแจ้งเตือนลืมลงเวลาเลิกงาน */}
        {showMissingCheckOutWarning && (
          <div style={{
            backgroundColor: '#FEF3C7',
            border: '1px solid #FCD34D',
            color: '#B45309',
            padding: '12px 14px',
            borderRadius: '12px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            fontSize: '0.88rem',
            lineHeight: '1.4'
          }}>
            <AlertTriangle size={20} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>เลยเวลาเลิกงานมาตรฐาน ({todayOperatingConfig.closeTime} น.) แล้ว!</strong>
              <div>ท่านยังไม่ได้กดลงเวลา <b>"เลิกงาน"</b> ในวันนี้ อย่าลืมกดเพื่อบันทึกเวลาทำงานนะคะ</div>
            </div>
          </div>
        )}

        {/* ช่องกรอกรหัสพนักงาน (บังคับตัวพิมพ์ใหญ่) */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{
            display: 'block',
            fontWeight: 600,
            fontSize: '0.9rem',
            color: '#4A4036',
            marginBottom: '0.4rem'
          }}>
            รหัสพนักงาน (Employee ID) <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#A09383' }}>
              <User size={18} />
            </div>
            <input 
              type="text" 
              placeholder="เช่น HDH001, HDH002..."
              value={employeeId}
              onChange={handleIdChange}
              style={{
                width: '100%',
                padding: '0.85rem 1rem 0.85rem 2.6rem',
                fontSize: '1.15rem',
                fontWeight: 700,
                color: '#4A4036',
                backgroundColor: '#FAF5EE',
                border: currentEmployee ? '2px solid #2E7D32' : '1px solid #DCD1C4',
                borderRadius: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                transition: 'all 0.2s'
              }}
            />
            {employeeId && (
              <button 
                type="button" 
                onClick={() => setEmployeeId('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#999',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* กล่องแสดงข้อมูลพนักงานที่ตรวจพบ */}
          {currentEmployee ? (
            <div style={{
              marginTop: '0.5rem',
              padding: '8px 12px',
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.85rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="#16A34A" />
                <span style={{ fontWeight: 600, color: '#166534' }}>
                  {currentEmployee.fullname || currentEmployee.name} {currentEmployee.nickname ? `(${currentEmployee.nickname})` : ''}
                </span>
                <span style={{ color: '#65a30d', fontSize: '0.75rem' }}>
                  • {currentEmployee.position || currentEmployee.role || 'พนักงาน'}
                </span>
              </div>

              {/* ปุ่ม/สถานะ LINE */}
              {isEmployeeLineLinked ? (
                <button
                  type="button"
                  onClick={handleAutoLinkLine}
                  style={{
                    fontSize: '0.72rem',
                    backgroundColor: '#DCFCE7',
                    border: '1px solid #BBF7D0',
                    color: '#15803D',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                  title="คลิกเพื่อตรวจสอบหรือเปลี่ยนการผูก LINE OA"
                >
                  <MessageCircle size={12} /> LINE ผูกแล้ว ✓
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleAutoLinkLine}
                  style={{
                    background: '#E0F2FE',
                    border: '1px solid #BAE6FD',
                    color: '#0369A1',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <MessageCircle size={12} /> เชื่อมต่อ LINE OA
                </button>
              )}
            </div>
          ) : employeeId ? (
            <div style={{
              marginTop: '0.5rem',
              padding: '6px 12px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '8px',
              color: '#DC2626',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <AlertCircle size={14} />
              <span>ยังไม่พบรหัสพนักงานนี้ในระบบหลัก (สามารถกดลงเวลาได้)</span>
            </div>
          ) : null}

          {/* ตัวเลือกจำรหัสพนักงาน */}
          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input 
              type="checkbox" 
              id="rememberIdCheck"
              checked={rememberId}
              onChange={(e) => handleRememberToggle(e.target.checked)}
              style={{ cursor: 'pointer', accentColor: '#C19B6C' }}
            />
            <label htmlFor="rememberIdCheck" style={{ fontSize: '0.82rem', color: '#6B7280', cursor: 'pointer' }}>
              จำรหัสพนักงานบนอุปกรณ์นี้
            </label>
          </div>
        </div>

        {/* ปุ่ม เข้างาน และ เลิกงาน */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
          {/* ปุ่มเข้างาน */}
          <button 
            type="button"
            disabled={isProcessing}
            onClick={() => handleRecordAttendance('เข้างาน')}
            style={{
              padding: '1.15rem 1rem',
              borderRadius: '16px',
              border: 'none',
              backgroundColor: '#2E7D32',
              color: '#ffffff',
              fontSize: '1.05rem',
              fontWeight: 700,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 6px 16px rgba(46, 125, 50, 0.25)',
              transition: 'transform 0.1s, background-color 0.2s',
              opacity: isProcessing ? 0.7 : 1
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <LogIn size={22} />
              <span>เข้างาน</span>
            </div>
            <span style={{ fontSize: '0.75rem', opacity: 0.85, fontWeight: 'normal' }}>
              (Check-in)
            </span>
          </button>

          {/* ปุ่มเลิกงาน */}
          <button 
            type="button"
            disabled={isProcessing}
            onClick={() => handleRecordAttendance('เลิกงาน')}
            style={{
              padding: '1.15rem 1rem',
              borderRadius: '16px',
              border: 'none',
              backgroundColor: '#C19B6C',
              color: '#ffffff',
              fontSize: '1.05rem',
              fontWeight: 700,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 6px 16px rgba(193, 155, 108, 0.3)',
              transition: 'transform 0.1s, background-color 0.2s',
              opacity: isProcessing ? 0.7 : 1
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <LogOut size={22} />
              <span>เลิกงาน</span>
            </div>
            <span style={{ fontSize: '0.75rem', opacity: 0.85, fontWeight: 'normal' }}>
              (Check-out)
            </span>
          </button>
        </div>

        {/* ข้อมูลสรุปสถานะการลงเวลาของวันนี้ */}
        <div style={{
          backgroundColor: '#FAF5EE',
          borderRadius: '14px',
          padding: '1rem',
          border: '1px solid #EFE4D6',
          marginBottom: '1rem'
        }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4A4036', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>สรุปการลงเวลาวันนี้</span>
            <span style={{ fontSize: '0.75rem', color: '#8E7F70' }}>{todayStr}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center' }}>
            <div style={{ backgroundColor: '#fff', padding: '8px 4px', borderRadius: '10px', border: '1px solid #F5EAE1' }}>
              <div style={{ fontSize: '0.7rem', color: '#8E7F70' }}>เข้างาน</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: latestCheckInToday ? '#2E7D32' : '#9CA3AF' }}>
                {latestCheckInToday ? latestCheckInToday.time : '-'}
              </div>
            </div>

            <div style={{ backgroundColor: '#fff', padding: '8px 4px', borderRadius: '10px', border: '1px solid #F5EAE1' }}>
              <div style={{ fontSize: '0.7rem', color: '#8E7F70' }}>เลิกงาน</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: latestCheckOutToday ? '#C19B6C' : '#9CA3AF' }}>
                {latestCheckOutToday ? latestCheckOutToday.time : '-'}
              </div>
            </div>

            <div style={{ backgroundColor: '#fff', padding: '8px 4px', borderRadius: '10px', border: '1px solid #F5EAE1' }}>
              <div style={{ fontSize: '0.7rem', color: '#8E7F70' }}>ชั่วโมงวันนี้</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: todayWorkHours > 0 ? '#166534' : '#9CA3AF' }}>
                {todayWorkHours > 0 ? `${todayWorkHours} ชม.` : '-'}
              </div>
            </div>
          </div>
        </div>

        {/* ปุ่มแถบฟังก์ชันเสริม: Add to Home Screen และเชื่อมต่อ LINE */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button
            type="button"
            onClick={handleAddToHomeScreen}
            style={{
              padding: '8px 12px',
              backgroundColor: '#fff',
              border: '1px solid #DCD1C4',
              borderRadius: '10px',
              color: '#4A4036',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'background-color 0.2s'
            }}
          >
            <Smartphone size={15} color="#C19B6C" />
            <span>เพิ่มไปหน้าจอโฮม</span>
          </button>

          <button
            type="button"
            onClick={handleAutoLinkLine}
            style={{
              padding: '8px 12px',
              backgroundColor: isEmployeeLineLinked ? '#F0FDF4' : '#fff',
              border: isEmployeeLineLinked ? '1px solid #86EFAC' : '1px solid #DCD1C4',
              borderRadius: '10px',
              color: isEmployeeLineLinked ? '#166534' : '#4A4036',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s',
              boxShadow: isEmployeeLineLinked ? '0 1px 3px rgba(22, 101, 52, 0.1)' : 'none'
            }}
          >
            <MessageCircle size={15} color="#16A34A" />
            <span>{isEmployeeLineLinked ? 'ผูก LINE OA แล้ว ✓' : 'เชื่อมต่อ LINE OA'}</span>
          </button>
        </div>

      </div>

      {/* บัตรส่วนที่ 2: สรุปตามรอบเงินเดือน (26 ถึง 25) และประวัติการลงเวลา */}
      <div style={{
        width: '100%',
        maxWidth: '540px',
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        padding: '1.5rem',
        marginTop: '1.25rem',
        boxShadow: '0 10px 30px rgba(74, 64, 54, 0.08)',
        border: '1px solid #F5EAE1',
        boxSizing: 'border-box'
      }}>
        {/* สรุปรอบเงินเดือน */}
        <div style={{
          backgroundColor: '#FAF5EE',
          borderRadius: '14px',
          padding: '1rem',
          border: '1px solid #EFE4D6',
          marginBottom: '1.25rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4A4036' }}>
              สรุปตามรอบเงินเดือน
            </span>
            <span style={{ fontSize: '0.78rem', color: '#C19B6C', fontWeight: 600 }}>
              {payPeriod.label}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '10px', textAlign: 'center', border: '1px solid #F5EAE1' }}>
              <div style={{ fontSize: '0.75rem', color: '#8E7F70' }}>วันที่มาทำงานในรอบ</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#4A4036', marginTop: '2px' }}>
                {periodSummary.daysWorked} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>วัน</span>
              </div>
            </div>

            <div style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '10px', textAlign: 'center', border: '1px solid #F5EAE1' }}>
              <div style={{ fontSize: '0.75rem', color: '#8E7F70' }}>ชั่วโมงทำงานรวมในรอบ</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#2E7D32', marginTop: '2px' }}>
                {periodSummary.totalHours} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>ชม.</span>
              </div>
            </div>
          </div>
        </div>

        {/* แถบสลับดูประวัติ */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setHistoryTab('today')}
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: historyTab === 'today' ? '#C19B6C' : '#FAF5EE',
                color: historyTab === 'today' ? '#fff' : '#8E7F70',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              วันนี้ ({todayLogs.length})
            </button>
            <button
              type="button"
              onClick={() => setHistoryTab('period')}
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: historyTab === 'period' ? '#C19B6C' : '#FAF5EE',
                color: historyTab === 'period' ? '#fff' : '#8E7F70',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              รอบนี้ ({periodLogs.length})
            </button>
          </div>

          <button
            type="button"
            onClick={reloadData}
            title="รีเฟรชข้อมูล"
            style={{
              background: 'none',
              border: 'none',
              color: '#8E7F70',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.78rem'
            }}
          >
            <RefreshCw size={13} />
            <span>รีเฟรช</span>
          </button>
        </div>

        {/* รายการประวัติการลงเวลา */}
        <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
          {(historyTab === 'today' ? todayLogs : periodLogs).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#9CA3AF', fontSize: '0.85rem' }}>
              ยังไม่มีประวัติการลงเวลาในช่วงนี้
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(historyTab === 'today' ? todayLogs : periodLogs).map((item, idx) => {
                const isCheckIn = item.type === 'เข้างาน' || item.type === 'IN';
                return (
                  <div 
                    key={item.id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      backgroundColor: '#FAF5EE',
                      borderRadius: '10px',
                      border: '1px solid #F5EAE1',
                      fontSize: '0.85rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: isCheckIn ? '#DCFCE7' : '#FEF3C7',
                        color: isCheckIn ? '#166534' : '#B45309'
                      }}>
                        {item.type}
                      </span>
                      <div>
                        <div style={{ fontWeight: 600, color: '#4A4036' }}>
                          {item.time} น.
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#8E7F70' }}>
                          {item.date}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {item.workHours > 0 && (
                        <span style={{ fontSize: '0.78rem', color: '#2E7D32', fontWeight: 600 }}>
                          {item.workHours} ชม.
                        </span>
                      )}
                      {item.mapsUrl ? (
                        <a 
                          href={item.mapsUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          title="ดูพิกัดบนแผนที่"
                          style={{
                            color: '#0284c7',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                            textDecoration: 'none'
                          }}
                        >
                          <MapPin size={15} />
                        </a>
                      ) : (
                        <MapPin size={15} color="#D1D5DB" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal คู่มือติดตั้ง Add to Home Screen บน iOS */}
      {showIosGuide && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '20px',
            padding: '1.75rem',
            maxWidth: '380px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#4A4036' }}>วิธีเพิ่มไปยังหน้าจอโฮม (iOS)</h3>
            <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '0 0 1.25rem 0' }}>
              เพื่อความสะดวกในการเปิดลงเวลาเหมือนแอปจริง
            </p>
            <div style={{ textAlign: 'left', fontSize: '0.9rem', lineHeight: '1.8', color: '#374151', marginBottom: '1.5rem' }}>
              <div>1. แตะไอคอน <b>แชร์ (Share)</b> ที่แถบด้านล่างของ Safari</div>
              <div>2. เลื่อนลงมาแล้วเลือก <b>"เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen)</b></div>
              <div>3. กด <b>"เพิ่ม" (Add)</b> ที่มุมขวาบน</div>
            </div>
            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#C19B6C',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              รับทราบ
            </button>
          </div>
        </div>
      )}

      {/* Modal เชื่อมต่อ LINE OA */}
      {showLineModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '20px',
            padding: '1.75rem',
            maxWidth: '440px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: '#4A4036', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem' }}>
                <MessageCircle size={22} color="#16A34A" />
                <span>เชื่อมต่อ LINE OA พนักงาน</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setShowLineModal(false)}
                style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* การ์ดข้อมูลพนักงานที่กำลังเชื่อมต่อ */}
            <div style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '10px 14px',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontWeight: 700, color: '#1E293B', fontSize: '0.95rem' }}>
                  {currentEmployee?.fullname || 'พนักงาน'} {currentEmployee?.nickname ? `(${currentEmployee.nickname})` : ''}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px' }}>
                  รหัสพนักงาน: <b style={{ color: '#0284C7', fontFamily: 'monospace' }}>{(employeeId || '').toUpperCase()}</b>
                </div>
              </div>
              <div style={{
                fontSize: '0.75rem',
                padding: '4px 10px',
                borderRadius: '8px',
                fontWeight: 600,
                backgroundColor: (currentEmployee?.line_user_id || currentEmployee?.lineUserId || localStorage.getItem(`hdh_line_user_${(employeeId || '').toUpperCase()}`)) ? '#DCFCE7' : '#FEF3C7',
                color: (currentEmployee?.line_user_id || currentEmployee?.lineUserId || localStorage.getItem(`hdh_line_user_${(employeeId || '').toUpperCase()}`)) ? '#15803D' : '#D97706'
              }}>
                {(currentEmployee?.line_user_id || currentEmployee?.lineUserId || localStorage.getItem(`hdh_line_user_${(employeeId || '').toUpperCase()}`)) ? 'ผูกแล้ว ✓' : 'ยังไม่ได้ผูก'}
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '0 0 1rem 0', lineHeight: '1.5' }}>
              เมื่อเชื่อมต่อแล้ว ระบบจะส่งการแจ้งเตือนเวลาเข้างานและเลิกงานเข้า LINE ส่วนตัวของพนักงานรายนี้โดยตรงค่ะ
            </p>

            {/* 1. ปุ่มผูกบัญชี LINE OA อัตโนมัติ (1 คลิก) แนะนำที่สุด */}
            {(() => {
              const empClean = (employeeId || '').toUpperCase().trim();
              const liffId = clinicInfo?.liffId || '2008270606-7bkwSGyt';
              const returnUrl = encodeURIComponent(window.location.href.split('?')[0].split('#')[0] + '#/checkin');
              const autoLinkUrl = `https://liff.line.me/${liffId}?action=employee_link&employeeId=${encodeURIComponent(empClean)}&returnUrl=${returnUrl}`;

              return (
                <div style={{ marginBottom: '1.25rem' }}>
                  <a
                    href={autoLinkUrl}
                    style={{
                      width: '100%',
                      padding: '0.9rem 1rem',
                      backgroundColor: '#16A34A',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '14px',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      textDecoration: 'none',
                      boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)',
                      boxSizing: 'border-box'
                    }}
                  >
                    <MessageCircle size={20} />
                    <span>⚡ ผูกบัญชี LINE อัตโนมัติ (1 คลิก)</span>
                  </a>
                  <div style={{
                    fontSize: '0.78rem',
                    color: '#15803D',
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    marginTop: '8px',
                    lineHeight: '1.45'
                  }}>
                    ⭐ <b>สำหรับผู้ที่เป็นเพื่อนอยู่แล้ว หรือเพิ่งกดเพิ่มเพื่อน:</b> แตะปุ่มด้านบนนี้ ระบบจะดึงบัญชี LINE ของท่านมาผูกกับรหัสพนักงาน <b>{empClean}</b> ให้อัตโนมัติทันที โดยไม่ต้องพิมพ์รหัส ID เองค่ะ
                  </div>
                </div>
              );
            })()}

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '1.25rem 0 1rem 0' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }}></div>
              <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>หรือกรณีที่ยังไม่ได้เพิ่มเพื่อน LINE</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }}></div>
            </div>

            {/* เพิ่มเพื่อน LINE OA */}
            {(() => {
              const rawLineOa = (clinicInfo?.lineId || '@hugdeehome').trim();
              const lineOaAt = rawLineOa.startsWith('@') ? rawLineOa : `@${rawLineOa}`;
              const lineAddFriendUrl = `https://line.me/R/ti/p/${encodeURIComponent(lineOaAt)}`;
              const lineWebUrl = `https://page.line.me/${lineOaAt.replace(/^@/, '')}`;

              return (
                <div style={{
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  padding: '12px 14px',
                  borderRadius: '14px',
                  marginBottom: '1.25rem'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Smartphone size={16} color="#166534" />
                      <span style={{ fontSize: '0.85rem', color: '#166534' }}>
                        LINE Official: <b>{lineOaAt}</b>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(lineOaAt);
                            Swal.fire({
                              toast: true,
                              position: 'top-end',
                              icon: 'success',
                              title: `คัดลอกไอดี ${lineOaAt} แล้ว`,
                              showConfirmButton: false,
                              timer: 1500
                            });
                          }
                        }}
                        title="คัดลอกไอดี LINE"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#15803D',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <Copy size={13} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setShowLineQr(prev => !prev)}
                        style={{
                          color: '#15803D',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          backgroundColor: '#fff',
                          border: '1px solid #86EFAC',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <QrCode size={13} />
                        {showLineQr ? 'ซ่อน QR' : 'ดู QR'}
                      </button>
                      <a 
                        href={lineAddFriendUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          textDecoration: 'none',
                          backgroundColor: '#16A34A',
                          border: 'none',
                          padding: '5px 12px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)'
                        }}
                      >
                        + เพิ่มเพื่อน LINE
                      </a>
                    </div>
                  </div>

                  {/* QR Code Collapsible */}
                  {showLineQr && (
                    <div style={{
                      textAlign: 'center',
                      padding: '12px 0 6px 0',
                      marginTop: '10px',
                      borderTop: '1px dashed #BBF7D0'
                    }}>
                      <img 
                        src="https://qr-official.line.me/gs/M_747fgvap_GW.png" 
                        alt="LINE Official QR Code"
                        style={{
                          width: '130px',
                          height: '130px',
                          borderRadius: '8px',
                          border: '2px solid #86EFAC',
                          backgroundColor: '#fff',
                          padding: '4px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                        }} 
                      />
                      <div style={{ fontSize: '0.75rem', color: '#15803D', marginTop: '6px', fontWeight: 500 }}>
                        สแกน QR Code ด้วยแอป LINE เพื่อเพิ่มเพื่อน
                      </div>
                    </div>
                  )}

                  <div style={{ fontSize: '0.75rem', color: '#15803D', marginTop: '8px', lineHeight: '1.45' }}>
                    💡 <b>คำแนะนำ:</b> หากคลิกแล้ว LINE แจ้งเตือนข้อผิดพลาด สามารถเปิดแอป LINE แล้วค้นหาเพื่อนด้วยไอดี: <b>@hugdeehome</b> (หรือ <b>@747fgvap</b>) หรือเข้าผ่าน <a href={lineWebUrl} target="_blank" rel="noreferrer" style={{ color: '#166534', fontWeight: 600, textDecoration: 'underline' }}>หน้าเว็บ LINE คลินิก</a> ได้เช่นกันค่ะ
                  </div>
                </div>
              );
            })()}

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: '#374151' }}>
                LINE User ID ของพนักงาน
              </label>
              <input 
                type="text" 
                placeholder="เช่น U1a2b3c4d5e6f7g8h9i0..."
                value={lineUserIdInput}
                onChange={(e) => setLineUserIdInput(e.target.value.trim())}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '0.9rem',
                  borderRadius: '10px',
                  border: '1px solid #D1D5DB',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '4px', lineHeight: '1.4' }}>
                * สามารถให้ Admin ตรวจสอบหรือใส่ให้ได้จากหน้า <b>"ระบบจัดการบัญชีผู้ใช้งานระบบ (พนักงาน)"</b>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowLineModal(false)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: '#F3F4F6',
                  color: '#4B5563',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                ปิด
              </button>
              {lineUserIdInput && (
                <button
                  type="button"
                  onClick={async () => {
                    const empClean = (employeeId || '').trim().toUpperCase();
                    await saveEmployeeLineUser(empClean, '');
                    setLineUserIdInput('');
                    setShowLineModal(false);
                    reloadData();
                    Swal.fire({
                      icon: 'success',
                      title: 'ยกเลิกการผูก LINE สำเร็จ',
                      text: `ยกเลิกการเชื่อมต่อ LINE กับพนักงานรหัส ${empClean} เรียบร้อยแล้ว`,
                      confirmButtonColor: '#16A34A'
                    });
                  }}
                  style={{
                    padding: '0.75rem',
                    backgroundColor: '#FEE2E2',
                    color: '#DC2626',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  title="ยกเลิกการผูก LINE"
                >
                  ยกเลิกผูก
                </button>
              )}
              <button
                type="button"
                disabled={isLinkingLine}
                onClick={handleSaveLineId}
                style={{
                  flex: 2,
                  padding: '0.75rem',
                  backgroundColor: '#16A34A',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 600,
                  cursor: isLinkingLine ? 'not-allowed' : 'pointer',
                  opacity: isLinkingLine ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {isLinkingLine ? (
                  <>
                    <RefreshCw size={16} className="spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <span>บันทึกและทดสอบส่ง</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* สไตล์อนิเมชันกระพริบของจุดนาฬิกา */}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}
