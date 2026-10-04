import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Smartphone, ShieldCheck, Heart, LogOut, Check, RefreshCw, MessageCircle,
  Calendar, Target, Award, Home, User, Clock, Phone, AlertTriangle,
  ChevronRight, FileText, Sparkles, BookOpen, ExternalLink, Activity, Info,
  CheckCircle2, ArrowRight
} from 'lucide-react';
import Swal from 'sweetalert2';
import { supabase } from '../utils/supabaseClient';
import { db } from '../utils/db';
import { DEFAULT_CLINIC_LOGO } from '../utils/defaultAssets';
import { formatDateBE } from '../utils/format';

// Helper to extract param from search, hash, or liff.state
function getUrlParam(key) {
  if (typeof window === 'undefined') return null;
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.get(key)) return searchParams.get(key);

  // Check liff.state if present
  const liffState = searchParams.get('liff.state');
  if (liffState) {
    try {
      const decoded = decodeURIComponent(liffState);
      const stateQuery = decoded.startsWith('?') ? decoded.slice(1) : (decoded.includes('?') ? decoded.split('?')[1] : decoded);
      const stateParams = new URLSearchParams(stateQuery);
      if (stateParams.get(key)) return stateParams.get(key);
    } catch (e) {}
  }

  // Check hash
  const hash = window.location.hash || '';
  if (hash.includes('?')) {
    const hashQuery = hash.split('?')[1];
    const hashParams = new URLSearchParams(hashQuery);
    if (hashParams.get(key)) return hashParams.get(key);
  }
  return null;
}

// Preset Home Program Activities
const HOME_ACTIVITIES = [
  {
    category: 'กล้ามเนื้อมัดเล็ก & การใช้มือ (Fine Motor)',
    items: [
      { title: 'ปั้นแป้งโดว์หรือดินน้ำมัน', desc: 'ปั้นเป็นก้อนกลม บีบ กด แบน เพื่อเสริมความแข็งแรงของนิ้วหัวแม่มือและนิ้วชี้ (10-15 นาที/วัน)' },
      { title: 'ใช้ที่คีบหรือนิ้วหยิบของชิ้นเล็ก', desc: 'ใช้นิ้วโป้งและนิ้วชี้ (Pincer Grasp) คีบเมล็ดถั่วหรือปอมปอมใส่ขวดปากแคบ (5-10 นาที)' },
      { title: 'ฝึกติดกระดุมและรูดซิป', desc: 'ฝึกทักษะการช่วยเหลือตนเองกับเสื้อผ้าตัวหลวม 5-10 ครั้งต่อวัน' },
      { title: 'ฉีกหรือตัดกระดาษตามแนวเส้นตรง', desc: 'ฝึกการประสานสัมพันธ์สองมือ (Bilateral Coordination) ตัดกระดาษตามแนวเส้น' }
    ]
  },
  {
    category: 'ระบบประสาทรับความรู้สึก & การทรงตัว (Sensory Diet)',
    items: [
      { title: 'เดินท่าสัตว์ (Animal Walks)', desc: 'เดินท่าหมี คลานท่าปู หรือกระโดดท่ากบ เพื่อกระตุ้นแรงต้านข้อต่อและแกนกลางลำตัว (รอบละ 1-2 นาที)' },
      { title: 'งานหนักกล้ามเนื้อ (Heavy Work)', desc: 'ช่วยยกของ ดันตะกร้าผ้า หรือดึงกล่องของเล่นที่มีน้ำหนักพอเหมาะ' },
      { title: 'กระโดดแทรมโพลีนหรือข้ามหมอน', desc: 'กระโดดลงบนเบาะหรือหมอน 15-20 ครั้ง ช่วยปรับระดับความตื่นตัวของระบบประสาท' },
      { title: 'เกมแซนด์วิชหมอน (Deep Pressure)', desc: 'ใช้หมอนกดทับลำตัวเบาๆ ให้แรงกดที่ลึก ช่วยให้สงบและผ่อนคลายก่อนนอน' }
    ]
  },
  {
    category: 'การควบคุมอารมณ์และสมาธิ (Self-Regulation)',
    items: [
      { title: 'เป่าฟองสบู่หรือลูกโป่งน้ำ', desc: 'สูดหายใจเข้าลึกๆ และเป่าฟองสบู่ช้าๆ ช่วยฝึกควบคุมลมหายใจ สมาธิ และความสงบ' },
      { title: 'เล่นเกมหยุด-ไป (Red Light, Green Light)', desc: 'ฝึกการยับยั้งชั่งใจ (Impulse Control) และการรับฟังคำสั่ง' }
    ]
  }
];

export default function LineLinkPortal({ 
  clinicInfo,
  users = [],
  patients = [],
  appointments = [],
  receipts = [],
  assessments = [],
  itpGoals = []
}) {
  const [liffProfile, setLiffProfile] = useState(null);
  const [liffError, setLiffError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Linked account state
  const [linkedUser, setLinkedUser] = useState(null); // Staff / OT / Admin
  const [linkedPatients, setLinkedPatients] = useState([]); // Linked Patients for Parent
  const [activeChildHn, setActiveChildHn] = useState('');

  // Parent Portal Sub-tab: 'profile' | 'appointments' | 'itp' | 'courses' | 'homeprogram'
  const [parentPortalTab, setParentPortalTab] = useState(() => {
    const action = getUrlParam('action') || '';
    const tab = getUrlParam('tab') || '';
    if (action === 'parent-appointments' || tab === 'appointments') return 'appointments';
    if (action === 'parent-itp' || tab === 'itp') return 'itp';
    if (action === 'parent-courses' || tab === 'courses') return 'courses';
    if (action === 'parent-homeprogram' || tab === 'homeprogram') return 'homeprogram';
    return 'profile';
  });

  // Active Tab for binding form: 'parent' | 'staff'
  const [bindingTab, setBindingTab] = useState('parent');

  // Form states for Parent
  const [parentIdentifier, setParentIdentifier] = useState(''); // phone or hn
  const [isSubmittingParent, setIsSubmittingParent] = useState(false);

  // Form states for Staff
  const [staffEmpId, setStaffEmpId] = useState('');
  const [staffUsername, setStaffUsername] = useState('');
  const [isSubmittingStaff, setIsSubmittingStaff] = useState(false);

  // Manual UID override for testing on Desktop
  const [manualUid, setManualUid] = useState('');
  const [currentMenuRole, setCurrentMenuRole] = useState('guest');
  const [isSwitchingMenu, setIsSwitchingMenu] = useState(false);

  const liffId = clinicInfo?.liffId || '2008270606-7bkwSGyt';

  // Fallback data sources if props are empty
  const allPatients = useMemo(() => {
    if (patients && patients.length > 0) return patients;
    try {
      const dbData = db.getPatients();
      if (dbData && dbData.length > 0) return dbData;
    } catch (e) {}
    try {
      const local = localStorage.getItem('hdh_patients');
      if (local) return JSON.parse(local);
    } catch (e) {}
    return [];
  }, [patients]);

  const allAppointments = useMemo(() => {
    if (appointments && appointments.length > 0) return appointments;
    try {
      const dbData = db.getAppointments();
      if (dbData && dbData.length > 0) return dbData;
    } catch (e) {}
    try {
      const local = localStorage.getItem('hdh_appointments');
      if (local) return JSON.parse(local);
    } catch (e) {}
    return [];
  }, [appointments]);

  const allReceipts = useMemo(() => {
    if (receipts && receipts.length > 0) return receipts;
    try {
      const dbData = db.getReceipts();
      if (dbData && dbData.length > 0) return dbData;
    } catch (e) {}
    try {
      const local = localStorage.getItem('hdh_receipts');
      if (local) return JSON.parse(local);
    } catch (e) {}
    return [];
  }, [receipts]);

  const allItpGoals = useMemo(() => {
    if (itpGoals && itpGoals.length > 0) return itpGoals;
    try {
      const dbData = db.getItpGoals();
      if (dbData && dbData.length > 0) return dbData;
    } catch (e) {}
    try {
      const local = localStorage.getItem('hdh_itp_goals');
      if (local) return JSON.parse(local);
    } catch (e) {}
    return [];
  }, [itpGoals]);

  // 1. Check if this LINE UID is already linked (in Supabase or Local Storage)
  const checkExistingBinding = useCallback(async (targetUid) => {
    if (!targetUid) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      // A. Check staff/ot/admin in users table (Remote Supabase + Local Fallback)
      let foundStaff = null;
      try {
        const { data: uData, error: uErr } = await supabase
          .from('users')
          .select('*')
          .eq('line_user_id', targetUid)
          .limit(1);

        if (!uErr && uData && uData.length > 0) {
          foundStaff = uData[0];
        } else {
          // Check avatar_file JSON if stored there
          const { data: allUsers } = await supabase.from('users').select('*');
          if (allUsers) {
            foundStaff = allUsers.find(u => {
              if (u.line_user_id === targetUid) return true;
              if (u.avatar_file) {
                try {
                  const parsed = typeof u.avatar_file === 'string' ? JSON.parse(u.avatar_file) : u.avatar_file;
                  if (parsed?.line_user_id === targetUid) return true;
                } catch (e) {}
              }
              return false;
            });
          }
        }
      } catch (err) {
        console.warn('Supabase users check warning:', err);
      }

      // Check local users
      if (!foundStaff) {
        const localUsers = (users && users.length > 0) ? users : (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('hdh_users') || '[]') : []);
        foundStaff = localUsers.find(u => 
          u.line_user_id === targetUid || 
          u.lineUserId === targetUid || 
          localStorage.getItem(`hdh_line_user_${u.employee_id || u.employeeId}`) === targetUid
        );
      }

      if (foundStaff) {
        setLinkedUser(foundStaff);
        setCurrentMenuRole((foundStaff.role || 'staff').toLowerCase());
      } else {
        setLinkedUser(null);
      }

      // B. Check parents in patients table (Remote Supabase + Local Cache)
      let foundPatients = [];
      try {
        const { data: pData, error: pErr } = await supabase
          .from('patients')
          .select('*')
          .eq('line_user_id', targetUid);

        if (!pErr && pData && pData.length > 0) {
          foundPatients = pData;
        }
      } catch (err) {
        console.warn('Supabase patients check warning:', err);
      }

      // Fallback to local storage or cached links
      if (foundPatients.length === 0) {
        let cachedHns = [];
        try {
          const rawHns = localStorage.getItem(`hdh_line_parent_${targetUid}`);
          if (rawHns) cachedHns = JSON.parse(rawHns);
        } catch (e) {}

        const localPatients = (allPatients && allPatients.length > 0) ? allPatients : (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('hdh_patients') || '[]') : []);
        foundPatients = localPatients.filter(p => 
          p.line_user_id === targetUid || 
          p.lineUserId === targetUid || 
          (p.channels && p.channels.line_user_id === targetUid) ||
          (cachedHns && cachedHns.includes(p.hn))
        );
      }

      if (foundPatients.length > 0) {
        setLinkedPatients(foundPatients);
        setActiveChildHn(prev => prev || foundPatients[0].hn);
        if (!foundStaff) {
          setCurrentMenuRole('parent');
        }
      } else {
        setLinkedPatients([]);
      }
    } catch (err) {
      console.error('Error checking existing binding:', err);
    } finally {
      setLoading(false);
    }
  }, [allPatients, users]);

  // 0. Parse Initial Profile from URL params or Cache immediately
  useEffect(() => {
    const urlUid = getUrlParam('uid');
    const urlName = getUrlParam('name');
    const urlPic = getUrlParam('pic');
    const urlTab = getUrlParam('tab');
    const urlAction = getUrlParam('action');
    const urlHn = getUrlParam('hn');

    if (urlTab === 'parent' || urlTab === 'staff') {
      setBindingTab(urlTab);
    } else if (urlTab === 'profile' || urlTab === 'appointments' || urlTab === 'itp' || urlTab === 'courses' || urlTab === 'homeprogram') {
      setParentPortalTab(urlTab);
    } else if (urlAction && urlAction.startsWith('parent-')) {
      const mapped = urlAction.replace('parent-', '');
      if (['profile', 'appointments', 'itp', 'courses', 'homeprogram'].includes(mapped)) {
        setParentPortalTab(mapped);
      }
    }

    if (urlHn) {
      setActiveChildHn(urlHn);
    }

    if (urlUid) {
      const p = {
        userId: urlUid,
        displayName: urlName || 'ผู้ใช้งาน LINE',
        pictureUrl: urlPic || null
      };
      setLiffProfile(p);
      setManualUid(urlUid);
      checkExistingBinding(urlUid);
      try {
        localStorage.setItem('hdh_line_portal_profile', JSON.stringify(p));
        sessionStorage.setItem('hdh_line_portal_profile', JSON.stringify(p));
      } catch (e) {}
      return;
    }

    // Read cached profile if exists
    try {
      const cached = localStorage.getItem('hdh_line_portal_profile') || sessionStorage.getItem('hdh_line_portal_profile');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.userId) {
          setLiffProfile(parsed);
          setManualUid(parsed.userId);
          checkExistingBinding(parsed.userId);
        }
      }
    } catch (e) {}
  }, [checkExistingBinding]);

  // 2. Initialize LIFF SDK
  useEffect(() => {
    let isMounted = true;

    async function initLiff() {
      try {
        let attempts = 0;
        while (!window.liff && attempts < 10) {
          await new Promise(r => setTimeout(r, 100));
          attempts++;
        }

        if (window.liff) {
          await window.liff.init({ liffId });
          if (window.liff.isLoggedIn()) {
            const profile = await window.liff.getProfile();
            if (isMounted) {
              const fullProfile = {
                userId: profile.userId,
                displayName: profile.displayName || 'ผู้ใช้งาน LINE',
                pictureUrl: profile.pictureUrl || null
              };
              setLiffProfile(fullProfile);
              setManualUid(profile.userId);
              try {
                localStorage.setItem('hdh_line_portal_profile', JSON.stringify(fullProfile));
                sessionStorage.setItem('hdh_line_portal_profile', JSON.stringify(fullProfile));
              } catch (e) {}
              await checkExistingBinding(profile.userId);
            }
          } else {
            const isLineClient = window.liff.isInClient() || /Line\//i.test(navigator.userAgent);
            if (isLineClient) {
              window.liff.login();
            } else {
              setLoading(false);
            }
          }
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.warn('LIFF init warning:', err);
        if (isMounted) {
          setLiffError(err.message);
          setLoading(false);
        }
      }
    }

    initLiff();

    return () => {
      isMounted = false;
    };
  }, [liffId, checkExistingBinding]);

  // Safe LINE Login handler without '#' or origin issues (avoids 400 Bad Request)
  const handleLineLogin = () => {
    if (liffId) {
      window.location.href = `https://liff.line.me/${liffId}?action=line-link`;
      return;
    }
    if (window.liff) {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.liff.login({ redirectUri: cleanUrl });
    }
  };

  // 3. Handle Parent Binding
  const handleBindParent = async (e) => {
    e.preventDefault();
    const cleanId = parentIdentifier.trim();
    const uid = liffProfile?.userId || manualUid.trim();

    if (!cleanId) {
      Swal.fire({ icon: 'warning', title: 'กรุณากรอกข้อมูล', text: 'กรุณากรอกเบอร์โทรศัพท์ หรือเลข HN ของน้อง' });
      return;
    }
    if (!uid) {
      Swal.fire({
        icon: 'warning',
        title: 'ยังไม่พบข้อมูลบัญชี LINE',
        html: 'กรุณากดปุ่ม <b>"เข้าสู่ระบบด้วย LINE"</b> เพื่อให้ระบบดึงรูปโปรไฟล์และ User ID ของคุณโดยอัตโนมัติค่ะ',
        confirmButtonColor: '#06C755',
        confirmButtonText: 'เข้าสู่ระบบด้วย LINE ตอนนี้',
        showCancelButton: true,
        cancelButtonText: 'ยกเลิก'
      }).then(res => {
        if (res.isConfirmed) {
          handleLineLogin();
        }
      });
      return;
    }

    setIsSubmittingParent(true);
    try {
      // Find matching patient by phone or hn in Supabase
      let matched = [];
      try {
        const { data: remoteMatched, error: findErr } = await supabase
          .from('patients')
          .select('*')
          .or(`phone.eq.${cleanId},hn.eq.${cleanId},parent_name.ilike.%${cleanId}%`);

        if (!findErr && remoteMatched && remoteMatched.length > 0) {
          matched = remoteMatched;
        }
      } catch (e) {
        console.warn('Supabase search warning:', e);
      }

      // Fallback to local patients
      if (matched.length === 0) {
        const cleanDigits = cleanId.replace(/[^0-9]/g, '');
        matched = allPatients.filter(p => {
          const pPhone = (p.phone || '').replace(/[^0-9]/g, '');
          const pHn = String(p.hn || '').toLowerCase();
          const pParent = (p.parent_name || p.parentName || p.guardian || '').toLowerCase();
          const pName = (p.name || `${p.firstname || ''} ${p.lastname || ''}`).toLowerCase();
          return (
            (cleanDigits && pPhone && (pPhone === cleanDigits || pPhone.includes(cleanDigits))) ||
            (pHn && pHn === cleanId.toLowerCase()) ||
            (pParent && pParent.includes(cleanId.toLowerCase())) ||
            (pName && pName.includes(cleanId.toLowerCase()))
          );
        });
      }

      if (matched.length === 0) {
        Swal.fire({
          icon: 'error',
          title: 'ไม่พบข้อมูลในระบบ',
          text: `ไม่พบข้อมูลผู้รับบริการที่ตรงกับ "${cleanId}" กรุณาตรวจสอบเบอร์โทรศัพท์หรือติดต่อเจ้าหน้าที่คลินิกค่ะ`
        });
        setIsSubmittingParent(false);
        return;
      }

      // Check if patient is Inactive
      const isInactive = matched.some(p => p.status && p.status.toLowerCase() === 'inactive');
      if (isInactive) {
        Swal.fire({
          icon: 'warning',
          title: 'สถานะไม่พร้อมใช้งาน',
          text: 'ผู้รับบริการรายนี้มีสถานะ Inactive ระบบจะคงสถานะ Rich Menu เป็นบุคคลทั่วไปตามระเบียบคลินิกค่ะ'
        });
      }

      // Update line_user_id in Supabase
      const hns = matched.map(m => m.hn);
      try {
        await supabase
          .from('patients')
          .update({ line_user_id: uid })
          .in('hn', hns);
      } catch (err) {
        console.warn('Supabase update line_user_id warning:', err);
      }

      // Persist locally in localStorage
      try {
        localStorage.setItem(`hdh_line_parent_${uid}`, JSON.stringify(hns));
        localStorage.setItem(`hdh_line_user_parent_${cleanId}`, uid);

        const updatedLocal = allPatients.map(p => {
          if (hns.includes(p.hn)) {
            return { ...p, line_user_id: uid, lineUserId: uid };
          }
          return p;
        });
        localStorage.setItem('hdh_patients', JSON.stringify(updatedLocal));
        try { db.setPatients(updatedLocal); } catch (e) {}
      } catch (storageErr) {
        console.warn('LocalStorage save error:', storageErr);
      }

      // Call Backend API to link Rich Menu 2 (Parent) if active
      if (!isInactive) {
        try {
          await fetch('/api/line-richmenu?action=link-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lineUserId: uid, role: 'parent', status: 'active' })
          });
        } catch (apiErr) {
          console.warn('API link warning:', apiErr);
        }
      }

      // Refresh
      await checkExistingBinding(uid);

      Swal.fire({
        icon: 'success',
        title: 'เชื่อมต่อสำเร็จ! 🎉',
        html: `เชื่อมต่อบัญชีของ <b>${matched.map(m => 'น้อง' + (m.nickname || m.name)).join(', ')}</b> เรียบร้อยแล้ว<br><br>แถบเมนูใน LINE ของท่านจะเปลี่ยนเป็น <b>"พอร์ทัลผู้ปกครอง"</b> ทันทีค่ะ 🤎`,
        confirmButtonColor: '#059669'
      });

    } catch (err) {
      console.error('Bind parent error:', err);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.message });
    } finally {
      setIsSubmittingParent(false);
    }
  };

  // 4. Handle Staff / OT / Admin Binding
  const handleBindStaff = async (e) => {
    e.preventDefault();
    const cleanEmpId = staffEmpId.trim().toUpperCase();
    const cleanUser = staffUsername.trim().toLowerCase();
    const uid = liffProfile?.userId || manualUid.trim();

    if (!cleanEmpId && !cleanUser) {
      Swal.fire({ icon: 'warning', title: 'กรุณากรอกข้อมูล', text: 'กรุณาระบุรหัสพนักงาน หรือชื่อผู้ใช้' });
      return;
    }
    if (!uid) {
      Swal.fire({
        icon: 'warning',
        title: 'ยังไม่พบข้อมูลบัญชี LINE',
        html: 'กรุณากดปุ่ม <b>"เข้าสู่ระบบด้วย LINE"</b> เพื่อให้ระบบดึงรูปโปรไฟล์และ User ID ของคุณโดยอัตโนมัติค่ะ',
        confirmButtonColor: '#06C755',
        confirmButtonText: 'เข้าสู่ระบบด้วย LINE ตอนนี้',
        showCancelButton: true,
        cancelButtonText: 'ยกเลิก'
      }).then(res => {
        if (res.isConfirmed) {
          handleLineLogin();
        }
      });
      return;
    }

    setIsSubmittingStaff(true);
    try {
      let query = supabase.from('users').select('*');
      if (cleanEmpId) query = query.eq('employee_id', cleanEmpId);
      else if (cleanUser) query = query.eq('username', cleanUser);

      const { data: uData, error: uErr } = await query.limit(1);

      if (uErr || !uData || uData.length === 0) {
        Swal.fire({
          icon: 'error',
          title: 'ไม่พบบัญชีพนักงาน',
          text: 'ไม่พบบัญชีพนักงานที่ตรงกับข้อมูล กรุณาตรวจสอบรหัสพนักงานอีกครั้ง'
        });
        setIsSubmittingStaff(false);
        return;
      }

      const user = uData[0];

      if (user.status && user.status.toLowerCase() === 'inactive') {
        Swal.fire({
          icon: 'error',
          title: 'บัญชีถูกระงับการใช้งาน',
          text: 'บัญชีพนักงานนี้มีสถานะ Inactive ไม่สามารถเปิดใช้งานเมนูเจ้าหน้าที่ได้'
        });
        setIsSubmittingStaff(false);
        return;
      }

      // Update line_user_id column
      try {
        await supabase
          .from('users')
          .update({ line_user_id: uid })
          .eq('id', user.id);
      } catch (e) {
        console.warn('Direct column update failed, trying avatar payload:', e);
      }

      // Save locally
      try {
        localStorage.setItem(`hdh_line_user_${cleanEmpId}`, uid);
      } catch (e) {}

      // Call API to link Rich Menu (admin, ot, or staff)
      const userRole = (user.role || 'staff').toLowerCase();
      try {
        await fetch('/api/line-richmenu?action=link-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lineUserId: uid, role: userRole, status: 'active' })
        });
      } catch (apiErr) {
        console.warn('API link warning:', apiErr);
      }

      // Refresh
      await checkExistingBinding(uid);

      Swal.fire({
        icon: 'success',
        title: 'ยืนยันตัวตนสำเร็จ! 🌟',
        html: `สวัสดีค่ะ <b>คุณ${user.fullname || user.name}</b><br>สิทธิ์การใช้งาน: <b>${user.role}</b><br><br>แถบเมนูใน LINE ของท่านถูกอัปเกรดเรียบร้อยแล้วค่ะ`,
        confirmButtonColor: '#2563EB'
      });

    } catch (err) {
      console.error('Bind staff error:', err);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.message });
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  // 5. Handle Menu Switching
  const handleSwitchMenu = async (targetRole) => {
    const uid = liffProfile?.userId || manualUid.trim();
    if (!uid) return;

    setIsSwitchingMenu(true);
    try {
      const res = await fetch('/api/line-richmenu?action=switch-user-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineUserId: uid, targetRole })
      });

      const data = await res.json();
      if (res.ok) {
        setCurrentMenuRole(targetRole);
        Swal.fire({
          icon: 'success',
          title: 'สลับเมนูสำเร็จ!',
          text: `แถบเมนูในห้องแชท LINE ของคุณเปลี่ยนเป็นโหมด "${targetRole.toUpperCase()}" เรียบร้อยแล้วค่ะ`,
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        Swal.fire({ icon: 'error', title: 'ไม่สามารถสลับได้', text: data.error || 'เกิดข้อผิดพลาด' });
      }
    } catch (err) {
      console.error('Switch error:', err);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.message });
    } finally {
      setIsSwitchingMenu(false);
    }
  };

  // 6. Handle Unlink Account
  const handleUnlink = async () => {
    const uid = liffProfile?.userId || manualUid.trim();
    if (!uid) return;

    const result = await Swal.fire({
      title: 'ยืนยันการตัดการเชื่อมต่อ?',
      text: 'ระบบจะรีเซ็ตแถบเมนูใน LINE กลับเป็น "บุคคลทั่วไป" และยกเลิกการผูกบัญชีนี้',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#DC2626',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'ใช่, ตัดการเชื่อมต่อ',
      cancelButtonText: 'ยกเลิก'
    });

    if (!result.isConfirmed) return;

    try {
      // Remove line_user_id from users
      await supabase.from('users').update({ line_user_id: null }).eq('line_user_id', uid);
      // Remove line_user_id from patients
      await supabase.from('patients').update({ line_user_id: null }).eq('line_user_id', uid);

      // Clean local storage caches
      try {
        localStorage.removeItem(`hdh_line_parent_${uid}`);
      } catch (e) {}

      // Call API to unlink
      await fetch('/api/line-richmenu?action=link-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineUserId: uid, role: 'guest', status: 'active' })
      });

      setLinkedUser(null);
      setLinkedPatients([]);
      setCurrentMenuRole('guest');

      Swal.fire({ icon: 'success', title: 'ตัดการเชื่อมต่อแล้ว', text: 'แถบเมนูของท่านกลับเป็นบุคคลทั่วไปเรียบร้อยแล้วค่ะ' });
    } catch (err) {
      console.error('Unlink error:', err);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.message });
    }
  };

  // Close LIFF window
  const handleClose = () => {
    if (window.liff && window.liff.isInClient()) {
      window.liff.closeWindow();
    } else {
      window.location.hash = '#/';
    }
  };

  // Active child for parent view
  const activeChild = useMemo(() => {
    if (!linkedPatients || linkedPatients.length === 0) return null;
    if (activeChildHn) {
      const found = linkedPatients.find(p => String(p.hn) === String(activeChildHn));
      if (found) return found;
    }
    return linkedPatients[0];
  }, [linkedPatients, activeChildHn]);

  // Appointments for active child
  const childAppointments = useMemo(() => {
    if (!activeChild) return [];
    return allAppointments.filter(app => String(app.hn) === String(activeChild.hn));
  }, [activeChild, allAppointments]);

  const upcomingAppointments = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return childAppointments
      .filter(app => (app.date >= todayStr || app.status === 'รอรับบริการ' || app.status === 'ยืนยันแล้ว') && app.status !== 'ยกเลิก' && app.status !== 'รับบริการแล้ว')
      .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  }, [childAppointments]);

  const pastAppointments = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return childAppointments
      .filter(app => app.date < todayStr || app.status === 'รับบริการแล้ว')
      .sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));
  }, [childAppointments]);

  // Course balance calculation for active child
  const courseStats = useMemo(() => {
    if (!activeChild) return { purchased: 0, used: 0, balance: 0, points: 0 };
    const pReceipts = (allReceipts || []).filter(r => String(r.hn) === String(activeChild.hn) && r.status === 'ชำระเงินแล้ว');
    let purchased = 0;
    let points = 0;

    pReceipts.forEach(r => {
      points += Number(r.pointsEarned || Math.floor((Number(r.total) || 0) / 100)) || 0;
      (r.items || []).forEach(item => {
        if (item && item.type === 'บริการ') {
          if (item.code === 'TRANSFER_OUT') {
            purchased -= Number(item.quantity) || 0;
          } else if (item.code === 'TRANSFER_IN' || item.code === 'MANUAL_ADD') {
            purchased += Number(item.quantity) || 0;
          } else if (item.code === 'SV02' || (item.name && item.name.includes('ประเมินพัฒนาการ'))) {
            // First time evaluation
          } else {
            const sessionsPerUnit = item.sessionsPerUnit || (item.code === 'SV03' ? 10 : 1);
            purchased += (Number(item.quantity) || 0) * sessionsPerUnit;
          }
        }
      });
    });

    const used = childAppointments.filter(app => app.status === 'รับบริการแล้ว').length;
    const balance = Math.max(0, purchased - used);

    return { purchased, used, balance, points };
  }, [activeChild, allReceipts, childAppointments]);

  // ITP goals for active child
  const childItpGoals = useMemo(() => {
    if (!activeChild) return [];
    return (allItpGoals || []).filter(g => String(g.hn) === String(activeChild.hn));
  }, [activeChild, allItpGoals]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F8FAFC',
      fontFamily: "'Prompt', 'Sarabun', sans-serif",
      color: '#1E293B',
      paddingBottom: '3rem'
    }}>
      {/* Top Banner Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0E7490, #0891B2)',
        color: '#FFFFFF',
        padding: '2.5rem 1.25rem 2rem',
        textAlign: 'center',
        borderBottomLeftRadius: '24px',
        borderBottomRightRadius: '24px',
        boxShadow: '0 8px 24px rgba(14, 116, 144, 0.2)'
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '70px', height: '70px', backgroundColor: '#FFFFFF', borderRadius: '20px', marginBottom: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <img src={clinicInfo?.logoUrl || DEFAULT_CLINIC_LOGO} alt="Logo" style={{ width: '52px', height: '52px', objectFit: 'contain' }} />
        </div>
        <h1 style={{ fontSize: '1.45rem', fontWeight: '800', margin: '0 0 0.35rem 0', letterSpacing: '0.3px' }}>
          {linkedPatients.length > 0 ? 'พอร์ทัลผู้ปกครอง คลินิกบ้านฮักดี 🤎' : 'ระบบเชื่อมต่อบัญชี LINE OA'}
        </h1>
        <p style={{ fontSize: '0.9rem', opacity: 0.9, margin: 0 }}>
          คลินิกกิจกรรมบำบัด บ้านฮักดี โฮมแคร์
        </p>
      </div>

      <div style={{ maxWidth: '540px', margin: '-1.5rem auto 0', padding: '0 1rem' }}>
        
        {/* Error notification if LIFF fails */}
        {liffError && (
          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: '16px', padding: '0.85rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚠️ ไม่สามารถเชื่อมต่อกับ LINE SDK ได้: {liffError}</span>
          </div>
        )}

        {/* Loading state indicator */}
        {loading && (
          <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', borderRadius: '16px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <RefreshCw className="animate-spin" size={16} /> กำลังตรวจสอบข้อมูลและสิทธิ์...
          </div>
        )}

        {/* User LINE Profile Card */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          padding: '1.25rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          border: '1.5px solid ' + (liffProfile ? '#A7F3D0' : '#E2E8F0'),
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.25rem'
        }}>
          {liffProfile?.pictureUrl ? (
            <img 
              src={liffProfile.pictureUrl} 
              alt="Avatar" 
              style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #10B981', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)' }} 
            />
          ) : (
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#E0F2FE', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem' }}>
              👤
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {liffProfile?.displayName || 'ผู้ใช้งาน LINE'}
              </span>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: liffProfile ? '#10B981' : '#94A3B8' }} />
            </div>
            <div style={{ fontSize: '0.78rem', color: liffProfile ? '#059669' : '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              {liffProfile ? (
                <span>✓ เชื่อมต่อบัญชี LINE สำเร็จ (ดึง ID อัตโนมัติ)</span>
              ) : (
                <span>UID: {manualUid ? `${manualUid.substring(0, 14)}...` : 'รอการเชื่อมต่อ'}</span>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{
              display: 'inline-block',
              padding: '6px 12px',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontWeight: '700',
              backgroundColor: linkedUser ? '#EFF6FF' : (linkedPatients.length > 0 ? '#ECFDF5' : '#F1F5F9'),
              color: linkedUser ? '#2563EB' : (linkedPatients.length > 0 ? '#059669' : '#64748B')
            }}>
              {linkedUser ? linkedUser.role : (linkedPatients.length > 0 ? 'ผู้ปกครอง' : 'บุคคลทั่วไป')}
            </span>
          </div>
        </div>

        {/* 1-Click LINE Login Prompt (Visible when opened in external browser without profile) */}
        {!liffProfile && (
          <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '20px', padding: '1.25rem', marginBottom: '1.25rem', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: '700', fontSize: '0.95rem', marginBottom: '6px' }}>
              <MessageCircle size={18} color="#16A34A" /> เข้าสู่ระบบด้วย LINE
            </div>
            <p style={{ fontSize: '0.85rem', color: '#15803D', margin: '0 0 12px 0', lineHeight: 1.4 }}>
              เพื่อให้ระบบดึงรูปโปรไฟล์ ชื่อ และ LINE User ID ของคุณให้อัตโนมัติ โดยไม่ต้องกรอกเอง:
            </p>
            <button
              onClick={handleLineLogin}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '12px',
                backgroundColor: '#06C755',
                color: '#FFFFFF',
                fontWeight: '700',
                fontSize: '0.95rem',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(6, 199, 85, 0.25)',
                transition: 'all 0.2s'
              }}
            >
              <MessageCircle size={20} />
              เข้าสู่ระบบด้วย LINE เพื่อดึงข้อมูลโปรไฟล์อัตโนมัติ
            </button>

            <details style={{ marginTop: '12px', textAlign: 'left', fontSize: '0.8rem', color: '#4B5563' }}>
              <summary style={{ cursor: 'pointer', color: '#6B7280' }}>หรือระบุ LINE User ID เพื่อทดสอบด้วยตนเอง (สำหรับเจ้าหน้าที่)</summary>
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                <input 
                  type="text"
                  placeholder="ระบุ LINE User ID (U...)"
                  value={manualUid}
                  onChange={(e) => setManualUid(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                />
                <button 
                  onClick={() => checkExistingBinding(manualUid)}
                  className="btn btn-primary"
                  style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '0.82rem', backgroundColor: '#0284C7', borderColor: '#0284C7' }}
                >
                  ตรวจสอบ
                </button>
              </div>
            </details>
          </div>
        )}

        {/* CASE 1: ALREADY LINKED (STAFF / OT / ADMIN) */}
        {linkedUser && (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#0369A1', marginBottom: '1rem' }}>
              <ShieldCheck size={22} />
              <h2 style={{ fontSize: '1.15rem', fontWeight: '700', margin: 0 }}>
                เชื่อมโยงบัญชีพนักงานเรียบร้อย
              </h2>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', borderRadius: '14px', padding: '1rem', border: '1px solid #E2E8F0', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.88rem' }}>
                <span style={{ color: '#64748B' }}>ชื่อ-นามสกุล:</span>
                <span style={{ fontWeight: '700', color: '#0F172A' }}>{linkedUser.fullname || linkedUser.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.88rem' }}>
                <span style={{ color: '#64748B' }}>รหัสพนักงาน:</span>
                <span style={{ fontWeight: '700', color: '#0284C7' }}>{linkedUser.employee_id || '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <span style={{ color: '#64748B' }}>ตำแหน่ง / สิทธิ์:</span>
                <span style={{ fontWeight: '700', color: '#10B981' }}>{linkedUser.position || linkedUser.role}</span>
              </div>
            </div>

            {/* Menu Switcher for Staff / OT / Admin */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#334155', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RefreshCw size={16} /> สลับดูรูปแบบเมนูใน LINE (Switch View)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                <button
                  disabled={isSwitchingMenu}
                  onClick={() => handleSwitchMenu('guest')}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '12px',
                    border: currentMenuRole === 'guest' ? '2px solid #C19B6C' : '1px solid #E2E8F0',
                    backgroundColor: currentMenuRole === 'guest' ? '#FFFBEB' : '#FFFFFF',
                    color: currentMenuRole === 'guest' ? '#B45309' : '#64748B',
                    fontWeight: '700',
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  🟢 1. ทั่วไป
                </button>
                {((linkedUser.role || '').toLowerCase() === 'admin') && (
                  <button
                    disabled={isSwitchingMenu}
                    onClick={() => handleSwitchMenu('parent')}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '12px',
                      border: currentMenuRole === 'parent' ? '2px solid #059669' : '1px solid #E2E8F0',
                      backgroundColor: currentMenuRole === 'parent' ? '#ECFDF5' : '#FFFFFF',
                      color: currentMenuRole === 'parent' ? '#047857' : '#64748B',
                      fontWeight: '700',
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    🟡 2. ผู้ปกครอง
                  </button>
                )}

                {(['staff', 'admin'].includes((linkedUser.role || '').toLowerCase())) && (
                  <button
                    disabled={isSwitchingMenu}
                    onClick={() => handleSwitchMenu('staff')}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '12px',
                      border: currentMenuRole === 'staff' ? '2px solid #0284C7' : '1px solid #E2E8F0',
                      backgroundColor: currentMenuRole === 'staff' ? '#F0F9FF' : '#FFFFFF',
                      color: currentMenuRole === 'staff' ? '#0369A1' : '#64748B',
                      fontWeight: '700',
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    🔵 3. เจ้าหน้าที่
                  </button>
                )}

                {(['ot', 'admin'].includes((linkedUser.role || '').toLowerCase())) && (
                  <button
                    disabled={isSwitchingMenu}
                    onClick={() => handleSwitchMenu('ot')}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '12px',
                      border: currentMenuRole === 'ot' ? '2px solid #EA580C' : '1px solid #E2E8F0',
                      backgroundColor: currentMenuRole === 'ot' ? '#FFF7ED' : '#FFFFFF',
                      color: currentMenuRole === 'ot' ? '#C2410C' : '#64748B',
                      fontWeight: '700',
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    🟠 4. นักบำบัด
                  </button>
                )}

                {(linkedUser.role || '').toLowerCase() === 'admin' && (
                  <button
                    disabled={isSwitchingMenu}
                    onClick={() => handleSwitchMenu('admin')}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '12px',
                      border: currentMenuRole === 'admin' ? '2px solid #7C3AED' : '1px solid #E2E8F0',
                      backgroundColor: currentMenuRole === 'admin' ? '#FAF5FF' : '#FFFFFF',
                      color: currentMenuRole === 'admin' ? '#6D28D9' : '#64748B',
                      fontWeight: '700',
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    🟣 5. ผู้ดูแลระบบ
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleClose}
                className="btn btn-primary"
                style={{ flex: 1, padding: '12px', borderRadius: '12px', fontWeight: '700', backgroundColor: '#0284C7', borderColor: '#0284C7' }}
              >
                เสร็จสิ้น / ปิดหน้าต่าง
              </button>
              <button
                onClick={handleUnlink}
                className="btn btn-light"
                style={{ padding: '12px', borderRadius: '12px', color: '#DC2626', borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }}
                title="ตัดการเชื่อมต่อบัญชี"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        )}

        {/* CASE 2: ALREADY LINKED PARENT -> COMPREHENSIVE CHILD PORTAL */}
        {!linkedUser && linkedPatients.length > 0 && activeChild && (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '1.25rem', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0', marginBottom: '1.25rem' }}>
            
            {/* Multi-Child Selector Pills (If Parent has > 1 child registered) */}
            {linkedPatients.length > 1 && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748B', marginBottom: '6px' }}>
                  👶 เลือกดูข้อมูลผู้รับบริการ ({linkedPatients.length} คน):
                </div>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {linkedPatients.map(child => {
                    const isSelected = activeChild.hn === child.hn;
                    return (
                      <button
                        key={child.hn}
                        onClick={() => setActiveChildHn(child.hn)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          borderRadius: '9999px',
                          border: isSelected ? '2px solid #059669' : '1px solid #E2E8F0',
                          backgroundColor: isSelected ? '#ECFDF5' : '#F8FAFC',
                          color: isSelected ? '#047857' : '#64748B',
                          fontWeight: '700',
                          fontSize: '0.84rem',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s'
                        }}
                      >
                        <span>👶</span>
                        <span>น้อง{child.nickname || child.name}</span>
                        <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>(HN: {child.hn})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Child Profile Banner Card */}
            <div style={{
              background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)',
              borderRadius: '20px',
              padding: '1.25rem',
              border: '1.5px solid #BBF7D0',
              marginBottom: '1.25rem',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.15)',
                  border: '2px solid #86EFAC',
                  flexShrink: 0
                }}>
                  👶
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#064E3B', margin: 0 }}>
                      น้อง{activeChild.nickname || activeChild.name}
                    </h3>
                    <span style={{
                      backgroundColor: '#10B981',
                      color: '#FFFFFF',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '9999px'
                    }}>
                      {activeChild.status || 'Active'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.86rem', color: '#047857', marginTop: '2px', fontWeight: '600' }}>
                    {activeChild.title || ''}{activeChild.firstname || activeChild.name} {activeChild.lastname || ''}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#065F46', display: 'flex', gap: '10px', marginTop: '4px' }}>
                    <span><strong>HN:</strong> {activeChild.hn}</span>
                    <span>•</span>
                    <span><strong>อายุ:</strong> {activeChild.ageText || activeChild.age || '-'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs (5 Rich Menu Features) */}
            <div style={{
              display: 'flex',
              gap: '4px',
              backgroundColor: '#F1F5F9',
              borderRadius: '16px',
              padding: '4px',
              marginBottom: '1.25rem',
              overflowX: 'auto'
            }}>
              <button
                onClick={() => setParentPortalTab('profile')}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 4px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: parentPortalTab === 'profile' ? '#FFFFFF' : 'transparent',
                  color: parentPortalTab === 'profile' ? '#059669' : '#64748B',
                  fontWeight: '700',
                  fontSize: '0.76rem',
                  boxShadow: parentPortalTab === 'profile' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer',
                  minWidth: '60px'
                }}
              >
                <User size={18} />
                <span>ประวัติ</span>
              </button>
              <button
                onClick={() => setParentPortalTab('appointments')}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 4px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: parentPortalTab === 'appointments' ? '#FFFFFF' : 'transparent',
                  color: parentPortalTab === 'appointments' ? '#059669' : '#64748B',
                  fontWeight: '700',
                  fontSize: '0.76rem',
                  boxShadow: parentPortalTab === 'appointments' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer',
                  minWidth: '60px'
                }}
              >
                <Calendar size={18} />
                <span>นัดหมาย</span>
              </button>
              <button
                onClick={() => setParentPortalTab('itp')}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 4px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: parentPortalTab === 'itp' ? '#FFFFFF' : 'transparent',
                  color: parentPortalTab === 'itp' ? '#059669' : '#64748B',
                  fontWeight: '700',
                  fontSize: '0.76rem',
                  boxShadow: parentPortalTab === 'itp' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer',
                  minWidth: '60px'
                }}
              >
                <Target size={18} />
                <span>พัฒนาการ</span>
              </button>
              <button
                onClick={() => setParentPortalTab('courses')}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 4px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: parentPortalTab === 'courses' ? '#FFFFFF' : 'transparent',
                  color: parentPortalTab === 'courses' ? '#059669' : '#64748B',
                  fontWeight: '700',
                  fontSize: '0.76rem',
                  boxShadow: parentPortalTab === 'courses' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer',
                  minWidth: '60px'
                }}
              >
                <Award size={18} />
                <span>คอร์ส/แต้ม</span>
              </button>
              <button
                onClick={() => setParentPortalTab('homeprogram')}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 4px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: parentPortalTab === 'homeprogram' ? '#FFFFFF' : 'transparent',
                  color: parentPortalTab === 'homeprogram' ? '#059669' : '#64748B',
                  fontWeight: '700',
                  fontSize: '0.76rem',
                  boxShadow: parentPortalTab === 'homeprogram' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer',
                  minWidth: '60px'
                }}
              >
                <Home size={18} />
                <span>ฝึกที่บ้าน</span>
              </button>
            </div>

            {/* TAB CONTENT 1: PROFILE & MEDICAL HISTORY */}
            {parentPortalTab === 'profile' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Health & Care Alerts */}
                <div style={{
                  backgroundColor: (activeChild.allergies && !activeChild.allergies.includes('ปฏิเสธ')) ? '#FEF2F2' : '#F0FDF4',
                  border: '1.5px solid ' + ((activeChild.allergies && !activeChild.allergies.includes('ปฏิเสธ')) ? '#FECACA' : '#BBF7D0'),
                  borderRadius: '16px',
                  padding: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', color: (activeChild.allergies && !activeChild.allergies.includes('ปฏิเสธ')) ? '#991B1B' : '#166534', fontWeight: '700', fontSize: '0.9rem' }}>
                    <AlertTriangle size={18} /> ข้อมูลสุขภาพ & อาการสำคัญ
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div>
                      <strong style={{ color: '#475569' }}>ประวัติการแพ้ยา/อาหาร: </strong>
                      <span style={{
                        fontWeight: '700',
                        color: (activeChild.allergies && !activeChild.allergies.includes('ปฏิเสธ')) ? '#DC2626' : '#16A34A'
                      }}>
                        {activeChild.allergies_details || activeChild.allergiesDetails || activeChild.allergies || 'ปฏิเสธการแพ้ยาและอาหาร'}
                      </span>
                    </div>
                    <div>
                      <strong style={{ color: '#475569' }}>อาการที่ผู้ปกครองกังวล: </strong>
                      <span style={{ color: '#0F172A' }}>
                        {activeChild.worries || activeChild.diagnosis || activeChild.conditions_details || 'ประเมินและฝึกกระตุ้นพัฒนาการทั่วไป'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Patient Information Card */}
                <div style={{ backgroundColor: '#F8FAFC', borderRadius: '16px', padding: '1rem', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={16} color="#059669" /> ข้อมูลทั่วไปและการติดต่อ
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748B' }}>ชื่อผู้ปกครอง:</span>
                      <span style={{ fontWeight: '700', color: '#0F172A' }}>{activeChild.parent_name || activeChild.parentName || activeChild.guardian || '-'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748B' }}>เบอร์โทรศัพท์:</span>
                      <span style={{ fontWeight: '700', color: '#0F172A' }}>{activeChild.phone || '-'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748B' }}>วันเกิด:</span>
                      <span style={{ color: '#0F172A' }}>{activeChild.dobBE || activeChild.dob || '-'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748B' }}>นักบำบัดผู้ดูแลเคส:</span>
                      <span style={{ fontWeight: '700', color: '#059669' }}>{activeChild.therapist || activeChild.therapist_name || 'ทีมนักกิจกรรมบำบัดบ้านฮักดี'}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <div style={{ backgroundColor: '#EFF6FF', borderRadius: '14px', padding: '10px 8px', textAlign: 'center', border: '1px solid #BFDBFE' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1D4ED8' }}>{upcomingAppointments.length}</div>
                    <div style={{ fontSize: '0.72rem', color: '#2563EB', fontWeight: '600', marginTop: '2px' }}>นัดหมายรอฝึก</div>
                  </div>
                  <div style={{ backgroundColor: '#ECFDF5', borderRadius: '14px', padding: '10px 8px', textAlign: 'center', border: '1px solid #A7F3D0' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#059669' }}>{courseStats.balance}</div>
                    <div style={{ fontSize: '0.72rem', color: '#047857', fontWeight: '600', marginTop: '2px' }}>คอร์สคงเหลือ</div>
                  </div>
                  <div style={{ backgroundColor: '#FFFBEB', borderRadius: '14px', padding: '10px 8px', textAlign: 'center', border: '1px solid #FDE68A' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#D97706' }}>{courseStats.points}</div>
                    <div style={{ fontSize: '0.72rem', color: '#B45309', fontWeight: '600', marginTop: '2px' }}>แต้มสะสม</div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: APPOINTMENTS */}
            {parentPortalTab === 'appointments' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0F172A', margin: 0 }}>
                    📅 ตารางนัดหมายที่กำลังจะมาถึง
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '700', backgroundColor: '#ECFDF5', padding: '2px 8px', borderRadius: '9999px' }}>
                    {upcomingAppointments.length} รายการ
                  </span>
                </div>

                {upcomingAppointments.length === 0 ? (
                  <div style={{ backgroundColor: '#F8FAFC', borderRadius: '16px', padding: '1.5rem', textAlign: 'center', border: '1px dashed #CBD5E1', marginBottom: '1rem' }}>
                    <Calendar size={32} color="#94A3B8" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '0.88rem', color: '#64748B', fontWeight: '600' }}>ยังไม่มีรายการนัดหมายในอนาคต</div>
                    <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '4px' }}>คุณพ่อคุณแม่สามารถติดต่อจองคิวนัดฝึกกับเจ้าหน้าที่ได้ค่ะ</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.25rem' }}>
                    {upcomingAppointments.map((app, idx) => (
                      <div key={idx} style={{
                        backgroundColor: '#F0FDF4',
                        border: '1.5px solid #BBF7D0',
                        borderRadius: '16px',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <div>
                          <div style={{ fontWeight: '800', fontSize: '0.92rem', color: '#065F46' }}>
                            {formatDateBE(app.date)} • {app.time || '10:00 - 11:00'} น.
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#047857', marginTop: '2px' }}>
                            {app.service || app.type || 'กิจกรรมบำบัดเดี่ยว (OT)'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                            ผู้ดูแล: <strong>{app.therapist || 'ครูผู้ดูแล'}</strong> {app.room ? `• ห้อง ${app.room}` : ''}
                          </div>
                        </div>
                        <span style={{
                          backgroundColor: '#10B981',
                          color: '#FFFFFF',
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          padding: '4px 8px',
                          borderRadius: '8px',
                          whiteSpace: 'nowrap'
                        }}>
                          {app.status || 'ยืนยันแล้ว'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Past Sessions History */}
                {pastAppointments.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748B', marginBottom: '8px' }}>
                      ประวัติการเข้ารับบริการที่ผ่านมา ({pastAppointments.length} ครั้ง):
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {pastAppointments.slice(0, 5).map((app, idx) => (
                        <div key={idx} style={{
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '12px',
                          padding: '8px 12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.82rem'
                        }}>
                          <div>
                            <span style={{ fontWeight: '700', color: '#334155' }}>{formatDateBE(app.date)}</span>
                            <span style={{ color: '#64748B', marginLeft: '6px' }}>({app.service || app.type || 'OT'})</span>
                          </div>
                          <span style={{ color: '#059669', fontWeight: '700' }}>✓ เข้ารับบริการแล้ว</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 3: ITP & DEVELOPMENT */}
            {parentPortalTab === 'itp' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0F172A', margin: 0 }}>
                    🌟 เป้าหมายและแผนการบำบัดรายบุคคล (ITP)
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: '#0284C7', fontWeight: '700', backgroundColor: '#F0F9FF', padding: '2px 8px', borderRadius: '9999px' }}>
                    {childItpGoals.length} เป้าหมาย
                  </span>
                </div>

                {childItpGoals.length === 0 ? (
                  <div style={{ backgroundColor: '#F8FAFC', borderRadius: '16px', padding: '1.5rem', textAlign: 'center', border: '1px dashed #CBD5E1' }}>
                    <Target size={32} color="#94A3B8" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '0.88rem', color: '#64748B', fontWeight: '600' }}>กำลังประเมินและจัดทำแผนการฝึก (ITP)</div>
                    <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '4px' }}>
                      นักกิจกรรมบำบัดจะจัดทำแผนและกำหนดเป้าหมายเพื่อรายงานความก้าวหน้าให้น้องที่นี่ค่ะ
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {childItpGoals.map((goal, idx) => (
                      <div key={idx} style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '16px',
                        padding: '12px 14px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#0369A1', backgroundColor: '#F0F9FF', padding: '2px 8px', borderRadius: '6px' }}>
                            {goal.category || 'ทักษะทางกิจกรรมบำบัด'}
                          </span>
                          <span style={{ fontSize: '0.72rem', fontWeight: '700', color: goal.progress >= 100 ? '#059669' : '#D97706' }}>
                            {goal.progress >= 100 ? 'บรรลุเป้าหมาย ✓' : `${goal.progress || 0}%`}
                          </span>
                        </div>
                        <div style={{ fontWeight: '700', fontSize: '0.88rem', color: '#0F172A', marginTop: '6px' }}>
                          {goal.title || goal.goalText}
                        </div>
                        {/* Progress Bar */}
                        <div style={{ width: '100%', height: '8px', backgroundColor: '#E2E8F0', borderRadius: '9999px', marginTop: '8px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${Math.min(100, Math.max(5, goal.progress || 0))}%`,
                            height: '100%',
                            backgroundColor: goal.progress >= 100 ? '#10B981' : '#0284C7',
                            borderRadius: '9999px'
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 4: COURSES & POINTS */}
            {parentPortalTab === 'courses' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '1.25rem' }}>
                  {/* Sessions Balance Card */}
                  <div style={{
                    background: 'linear-gradient(135deg, #059669, #10B981)',
                    borderRadius: '20px',
                    padding: '1.5rem',
                    color: '#FFFFFF',
                    textAlign: 'center',
                    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.25)'
                  }}>
                    <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '4px' }}>คอร์สฝึกพัฒนาการคงเหลือ</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '900', lineHeight: 1 }}>{courseStats.balance}</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', marginTop: '4px' }}>ครั้ง (Sessions)</div>
                    
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.2)', fontSize: '0.82rem' }}>
                      <div>ซื้อสะสม: <strong>{courseStats.purchased}</strong> ครั้ง</div>
                      <div>•</div>
                      <div>ใช้ไปแล้ว: <strong>{courseStats.used}</strong> ครั้ง</div>
                    </div>
                  </div>

                  {/* Hug Dee Points Card */}
                  <div style={{
                    background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                    borderRadius: '20px',
                    padding: '1.25rem',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 14px rgba(217, 119, 6, 0.25)'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>คะแนนสะสม Hug Dee Points</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: '800', marginTop: '2px' }}>{courseStats.points} คะแนน</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.85, marginTop: '2px' }}>ใช้แลกรับส่วนลดและของรางวัลพัฒนาการ</div>
                    </div>
                    <Award size={42} style={{ opacity: 0.9 }} />
                  </div>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', borderRadius: '16px', padding: '1rem', border: '1px solid #E2E8F0', fontSize: '0.85rem', color: '#475569' }}>
                  <div style={{ fontWeight: '700', color: '#0F172A', marginBottom: '4px' }}>💡 หมายเหตุเกี่ยวกับคอร์สการฝึก:</div>
                  <ul style={{ margin: '0 0 0 1.2rem', padding: 0, lineHeight: 1.5 }}>
                    <li>คอร์สกิจกรรมบำบัดสามารถใช้ได้กับทั้งการฝึก OT เดี่ยว และการกระตุ้นพัฒนาการ</li>
                    <li>เมื่อคอร์สใกล้หมด ระบบจะแจ้งเตือนผ่าน LINE OA ให้คุณพ่อคุณแม่ทราบล่วงหน้าค่ะ</li>
                  </ul>
                </div>
              </div>
            )}

            {/* TAB CONTENT 5: HOME PROGRAM */}
            {parentPortalTab === 'homeprogram' && (
              <div>
                <div style={{ marginBottom: '10px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0F172A', margin: '0 0 4px 0' }}>
                    🏡 กิจกรรมและแบบฝึกหัดที่บ้าน (Home Program)
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>
                    กิจกรรมแนะนำทางกิจกรรมบำบัดที่คุณพ่อคุณแม่สามารถฝึกร่วมกับน้องได้ที่บ้าน:
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {HOME_ACTIVITIES.map((cat, cIdx) => (
                    <div key={cIdx} style={{ backgroundColor: '#F8FAFC', borderRadius: '16px', padding: '1rem', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#059669', marginBottom: '8px' }}>
                        {cat.category}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {cat.items.map((act, aIdx) => (
                          <div key={aIdx} style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '10px 12px', border: '1px solid #E2E8F0' }}>
                            <div style={{ fontWeight: '700', fontSize: '0.86rem', color: '#0F172A' }}>
                              • {act.title}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px', lineHeight: 1.4 }}>
                              {act.desc}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Actions for Parent */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #F1F5F9' }}>
              <button
                onClick={handleClose}
                className="btn btn-primary"
                style={{ flex: 1, padding: '12px', borderRadius: '14px', fontWeight: '700', backgroundColor: '#059669', borderColor: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                เสร็จสิ้น / ปิดหน้าต่าง ➔
              </button>
              <button
                onClick={handleUnlink}
                className="btn btn-light"
                style={{ padding: '12px', borderRadius: '14px', color: '#DC2626', borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }}
                title="ตัดการเชื่อมต่อบัญชี"
              >
                <LogOut size={18} />
              </button>
            </div>

          </div>
        )}

        {/* CASE 3: NOT YET LINKED (FORM TO LINK AS PARENT OR STAFF) */}
        {!linkedUser && linkedPatients.length === 0 && (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0' }}>
            
            {/* Tabs */}
            <div style={{ display: 'flex', borderRadius: '14px', backgroundColor: '#F1F5F9', padding: '4px', marginBottom: '1.5rem' }}>
              <button
                onClick={() => setBindingTab('parent')}
                style={{
                  flex: 1,
                  padding: '10px 8px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: bindingTab === 'parent' ? '#FFFFFF' : 'transparent',
                  color: bindingTab === 'parent' ? '#059669' : '#64748B',
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  boxShadow: bindingTab === 'parent' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer'
                }}
              >
                👶 สำหรับผู้ปกครอง
              </button>
              <button
                onClick={() => setBindingTab('staff')}
                style={{
                  flex: 1,
                  padding: '10px 8px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: bindingTab === 'staff' ? '#FFFFFF' : 'transparent',
                  color: bindingTab === 'staff' ? '#0284C7' : '#64748B',
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  boxShadow: bindingTab === 'staff' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer'
                }}
              >
                💼 เจ้าหน้าที่ / นักบำบัด
              </button>
            </div>

            {/* TAB 1: PARENT */}
            {bindingTab === 'parent' && (
              <form onSubmit={handleBindParent}>
                {/* Auto Profile Connection Status */}
                <div style={{
                  backgroundColor: liffProfile ? '#ECFDF5' : '#FFFBEB',
                  border: '1.5px solid ' + (liffProfile ? '#A7F3D0' : '#FDE68A'),
                  borderRadius: '14px',
                  padding: '12px 14px',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  {liffProfile?.pictureUrl ? (
                    <img src={liffProfile.pictureUrl} alt="Avatar" style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #10B981' }} />
                  ) : (
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#E0F2FE', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                      👤
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: '800', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      ผูกกับบัญชี LINE: {liffProfile?.displayName || (manualUid ? `UID: ${manualUid.substring(0, 10)}...` : 'รอเชื่อมต่อ')}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: liffProfile ? '#059669' : '#B45309', fontWeight: '600', marginTop: '2px' }}>
                      {liffProfile ? '✓ เชื่อมโยง LINE User ID อัตโนมัติ (ไม่ต้องกรอกเอง)' : 'เพื่อความสะดวก แนะนำให้กดเข้าสู่ระบบด้วย LINE ด้านบน'}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontWeight: '700', fontSize: '0.88rem', color: '#334155', marginBottom: '6px' }}>
                    เบอร์โทรศัพท์ผู้ปกครอง หรือ เลข HN ของน้อง:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น 0812345678 หรือ 69001"
                    value={parentIdentifier}
                    onChange={(e) => setParentIdentifier(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '0.95rem'
                    }}
                  />
                  <span style={{ fontSize: '0.78rem', color: '#64748B', display: 'block', marginTop: '6px' }}>
                    * เบอร์เดียวกับที่คุณพ่อคุณแม่ใช้ลงทะเบียนประวัติกับคลินิก
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingParent}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '14px',
                    fontSize: '1rem',
                    fontWeight: '700',
                    backgroundColor: '#059669',
                    borderColor: '#059669',
                    boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)'
                  }}
                >
                  {isSubmittingParent ? 'กำลังตรวจสอบ...' : '🔗 ยืนยันและเชื่อมต่อบัญชี'}
                </button>

                <div style={{ marginTop: '1.5rem', textAlign: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '1.25rem' }}>
                  <span style={{ fontSize: '0.82rem', color: '#64748B' }}>ยังไม่เคยลงทะเบียนผู้รับบริการใช่ไหมคะ?</span><br />
                  <a href="#/register-patient" style={{ color: '#0E7490', fontWeight: '700', fontSize: '0.88rem', textDecoration: 'none', display: 'inline-block', marginTop: '4px' }}>
                    คลิกที่นี่เพื่อลงทะเบียนคนไข้ใหม่ ➔
                  </a>
                </div>
              </form>
            )}

            {/* TAB 2: STAFF */}
            {bindingTab === 'staff' && (
              <form onSubmit={handleBindStaff}>
                {/* Auto Profile Connection Status */}
                <div style={{
                  backgroundColor: liffProfile ? '#F0F9FF' : '#FFFBEB',
                  border: '1.5px solid ' + (liffProfile ? '#BAE6FD' : '#FDE68A'),
                  borderRadius: '14px',
                  padding: '12px 14px',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  {liffProfile?.pictureUrl ? (
                    <img src={liffProfile.pictureUrl} alt="Avatar" style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #0284C7' }} />
                  ) : (
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#E0F2FE', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                      👤
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: '800', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      ผูกกับบัญชี LINE: {liffProfile?.displayName || (manualUid ? `UID: ${manualUid.substring(0, 10)}...` : 'รอเชื่อมต่อ')}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: liffProfile ? '#0284C7' : '#B45309', fontWeight: '600', marginTop: '2px' }}>
                      {liffProfile ? '✓ เชื่อมโยง LINE User ID อัตโนมัติ (ไม่ต้องกรอกเอง)' : 'เพื่อความสะดวก แนะนำให้กดเข้าสู่ระบบด้วย LINE ด้านบน'}
                    </div>
                  </div>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontWeight: '700', fontSize: '0.88rem', color: '#334155', marginBottom: '6px' }}>
                    รหัสพนักงาน (Employee ID):
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น HDH001, HDH002"
                    value={staffEmpId}
                    onChange={(e) => setStaffEmpId(e.target.value.toUpperCase())}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '0.95rem'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontWeight: '700', fontSize: '0.88rem', color: '#334155', marginBottom: '6px' }}>
                    ชื่อผู้ใช้ในระบบ (Username):
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น admin, ot_nam"
                    value={staffUsername}
                    onChange={(e) => setStaffUsername(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '0.95rem'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingStaff}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '14px',
                    fontSize: '1rem',
                    fontWeight: '700',
                    backgroundColor: '#0284C7',
                    borderColor: '#0284C7',
                    boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)'
                  }}
                >
                  {isSubmittingStaff ? 'กำลังตรวจสอบ...' : '🔐 ยืนยันสิทธิ์เจ้าหน้าที่'}
                </button>
              </form>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
