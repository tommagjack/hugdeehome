import { useState, useEffect, useMemo } from 'react';
import { 
  Link as LinkIcon, QrCode, Copy, ExternalLink, RefreshCw, 
  Check, Save, Plus, Trash2, ArrowRight, Sparkles, Smartphone,
  DollarSign, Receipt, Calendar, Heart, Shield, Activity, Share2, Download
} from 'lucide-react';
import Swal from 'sweetalert2';

export default function LiffLinkManager({ clinicInfo, setClinicInfo, onNavigateToServicesEditor }) {
  const liffId = clinicInfo?.liffId || '2008270606-7bkwSGyt';
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://hugdeehome.vercel.app';

  // State: Dynamic Links List
  const [links, setLinks] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [savingAlias, setSavingAlias] = useState(null);

  // State: Deep Link & QR Code Builder
  const [builderModule, setBuilderModule] = useState('line-link');
  const [customPath, setCustomPath] = useState('');
  const [paramHn, setParamHn] = useState('');
  const [paramEmpId, setParamEmpId] = useState('');
  const [paramSource, setParamSource] = useState('line_chat');
  const [selectedAlias, setSelectedAlias] = useState('staff-finance');

  // State: Add New Dynamic Link Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAlias, setNewAlias] = useState('');
  const [newTarget, setNewTarget] = useState('/#services');
  const [newCategory, setNewCategory] = useState('general');
  const [newRoles, setNewRoles] = useState('all');

  // 1. Fetch Dynamic Links from LocalStorage + API
  const fetchLinks = async () => {
    setLoadingLinks(true);
    // A. Instant cache prefill from localStorage
    try {
      const cached = localStorage.getItem('hdh_dynamic_links');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLinks(parsed);
        }
      }
    } catch (e) {}

    // B. Fetch authoritative list from server / Supabase
    try {
      const res = await fetch('/api/link?action=list');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.links) && data.links.length > 0) {
          setLinks(data.links);
          try {
            localStorage.setItem('hdh_dynamic_links', JSON.stringify(data.links));
          } catch (e) {}
        }
      } else {
        // Fallback to static JSON if offline
        const staticRes = await fetch('/dynamic_links.json');
        if (staticRes.ok) {
          const staticData = await staticRes.json();
          if (Array.isArray(staticData.links)) {
            setLinks(staticData.links);
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch dynamic links from server:', err);
    } finally {
      setLoadingLinks(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  // 2. Quick Switch Destination Handler
  const handleUpdateTarget = async (linkId, targetUrl, linkTitle) => {
    setSavingAlias(linkId);
    const updatedList = links.map(l => l.id === linkId ? { ...l, targetUrl, updatedAt: new Date().toISOString() } : l);
    setLinks(updatedList);
    try {
      localStorage.setItem('hdh_dynamic_links', JSON.stringify(updatedList));
      window.dispatchEvent(new CustomEvent('hdh_dynamic_links_updated', { detail: updatedList }));
    } catch (e) {}
    if (typeof setClinicInfo === 'function') {
      setClinicInfo(prev => ({ ...prev, dynamicLinks: updatedList }));
    }

    try {
      const res = await fetch('/api/link?action=update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: linkId, targetUrl })
      });
      const data = await res.json();

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'สลับปลายทางสำเร็จ! ⚡',
          html: `ปรับเปลี่ยนปลายทางของ <b>"${linkTitle}"</b> เป็น <code>${targetUrl}</code> เรียบร้อยแล้วค่ะ<br><span style="font-size: 0.85rem; color: #059669;">ผู้ใช้งานที่กดผ่าน LINE หรือลิงก์ย่อจะเปิดหน้าใหม่ทันทีโดยไม่ต้อง Deploy LINE Rich Menu ใหม่</span>`,
          timer: 2800,
          showConfirmButton: false
        });
      } else {
        throw new Error(data.error || 'Failed to update');
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.message });
    } finally {
      setSavingAlias(null);
    }
  };

  // 3. Add New Custom Dynamic Link
  const handleAddNewLink = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAlias.trim() || !newTarget.trim()) {
      Swal.fire({ icon: 'warning', title: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
      return;
    }

    const cleanAlias = newAlias.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    if (links.some(l => l.alias === cleanAlias || l.id === cleanAlias)) {
      Swal.fire({ icon: 'warning', title: 'ชื่อ Alias นี้มีอยู่ในระบบแล้ว', text: 'กรุณาตั้งชื่อ Alias อื่น เช่น staff-portal-2' });
      return;
    }

    const newLinkObj = {
      id: cleanAlias,
      alias: cleanAlias,
      title: newTitle.trim(),
      category: newCategory,
      description: `ลิงก์แบบย่อสำหรับ ${newTitle.trim()}`,
      targetUrl: newTarget.trim(),
      allowedRoles: newRoles === 'all' ? ['all'] : [newRoles],
      presetOptions: [
        { label: `ปลายทางเริ่มต้น (${newTarget.trim()})`, url: newTarget.trim() }
      ],
      clickCount: 0,
      updatedAt: new Date().toISOString()
    };

    const updatedList = [newLinkObj, ...links];
    setLinks(updatedList);
    try {
      localStorage.setItem('hdh_dynamic_links', JSON.stringify(updatedList));
      window.dispatchEvent(new CustomEvent('hdh_dynamic_links_updated', { detail: updatedList }));
    } catch (e) {}
    if (typeof setClinicInfo === 'function') {
      setClinicInfo(prev => ({ ...prev, dynamicLinks: updatedList }));
    }

    setShowAddModal(false);
    setNewTitle('');
    setNewAlias('');
    setNewTarget('/#services');

    try {
      await fetch('/api/link?action=save-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links: updatedList })
      });
      Swal.fire({ 
        icon: 'success', 
        title: 'สร้างและบันทึกลิงก์สำเร็จ! 🎉', 
        html: `สร้างลิงก์ <code>alias:${cleanAlias}</code> เรียบร้อยแล้ว<br><span style="font-size: 0.85rem; color: #059669;">สามารถนำไปใส่ในปุ่ม Rich Menu หรือสร้างเป็น QR Code ได้ทันที</span>`,
        timer: 2500, 
        showConfirmButton: false 
      });
    } catch (err) {
      console.warn('API save-all warning:', err);
    }
  };

  // 4. Delete Dynamic Link
  const handleDeleteLink = async (linkId, title) => {
    const confirm = await Swal.fire({
      title: 'ยืนยันการลบลิงก์?',
      text: `ต้องการลบลิงก์ "${title}" หรือไม่? หากมีปุ่มบน LINE ชี้มาที่ลิงก์นี้ ปุ่มจะใช้งานไม่ได้`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบลิงก์',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#DC2626'
    });
    if (!confirm.isConfirmed) return;

    const filtered = links.filter(l => l.id !== linkId);
    setLinks(filtered);
    try {
      localStorage.setItem('hdh_dynamic_links', JSON.stringify(filtered));
      window.dispatchEvent(new CustomEvent('hdh_dynamic_links_updated', { detail: filtered }));
    } catch (e) {}
    if (typeof setClinicInfo === 'function') {
      setClinicInfo(prev => ({ ...prev, dynamicLinks: filtered }));
    }

    try {
      await fetch('/api/link?action=save-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links: filtered })
      });
      Swal.fire({ icon: 'success', title: 'ลบเรียบร้อยแล้ว', timer: 1200, showConfirmButton: false });
    } catch (err) {
      console.warn('API save-all delete warning:', err);
    }
  };

  // 5. Copy helper
  const copyText = (text, label) => {
    navigator.clipboard.writeText(text);
    Swal.fire({
      icon: 'success',
      title: 'คัดลอกแล้ว',
      text: `คัดลอก ${label} เรียบร้อยแล้วค่ะ`,
      timer: 1500,
      showConfirmButton: false
    });
  };

  // 6. Deep Link & QR Code Output Calculations
  const generatedLinks = useMemo(() => {
    let liffTarget = `https://liff.line.me/${liffId}`;
    let directTarget = `${appOrigin}/#`;
    let queryParams = [];

    if (paramSource) queryParams.push(`utm_source=${encodeURIComponent(paramSource)}`);

    if (builderModule === 'line-link') {
      liffTarget += '?action=line-link';
      directTarget += '/line-link';
    } else if (builderModule === 'parent-profile') {
      liffTarget += '?action=parent-profile';
      directTarget += '/line-link?tab=profile';
      if (paramHn) queryParams.push(`hn=${encodeURIComponent(paramHn)}`);
    } else if (builderModule === 'parent-appointments') {
      liffTarget += '?action=parent-appointments';
      directTarget += '/line-link?tab=appointments';
      if (paramHn) queryParams.push(`hn=${encodeURIComponent(paramHn)}`);
    } else if (builderModule === 'parent-itp') {
      liffTarget += '?action=parent-itp';
      directTarget += '/line-link?tab=itp';
      if (paramHn) queryParams.push(`hn=${encodeURIComponent(paramHn)}`);
    } else if (builderModule === 'parent-homeprogram') {
      liffTarget += '?action=parent-homeprogram';
      directTarget += '/line-link?tab=homeprogram';
    } else if (builderModule === 'parent-courses') {
      liffTarget += '?action=parent-courses';
      directTarget += '/line-link?tab=courses';
    } else if (builderModule === 'register-patient') {
      liffTarget += '?action=register-patient';
      directTarget += '/register-patient';
    } else if (builderModule === 'checkin') {
      liffTarget += '?action=checkin';
      directTarget += '/checkin';
      if (paramEmpId) queryParams.push(`emp=${encodeURIComponent(paramEmpId)}`);
    } else if (builderModule === 'salary') {
      liffTarget = `${appOrigin}/#salary`;
      directTarget += '/salary';
      if (paramEmpId) queryParams.push(`emp=${encodeURIComponent(paramEmpId)}`);
    } else if (builderModule === 'receipts') {
      liffTarget = `${appOrigin}/#receipts`;
      directTarget += '/receipts';
    } else if (builderModule === 'services') {
      liffTarget += '?action=services';
      directTarget += '/services';
    } else if (builderModule === 'dynamic-alias') {
      liffTarget = `${appOrigin}/api/link?alias=${selectedAlias}`;
      directTarget = `${appOrigin}/api/link?alias=${selectedAlias}`;
    } else if (builderModule === 'custom') {
      const cleanCustom = customPath.startsWith('/') ? customPath : `/${customPath}`;
      liffTarget = `${appOrigin}${cleanCustom}`;
      directTarget = `${appOrigin}${cleanCustom}`;
    }

    if (queryParams.length > 0 && builderModule !== 'dynamic-alias') {
      const sep = liffTarget.includes('?') ? '&' : '?';
      liffTarget += sep + queryParams.join('&');
      const directSep = directTarget.includes('?') ? '&' : '?';
      directTarget += directSep + queryParams.join('&');
    }

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(liffTarget)}`;

    const chatTemplate = `สวัสดีค่ะคุณพ่อคุณแม่/คุณครู ทางคลินิกกิจกรรมบำบัดบ้านฮักดีส่งลิงก์สำหรับเข้าใช้งานระบบมาให้ค่ะ 🤎\nสามารถกดลิงก์ด้านล่างนี้ได้เลยนะคะ:\n🔗 ${liffTarget}`;

    return { liffTarget, directTarget, qrUrl, chatTemplate };
  }, [builderModule, customPath, paramHn, paramEmpId, paramSource, selectedAlias, liffId, appOrigin]);

  // 7. Download QR Code helper
  const handleDownloadQr = async () => {
    try {
      const res = await fetch(generatedLinks.qrUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HDH_QRCode_${builderModule}_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      window.open(generatedLinks.qrUrl, '_blank');
    }
  };

  // 8. Total clicks
  const totalClicks = useMemo(() => {
    return links.reduce((sum, l) => sum + (l.clickCount || 0), 0);
  }, [links]);

  return (
    <div className="fade-in" style={{ paddingBottom: '3rem' }}>
      
      {/* Overview Statistics Banner */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '20px',
        padding: '1.5rem',
        border: '1px solid #E2E8F0',
        boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
        marginBottom: '1.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: '#EDE9FE', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LinkIcon size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: '#1E1B4B' }}>
              ศูนย์กลางจัดการ Link URL & LIFF Portal Hub
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#64748B' }}>
              ควบคุมการกระจายลิงก์ สลับปลายทางปุ่มเมนูด่วนแบบ Real-time และสร้าง QR Code สำหรับบริการคลินิก
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ padding: '8px 16px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '600' }}>จำนวนลิงก์ Dynamic</div>
            <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#7C3AED' }}>{links.length} รายการ</div>
          </div>
          <div style={{ padding: '8px 16px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '600' }}>ยอดคลิกสะสมทั้งหมด</div>
            <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#059669' }}>{totalClicks} ครั้ง</div>
          </div>
          <button
            onClick={fetchLinks}
            className="btn btn-light"
            style={{ padding: '10px 14px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw size={16} className={loadingLinks ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* SECTION 1: DYNAMIC LINK REGISTRY & DESTINATION SWITCHER */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '24px',
        padding: '1.75rem',
        border: '1px solid #E2E8F0',
        boxShadow: '0 6px 20px rgba(0,0,0,0.04)',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '9999px', backgroundColor: '#EFF6FF', color: '#2563EB', fontSize: '0.75rem', fontWeight: '700', marginBottom: '6px' }}>
              <Sparkles size={14} /> Zero-Downtime Re-routing
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, color: '#0F172A' }}>
              ⚡ รายการ Dynamic Links & สลับปลายทางด่วน (ไม่ต้อง Deploy Rich Menu ใหม่)
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748B' }}>
              ปุ่มที่ผูกกับ Alias ด้านล่างนี้ เมื่อกดสลับปลายทาง ระบบจะเปลี่ยนเส้นทางให้ผู้ใช้งานทุกคนใน LINE ทันทีใน 1 วินาที
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              fontWeight: '700',
              fontSize: '0.88rem',
              backgroundColor: '#7C3AED',
              borderColor: '#7C3AED',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Plus size={16} /> เพิ่ม Dynamic Link ใหม่
          </button>
        </div>

        {/* Links Grid Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {links.map((link) => {
            const isSaving = savingAlias === link.id;
            const fullShortUrl = `${appOrigin}/api/link?alias=${link.alias}`;
            const isStaffFinance = link.id === 'staff-finance';

            return (
              <div
                key={link.id}
                style={{
                  backgroundColor: isStaffFinance ? '#FDF4FF' : '#F8FAFC',
                  borderRadius: '16px',
                  border: isStaffFinance ? '1.5px solid #F0ABFC' : '1px solid #E2E8F0',
                  padding: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1.25rem',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Info Column */}
                <div style={{ flex: '1 1 300px', minWidth: '260px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '800', fontSize: '1rem', color: '#0F172A' }}>
                      {link.title}
                    </span>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontFamily: 'monospace',
                      fontWeight: '700',
                      backgroundColor: '#EDE9FE',
                      color: '#6D28D9'
                    }}>
                      alias:{link.alias}
                    </span>
                    {isStaffFinance && (
                      <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '700', backgroundColor: '#FCE7F3', color: '#BE185D' }}>
                        ★ ปุ่มการเงินเจ้าหน้าที่
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#64748B', lineHeight: 1.4, marginBottom: '6px' }}>
                    {link.description}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.78rem', color: '#94A3B8' }}>
                    <span>คลิก: <b style={{ color: '#059669' }}>{link.clickCount || 0} ครั้ง</b></span>
                    <span>•</span>
                    <span>สิทธิ์: <b>{(link.allowedRoles || ['all']).join(', ')}</b></span>
                  </div>
                </div>

                {/* Destination Dropdown & Quick Switch Column */}
                <div style={{ flex: '1 1 380px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                      ปลายทางปัจจุบัน: <code style={{ color: '#2563EB' }}>{link.targetUrl}</code>
                    </div>
                    <select
                      value={link.targetUrl}
                      onChange={(e) => handleUpdateTarget(link.id, e.target.value, link.title)}
                      disabled={isSaving}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '0.88rem',
                        fontWeight: '600',
                        backgroundColor: '#FFFFFF',
                        color: '#0F172A',
                        cursor: 'pointer'
                      }}
                    >
                      {/* Presets */}
                      {(link.presetOptions || []).map((preset, pIdx) => (
                        <option key={pIdx} value={preset.url}>
                          {preset.label} ({preset.url})
                        </option>
                      ))}
                      {/* Global Presets */}
                      <option value="/#salary">💵 ดูเงินเดือนและสลิปเงินเดือน (/#salary)</option>
                      <option value="/#receipts">🧾 ออกใบเสร็จรับเงิน & ตัดคอร์ส (/#receipts)</option>
                      <option value="/#checkin">📍 ลงเวลางาน GPS (/#checkin)</option>
                      <option value="/#attendance">⏱️ ประวัติการลงเวลา (/#attendance)</option>
                      <option value="/#line-link?tab=appointments">📅 พอร์ทัลนัดหมายน้อง (/#line-link)</option>
                      <option value="/#line-link?tab=itp">🧩 พัฒนาการ & แผน ITP</option>
                      <option value="/#line-link?tab=homeprogram">🏠 กิจกรรมฝึกที่บ้าน</option>
                      <option value="/#register-patient">📝 ลงทะเบียนคนไข้ใหม่ (/#register-patient)</option>
                      <option value="/#services">🌟 ข้อมูลบริการและแพ็กเกจ (/#services)</option>
                      <option value="/#dashboard">📊 แดชบอร์ดภาพรวมคลินิก (/#dashboard)</option>
                    </select>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '18px' }}>
                    <button
                      onClick={() => copyText(fullShortUrl, 'ลิงก์ย่อ Dynamic Link')}
                      className="btn btn-light"
                      style={{ padding: '9px 12px', borderRadius: '10px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      title="คัดลอกลิงก์ย่อ"
                    >
                      <Copy size={14} /> คัดลอก
                    </button>
                    <a
                      href={fullShortUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-light"
                      style={{ padding: '9px 12px', borderRadius: '10px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                      title="ทดสอบเปิดลิงก์"
                    >
                      <ExternalLink size={14} />
                    </a>
                    {(link.targetUrl?.includes('/services') || link.alias === 'clinic-services') && onNavigateToServicesEditor && (
                      <button
                        type="button"
                        onClick={onNavigateToServicesEditor}
                        className="btn btn-light"
                        style={{ padding: '9px 12px', borderRadius: '10px', fontSize: '0.8rem', backgroundColor: '#FFFBEB', color: '#B45309', border: '1px solid #FCD34D', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '700' }}
                        title="แก้ไขข้อมูลและเนื้อหาหน้าบริการนี้"
                      >
                        ✏️ แก้ไขหน้าบริการ
                      </button>
                    )}
                    {!['staff-finance', 'staff-attendance', 'parent-appointments'].includes(link.id) && (
                      <button
                        onClick={() => handleDeleteLink(link.id, link.title)}
                        className="btn btn-light"
                        style={{ padding: '9px 12px', borderRadius: '10px', fontSize: '0.8rem', color: '#DC2626' }}
                        title="ลบลิงก์"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: LIFF DEEP LINK & QR CODE GENERATOR */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '24px',
        padding: '1.75rem',
        border: '1px solid #E2E8F0',
        boxShadow: '0 6px 20px rgba(0,0,0,0.04)'
      }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '9999px', backgroundColor: '#F0FDF4', color: '#16A34A', fontSize: '0.75rem', fontWeight: '700', marginBottom: '6px' }}>
            <QrCode size={14} /> Instant Deep Link & QR Builder
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: '#0F172A' }}>
            🛠️ เครื่องมือสร้าง LIFF Deep Link & QR Code สำเร็จรูป
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: '#64748B' }}>
            สร้างลิงก์สำหรับส่งให้ผู้ปกครองในแชท LINE หรือดาวน์โหลด QR Code สำหรับพิมพ์ติดเคาน์เตอร์คลินิก
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
          
          {/* Controls Column */}
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontWeight: '700', fontSize: '0.88rem', color: '#334155', marginBottom: '6px' }}>
                1. เลือกหมวดหมู่ฟังก์ชันปลายทาง:
              </label>
              <select
                value={builderModule}
                onChange={(e) => setBuilderModule(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '0.92rem',
                  fontWeight: '600',
                  color: '#0F172A'
                }}
              >
                <optgroup label="🌟 สำหรับผู้ปกครอง & บุคคลทั่วไป">
                  <option value="line-link">🔗 เชื่อมต่อบัญชี LINE / ตรวจสิทธิ์ (LIFF Auto Profile)</option>
                  <option value="parent-profile">👶 ประวัติคนไข้ & ข้อมูลของน้อง (Parent Portal)</option>
                  <option value="parent-appointments">📅 นัดหมายของน้อง (แท็บนัดหมาย)</option>
                  <option value="parent-itp">🧩 พัฒนาการ & แผนบำบัด ITP</option>
                  <option value="parent-homeprogram">🏠 กิจกรรมฝึกที่บ้าน (Home Program)</option>
                  <option value="parent-courses">⭐ ยอดคอร์สคงเหลือ & แต้มสะสม</option>
                  <option value="register-patient">📝 ลงทะเบียนคนไข้ใหม่ (New Patient Intake)</option>
                  <option value="services">🏡 หน้าบริการและข้อมูลคลินิก</option>
                </optgroup>
                <optgroup label="💼 สำหรับเจ้าหน้าที่ / นักบำบัด">
                  <option value="checkin">📍 ลงเวลางาน GPS พนักงาน (Check-in)</option>
                  <option value="salary">💵 ดูเงินเดือนและสลิปเงินเดือน (Staff Salary)</option>
                  <option value="receipts">🧾 ออกใบเสร็จรับเงิน & ตัดคอร์ส</option>
                </optgroup>
                <optgroup label="⚡ ลิงก์ย่อ Dynamic Routing">
                  <option value="dynamic-alias">⚡ ใช้ Dynamic Alias (สลับปลายทางได้ตลอดเวลา)</option>
                  <option value="custom">🌐 กำหนด URL / Hash เอง (Custom Path)</option>
                </optgroup>
              </select>
            </div>

            {/* Sub-inputs based on selection */}
            {builderModule === 'dynamic-alias' && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '0.88rem', color: '#334155', marginBottom: '6px' }}>
                  เลือก Dynamic Link Alias ที่ต้องการ:
                </label>
                <select
                  value={selectedAlias}
                  onChange={(e) => setSelectedAlias(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '0.88rem' }}
                >
                  {links.map(l => (
                    <option key={l.id} value={l.alias}>{l.title} (alias:{l.alias})</option>
                  ))}
                </select>
              </div>
            )}

            {builderModule === 'custom' && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '0.88rem', color: '#334155', marginBottom: '6px' }}>
                  ระบุ URL หรือ Path ปลายทาง:
                </label>
                <input
                  type="text"
                  placeholder="เช่น /#opd หรือ /#attendance"
                  value={customPath}
                  onChange={(e) => setCustomPath(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '0.88rem' }}
                />
              </div>
            )}

            {/* Patient HN or Emp ID (Optional) */}
            {['parent-profile', 'parent-appointments', 'parent-itp'].includes(builderModule) && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '0.88rem', color: '#334155', marginBottom: '6px' }}>
                  เลข HN ของน้อง (Optional):
                </label>
                <input
                  type="text"
                  placeholder="เช่น 69001 (เพื่อเปิดประวัติน้องคนนี้ทันที)"
                  value={paramHn}
                  onChange={(e) => setParamHn(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '0.88rem' }}
                />
              </div>
            )}

            {['checkin', 'salary'].includes(builderModule) && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '0.88rem', color: '#334155', marginBottom: '6px' }}>
                  รหัสพนักงาน (Optional):
                </label>
                <input
                  type="text"
                  placeholder="เช่น HDH001"
                  value={paramEmpId}
                  onChange={(e) => setParamEmpId(e.target.value.toUpperCase())}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '0.88rem' }}
                />
              </div>
            )}

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontWeight: '700', fontSize: '0.88rem', color: '#334155', marginBottom: '6px' }}>
                2. ที่มาของลิงก์ / ช่องทางใช้งาน (Tracking Source):
              </label>
              <select
                value={paramSource}
                onChange={(e) => setParamSource(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '0.88rem' }}
              >
                <option value="line_chat">💬 ส่งในแชท LINE ส่วนตัว</option>
                <option value="counter_stand">🏷️ ป้ายสแตนดี้ตั้งหน้าเคาน์เตอร์คลินิก</option>
                <option value="brochure">📄 แผ่นพับ / โบรชัวร์ประชาสัมพันธ์</option>
                <option value="facebook_page">🌐 Facebook Page / โพสต์โซเชียล</option>
                <option value="general">🔗 ทั่วไป (ไม่มีแท็ก)</option>
              </select>
            </div>
          </div>

          {/* Preview & Output Column */}
          <div style={{
            backgroundColor: '#F8FAFC',
            borderRadius: '20px',
            border: '1.5px solid #E2E8F0',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#1E1B4B', marginBottom: '12px' }}>
              ภาพ QR Code ความละเอียดสูง (พร้อมสแกน)
            </div>

            {/* QR Image Box */}
            <div style={{
              backgroundColor: '#FFFFFF',
              padding: '12px',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
              marginBottom: '1rem'
            }}>
              <img 
                src={generatedLinks.qrUrl} 
                alt="QR Code" 
                style={{ width: '180px', height: '180px', display: 'block' }} 
              />
            </div>

            {/* Link Text Box */}
            <div style={{ width: '100%', marginBottom: '1rem', textAlign: 'left' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748B', marginBottom: '4px' }}>
                URL ปลายทางสำหรับแอป LINE (LIFF / Deep Link):
              </div>
              <input
                type="text"
                readOnly
                value={generatedLinks.liffTarget}
                onClick={() => copyText(generatedLinks.liffTarget, 'LIFF URL')}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.8rem',
                  fontFamily: 'monospace',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer'
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%', marginBottom: '8px' }}>
              <button
                onClick={() => copyText(generatedLinks.liffTarget, 'ลิงก์เข้าใช้งาน')}
                className="btn btn-primary"
                style={{
                  padding: '10px',
                  borderRadius: '12px',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  backgroundColor: '#7C3AED',
                  borderColor: '#7C3AED',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Copy size={15} /> คัดลอกลิงก์
              </button>

              <button
                onClick={handleDownloadQr}
                className="btn btn-success"
                style={{
                  padding: '10px',
                  borderRadius: '12px',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  backgroundColor: '#059669',
                  borderColor: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Download size={15} /> ดาวน์โหลด QR
              </button>
            </div>

            <button
              onClick={() => copyText(generatedLinks.chatTemplate, 'ข้อความส่งใน LINE Chat')}
              className="btn btn-light"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '12px',
                fontSize: '0.82rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF'
              }}
            >
              <Share2 size={15} color="#0284C7" /> คัดลอกข้อความสำหรับส่งในแชท LINE
            </button>
          </div>

        </div>
      </div>

      {/* MODAL: ADD NEW DYNAMIC LINK */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            padding: '2rem',
            maxWidth: '480px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '0 0 1rem 0', color: '#0F172A' }}>
              ✨ สร้าง Dynamic Link ใหม่
            </h3>

            <form onSubmit={handleAddNewLink}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '0.85rem', color: '#334155', marginBottom: '4px' }}>
                  ชื่อหัวข้อลิงก์:
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น สิทธิประโยชน์สมาชิกใหม่"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '0.85rem', color: '#334155', marginBottom: '4px' }}>
                  คีย์ย่อ (Alias Key - ตัวพิมพ์เล็ก):
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น promo-2026, survey-satisfaction"
                  value={newAlias}
                  onChange={(e) => setNewAlias(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '0.9rem', fontFamily: 'monospace' }}
                />
                <span style={{ fontSize: '0.75rem', color: '#64748B' }}>จะสามารถเรียกใช้ผ่าน: <code>/api/link?alias={newAlias || 'key'}</code></span>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '0.85rem', color: '#334155', marginBottom: '4px' }}>
                  ปลายทางเริ่มต้น (URL / Hash):
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น /#services, /#salary, หรือ https://..."
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', fontWeight: '700', backgroundColor: '#7C3AED', borderColor: '#7C3AED' }}
                >
                  บันทึกสร้างลิงก์
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-light"
                  style={{ padding: '12px 18px', borderRadius: '12px' }}
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
