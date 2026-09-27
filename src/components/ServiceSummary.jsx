import React, { useState, useMemo, useEffect } from 'react';
import { formatPatientNickname } from '../utils/format';
import { db, syncDeltaToSupabase, toCamelCase, safeJsonParse } from '../utils/db';
import { supabase } from '../utils/supabaseClient';
import Swal from 'sweetalert2';
import { 
  BarChart3, 
  Calendar, 
  Clock, 
  User, 
  Eye, 
  Award,
  Sparkles,
  Download,
  MapPin,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Users as UsersIcon,
  Briefcase,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Database,
  Copy,
  RefreshCw
} from 'lucide-react';

export default function ServiceSummary({ 
  patients = [], 
  appointments = [], 
  therapists = [],
  users = [],
  attendance: propAttendance = [],
  setAttendance: propSetAttendance,
  currentUser
}) {
  // คำนวณรอบเงินเดือนปัจจุบันโดยอัตโนมัติ (วันที่ 26 ของเดือนก่อน ถึง วันที่ 25 ของเดือนปัจจุบัน)
  const defaultDates = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0 = ม.ค.
    const date = today.getDate();

    let startYear, startMonth, endYear, endMonth;

    if (date <= 25) {
      // รอบบิลสิ้นสุดในวันที่ 25 ของเดือนนี้
      endYear = year;
      endMonth = month;
      
      const prev = new Date(year, month - 1, 26);
      startYear = prev.getFullYear();
      startMonth = prev.getMonth();
    } else {
      // รอบบิลสิ้นสุดในวันที่ 25 ของเดือนถัดไป
      const next = new Date(year, month + 1, 25);
      endYear = next.getFullYear();
      endMonth = next.getMonth();
      
      startYear = year;
      startMonth = month;
    }

    const format = (y, m, d) => {
      const mm = String(m + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      return `${y}-${mm}-${dd}`;
    };

    return {
      start: format(startYear, startMonth, 26),
      end: format(endYear, endMonth, 25)
    };
  }, []);

  // แท็บหลัก: 'teaching' (ชั่วโมงสอนครู OT) หรือ 'attendance' (การเข้าทำงานของพนักงาน)
  const [activeSummaryTab, setActiveSummaryTab] = useState('teaching');

  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);
  const [selectedTherapistId, setSelectedTherapistId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  
  // ซิงค์ attendance จาก prop และ fallback หาจาก db.getAttendance()
  const [attendance, setAttendance] = useState(() => {
    if (Array.isArray(propAttendance) && propAttendance.length > 0) return propAttendance;
    return db.getAttendance();
  });

  useEffect(() => {
    if (Array.isArray(propAttendance) && propAttendance.length > 0) {
      setAttendance(propAttendance);
    } else {
      setAttendance(db.getAttendance());
    }
  }, [propAttendance]);

  // ฟังก์ชันอัปเดตข้อมูล attendance ไปยัง State, LocalStorage และ Cloud
  const updateAttendance = (newAttendanceList) => {
    setAttendance(newAttendanceList);
    db.setAttendance(newAttendanceList);
    if (typeof propSetAttendance === 'function') {
      propSetAttendance(newAttendanceList);
    }
  };

  // ตรวจสอบสถานะตาราง attendance ใน Supabase
  const [isSupabaseTableMissing, setIsSupabaseTableMissing] = useState(false);
  const [isRefreshingCloud, setIsRefreshingCloud] = useState(false);

  // ดึงข้อมูล attendance จาก Supabase และผสานกับเครื่องนี้
  const refreshAttendanceFromCloud = async (showToast = false) => {
    setIsRefreshingCloud(true);
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('schema cache') || error.message?.includes('does not exist')) {
          setIsSupabaseTableMissing(true);
          if (showToast) {
            Swal.fire({
              icon: 'warning',
              title: 'ยังไม่พบตาราง attendance บน Supabase',
              text: 'กรุณารันคำสั่ง SQL สร้างตารางใน Supabase Dashboard เพื่อเปิดใช้งานการซิงค์ข้ามอุปกรณ์ค่ะ',
              confirmButtonColor: 'var(--secondary)'
            });
          }
          return;
        }
      }

      setIsSupabaseTableMissing(false);

      if (Array.isArray(data)) {
        const remoteLogs = data.map(row => {
          const mapped = {};
          for (const k in row) {
            mapped[toCamelCase(k)] = safeJsonParse(row[k]);
          }
          return mapped;
        });

        const localLogs = db.getAttendance() || [];
        const remoteIds = new Set(remoteLogs.map(r => String(r.id)));
        const unsynced = localLogs.filter(l => l && l.id && !remoteIds.has(String(l.id)));

        if (unsynced.length > 0) {
          syncDeltaToSupabase('hdh_attendance', { toUpsert: unsynced }).catch(() => {});
        }

        const mergedMap = new Map();
        localLogs.forEach(l => { if (l && l.id) mergedMap.set(String(l.id), l); });
        remoteLogs.forEach(r => { if (r && r.id) mergedMap.set(String(r.id), r); });

        const mergedList = Array.from(mergedMap.values()).sort((a, b) => {
          const dtA = `${a.date || ''} ${a.time || ''}`;
          const dtB = `${b.date || ''} ${b.time || ''}`;
          return dtB.localeCompare(dtA);
        });

        updateAttendance(mergedList);

        if (showToast) {
          Swal.fire({
            icon: 'success',
            title: 'ซิงค์ข้อมูลล่าสุดสำเร็จ',
            text: `ดึงข้อมูลจากคลาวด์พบ ${remoteLogs.length} รายการ (รวมในเครื่อง ${mergedList.length} รายการ)`,
            timer: 2000,
            showConfirmButton: false
          });
        }
      }
    } catch (e) {
      console.warn('Error refreshing attendance from cloud:', e);
    } finally {
      setIsRefreshingCloud(false);
    }
  };

  useEffect(() => {
    refreshAttendanceFromCloud(false);
  }, []);

  const handleCopySql = async () => {
    const sqlScript = `-- =========================================================================
-- สคริปต์สร้างตาราง attendance สำหรับระบบลงเวลาเข้า-ออกงาน (Time Attendance)
-- คลินิกบ้านฮักดี (Hug Dee Home)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.attendance (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  employee_name TEXT,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  type TEXT NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC,
  accuracy NUMERIC,
  maps_url TEXT,
  work_hours NUMERIC DEFAULT 0,
  line_user_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON public.attendance (employee_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance (date);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS line_user_id TEXT;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read attendance" ON public.attendance;
CREATE POLICY "Allow anon read attendance" ON public.attendance FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon insert attendance" ON public.attendance;
CREATE POLICY "Allow anon insert attendance" ON public.attendance FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update attendance" ON public.attendance;
CREATE POLICY "Allow anon update attendance" ON public.attendance FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow anon delete attendance" ON public.attendance;
CREATE POLICY "Allow anon delete attendance" ON public.attendance FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow anon update line_user_id on users" ON public.users;
CREATE POLICY "Allow anon update line_user_id on users" ON public.users FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon select users" ON public.users;
CREATE POLICY "Allow anon select users" ON public.users FOR SELECT USING (true);

GRANT ALL ON public.attendance TO anon, authenticated;
GRANT SELECT ON public.clinic_info TO anon, authenticated;
`;

    try {
      await navigator.clipboard.writeText(sqlScript);
      await Swal.fire({
        icon: 'success',
        title: 'คัดลอกคำสั่ง SQL เรียบร้อยแล้ว! 📋',
        html: `
          <div style="text-align: left; font-size: 0.95rem; line-height: 1.6; padding: 0.5rem;">
            <b>ขั้นตอนนำไปใช้งานบน Supabase (ทำเพียงครั้งเดียว):</b>
            <ol style="margin: 0.5rem 0 0 1rem; padding: 0;">
              <li>เปิด <a href="https://supabase.com/dashboard/project/bmplfuzkyyuqtlfgifvm/sql/new" target="_blank" style="color: #0284C7; font-weight: bold; text-decoration: underline;">Supabase SQL Editor</a></li>
              <li>กด <b>Ctrl + V</b> เพื่อวางคำสั่ง SQL ที่คัดลอกไว้</li>
              <li>กดปุ่มสีเขียว <b>Run</b> ที่มุมขวาล่าง</li>
              <li>จากนั้นกลับมากดปุ่ม <b>"ตรวจสอบและซิงค์ข้อมูลอีกครั้ง"</b> ที่หน้านี้ได้เลยค่ะ 🎉</li>
            </ol>
          </div>
        `,
        confirmButtonText: 'รับทราบ',
        confirmButtonColor: '#16A34A'
      });
    } catch (e) {
      prompt('คัดลอกคำสั่ง SQL ด้านล่างนี้:', sqlScript);
    }
  };

  // วันที่ปัจจุบัน YYYY-MM-DD
  const todayStr = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // สถานะเปิด Modal รายละเอียดการสอน (Tab 1)
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [modalDetails, setModalDetails] = useState({
    therapistName: '',
    nickname: '',
    date: '',
    cases: []
  });

  // สถานะเปิด Modal รายละเอียดการเข้างาน (Tab 2)
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [modalAttendance, setModalAttendance] = useState(null);

  // สถานะเปิด Modal เพิ่ม/แก้ไขเวลาการทำงาน (Admin Only)
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [formAttendance, setFormAttendance] = useState({
    employeeId: '',
    date: todayStr,
    inTime: '08:30:00',
    outTime: '17:30:00',
    workHours: 8.0,
    notes: 'Admin บันทึกเวลาทำงาน'
  });

  // ตรวจสอบว่าเป็นวันเสาร์หรืออาทิตย์หรือไม่
  const isWeekend = (dateStr) => {
    if (!dateStr) return false;
    const parts = String(dateStr).split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts.map(Number);
      const day = new Date(y, m - 1, d).getDay();
      return day === 0 || day === 6; // 0 = อาทิตย์, 6 = เสาร์
    }
    return false;
  };

  // ฟังก์ชันคำนวณผลต่างชั่วโมงระหว่าง In และ Out (วันเสาร์-อาทิตย์ หักเวลาพักเที่ยง 1 ชั่วโมง)
  const calculateDiffHours = (inT, outT, dateStr = '') => {
    if (!inT || !outT) return 0;
    const [h1, m1, s1] = inT.split(':').map(Number);
    const [h2, m2, s2] = outT.split(':').map(Number);
    const d1 = new Date(2000, 0, 1, h1 || 0, m1 || 0, s1 || 0);
    const d2 = new Date(2000, 0, 1, h2 || 0, m2 || 0, s2 || 0);
    const diffMs = Math.max(0, d2.getTime() - d1.getTime());
    let hours = diffMs / (1000 * 60 * 60);

    // วันเสาร์ อาทิตย์ คำนวณหักเวลาพักเที่ยง 1 ชั่วโมง (เมื่อทำงานตั้งแต่ 5 ชั่วโมงขึ้นไป)
    const targetDate = dateStr || formAttendance?.date || todayStr;
    if (isWeekend(targetDate) && hours >= 5) {
      hours = Math.max(0, hours - 1);
    }

    return Math.round(hours * 10) / 10;
  };

  // ค้นหาข้อมูลพนักงานจาก users / therapists
  const getEmployeeInfo = (empId, fallbackName = '') => {
    const normId = String(empId || '').toUpperCase().trim();
    const u = (users || []).find(user => 
      String(user.employeeId || user.employee_id || user.username || '').toUpperCase().trim() === normId ||
      (user.fullname && user.fullname === fallbackName)
    );
    if (u) {
      return {
        employeeId: u.employeeId || u.employee_id || normId,
        fullname: u.fullname || u.name || fallbackName,
        nickname: u.nickname || '',
        position: u.position || u.role || 'พนักงาน',
        role: u.role || 'Staff'
      };
    }
    const t = (therapists || []).find(therapist => 
      String(therapist.id || '').toUpperCase().trim() === normId ||
      therapist.fullname === fallbackName
    );
    if (t) {
      return {
        employeeId: t.id || normId,
        fullname: t.fullname || fallbackName,
        nickname: t.nickname || '',
        position: 'นักกิจกรรมบำบัด',
        role: 'OT'
      };
    }
    return {
      employeeId: normId,
      fullname: fallbackName || normId,
      nickname: '',
      position: 'พนักงาน',
      role: ''
    };
  };

  // ตรวจสอบสิทธิ์การแสดงผลสำหรับผู้ใช้ที่ล็อกอินอยู่
  const myEmployeeId = useMemo(() => {
    if (!currentUser) return null;
    return String(currentUser.employeeId || currentUser.employee_id || currentUser.username || '').toUpperCase().trim();
  }, [currentUser]);

  const isAllowedEmployee = (empId, empFullname) => {
    if (!currentUser || currentUser.role === 'Admin') return true;
    const normId = String(empId || '').toUpperCase().trim();
    if (myEmployeeId && normId === myEmployeeId) return true;
    if (currentUser.fullname && empFullname === currentUser.fullname) return true;
    if (currentUser.username && String(currentUser.username).toUpperCase() === normId) return true;
    return false;
  };

  // รายชื่อพนักงานสำหรับ Dropdown เลือกใน Tab 2 (Admin view)
  const availableEmployees = useMemo(() => {
    const list = [];
    const seen = new Set();
    
    (users || []).forEach(u => {
      const id = String(u.employeeId || u.employee_id || u.username || '').toUpperCase().trim();
      if (id && !seen.has(id)) {
        seen.add(id);
        list.push({
          id,
          fullname: u.fullname || u.name || id,
          nickname: u.nickname || '',
          position: u.position || u.role || 'พนักงาน'
        });
      }
    });

    (therapists || []).forEach(t => {
      const id = String(t.id || '').toUpperCase().trim();
      if (id && !seen.has(id)) {
        seen.add(id);
        list.push({
          id,
          fullname: t.fullname || id,
          nickname: t.nickname || '',
          position: 'นักกิจกรรมบำบัด'
        });
      }
    });

    return list.sort((a, b) => a.fullname.localeCompare(b.fullname));
  }, [users, therapists]);

  // ==========================================
  // TAB 1: คำนวณชั่วโมงสอนครู (OT)
  // ==========================================

  // 1. คำนวณชั่วโมงสอนของครูแต่ละคนในช่วงเวลาเพื่อแสดงการ์ดสรุปด้านบน
  const teacherSummaryCards = useMemo(() => {
    const counts = {};
    
    therapists.forEach(t => {
      counts[t.id] = 0;
    });

    appointments.forEach(app => {
      if (
        app.status === 'รับบริการแล้ว' && 
        (app.type === 'ประเมินพัฒนาการครั้งแรก' || app.type === 'ฝึกกระตุ้นพัฒนาการ') &&
        app.date >= startDate && 
        app.date <= endDate
      ) {
        if (counts[app.therapistId] !== undefined) {
          counts[app.therapistId]++;
        }
      }
    });

    let list = therapists
      .map(t => ({
        id: t.id,
        nickname: t.nickname,
        fullname: t.fullname,
        licenseNo: t.licenseNo,
        totalHours: counts[t.id]
      }))
      .filter(t => t.totalHours > 0);

    if (currentUser && currentUser.role === 'OT') {
      const myTherapist = therapists.find(t => 
        t.id === currentUser.employeeId || 
        t.fullname === currentUser.fullname || 
        (t.nickname && currentUser.nickname && t.nickname === currentUser.nickname)
      );
      const myTherapistId = myTherapist ? myTherapist.id : 'NONE';
      list = list.filter(t => t.id === myTherapistId);
    } else if (selectedTherapistId) {
      list = list.filter(t => t.id === selectedTherapistId);
    }

    return list;
  }, [appointments, therapists, startDate, endDate, currentUser, selectedTherapistId]);

  // 2. จัดกลุ่มนัดหมายที่สอนสำเร็จตาม ครู + วัน (1 แถวต่อครูในวันเดียวกัน)
  const aggregatedTeachingRows = useMemo(() => {
    const groups = {};

    const servedApps = appointments.filter(app => 
      app.status === 'รับบริการแล้ว' && 
      (app.type === 'ประเมินพัฒนาการครั้งแรก' || app.type === 'ฝึกกระตุ้นพัฒนาการ') &&
      app.date >= startDate && 
      app.date <= endDate
    );

    servedApps.forEach(app => {
      const key = `${app.therapistId}_${app.date}`;
      if (!groups[key]) {
        groups[key] = {
          therapistId: app.therapistId,
          date: app.date,
          hours: 0,
          appointmentIds: []
        };
      }
      groups[key].hours++;
      groups[key].appointmentIds.push(app.id);
    });

    let myTherapistId = null;
    if (currentUser && currentUser.role === 'OT') {
      const myTherapist = therapists.find(t => 
        t.id === currentUser.employeeId || 
        t.fullname === currentUser.fullname || 
        (t.nickname && currentUser.nickname && t.nickname === currentUser.nickname)
      );
      myTherapistId = myTherapist ? myTherapist.id : 'NONE';
    }

    return Object.values(groups)
      .map(g => {
        const therapist = therapists.find(t => t.id === g.therapistId);
        return {
          ...g,
          therapistNickname: therapist ? therapist.nickname : 'ไม่ระบุชื่อครู',
          therapistFullname: therapist ? therapist.fullname : 'ไม่ระบุชื่อครู',
          licenseNo: therapist ? therapist.licenseNo : ''
        };
      })
      .filter(row => {
        if (currentUser && currentUser.role === 'OT') {
          return row.therapistId === myTherapistId;
        } else if (selectedTherapistId) {
          return row.therapistId === selectedTherapistId;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || a.therapistNickname.localeCompare(b.therapistNickname));
  }, [appointments, therapists, startDate, endDate, currentUser, selectedTherapistId]);

  // คลิกดูรายละเอียดเคสที่สอนในวันนั้น
  const handleViewDetailClick = (row) => {
    const dailyApps = appointments
      .filter(app => 
        app.therapistId === row.therapistId && 
        app.date === row.date && 
        app.status === 'รับบริการแล้ว' &&
        (app.type === 'ประเมินพัฒนาการครั้งแรก' || app.type === 'ฝึกกระตุ้นพัฒนาการ')
      )
      .map(app => {
        const patient = patients.find(p => String(p.hn) === String(app.hn));
        return {
          ...app,
          patientName: patient ? `${patient.title}${patient.firstname} ${patient.lastname}` : 'ไม่พบข้อมูล',
          patientNickname: patient ? patient.nickname : ''
        };
      })
      .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));

    setModalDetails({
      therapistName: row.therapistFullname,
      nickname: row.therapistNickname,
      date: row.date,
      cases: dailyApps
    });
    
    setShowDetailModal(true);
  };

  // ==========================================
  // TAB 2: คำนวณการเข้าทำงานของพนักงาน (Attendance)
  // ==========================================

  // แปลงและคลีน Attendance logs
  const normalizedAttendanceLogs = useMemo(() => {
    if (!Array.isArray(attendance)) return [];
    return attendance.map(log => {
      const empId = String(log.employeeId || log.employee_id || '').toUpperCase().trim();
      const empName = log.employeeName || log.employee_name || '';
      const date = log.date || (log.createdAt ? log.createdAt.split('T')[0] : '');
      const time = log.time || (log.createdAt ? log.createdAt.split('T')[1]?.split('.')[0] : '00:00:00');
      const type = log.type || 'เข้างาน';
      const workHours = Number(log.workHours ?? log.work_hours ?? 0);
      const lat = log.latitude;
      const lng = log.longitude;
      const accuracy = log.accuracy;
      const mapsUrl = log.mapsUrl || log.maps_url || (lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : '');
      const notes = log.notes || '';
      return {
        ...log,
        employeeId: empId,
        employeeName: empName,
        date,
        time,
        type,
        workHours,
        latitude: lat,
        longitude: lng,
        accuracy,
        mapsUrl,
        notes
      };
    });
  }, [attendance]);

  // จัดกลุ่มการเข้าทำงานรายวัน (1 แถวต่อพนักงาน 1 คนใน 1 วัน)
  const dailyAttendanceRows = useMemo(() => {
    const filtered = normalizedAttendanceLogs.filter(log => {
      if (!log.date || log.date < startDate || log.date > endDate) return false;
      if (currentUser?.role === 'Admin') {
        if (selectedEmployeeId && log.employeeId !== selectedEmployeeId) return false;
        return true;
      }
      return isAllowedEmployee(log.employeeId, log.employeeName);
    });

    const groups = {};
    filtered.forEach(log => {
      const key = `${log.date}_${log.employeeId}`;
      if (!groups[key]) {
        groups[key] = {
          date: log.date,
          employeeId: log.employeeId,
          logs: []
        };
      }
      groups[key].logs.push(log);
    });

    return Object.values(groups).map(g => {
      const empInfo = getEmployeeInfo(g.employeeId, g.logs[0]?.employeeName);
      const sortedLogs = [...g.logs].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      
      const inLogs = sortedLogs.filter(l => l.type === 'เข้างาน' || l.type === 'IN');
      const outLogs = sortedLogs.filter(l => l.type === 'เลิกงาน' || l.type === 'OUT');
      
      const firstIn = inLogs[0] || null;
      const latestOut = outLogs[outLogs.length - 1] || null;
      
      let workHours = 0;
      outLogs.forEach(l => {
        if (l.workHours > 0) {
          workHours += l.workHours;
        }
      });

      if (workHours === 0 && firstIn && latestOut && firstIn.time && latestOut.time) {
        const [h1, m1, s1] = firstIn.time.split(':').map(Number);
        const [h2, m2, s2] = latestOut.time.split(':').map(Number);
        const d1 = new Date(2000, 0, 1, h1 || 0, m1 || 0, s1 || 0);
        const d2 = new Date(2000, 0, 1, h2 || 0, m2 || 0, s2 || 0);
        const diffMs = Math.max(0, d2 - d1);
        let hours = diffMs / (1000 * 60 * 60);
        if (isWeekend(g.date) && hours >= 5) {
          hours = Math.max(0, hours - 1);
        }
        workHours = Math.round(hours * 10) / 10;
      } else {
        workHours = Math.round(workHours * 10) / 10;
      }

      const isWorkingNow = firstIn && !latestOut && g.date === todayStr;
      const isMissingCheckOut = firstIn && !latestOut && g.date < todayStr;

      return {
        key: `${g.date}_${g.employeeId}`,
        date: g.date,
        employeeId: empInfo.employeeId,
        employeeName: empInfo.fullname,
        employeeNickname: empInfo.nickname,
        employeePosition: empInfo.position,
        firstInTime: firstIn?.time || null,
        latestOutTime: latestOut?.time || null,
        inRecord: firstIn,
        outRecord: latestOut,
        allDayLogs: sortedLogs,
        workHours,
        isWorkingNow,
        isMissingCheckOut,
        hasLocation: !!(firstIn?.mapsUrl || latestOut?.mapsUrl)
      };
    }).sort((a, b) => b.date.localeCompare(a.date) || a.employeeName.localeCompare(b.employeeName));
  }, [normalizedAttendanceLogs, startDate, endDate, currentUser, selectedEmployeeId, users, therapists, todayStr]);

  // การ์ดสรุปการทำงานของพนักงานแต่ละคนในรอบนี้
  const employeeSummaryCards = useMemo(() => {
    const map = {};

    dailyAttendanceRows.forEach(row => {
      if (!map[row.employeeId]) {
        map[row.employeeId] = {
          employeeId: row.employeeId,
          fullname: row.employeeName,
          nickname: row.employeeNickname,
          position: row.employeePosition,
          datesSet: new Set(),
          totalHours: 0
        };
      }
      map[row.employeeId].datesSet.add(row.date);
      map[row.employeeId].totalHours += row.workHours;
    });

    return Object.values(map).map(item => ({
      employeeId: item.employeeId,
      fullname: item.fullname,
      nickname: item.nickname,
      position: item.position,
      daysWorked: item.datesSet.size,
      totalHours: Math.round(item.totalHours * 10) / 10
    })).sort((a, b) => b.totalHours - a.totalHours || a.fullname.localeCompare(b.fullname));
  }, [dailyAttendanceRows]);

  // Helper วันภาษาไทย
  const getThaiDayOfWeek = (dateStr) => {
    if (!dateStr) return '';
    const parts = String(dateStr).split('-');
    if (parts.length !== 3) return '';
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    return days[d.getDay()] || '';
  };

  const formatThaiDate = (dateStr) => {
    if (!dateStr) return '-';
    const parts = String(dateStr).split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // ==========================================
  // ฟังก์ชัน เพิ่ม / แก้ไข / ลบ สำหรับ ADMIN
  // ==========================================

  // เปิด Modal เพิ่มการลงเวลา
  const handleOpenAddModal = () => {
    const defaultEmp = availableEmployees[0]?.id || '';
    setFormAttendance({
      employeeId: defaultEmp,
      date: todayStr,
      inTime: '08:30:00',
      outTime: '17:30:00',
      workHours: calculateDiffHours('08:30:00', '17:30:00', todayStr),
      notes: 'Admin บันทึกเวลาทำงาน'
    });
    setIsEditing(false);
    setEditingRow(null);
    setShowAddEditModal(true);
  };

  // เปิด Modal แก้ไขการลงเวลา
  const handleOpenEditModal = (row) => {
    const inT = row.firstInTime ? (row.firstInTime.length === 5 ? `${row.firstInTime}:00` : row.firstInTime) : '08:30:00';
    const outT = row.latestOutTime ? (row.latestOutTime.length === 5 ? `${row.latestOutTime}:00` : row.latestOutTime) : '17:30:00';
    const hours = row.workHours > 0 ? row.workHours : calculateDiffHours(inT, outT, row.date);

    setFormAttendance({
      employeeId: row.employeeId,
      date: row.date,
      inTime: inT,
      outTime: outT,
      workHours: hours,
      notes: row.outRecord?.notes || row.inRecord?.notes || 'แก้ไขเวลาทำงานโดย Admin'
    });
    setIsEditing(true);
    setEditingRow(row);
    setShowAddEditModal(true);
  };

  // ลบรายการลงเวลา
  const handleDeleteAttendance = async (row) => {
    const confirmDelete = await Swal.fire({
      icon: 'warning',
      title: 'ยืนยันการลบรายการลงเวลา?',
      html: `ต้องการลบข้อมูลการลงเวลาของ <b>${row.employeeName}</b> (${row.employeeId})<br/>วันที่ <b>${formatThaiDate(row.date)}</b> หรือไม่?<br/><span style="color: #dc2626; font-size: 0.85rem;">*ข้อมูลการลงเวลาในวันนี้จะถูกลบออกจากระบบและคลาวด์ทันที</span>`,
      showCancelButton: true,
      confirmButtonText: 'ยืนยันลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6B7280'
    });

    if (confirmDelete.isConfirmed) {
      const rowEmpClean = String(row.employeeId || '').toUpperCase().trim();
      const logsToDelete = attendance.filter(l => {
        const lEmpId = String(l.employeeId || l.employee_id || '').toUpperCase().trim();
        return (l.date === row.date && lEmpId === rowEmpClean);
      });
      const idsToDelete = logsToDelete.map(l => l.id).filter(Boolean);

      // 1. ลบออกจาก Supabase ทันที
      if (idsToDelete.length > 0) {
        try {
          const { error: delErr } = await supabase
            .from('attendance')
            .delete()
            .in('id', idsToDelete);
          if (delErr) {
            console.error('Error deleting attendance from Supabase:', delErr);
          }
        } catch (e) {
          console.warn('Could not delete attendance from Supabase:', e);
        }

        try {
          await syncDeltaToSupabase('hdh_attendance', { toDelete: logsToDelete });
        } catch (e) {}
      }

      // 2. อัปเดต State และ LocalStorage
      const otherLogs = attendance.filter(l => !idsToDelete.includes(l.id));
      updateAttendance(otherLogs);

      if (showAttendanceModal) {
        setShowAttendanceModal(false);
      }

      Swal.fire({
        icon: 'success',
        title: 'ลบรายการสำเร็จ',
        text: `ลบข้อมูลการลงเวลาของ ${row.employeeName} วันที่ ${formatThaiDate(row.date)} เรียบร้อยแล้ว`,
        timer: 1500,
        showConfirmButton: false
      });
    }
  };

  // บันทึกฟอร์ม เพิ่ม / แก้ไข
  const handleSaveAttendance = async (e) => {
    e.preventDefault();
    
    if (!formAttendance.employeeId) {
      Swal.fire({ icon: 'warning', title: 'กรุณาเลือกพนักงาน', text: 'ต้องระบุพนักงานที่ต้องการบันทึกเวลา' });
      return;
    }
    if (!formAttendance.date) {
      Swal.fire({ icon: 'warning', title: 'กรุณาระบุวันที่', text: 'ต้องระบุวันที่ทำงาน' });
      return;
    }
    if (!formAttendance.inTime) {
      Swal.fire({ icon: 'warning', title: 'กรุณาระบุเวลาเข้างาน', text: 'ต้องระบุเวลาเข้างาน' });
      return;
    }

    const empInfo = getEmployeeInfo(formAttendance.employeeId);
    const now = new Date();
    
    const formatTime = (t) => {
      if (!t) return '';
      const parts = t.split(':');
      const h = String(parts[0] || '00').padStart(2, '0');
      const m = String(parts[1] || '00').padStart(2, '0');
      const s = String(parts[2] || '00').padStart(2, '0');
      return `${h}:${m}:${s}`;
    };

    const finalInTime = formatTime(formAttendance.inTime);
    const finalOutTime = formAttendance.outTime ? formatTime(formAttendance.outTime) : null;
    const finalWorkHours = parseFloat(formAttendance.workHours) || 0;

    if (isEditing && editingRow) {
      // อัปเดตรายการเดิม
      const otherLogs = attendance.filter(l => {
        const lEmpId = String(l.employeeId || l.employee_id || '').toUpperCase().trim();
        return !(l.date === editingRow.date && lEmpId === editingRow.employeeId);
      });

      const inRec = {
        ...(editingRow.inRecord || {}),
        id: editingRow.inRecord?.id || `att_${Date.now()}_${editingRow.employeeId}_in`,
        employeeId: editingRow.employeeId,
        employeeName: empInfo.fullname,
        date: formAttendance.date,
        time: finalInTime,
        type: 'เข้างาน',
        workHours: 0,
        notes: formAttendance.notes ? `${formAttendance.notes} (แก้ไขโดย Admin)` : 'แก้ไขโดย Admin',
        createdAt: editingRow.inRecord?.createdAt || now.toISOString()
      };

      const newLogs = [inRec];

      if (finalOutTime) {
        const outRec = {
          ...(editingRow.outRecord || {}),
          id: editingRow.outRecord?.id || `att_${Date.now() + 1}_${editingRow.employeeId}_out`,
          employeeId: editingRow.employeeId,
          employeeName: empInfo.fullname,
          date: formAttendance.date,
          time: finalOutTime,
          type: 'เลิกงาน',
          workHours: finalWorkHours,
          notes: formAttendance.notes ? `${formAttendance.notes} (แก้ไขโดย Admin)` : 'แก้ไขโดย Admin',
          createdAt: editingRow.outRecord?.createdAt || now.toISOString()
        };
        newLogs.push(outRec);
      }

      const updatedList = [...newLogs, ...otherLogs];
      updateAttendance(updatedList);

      // ซิงค์ตรงขึ้น Supabase
      try {
        await syncDeltaToSupabase('hdh_attendance', { toUpsert: newLogs });
      } catch (err) {
        console.warn('Error syncing edited attendance to Supabase:', err);
      }

      setShowAddEditModal(false);
      Swal.fire({
        icon: 'success',
        title: 'บันทึกการแก้ไขสำเร็จ!',
        text: `อัปเดตเวลาทำงานของ ${empInfo.fullname} วันที่ ${formatThaiDate(formAttendance.date)} เรียบร้อยแล้ว`,
        timer: 1800,
        showConfirmButton: false
      });

    } else {
      // เพิ่มรายการใหม่
      const existing = attendance.filter(l => {
        const lEmpId = String(l.employeeId || l.employee_id || '').toUpperCase().trim();
        return l.date === formAttendance.date && lEmpId === formAttendance.employeeId;
      });

      if (existing.length > 0) {
        const overwrite = await Swal.fire({
          icon: 'question',
          title: 'มีรายการลงเวลาในวันนี้อยู่แล้ว',
          html: `พนักงาน <b>${empInfo.fullname}</b> มีบันทึกเวลาในวันที่ <b>${formatThaiDate(formAttendance.date)}</b> อยู่แล้ว<br/>ต้องการบันทึกแทนที่ข้อมูลเดิมหรือไม่?`,
          showCancelButton: true,
          confirmButtonText: 'แทนที่ข้อมูลเดิม',
          cancelButtonText: 'ยกเลิก',
          confirmButtonColor: 'var(--primary)'
        });
        if (!overwrite.isConfirmed) return;
      }

      const otherLogs = attendance.filter(l => {
        const lEmpId = String(l.employeeId || l.employee_id || '').toUpperCase().trim();
        return !(l.date === formAttendance.date && lEmpId === formAttendance.employeeId);
      });

      const inRec = {
        id: `att_${Date.now()}_${formAttendance.employeeId}_in`,
        employeeId: formAttendance.employeeId,
        employeeName: empInfo.fullname,
        date: formAttendance.date,
        time: finalInTime,
        type: 'เข้างาน',
        workHours: 0,
        notes: formAttendance.notes || 'Admin บันทึกเวลาเข้างาน',
        createdAt: now.toISOString()
      };

      const newLogs = [inRec];

      if (finalOutTime) {
        const outRec = {
          id: `att_${Date.now() + 1}_${formAttendance.employeeId}_out`,
          employeeId: formAttendance.employeeId,
          employeeName: empInfo.fullname,
          date: formAttendance.date,
          time: finalOutTime,
          type: 'เลิกงาน',
          workHours: finalWorkHours,
          notes: formAttendance.notes || 'Admin บันทึกเวลาเลิกงาน',
          createdAt: now.toISOString()
        };
        newLogs.push(outRec);
      }

      const updatedList = [...newLogs, ...otherLogs];
      updateAttendance(updatedList);

      // ซิงค์ตรงขึ้น Supabase
      try {
        await syncDeltaToSupabase('hdh_attendance', { toUpsert: newLogs });
      } catch (err) {
        console.warn('Error syncing new attendance to Supabase:', err);
      }

      setShowAddEditModal(false);
      Swal.fire({
        icon: 'success',
        title: 'เพิ่มรายการลงเวลาสำเร็จ!',
        text: `บันทึกเวลาทำงานของ ${empInfo.fullname} วันที่ ${formatThaiDate(formAttendance.date)} เรียบร้อยแล้ว`,
        timer: 1800,
        showConfirmButton: false
      });
    }
  };

  // คลิกเปิด Modal รายละเอียดการเข้างาน
  const handleViewAttendanceDetail = (row) => {
    setModalAttendance(row);
    setShowAttendanceModal(true);
  };

  // Export CSV สำหรับชั่วโมงสอนครู
  const handleExportCSV = () => {
    const headers = ['นักกิจกรรมบำบัด', 'วันที่', 'วันที่ในสัปดาห์', 'จำนวนเคสที่ฝึก'];
    const csvRows = [headers.join(',')];
    
    aggregatedTeachingRows.forEach(row => {
      const therapistName = `${row.therapistFullname} (${row.therapistNickname})`;
      const formattedDate = formatThaiDate(row.date);
      const dayOfWeek = getThaiDayOfWeek(row.date);
      const caseCount = row.hours;
      
      const line = [
        `"${therapistName.replace(/"/g, '""')}"`,
        `"${formattedDate.replace(/"/g, '""')}"`,
        `"${dayOfWeek.replace(/"/g, '""')}"`,
        caseCount
      ].join(',');
      csvRows.push(line);
    });
    
    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `รายงานชั่วโมงสอนครู_${startDate}_ถึง_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export CSV สำหรับการเข้าทำงานของพนักงาน
  const handleExportAttendanceCSV = () => {
    const headers = [
      'รหัสพนักงาน', 
      'ชื่อ-นามสกุล', 
      'ชื่อเล่น', 
      'ตำแหน่ง', 
      'วันที่', 
      'วันในสัปดาห์', 
      'เวลาเข้างาน', 
      'เวลาเลิกงาน', 
      'ชั่วโมงทำงานรวม', 
      'สถานะ', 
      'พิกัดเข้างาน (Maps URL)', 
      'พิกัดเลิกงาน (Maps URL)'
    ];
    const csvRows = [headers.join(',')];

    dailyAttendanceRows.forEach(row => {
      const dayOfWeek = getThaiDayOfWeek(row.date);
      const formattedDate = formatThaiDate(row.date);
      const statusText = row.latestOutTime 
        ? 'เสร็จสิ้น' 
        : (row.isWorkingNow ? 'กำลังปฏิบัติงาน' : (row.isMissingCheckOut ? 'ยังไม่ลงเวลาเลิกงาน' : '-'));

      const line = [
        `"${(row.employeeId || '').replace(/"/g, '""')}"`,
        `"${(row.employeeName || '').replace(/"/g, '""')}"`,
        `"${(row.employeeNickname || '').replace(/"/g, '""')}"`,
        `"${(row.employeePosition || '').replace(/"/g, '""')}"`,
        `"${(formattedDate || '').replace(/"/g, '""')}"`,
        `"${(dayOfWeek || '').replace(/"/g, '""')}"`,
        `"${(row.firstInTime ? row.firstInTime + ' น.' : '-').replace(/"/g, '""')}"`,
        `"${(row.latestOutTime ? row.latestOutTime + ' น.' : '-').replace(/"/g, '""')}"`,
        `"${row.workHours} ชั่วโมง"`,
        `"${statusText.replace(/"/g, '""')}"`,
        `"${(row.inRecord?.mapsUrl || '').replace(/"/g, '""')}"`,
        `"${(row.outRecord?.mapsUrl || '').replace(/"/g, '""')}"`
      ].join(',');
      csvRows.push(line);
    });

    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `รายงานการเข้าทำงานพนักงาน_${startDate}_ถึง_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* ส่วนหัวหน้าเว็บและปุ่ม Export / เพิ่มการลงเวลา */}
      <div className="page-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">
            <BarChart3 size={28} />
            {activeSummaryTab === 'teaching' ? 'สรุปการให้บริการและชั่วโมงสอนครู' : 'สรุปการเข้าทำงานของพนักงาน'} {currentUser?.role === 'Admin' ? '(Admin Only)' : ''}
          </h1>
          <p style={{ margin: '0.25rem 0 0 2.25rem', fontSize: '0.875rem', color: 'var(--dark-light)' }}>
            {activeSummaryTab === 'teaching' 
              ? 'สรุปชั่วโมงสอนกิจกรรมบำบัดรายบุคคลและรายวันตามรอบบิล' 
              : 'สรุปการลงเวลาเข้า-ออกงาน พิกัดสถานที่ และชั่วโมงทำงานรวมของบุคลากร'}
          </p>
        </div>

        <div className="page-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {currentUser?.role === 'Admin' && activeSummaryTab === 'attendance' && (
            <button 
              className="btn btn-secondary" 
              onClick={() => refreshAttendanceFromCloud(true)}
              disabled={isRefreshingCloud}
              title="ดึงข้อมูลการลงเวลาล่าสุดจากคลาวด์"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={16} className={isRefreshingCloud ? 'spin' : ''} /> 
              {isRefreshingCloud ? 'กำลังซิงค์...' : 'ซิงค์ข้อมูลคลาวด์'}
            </button>
          )}

          {currentUser?.role === 'Admin' && activeSummaryTab === 'attendance' && (
            <button 
              className="btn btn-secondary" 
              onClick={handleOpenAddModal}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} /> บันทึกเวลาทำงาน
            </button>
          )}

          {currentUser?.role === 'Admin' && (
            <button 
              className="btn btn-primary" 
              onClick={activeSummaryTab === 'teaching' ? handleExportCSV : handleExportAttendanceCSV}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={16} /> Export CSV
            </button>
          )}
        </div>
      </div>

      {/* แถบสลับ Tab หลัก: ชั่วโมงสอนครู (OT) vs การเข้าทำงานของพนักงาน */}
      <div style={{
        display: 'inline-flex',
        background: '#FAF6F0',
        padding: '5px',
        borderRadius: '14px',
        border: '1px solid var(--border-light)',
        alignSelf: 'flex-start',
        gap: '6px'
      }}>
        <button
          type="button"
          onClick={() => setActiveSummaryTab('teaching')}
          style={{
            padding: '0.65rem 1.4rem',
            borderRadius: '10px',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: activeSummaryTab === 'teaching' ? 'var(--primary)' : 'transparent',
            color: activeSummaryTab === 'teaching' ? '#fff' : 'var(--dark-light)',
            boxShadow: activeSummaryTab === 'teaching' ? '0 3px 10px rgba(224, 122, 95, 0.25)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <Award size={18} />
          ชั่วโมงสอนครู (OT)
        </button>

        <button
          type="button"
          onClick={() => setActiveSummaryTab('attendance')}
          style={{
            padding: '0.65rem 1.4rem',
            borderRadius: '10px',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: activeSummaryTab === 'attendance' ? 'var(--primary)' : 'transparent',
            color: activeSummaryTab === 'attendance' ? '#fff' : 'var(--dark-light)',
            boxShadow: activeSummaryTab === 'attendance' ? '0 3px 10px rgba(224, 122, 95, 0.25)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <Clock size={18} />
          การเข้าทำงานของพนักงาน
        </button>
      </div>

      {/* แถบตัวกรองรอบวันที่และบุคลากร */}
      <div className="card-2xl" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Calendar size={20} color="var(--secondary)" />
          <span style={{ fontWeight: 600 }}>
            {activeSummaryTab === 'teaching' ? 'รอบเงินเดือนผู้สอน:' : 'รอบเงินเดือนพนักงาน:'}
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {currentUser?.role === 'Admin' && (
            activeSummaryTab === 'teaching' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem' }}>ครูผู้สอน:</span>
                <select
                  className="form-control"
                  value={selectedTherapistId}
                  onChange={(e) => setSelectedTherapistId(e.target.value)}
                  style={{ width: '180px', padding: '0.4rem 0.6rem' }}
                >
                  <option value="">ทั้งหมด (ทุกครู)</option>
                  {therapists.map(t => (
                    <option key={t.id} value={t.id}>{t.fullname} ({t.nickname})</option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem' }}>พนักงาน:</span>
                <select
                  className="form-control"
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  style={{ width: '220px', padding: '0.4rem 0.6rem' }}
                >
                  <option value="">ทั้งหมด (พนักงานทุกคน)</option>
                  {availableEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      [{emp.id}] {emp.fullname} {emp.nickname ? `(${emp.nickname})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem' }}>จากวันที่</span>
            <input 
              type="date" 
              className="form-control" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              style={{ width: '150px', padding: '0.4rem 0.6rem' }}
            />
          </div>
          
          <span style={{ color: 'var(--dark-light)' }}>ถึง</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem' }}>วันที่</span>
            <input 
              type="date" 
              className="form-control" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              style={{ width: '150px', padding: '0.4rem 0.6rem' }}
            />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* VIEW 1: สรุปชั่วโมงสอนครู (OT)                            */}
      {/* ======================================================== */}
      {activeSummaryTab === 'teaching' && (
        <>
          {/* Dynamic Summary Cards ด้านบน */}
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={18} color="var(--secondary)" />
              นักกิจกรรมบำบัดที่เข้าสอนในรอบบิลนี้
            </h2>

            {teacherSummaryCards.length === 0 ? (
              <div className="card-2xl" style={{ textAlign: 'center', padding: '2rem', color: 'var(--dark-light)', border: '1px dashed var(--border)' }}>
                ไม่มีข้อมูลชั่วโมงการสอนของครูท่านใดในช่วงรอบวันที่เลือก
              </div>
            ) : (
              <div className="dashboard-grid">
                {teacherSummaryCards.map(t => (
                  <div key={t.id} className="card-2xl stat-card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div>
                        <div className="stat-title" style={{ fontSize: '0.75rem' }}>{t.licenseNo || 'ไม่ระบุเลข ก.บ.'}</div>
                        <div style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--dark)', marginTop: '0.25rem' }}>
                          {t.fullname} ({t.nickname})
                        </div>
                      </div>
                      <Sparkles size={20} color="var(--primary)" />
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '1rem', borderTop: '1px solid var(--border-light)', paddingTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--dark-light)' }}>ชั่วโมงสะสมในรอบ:</span>
                      <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--secondary)' }}>{t.totalHours} ชม.</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ตารางแสดงการเข้าสอนแต่ละวันแบบรวมแถว (ครู 1 คนต่อ 1 วัน = 1 แถว) */}
          <div className="card-3xl">
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem' }}>รายการชั่วโมงปฏิบัติงานรายวัน</h2>

            <div className="table-container">
              <table className="hdh-table">
                <thead>
                  <tr>
                    <th>วันที่เข้าสอน</th>
                    <th>ครูผู้สอน</th>
                    <th>เลขนักกิจกรรมบำบัด (ก.บ.)</th>
                    <th style={{ textAlign: 'center' }}>ชั่วโมงสอนรวมในวัน</th>
                    <th style={{ textAlign: 'center' }}>ดูรายละเอียดเคส</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregatedTeachingRows.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--dark-light)' }}>
                        ไม่มีข้อมูลสรุปงานในช่วงเวลานี้
                      </td>
                    </tr>
                  ) : (
                    aggregatedTeachingRows.map((row, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>
                          {formatThaiDate(row.date)}
                        </td>
                        <td style={{ fontWeight: 600 }}>{row.therapistFullname} ({row.therapistNickname})</td>
                        <td style={{ fontFamily: 'monospace' }}>{row.licenseNo || '-'}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--secondary)', fontSize: '1.1rem' }}>
                          {row.hours} ชั่วโมง
                        </td>
                        <td>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <button 
                              className="btn btn-light btn-icon-only" 
                              title="ดูรายละเอียดการสอนวันนี้"
                              onClick={() => handleViewDetailClick(row)}
                            >
                              <Eye size={16} color="var(--dark)" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ======================================================== */}
      {/* VIEW 2: สรุปการเข้าทำงานของพนักงาน (Attendance)           */}
      {/* ======================================================== */}
      {activeSummaryTab === 'attendance' && (
        <>
          {/* แจ้งเตือนเมื่อยังไม่ได้สร้างตาราง attendance ใน Supabase */}
          {isSupabaseTableMissing && (
            <div style={{
              backgroundColor: '#FEF2F2',
              border: '2px dashed #EF4444',
              borderRadius: '16px',
              padding: '1.25rem 1.5rem',
              marginBottom: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  backgroundColor: '#FEE2E2',
                  color: '#DC2626',
                  borderRadius: '10px',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Database size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#991B1B' }}>
                    ⚠️ ยังไม่ได้สร้างตาราง attendance ในฐานข้อมูลออนไลน์ Supabase
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: '#B91C1C', lineHeight: '1.5' }}>
                    ระบบตรวจพบว่าข้อมูลการลงเวลาจากมือถือยังไม่สามารถส่งมายังเครื่องคอมพิวเตอร์นี้ได้ เนื่องจากยังไม่มีตาราง <code>attendance</code> บน Supabase (ข้อมูลยังคงถูกบันทึกอยู่ในมือถือของพนักงานอย่างปลอดภัย)
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.25rem' }}>
                <button
                  type="button"
                  onClick={handleCopySql}
                  style={{
                    backgroundColor: '#DC2626',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.6rem 1.2rem',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)'
                  }}
                >
                  <Copy size={16} /> คัดลอก SQL สร้างตาราง (Supabase)
                </button>

                <button
                  type="button"
                  onClick={() => refreshAttendanceFromCloud(true)}
                  disabled={isRefreshingCloud}
                  style={{
                    backgroundColor: '#fff',
                    color: '#DC2626',
                    border: '1px solid #F87171',
                    borderRadius: '10px',
                    padding: '0.6rem 1.2rem',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <RefreshCw size={16} className={isRefreshingCloud ? 'spin' : ''} /> ตรวจสอบและซิงค์ข้อมูลอีกครั้ง
                </button>

                <a
                  href="https://supabase.com/dashboard/project/bmplfuzkyyuqtlfgifvm/sql/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    backgroundColor: '#fff',
                    color: '#4B5563',
                    border: '1px solid #D1D5DB',
                    borderRadius: '10px',
                    padding: '0.6rem 1.2rem',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <ExternalLink size={16} /> เปิดหน้า Supabase SQL Editor
                </a>
              </div>
            </div>
          )}

          {/* Dynamic Summary Cards ด้านบนของพนักงาน */}
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UsersIcon size={18} color="var(--secondary)" />
              พนักงานที่เข้าทำงานในรอบบิลนี้
            </h2>

            {employeeSummaryCards.length === 0 ? (
              <div className="card-2xl" style={{ textAlign: 'center', padding: '2rem', color: 'var(--dark-light)', border: '1px dashed var(--border)' }}>
                ไม่มีข้อมูลการเข้าทำงานของพนักงานในช่วงรอบวันที่เลือก
              </div>
            ) : (
              <div className="dashboard-grid">
                {employeeSummaryCards.map(emp => (
                  <div key={emp.employeeId} className="card-2xl stat-card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div>
                        <div className="stat-title" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ 
                            background: '#F0EAE1', 
                            padding: '2px 6px', 
                            borderRadius: '4px', 
                            fontWeight: 700,
                            fontFamily: 'monospace' 
                          }}>
                            {emp.employeeId}
                          </span>
                          <span>• {emp.position}</span>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--dark)', marginTop: '0.35rem' }}>
                          {emp.fullname} {emp.nickname ? `(${emp.nickname})` : ''}
                        </div>
                      </div>
                      <Sparkles size={20} color="var(--primary)" />
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'baseline', 
                      marginTop: '1rem', 
                      borderTop: '1px solid var(--border-light)', 
                      paddingTop: '0.5rem' 
                    }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--dark-light)' }}>
                        มาทำงาน: <strong style={{ color: 'var(--dark)' }}>{emp.daysWorked}</strong> วัน
                      </span>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--dark-light)', marginRight: '0.35rem' }}>ชั่วโมงสะสม:</span>
                        <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--secondary)' }}>
                          {emp.totalHours} ชม.
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ตารางแสดงการเข้าทำงานรายวันของพนักงาน (พนักงาน 1 คนต่อ 1 วัน = 1 แถว) */}
          <div className="card-3xl">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>รายการบันทึกเวลาเข้า-ออกงานรายวัน</h2>
                <span style={{ fontSize: '0.85rem', color: 'var(--dark-light)' }}>
                  พบทั้งหมด <strong>{dailyAttendanceRows.length}</strong> รายการ
                </span>
              </div>

              {currentUser?.role === 'Admin' && (
                <button 
                  className="btn btn-secondary" 
                  onClick={handleOpenAddModal}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}
                >
                  <Plus size={15} /> บันทึกเวลาทำงาน
                </button>
              )}
            </div>

            <div className="table-container">
              <table className="hdh-table">
                <thead>
                  <tr>
                    <th>วันที่เข้างาน</th>
                    <th>รหัสพนักงาน</th>
                    <th>ชื่อ-นามสกุลพนักงาน</th>
                    <th style={{ textAlign: 'center' }}>เวลาเข้างาน</th>
                    <th style={{ textAlign: 'center' }}>เวลาเลิกงาน</th>
                    <th style={{ textAlign: 'center' }}>ชั่วโมงรวมในวัน</th>
                    <th style={{ textAlign: 'center' }}>พิกัดสถานที่</th>
                    <th style={{ textAlign: 'center' }}>
                      {currentUser?.role === 'Admin' ? 'จัดการ / รายละเอียด' : 'ดูรายละเอียด'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dailyAttendanceRows.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--dark-light)' }}>
                        ไม่มีข้อมูลการลงเวลาทำงานในช่วงเวลานี้
                      </td>
                    </tr>
                  ) : (
                    dailyAttendanceRows.map((row) => (
                      <tr key={row.key}>
                        <td style={{ fontWeight: 600 }}>
                          <div>{formatThaiDate(row.date)}</div>
                          <small style={{ color: 'var(--dark-light)', fontSize: '0.8rem' }}>
                            วัน{getThaiDayOfWeek(row.date)}
                          </small>
                        </td>
                        <td>
                          <span style={{ 
                            background: '#F0EAE1', 
                            padding: '3px 8px', 
                            borderRadius: '4px', 
                            fontWeight: 700, 
                            fontFamily: 'monospace',
                            fontSize: '0.85rem'
                          }}>
                            {row.employeeId}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--dark)' }}>
                            {row.employeeName} {row.employeeNickname ? `(${row.employeeNickname})` : ''}
                          </div>
                          <small style={{ color: 'var(--dark-light)', fontSize: '0.8rem' }}>
                            {row.employeePosition}
                          </small>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {row.firstInTime ? (
                            <span style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '4px',
                              padding: '3px 8px', 
                              borderRadius: '6px', 
                              background: '#E8F5E9', 
                              color: '#2E7D32',
                              fontWeight: 600,
                              fontSize: '0.85rem'
                            }}>
                              <Clock size={13} />
                              {row.firstInTime} น.
                            </span>
                          ) : (
                            <span style={{ color: 'var(--dark-light)', fontSize: '0.85rem' }}>-</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {row.latestOutTime ? (
                            <span style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '4px',
                              padding: '3px 8px', 
                              borderRadius: '6px', 
                              background: '#E3F2FD', 
                              color: '#1565C0',
                              fontWeight: 600,
                              fontSize: '0.85rem'
                            }}>
                              <Clock size={13} />
                              {row.latestOutTime} น.
                            </span>
                          ) : row.isWorkingNow ? (
                            <span style={{ 
                              padding: '3px 8px', 
                              borderRadius: '6px', 
                              background: '#FFF3E0', 
                              color: '#E65100',
                              fontWeight: 600,
                              fontSize: '0.8rem'
                            }}>
                              กำลังปฏิบัติงาน
                            </span>
                          ) : (
                            <span style={{ 
                              padding: '3px 8px', 
                              borderRadius: '6px', 
                              background: '#F5F5F5', 
                              color: '#757575',
                              fontSize: '0.8rem'
                            }}>
                              ยังไม่ลงเวลาออก
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--secondary)', fontSize: '1.05rem' }}>
                          {row.workHours > 0 ? `${row.workHours} ชม.` : '-'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {row.hasLocation ? (
                            <a
                              href={row.inRecord?.mapsUrl || row.outRecord?.mapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-light"
                              style={{ 
                                padding: '4px 8px', 
                                fontSize: '0.8rem', 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '4px',
                                color: 'var(--secondary)',
                                textDecoration: 'none'
                              }}
                              title="คลิกเพื่อดูแผนที่ Google Maps"
                            >
                              <MapPin size={14} />
                              เปิดแผนที่
                            </a>
                          ) : (
                            <span style={{ color: 'var(--dark-light)', fontSize: '0.8rem' }}>ไม่มีพิกัด</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px' }}>
                            <button 
                              className="btn btn-light btn-icon-only" 
                              title="ดูรายละเอียดการลงเวลาวันนี้"
                              onClick={() => handleViewAttendanceDetail(row)}
                            >
                              <Eye size={16} color="var(--dark)" />
                            </button>

                            {currentUser?.role === 'Admin' && (
                              <>
                                <button 
                                  className="btn btn-light btn-icon-only" 
                                  title="แก้ไขเวลาทำงาน"
                                  onClick={() => handleOpenEditModal(row)}
                                  style={{ color: '#0284c7' }}
                                >
                                  <Edit2 size={16} />
                                </button>

                                <button 
                                  className="btn btn-light btn-icon-only" 
                                  title="ลบรายการนี้"
                                  onClick={() => handleDeleteAttendance(row)}
                                  style={{ color: '#dc2626' }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: รายละเอียดการสอนของครู (Teaching cases)           */}
      {/* ======================================================== */}
      {showDetailModal && (
        <div className="modal-overlay">
          <div className="modal-content-wrapper" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>ตารางการสอนคุณครู {modalDetails.nickname} วันที่ {formatThaiDate(modalDetails.date)}</h3>
              <button className="close-modal-btn" onClick={() => setShowDetailModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--dark-light)', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                  <strong>ผู้สอนหลัก:</strong> {modalDetails.therapistName} | <strong>รวมคลาสสอนสำเร็จ:</strong> {modalDetails.cases.length} คลาส
                </div>

                <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <table className="hdh-table">
                    <thead>
                      <tr>
                        <th>ช่วงเวลา</th>
                        <th>HN ผู้ป่วย</th>
                        <th>ชื่อผู้เข้ารับบริการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalDetails.cases.map((cs, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600, color: 'var(--secondary)' }}>{cs.timeSlot}</td>
                          <td style={{ fontFamily: 'monospace' }}>{cs.hn}</td>
                          <td>
                            <strong>{cs.patientName}</strong> ({cs.patientNickname ? formatPatientNickname(cs.patientNickname) : ''})
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>ปิดหน้าต่าง</button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: รายละเอียดการลงเวลาพนักงาน (Attendance details)    */}
      {/* ======================================================== */}
      {showAttendanceModal && modalAttendance && (
        <div className="modal-overlay">
          <div className="modal-content-wrapper" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontWeight: 700, margin: 0 }}>
                  รายละเอียดการลงเวลา: {modalAttendance.employeeName}
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--dark-light)' }}>
                  [{modalAttendance.employeeId}] {modalAttendance.employeePosition} • วันที่ {formatThaiDate(modalAttendance.date)}
                </span>
              </div>
              <button className="close-modal-btn" onClick={() => setShowAttendanceModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* แถบสรุป 3 กล่อง */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  <div style={{ background: '#E8F5E9', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#2E7D32', fontWeight: 600 }}>เวลาเข้างานแรก</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1B5E20', marginTop: '0.25rem' }}>
                      {modalAttendance.firstInTime ? `${modalAttendance.firstInTime} น.` : '-'}
                    </div>
                  </div>

                  <div style={{ background: '#E3F2FD', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#1565C0', fontWeight: 600 }}>เวลาเลิกงานล่าสุด</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0D47A1', marginTop: '0.25rem' }}>
                      {modalAttendance.latestOutTime ? `${modalAttendance.latestOutTime} น.` : '-'}
                    </div>
                  </div>

                  <div style={{ background: '#FFF3E0', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#E65100', fontWeight: 600 }}>ชั่วโมงทำงานสุทธิ</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#BF360C', marginTop: '0.25rem' }}>
                      {modalAttendance.workHours > 0 ? `${modalAttendance.workHours} ชม.` : '-'}
                    </div>
                  </div>
                </div>

                {/* รายละเอียดพิกัด GPS */}
                <div className="card-2xl" style={{ padding: '1rem', background: '#FAFAF8', border: '1px solid var(--border-light)' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <MapPin size={16} color="var(--primary)" />
                    ข้อมูลพิกัด GPS ตำแหน่งที่บันทึก
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {/* จุดเข้างาน */}
                    <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#2E7D32', marginBottom: '0.35rem' }}>
                        พิกัดเวลาเข้างาน:
                      </div>
                      {modalAttendance.inRecord?.latitude ? (
                        <div style={{ fontSize: '0.8rem', color: 'var(--dark)' }}>
                          <div>ละติจูด: {modalAttendance.inRecord.latitude.toFixed(6)}</div>
                          <div>ลองจิจูด: {modalAttendance.inRecord.longitude.toFixed(6)}</div>
                          {modalAttendance.inRecord.accuracy && (
                            <div style={{ color: 'var(--dark-light)' }}>ความแม่นยำ: ±{modalAttendance.inRecord.accuracy} เมตร</div>
                          )}
                          <div style={{ marginTop: '0.5rem' }}>
                            <a 
                              href={modalAttendance.inRecord.mapsUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="btn btn-light"
                              style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <ExternalLink size={12} /> เปิดดูใน Google Maps
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.8rem', color: 'var(--dark-light)' }}>ไม่มีข้อมูลพิกัด GPS</div>
                      )}
                    </div>

                    {/* จุดเลิกงาน */}
                    <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1565C0', marginBottom: '0.35rem' }}>
                        พิกัดเวลาเลิกงาน:
                      </div>
                      {modalAttendance.outRecord?.latitude ? (
                        <div style={{ fontSize: '0.8rem', color: 'var(--dark)' }}>
                          <div>ละติจูด: {modalAttendance.outRecord.latitude.toFixed(6)}</div>
                          <div>ลองจิจูด: {modalAttendance.outRecord.longitude.toFixed(6)}</div>
                          {modalAttendance.outRecord.accuracy && (
                            <div style={{ color: 'var(--dark-light)' }}>ความแม่นยำ: ±{modalAttendance.outRecord.accuracy} เมตร</div>
                          )}
                          <div style={{ marginTop: '0.5rem' }}>
                            <a 
                              href={modalAttendance.outRecord.mapsUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="btn btn-light"
                              style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <ExternalLink size={12} /> เปิดดูใน Google Maps
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.8rem', color: 'var(--dark-light)' }}>
                          {modalAttendance.latestOutTime ? 'ไม่มีข้อมูลพิกัด GPS' : 'ยังไม่ได้ลงเวลาเลิกงาน'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* รายการเหตุการณ์ทั้งหมดที่กดในวันนั้น */}
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
                    ประวัติการบันทึกเวลาทั้งหมดในวันนี้ ({modalAttendance.allDayLogs.length} ครั้ง)
                  </h4>
                  <div className="table-container" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    <table className="hdh-table" style={{ fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th>เวลา</th>
                          <th>ประเภท</th>
                          <th>พิกัด</th>
                          <th>หมายเหตุ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modalAttendance.allDayLogs.map((log, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600 }}>{log.time} น.</td>
                            <td>
                              <span style={{ 
                                padding: '2px 6px', 
                                borderRadius: '4px', 
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                background: (log.type === 'เข้างาน' || log.type === 'IN') ? '#E8F5E9' : '#E3F2FD',
                                color: (log.type === 'เข้างาน' || log.type === 'IN') ? '#2E7D32' : '#1565C0'
                              }}>
                                {log.type}
                              </span>
                            </td>
                            <td>
                              {log.mapsUrl ? (
                                <a 
                                  href={log.mapsUrl} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  style={{ color: 'var(--primary)', textDecoration: 'underline' }}
                                >
                                  ดูแผนที่
                                </a>
                              ) : '-'}
                            </td>
                            <td style={{ color: 'var(--dark-light)' }}>
                              {log.notes || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: currentUser?.role === 'Admin' ? 'space-between' : 'flex-end', alignItems: 'center', width: '100%' }}>
              {currentUser?.role === 'Admin' && (
                <button 
                  className="btn btn-light" 
                  style={{ color: '#dc2626', borderColor: '#fca5a5', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => handleDeleteAttendance(modalAttendance)}
                >
                  <Trash2 size={16} /> ลบรายการนี้
                </button>
              )}

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {currentUser?.role === 'Admin' && (
                  <button 
                    className="btn btn-primary" 
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => {
                      setShowAttendanceModal(false);
                      handleOpenEditModal(modalAttendance);
                    }}
                  >
                    <Edit2 size={16} /> แก้ไขเวลาทำงาน
                  </button>
                )}
                <button className="btn btn-secondary" onClick={() => setShowAttendanceModal(false)}>ปิดหน้าต่าง</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: บันทึก/แก้ไขเวลาการทำงานของพนักงาน (Admin Only)     */}
      {/* ======================================================== */}
      {showAddEditModal && (
        <div className="modal-overlay">
          <div className="modal-content-wrapper" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontWeight: 700, margin: 0 }}>
                  {isEditing ? 'แก้ไขเวลาการทำงาน' : 'บันทึกเวลาทำงานพนักงาน'}
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--dark-light)' }}>
                  {isEditing ? `รหัสพนักงาน: ${formAttendance.employeeId}` : 'เพิ่มข้อมูลการลงเวลาย้อนหลังโดย Admin'}
                </span>
              </div>
              <button className="close-modal-btn" onClick={() => setShowAddEditModal(false)}>×</button>
            </div>

            <form onSubmit={handleSaveAttendance}>
              <div className="modal-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                  {/* เลือกพนักงาน */}
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                      พนักงาน <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        className="form-control" 
                        value={`${getEmployeeInfo(formAttendance.employeeId).fullname} [${formAttendance.employeeId}]`} 
                        disabled 
                        style={{ backgroundColor: '#F5F5F0', color: '#666' }}
                      />
                    ) : (
                      <select
                        className="form-control"
                        value={formAttendance.employeeId}
                        onChange={(e) => setFormAttendance(prev => ({ ...prev, employeeId: e.target.value }))}
                        required
                      >
                        <option value="">-- กรุณาเลือกพนักงาน --</option>
                        {availableEmployees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            [{emp.id}] {emp.fullname} {emp.nickname ? `(${emp.nickname})` : ''} - {emp.position}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* วันที่ทำงาน */}
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                      วันที่ทำงาน <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={formAttendance.date} 
                      onChange={(e) => {
                        const newDate = e.target.value;
                        setFormAttendance(prev => {
                          const hours = calculateDiffHours(prev.inTime, prev.outTime, newDate);
                          return { ...prev, date: newDate, workHours: hours };
                        });
                      }}
                      required
                    />
                  </div>

                  {/* เวลาเข้างาน และ เวลาเลิกงาน */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                        เวลาเข้างาน <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input 
                        type="time" 
                        step="1"
                        className="form-control" 
                        value={formAttendance.inTime} 
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormAttendance(prev => {
                            const hours = calculateDiffHours(val, prev.outTime, prev.date);
                            return { ...prev, inTime: val, workHours: hours };
                          });
                        }}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                        เวลาเลิกงาน
                      </label>
                      <input 
                        type="time" 
                        step="1"
                        className="form-control" 
                        value={formAttendance.outTime} 
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormAttendance(prev => {
                            const hours = calculateDiffHours(prev.inTime, val, prev.date);
                            return { ...prev, outTime: val, workHours: hours };
                          });
                        }}
                      />
                    </div>
                  </div>

                  {/* ชั่วโมงทำงานรวม */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                        ชั่วโมงทำงานรวม (ชม.)
                      </label>
                      <small style={{ color: isWeekend(formAttendance.date) ? '#16a34a' : 'var(--secondary)', fontWeight: 600 }}>
                        {isWeekend(formAttendance.date) ? 'คำนวณอัตโนมัติ (หักพักเที่ยง 1 ชม.)' : 'คำนวณอัตโนมัติ'}
                      </small>
                    </div>
                    <input 
                      type="number" 
                      step="0.1" 
                      min="0"
                      className="form-control" 
                      value={formAttendance.workHours} 
                      onChange={(e) => setFormAttendance(prev => ({ ...prev, workHours: e.target.value }))}
                    />
                    <small style={{ color: isWeekend(formAttendance.date) ? '#15803d' : 'var(--dark-light)', fontSize: '0.75rem', marginTop: '3px', display: 'block' }}>
                      {isWeekend(formAttendance.date) 
                        ? '* ระบบคำนวณหักเวลาพักเที่ยง 1 ชั่วโมงให้อัตโนมัติสำหรับวันเสาร์-อาทิตย์ (สามารถปรับแก้ได้โดยตรง)' 
                        : '* สามารถปรับแก้จำนวนชั่วโมงสุทธิได้โดยตรงหากมีเวลาพักหรือ OT'}
                    </small>
                  </div>

                  {/* หมายเหตุ */}
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                      หมายเหตุ / รายละเอียดเพิ่มเติม
                    </label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="เช่น บันทึกเวลาย้อนหลัง, แก้ไขเวลาเข้างาน, ลืมกด Check-in..." 
                      value={formAttendance.notes} 
                      onChange={(e) => setFormAttendance(prev => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>

                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddEditModal(false)}>
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Save size={16} /> บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
