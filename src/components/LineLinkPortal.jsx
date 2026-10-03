import React, { useState, useEffect } from 'react';
import { 
  Smartphone, User, CheckCircle2, AlertCircle, ArrowRight, 
  RotateCcw, ShieldCheck, Heart, Sparkles, LogOut, Check,
  Users, Calendar, Baby, RefreshCw
} from 'lucide-react';
import Swal from 'sweetalert2';
import { supabase } from '../utils/supabaseClient';
import { DEFAULT_CLINIC_LOGO } from '../utils/defaultAssets';

export default function LineLinkPortal({ clinicInfo, users = [], patients = [] }) {
  const [liffProfile, setLiffProfile] = useState(null);
  const [liffError, setLiffError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Linked account state
  const [linkedUser, setLinkedUser] = useState(null); // If linked to users table (staff/ot/admin)
  const [linkedPatients, setLinkedPatients] = useState([]); // If linked to patients table (parents)
  const [activeChildHn, setActiveChildHn] = useState('');

  // Active Tab for new binding: 'parent' | 'staff'
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

  // 1. Initialize LIFF
  useEffect(() => {
    let isMounted = true;

    async function initLiff() {
      try {
        if (window.liff) {
          await window.liff.init({ liffId });
          if (window.liff.isLoggedIn()) {
            const profile = await window.liff.getProfile();
            if (isMounted) {
              setLiffProfile(profile);
              setManualUid(profile.userId);
              await checkExistingBinding(profile.userId);
            }
          } else {
            // If in external browser, try login or allow manual UID
            if (window.liff.isInClient()) {
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
  }, [liffId]);

  // 2. Check if this LINE UID is already linked in Supabase
  const checkExistingBinding = async (targetUid) => {
    if (!targetUid) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      // A. Check staff/ot/admin in users table
      const { data: uData, error: uErr } = await supabase
        .from('users')
        .select('*')
        .eq('line_user_id', targetUid)
        .limit(1);

      if (!uErr && uData && uData.length > 0) {
        setLinkedUser(uData[0]);
        setCurrentMenuRole((uData[0].role || 'staff').toLowerCase());
      } else {
        setLinkedUser(null);
      }

      // B. Check parents in patients table
      const { data: pData, error: pErr } = await supabase
        .from('patients')
        .select('*')
        .eq('line_user_id', targetUid);

      if (!pErr && pData && pData.length > 0) {
        setLinkedPatients(pData);
        setActiveChildHn(pData[0].hn);
        if (!uData || uData.length === 0) {
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
      Swal.fire({ icon: 'warning', title: 'ไม่พบ LINE User ID', text: 'กรุณาเปิดหน้านี้ผ่านแอป LINE หรือระบุ LINE UID' });
      return;
    }

    setIsSubmittingParent(true);
    try {
      // Find matching patient by phone or hn
      const { data: matched, error: findErr } = await supabase
        .from('patients')
        .select('*')
        .or(`phone.eq.${cleanId},hn.eq.${cleanId},parent_name.ilike.%${cleanId}%`);

      if (findErr || !matched || matched.length === 0) {
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

      // Update line_user_id for all matching children with this phone/HN
      const hns = matched.map(m => m.hn);
      const { error: updateErr } = await supabase
        .from('patients')
        .update({ line_user_id: uid })
        .in('hn', hns);

      if (updateErr) {
        throw updateErr;
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
      Swal.fire({ icon: 'warning', title: 'ไม่พบ LINE User ID', text: 'กรุณาเปิดหน้านี้ผ่านแอป LINE หรือระบุ LINE UID' });
      return;
    }

    setIsSubmittingStaff(true);
    try {
      // Find user
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

      // SECURITY RULE: If inactive, block
      if (user.status && user.status.toLowerCase() === 'inactive') {
        Swal.fire({
          icon: 'error',
          title: 'บัญชีถูกระงับการใช้งาน',
          text: 'บัญชีพนักงานนี้มีสถานะ Inactive ไม่สามารถเปิดใช้งานเมนูเจ้าหน้าที่ได้'
        });
        setIsSubmittingStaff(false);
        return;
      }

      // Update line_user_id
      const { error: updateErr } = await supabase
        .from('users')
        .update({ line_user_id: uid })
        .eq('id', user.id);

      if (updateErr) throw updateErr;

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
          ระบบเชื่อมต่อบัญชี LINE OA
        </h1>
        <p style={{ fontSize: '0.9rem', opacity: 0.9, margin: 0 }}>
          คลินิกกิจกรรมบำบัด บ้านฮักดี 🤎
        </p>
      </div>

      <div style={{ maxWidth: '520px', margin: '-1.5rem auto 0', padding: '0 1rem' }}>
        
        {/* User LINE Profile Card */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          padding: '1.25rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          border: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.25rem'
        }}>
          {liffProfile?.pictureUrl ? (
            <img 
              src={liffProfile.pictureUrl} 
              alt="Avatar" 
              style={{ width: '58px', height: '58px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #06B6D4' }} 
            />
          ) : (
            <div style={{ width: '58px', height: '58px', borderRadius: '50%', backgroundColor: '#E0F2FE', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
              👤
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {liffProfile?.displayName || 'ผู้ใช้งาน LINE'}
              </span>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', wordBreak: 'break-all', marginTop: '2px' }}>
              UID: {liffProfile?.userId ? `${liffProfile.userId.substring(0, 14)}...` : (manualUid ? `${manualUid.substring(0, 14)}...` : 'รอการเชื่อมต่อ')}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{
              display: 'inline-block',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: '700',
              backgroundColor: linkedUser ? '#EFF6FF' : (linkedPatients.length > 0 ? '#ECFDF5' : '#F1F5F9'),
              color: linkedUser ? '#2563EB' : (linkedPatients.length > 0 ? '#059669' : '#64748B')
            }}>
              {linkedUser ? linkedUser.role : (linkedPatients.length > 0 ? 'ผู้ปกครอง' : 'บุคคลทั่วไป')}
            </span>
          </div>
        </div>

        {/* Desktop / Manual UID Helper (Visible when not inside LINE app) */}
        {!liffProfile && (
          <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '16px', padding: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#B45309', fontWeight: '700', fontSize: '0.88rem', marginBottom: '6px' }}>
              <Smartphone size={16} /> กำลังเปิดผ่านเบราว์เซอร์ภายนอก
            </div>
            <p style={{ fontSize: '0.8rem', color: '#78350F', margin: '0 0 8px 0', lineHeight: 1.4 }}>
              เพื่อความสะดวกสูงสุด แนะนำให้เปิดหน้านี้ผ่านแอป LINE หรือระบุ LINE User ID เพื่อทดสอบ:
            </p>
            <div style={{ display: 'flex', gap: '6px' }}>
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
                style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '0.82rem', backgroundColor: '#D97706', borderColor: '#D97706' }}
              >
                ตรวจสอบ
              </button>
            </div>
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

        {/* CASE 2: ALREADY LINKED (PARENT WITH CHILDREN) */}
        {!linkedUser && linkedPatients.length > 0 && (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#059669', marginBottom: '1rem' }}>
              <Heart size={22} color="#059669" fill="#05966920" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: '700', margin: 0 }}>
                พอร์ทัลผู้ปกครอง บ้านฮักดี 🤎
              </h2>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '0 0 1rem 0' }}>
              ท่านได้ผูกบัญชี LINE กับข้อมูลผู้รับบริการในระบบแล้ว ({linkedPatients.length} คน):
            </p>

            {/* Multi-Child Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.25rem' }}>
              {linkedPatients.map(child => {
                const isSelected = activeChildHn === child.hn;
                return (
                  <div
                    key={child.hn}
                    onClick={() => setActiveChildHn(child.hn)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: '14px',
                      border: isSelected ? '2px solid #059669' : '1px solid #E2E8F0',
                      backgroundColor: isSelected ? '#F0FDF4' : '#F8FAFC',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: isSelected ? '#DCFCE7' : '#E2E8F0', color: isSelected ? '#15803D' : '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                        👶
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#0F172A' }}>
                          น้อง{child.nickname || child.name} ({child.name})
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                          HN: {child.hn} • ผู้ปกครอง: {child.parent_name || '-'}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check size={18} color="#059669" />}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleClose}
                className="btn btn-primary"
                style={{ flex: 1, padding: '12px', borderRadius: '12px', fontWeight: '700', backgroundColor: '#059669', borderColor: '#059669' }}
              >
                ดูข้อมูลน้องใน LINE ➔
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

        {/* CASE 3: NOT YET LINKED (FORM TO LINK AS PARENT OR STAFF) */}
        {!linkedUser && linkedPatients.length === 0 && (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0' }}>
            
            {/* Tabs */}
            <div style={{ display: 'flex', borderRadius: '12px', backgroundColor: '#F1F5F9', padding: '4px', marginBottom: '1.5rem' }}>
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
