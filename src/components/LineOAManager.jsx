import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, ShieldCheck, RefreshCw, 
  QrCode, Copy, 
  Search, Zap, CheckCircle2, UserX,
  Layers, ArrowUpRight, ShieldAlert, Sparkles, Sliders,
  Upload, Download, Maximize2, RotateCcw
} from 'lucide-react';
import Swal from 'sweetalert2';
import { SmartAvatar } from '../utils/defaultAssets';

export default function LineOAManager({ clinicInfo, users = [], patients = [], onRefreshData }) {
  const [activeTab, setActiveTab] = useState('richmenus'); // 'richmenus' | 'customizer' | 'users' | 'tools'
  const [selectedConfigMenu, setSelectedConfigMenu] = useState('guest');
  const [isDeploying, setIsDeploying] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [deployedData, setDeployedData] = useState(null);
  const [loadingDeployed, setLoadingDeployed] = useState(true);

  // Custom Images & Visual Layout State
  const fileInputRef = useRef(null);
  const [customImages, setCustomImages] = useState({});
  const [highlightedSlot, setHighlightedSlot] = useState(null);

  // Search & Filters for User Registry
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'parent' | 'staff' | 'ot' | 'admin'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive' | 'linked'

  const liffId = clinicInfo?.liffId || '2008270606-7bkwSGyt';
  const lineOaId = clinicInfo?.lineId || '@hugdeehome';
  const liffLinkUrl = liffId ? `https://liff.line.me/${liffId}?action=line-link` : `${window.location.origin}/#/line-link`;

  const DEFAULT_CONFIGS = {
    guest: [
      { slot: 1, label: 'บริการของเรา', type: 'uri', value: '?action=services' },
      { slot: 2, label: 'ลงทะเบียนคนไข้ใหม่', type: 'uri', value: '?action=register-patient' },
      { slot: 3, label: 'แผนที่คลินิก', type: 'uri', value: 'https://maps.google.com/?q=Hug+Dee+Home+Clinic' },
      { slot: 4, label: 'โทรติดต่อคลินิก', type: 'uri', value: '?action=call' },
      { slot: 5, label: 'เชื่อมต่อบัญชี / ตรวจสิทธิ์', type: 'uri', value: '?action=line-link' },
      { slot: 6, label: 'โปรโมชัน & แพ็กเกจคอร์ส', type: 'message', value: 'สนใจสอบถามแพ็กเกจคอร์สกิจกรรมบำบัดและโปรโมชันค่ะ 🤎' }
    ],
    parent: [
      { slot: 1, label: 'นัดหมายของน้อง', type: 'uri', value: '?action=parent-appointments' },
      { slot: 2, label: 'พัฒนาการ & แผน ITP', type: 'uri', value: '?action=parent-itp' },
      { slot: 3, label: 'กิจกรรมฝึกที่บ้าน', type: 'uri', value: '?action=parent-homeprogram' },
      { slot: 4, label: 'คอร์ส & ยอดคงเหลือ & แต้มสะสม', type: 'uri', value: '?action=parent-courses' },
      { slot: 5, label: 'แจ้งเลื่อนนัด / คุยกับครู', type: 'message', value: 'ขออนุญาตติดต่อเจ้าหน้าที่เรื่องวันนัดหมายของน้องค่ะ 🤎' },
      { slot: 6, label: 'โปรไฟล์น้อง / สลับบัญชี', type: 'uri', value: '?action=line-link' }
    ],
    staff: [
      { slot: 1, label: 'ลงเวลางาน GPS', type: 'uri', value: '?action=checkin' },
      { slot: 2, label: 'Check-in รับคนไข้', type: 'uri', value: '?action=reception-intake' },
      { slot: 3, label: 'ส่ง LINE เตือนนัดกลุ่ม', type: 'uri', value: '?action=batch-reminders' },
      { slot: 4, label: 'ออกใบเสร็จ & ตัดคอร์ส', type: 'uri', value: '?action=receipts' },
      { slot: 5, label: 'คนไข้ขาดการติดต่อ', type: 'uri', value: '?action=dormant-tracker' },
      { slot: 6, label: 'สลับมุมมอง (1, 3)', type: 'uri', value: '?action=menu-switch&role=staff' }
    ],
    ot: [
      { slot: 1, label: 'ลงเวลางาน GPS', type: 'uri', value: '?action=checkin' },
      { slot: 2, label: 'ตารางเคสของฉันวันนี้', type: 'uri', value: '?action=my-cases' },
      { slot: 3, label: 'บันทึกผลการฝึก (OPD)', type: 'uri', value: '?action=opd-soap' },
      { slot: 4, label: 'เป้าหมายบำบัด (ITP)', type: 'uri', value: '?action=itp-tracker' },
      { slot: 5, label: 'กิจกรรมฝึกที่บ้าน', type: 'uri', value: '?action=home-program-planner' },
      { slot: 6, label: 'สลับมุมมอง (1, 4)', type: 'uri', value: '?action=menu-switch&role=ot' }
    ],
    admin: [
      { slot: 1, label: 'แดชบอร์ดภาพรวมคลินิก', type: 'uri', value: '?action=dashboard' },
      { slot: 2, label: 'ตรวจสอบเวลาบุคลากร', type: 'uri', value: '?action=staff-attendance' },
      { slot: 3, label: 'สรุปการเงิน & Payroll', type: 'uri', value: '?action=financial-payroll' },
      { slot: 4, label: 'คนไข้ขาดการติดต่อ', type: 'uri', value: '?action=dormant-tracker' },
      { slot: 5, label: 'ควบคุม LINE & ระบบ', type: 'uri', value: '?action=line-manager' },
      { slot: 6, label: 'สลับมุมมองอิสระทุกแบบ', type: 'uri', value: '?action=menu-switch&role=admin' }
    ]
  };

  const [customConfigs, setCustomConfigs] = useState(DEFAULT_CONFIGS);

  // 5 Rich Menu Specs
  const richMenuCards = [
    {
      key: 'guest',
      number: '1',
      title: 'บุคคลทั่วไป (General Public / Guest)',
      desc: 'สำหรับผู้ติดตามใหม่ ผู้ที่ยังไม่ลงทะเบียน หรือผู้ใช้ที่มีสถานะ Inactive (ไม่แสดงแต้มสะสม)',
      alias: 'rm-guest',
      color: '#C19B6C',
      bgColor: '#FFFBEB',
      borderColor: '#FDE68A',
      isDefault: true,
      image: '/richmenu_images/richmenu_1_guest.png',
      buttons: ['บริการของเรา', 'ลงทะเบียนคนไข้ใหม่', 'แผนที่คลินิก', 'โทรติดต่อคลินิก', 'เชื่อมต่อบัญชี / ตรวจสิทธิ์', 'โปรโมชัน & แพ็กเกจคอร์ส']
    },
    {
      key: 'parent',
      number: '2',
      title: 'ผู้ปกครอง (Parent / Guardian)',
      desc: 'สำหรับผู้ปกครองที่มีประวัติการรักษาในระบบ (แสดงแต้มสะสมร่วมกับคอร์ส & ยอดคงเหลือ)',
      alias: 'rm-parent',
      color: '#059669',
      bgColor: '#ECFDF5',
      borderColor: '#A7F3D0',
      isDefault: false,
      image: '/richmenu_images/richmenu_2_parent.png',
      buttons: ['นัดหมายของน้อง', 'พัฒนาการ & แผน ITP', 'กิจกรรมฝึกที่บ้าน', 'คอร์ส ยอดคงเหลือ & แต้มสะสม', 'แจ้งเลื่อนนัด / คุยกับครู', 'โปรไฟล์น้อง / สลับบัญชี']
    },
    {
      key: 'staff',
      number: '3',
      title: 'เจ้าหน้าที่คลินิก (Staff / Receptionist)',
      desc: 'สำหรับฝ่ายต้อนรับ ธุรการ และคิดเงิน (สลับดูแบบที่ 1 และ 3 ได้)',
      alias: 'rm-staff',
      color: '#0284C7',
      bgColor: '#F0F9FF',
      borderColor: '#BAE6FD',
      isDefault: false,
      image: '/richmenu_images/richmenu_3_staff.png',
      buttons: ['ลงเวลางาน GPS', 'Check-in รับคนไข้', 'ส่ง LINE เตือนนัดกลุ่ม', 'ออกใบเสร็จ & ตัดคอร์ส', 'คนไข้ขาดการติดต่อ', 'สลับมุมมอง (1, 3)']
    },
    {
      key: 'ot',
      number: '4',
      title: 'นักกิจกรรมบำบัด (Occupational Therapist - OT)',
      desc: 'สำหรับนักบำบัดและผู้สอน (สลับดูแบบที่ 1 และ 4 ได้)',
      alias: 'rm-ot',
      color: '#EA580C',
      bgColor: '#FFF7ED',
      borderColor: '#FED7AA',
      isDefault: false,
      image: '/richmenu_images/richmenu_4_ot.png',
      buttons: ['ลงเวลางาน GPS', 'ตารางเคสวันนี้', 'บันทึกผลการฝึก (OPD)', 'เป้าหมายบำบัด (ITP)', 'จัดกิจกรรมฝึกที่บ้าน', 'สลับมุมมอง (1, 4)']
    },
    {
      key: 'admin',
      number: '5',
      title: 'ผู้ดูแลระบบ (Executive Admin)',
      desc: 'ศูนย์บัญชาการของผู้บริหาร (สลับดูได้อิสระทุกแบบ 1, 2, 3, 4, 5)',
      alias: 'rm-admin',
      color: '#7C3AED',
      bgColor: '#FAF5FF',
      borderColor: '#DDD6FE',
      isDefault: false,
      image: '/richmenu_images/richmenu_5_admin.png',
      buttons: ['แดชบอร์ดภาพรวม', 'ตรวจสอบเวลาบุคลากร', 'สรุปการเงิน & Payroll', 'คนไข้ขาดการติดต่อ', 'ควบคุม LINE & ระบบ', 'สลับมุมมองอิสระทุกแบบ']
    }
  ];

  // Fetch status and custom configs from API
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/line-richmenu?action=list');
      if (res.ok) {
        const data = await res.json();
        setDeployedData(data);
      }
    } catch (e) {
      console.warn('Could not fetch rich menu status:', e);
    } finally {
      setLoadingDeployed(false);
    }
  };

  // Safe helper to parse JSON and report server status errors cleanly
  const safeFetchJson = async (res) => {
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      if (!res.ok) {
        if (res.status === 413) {
          throw new Error('ขนาดข้อมูลภาพใหญ่เกินขีดจำกัดเซิร์ฟเวอร์ (413 Request Entity Too Large) ระบบกำลังช่วยบีบอัดภาพให้อัตโนมัติ กรุณาลองกดบันทึกใหม่อีกครั้ง');
        }
        throw new Error(`เซิร์ฟเวอร์ตอบกลับรหัส ${res.status}: ${text.slice(0, 150)}`);
      }
      throw new Error('ข้อมูลตอบกลับจากเซิร์ฟเวอร์ไม่อยู่ในรูปแบบ JSON');
    }
    if (!res.ok) {
      throw new Error(data?.error || data?.message || `เกิดข้อผิดพลาด (${res.status})`);
    }
    return data;
  };

  // Helper to ensure any custom image data URL is compressed to JPEG under 600KB before transmission
  const optimizeImageDataUrl = (dataUrl) => {
    return new Promise((resolve) => {
      if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
        return resolve(dataUrl);
      }
      if (dataUrl.startsWith('data:image/jpeg') && dataUrl.length < 850000) {
        return resolve(dataUrl);
      }
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 2500;
        canvas.height = 1686;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 2500, 1686);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, 2500, 1686);
        const compressed = canvas.toDataURL('image/jpeg', 0.82);
        resolve(compressed);
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const fetchConfig = async () => {
    const sanitizeConfig = (cfg) => {
      if (!cfg || typeof cfg !== 'object') return cfg;
      const sanitized = { ...cfg };
      Object.keys(sanitized).forEach(k => {
        if (Array.isArray(sanitized[k])) {
          sanitized[k] = sanitized[k].map(slot => {
            if (slot && typeof slot.value === 'string' && (slot.value.startsWith('tel:') || slot.value.includes('tel:'))) {
              return { ...slot, value: '?action=call' };
            }
            return slot;
          });
        }
      });
      return sanitized;
    };

    // 1. First load from localStorage for instant prefill
    try {
      const localCfg = localStorage.getItem('hdh_line_richmenu_custom_configs');
      if (localCfg) {
        const parsed = JSON.parse(localCfg);
        if (parsed && typeof parsed === 'object') setCustomConfigs(sanitizeConfig(parsed));
      }
      const localImgs = localStorage.getItem('hdh_line_richmenu_custom_images');
      if (localImgs) {
        const parsed = JSON.parse(localImgs);
        if (parsed && typeof parsed === 'object') setCustomImages(parsed);
      }
    } catch (e) {
      console.warn('LocalStorage read error:', e);
    }

    // 2. Then merge from server if available
    try {
      const res = await fetch('/api/line-richmenu?action=get-config');
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setCustomConfigs(prev => ({ ...prev, ...sanitizeConfig(data.config) }));
        }
        if (data.images && typeof data.images === 'object') {
          setCustomImages(prev => ({ ...prev, ...data.images }));
        }
      }
    } catch (e) {
      console.warn('Could not fetch custom configs:', e);
    }
  };

  useEffect(() => {
    let active = true;
    async function loadData() {
      if (active) {
        await Promise.all([fetchStatus(), fetchConfig()]);
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, []);

  // Process uploaded image with Client-Side 2500x1686 Auto-Resizer & JPEG 0.82 Compressor (under 1MB for LINE specification)
  const processImageFile = (file, menuKey) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      Swal.fire({ icon: 'warning', title: 'ไฟล์ไม่ถูกต้อง', text: 'กรุณาเลือกไฟล์รูปภาพ (PNG, JPG หรือ WEBP)' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        // Create 2500x1686 Canvas for perfect LINE Rich Menu specification
        const canvas = document.createElement('canvas');
        canvas.width = 2500;
        canvas.height = 1686;
        const ctx = canvas.getContext('2d');

        // Fill background white
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 2500, 1686);

        // Draw and scale image smoothly to fit 2500 x 1686
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, 2500, 1686);

        // LINE Messaging API Official Specification:
        // Dimensions: 2500 x 1686 px, Max File Size: 1 MB (JPEG or PNG)
        // Converting to JPEG with quality 0.82 guarantees size ~350-500 KB (crystal clear & under 1 MB)
        const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        setCustomImages(prev => {
          const next = { ...prev, [menuKey]: resizedDataUrl };
          try {
            localStorage.setItem('hdh_line_richmenu_custom_images', JSON.stringify(next));
          } catch { /* ignore quota */ }
          return next;
        });

        Swal.fire({
          icon: 'success',
          title: 'แนบรูปภาพสำเร็จ! 🖼️',
          html: `ระบบได้ปรับขนาดภาพเป็น <strong>2,500 x 1,686 px</strong> และบีบอัดขนาดไฟล์ตามมาตรฐาน LINE (< 1 MB) อัตโนมัติแล้วค่ะ<br><span style="font-size: 0.85rem; color: #64748B;">สามารถตรวจดูผัง 6 ช่องด้านล่าง และกดบันทึกการตั้งค่าเพื่อนำไปใช้งาน</span>`,
          timer: 2400,
          showConfirmButton: false
        });
      };
      img.onerror = () => {
        Swal.fire({ icon: 'error', title: 'ไม่สามารถเปิดรูปภาพได้', text: 'เกิดข้อผิดพลาดในการประมวลผลไฟล์ภาพ' });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file, selectedConfigMenu);
    }
    e.target.value = '';
  };

  const handleResetImage = (menuKey) => {
    Swal.fire({
      title: 'คืนค่ารูปภาพมาตรฐาน?',
      text: `ต้องการยกเลิกภาพที่แนบ และกลับไปใช้รูปภาพทางการของคลินิกสำหรับแบบนี้`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'คืนค่าภาพมาตรฐาน',
      cancelButtonText: 'ยกเลิก'
    }).then(res => {
      if (res.isConfirmed) {
        setCustomImages(prev => {
          const next = { ...prev };
          next[menuKey] = 'default';
          return next;
        });
        Swal.fire({ icon: 'success', title: 'คืนค่าภาพมาตรฐานสำเร็จ', timer: 1200, showConfirmButton: false });
      }
    });
  };

  const scrollToSlot = (index) => {
    setHighlightedSlot(index);
    const el = document.getElementById(`slot-card-${index}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setTimeout(() => {
      setHighlightedSlot(null);
    }, 2200);
  };

  // Update slot field
  const handleSlotChange = (menuKey, slotIndex, field, value) => {
    setCustomConfigs(prev => {
      const currentList = prev[menuKey] ? [...prev[menuKey]] : [...(DEFAULT_CONFIGS[menuKey] || [])];
      if (!currentList[slotIndex]) {
        currentList[slotIndex] = { slot: slotIndex + 1, label: '', type: 'uri', value: '' };
      }
      currentList[slotIndex] = { ...currentList[slotIndex], [field]: value };
      return {
        ...prev,
        [menuKey]: currentList
      };
    });
  };

  // Reset to default
  const handleResetConfig = (menuKey) => {
    Swal.fire({
      title: 'ยืนยันการคืนค่าเริ่มต้น?',
      text: `คืนค่าปุ่มกดของเมนู ${menuKey.toUpperCase()} กลับเป็นค่าเริ่มต้นของระบบ`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'คืนค่าเริ่มต้น',
      cancelButtonText: 'ยกเลิก'
    }).then(res => {
      if (res.isConfirmed) {
        setCustomConfigs(prev => ({
          ...prev,
          [menuKey]: [...DEFAULT_CONFIGS[menuKey]]
        }));
        Swal.fire({ icon: 'success', title: 'คืนค่าสำเร็จ', timer: 1200, showConfirmButton: false });
      }
    });
  };

  // Save config to backend
  const handleSaveConfig = async (shouldDeploy = false) => {
    setIsSavingConfig(true);
    try {
      // 1. Optimize any uploaded images so each image is guaranteed < 500 KB
      const optimizedImages = {};
      for (const [key, val] of Object.entries(customImages)) {
        if (val && typeof val === 'string' && val.startsWith('data:image')) {
          optimizedImages[key] = await optimizeImageDataUrl(val);
        } else {
          optimizedImages[key] = val;
        }
      }
      setCustomImages(optimizedImages);

      // 2. Persist to localStorage immediately
      try {
        localStorage.setItem('hdh_line_richmenu_custom_configs', JSON.stringify(customConfigs));
        localStorage.setItem('hdh_line_richmenu_custom_images', JSON.stringify(optimizedImages));
      } catch (storageErr) {
        console.warn('LocalStorage save failed:', storageErr);
      }

      // 3. Send to backend
      const res = await fetch('/api/line-richmenu?action=save-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          config: customConfigs,
          images: optimizedImages
        })
      });
      await safeFetchJson(res);

      if (shouldDeploy) {
        await handleDeployAll(optimizedImages);
      } else {
        Swal.fire({
          icon: 'success',
          title: 'บันทึกการตั้งค่าสำเร็จ! 💾',
          text: 'บันทึกการปรับแต่งปุ่มเมนูและรูปภาพเรียบร้อยแล้ว หากต้องการให้มีผลบน LINE ทันที ให้กดปุ่ม Deploy',
          timer: 2200,
          showConfirmButton: false
        });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.message });
    } finally {
      setIsSavingConfig(false);
    }
  };

  // 1. One-Click Deploy All 5 Menus
  const handleDeployAll = async (overrideImages = null) => {
    const result = await Swal.fire({
      title: 'ยืนยันการ Deploy Rich Menu?',
      html: `ระบบจะดำเนินการ:
      <ul style="text-align: left; font-size: 0.88rem; margin-top: 8px;">
        <li>สร้าง Rich Menu 5 รูปแบบ บน LINE Official Account</li>
        <li>อัปโหลดภาพกราฟิกความละเอียดสูง (2500x1686 px)</li>
        <li>ตั้งค่า Aliases (rm-guest, rm-parent, rm-staff, rm-ot, rm-admin)</li>
        <li>ตั้งค่า Rich Menu แบบที่ 1 เป็นค่าเริ่มต้นสำหรับผู้ใช้ทุกคน</li>
      </ul>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '🚀 เริ่ม Deploy ทันที',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#7C3AED'
    });

    if (!result.isConfirmed) return;

    setIsDeploying(true);
    try {
      const imagesToSend = overrideImages || customImages;
      const res = await fetch('/api/line-richmenu?action=deploy-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: customConfigs,
          images: imagesToSend
        })
      });
      const data = await safeFetchJson(res);

      await fetchStatus();
      Swal.fire({
        icon: 'success',
        title: 'Deploy สำเร็จเรียบร้อย! 🎉',
        html: data.message || 'ติดตั้ง Rich Menu ทั้ง 5 รูปแบบขึ้นสู่ LINE Server เรียบร้อยแล้วค่ะ<br>ผู้ติดตามทุกคนจะเริ่มเห็น Rich Menu แบบใหม่ทันที',
        confirmButtonColor: '#059669'
      });
    } catch (err) {
      console.error('Deploy error:', err);
      Swal.fire({ icon: 'error', title: 'การ Deploy ขัดข้อง', text: err.message });
    } finally {
      setIsDeploying(false);
    }
  };

  // 2. Batch Sync All Users
  const handleSyncAllUsers = async () => {
    const result = await Swal.fire({
      title: 'ซิงค์สิทธิ์และตัดสิทธิ์ Inactive?',
      text: 'ระบบจะตรวจสอบผู้ใช้ทุกคนในฐานข้อมูล: ผู้ใช้ที่เป็น Active จะได้รับ Rich Menu ตรงตามสิทธิ์ ส่วนผู้ใช้ที่มีสถานะ Inactive จะถูกตัดสิทธิ์กลับเป็นบุคคลทั่วไปทันที',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'เริ่มซิงค์ทันที',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#2563EB'
    });

    if (!result.isConfirmed) return;

    setIsSyncingAll(true);
    try {
      const res = await fetch('/api/line-richmenu?action=sync-all-users', { method: 'POST' });
      const data = await safeFetchJson(res);

      Swal.fire({
        icon: 'success',
        title: 'ซิงค์สำเร็จ! 🌟',
        text: data.message || 'ซิงค์สิทธิ์ผู้ใช้งานทั้งหมดเรียบร้อยแล้ว'
      });
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Sync error:', err);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.message });
    } finally {
      setIsSyncingAll(false);
    }
  };

  // 3. Force Switch Rich Menu for a Specific User
  const handleForceSwitchUser = async (userRecord, targetRole) => {
    if (!userRecord.lineUserId) {
      Swal.fire({ icon: 'warning', title: 'ยังไม่ผูก LINE UID', text: 'ผู้ใช้งานท่านนี้ยังไม่ได้ผูกบัญชี LINE OA' });
      return;
    }

    try {
      const res = await fetch('/api/line-richmenu?action=link-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineUserId: userRecord.lineUserId,
          role: targetRole,
          status: userRecord.status
        })
      });

      await safeFetchJson(res);
      Swal.fire({
        icon: 'success',
        title: 'ปรับเปลี่ยนสำเร็จ',
        text: `เปลี่ยน Rich Menu ของคุณ ${userRecord.name} เป็น "${targetRole.toUpperCase()}" เรียบร้อยแล้ว`,
        timer: 1800,
        showConfirmButton: false
      });
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: e.message });
    }
  };

  // 4. Combined User Registry (Staff + Patients)
  const combinedUserRegistry = useMemo(() => {
    const list = [];
    const safeUsers = Array.isArray(users) ? users.filter(Boolean) : [];
    const safePatients = Array.isArray(patients) ? patients.filter(Boolean) : [];

    // Add Staff / OT / Admin
    safeUsers.forEach((u, idx) => {
      let r = (u.role || 'staff').toLowerCase();
      let labelRole = u.role === 'Admin' ? 'ผู้บริหาร' : (u.role === 'OT' ? 'นักกิจกรรมบำบัด' : 'เจ้าหน้าที่');
      
      let lineUid = u.lineUserId || null;
      if (!lineUid && u.avatar_file) {
        if (typeof u.avatar_file === 'object' && u.avatar_file !== null) {
          lineUid = u.avatar_file.line_user_id || null;
        } else if (typeof u.avatar_file === 'string' && u.avatar_file.includes('U')) {
          try {
            lineUid = JSON.parse(u.avatar_file)?.line_user_id || null;
          } catch {
            lineUid = null;
          }
        }
      }

      list.push({
        id: `user_${u.id || u.employeeId || u.username || idx}`,
        sourceType: 'user',
        name: u.fullname || u.name || u.username || 'เจ้าหน้าที่',
        code: u.employeeId || '-',
        role: r,
        roleLabel: labelRole,
        phone: u.phone || '-',
        status: u.status || 'Active',
        lineUserId: lineUid,
        avatarUrl: u.avatarUrl || null
      });
    });

    // Add Patients (Parents)
    safePatients.forEach((p, idx) => {
      list.push({
        id: `patient_${p.hn || idx}`,
        sourceType: 'patient',
        name: `ผู้ปกครองน้อง${p.nickname || p.name || 'ผู้รับบริการ'} (${p.parentName || p.parent_name || 'ไม่ระบุชื่อ'})`,
        code: p.hn ? `HN ${p.hn}` : '-',
        role: 'parent',
        roleLabel: 'ผู้ปกครอง',
        phone: p.phone || '-',
        status: p.status || 'Active',
        lineUserId: p.lineUserId || p.line_user_id || null,
        avatarUrl: null
      });
    });

    return list;
  }, [users, patients]);

  // Filtered User Registry
  const filteredUsers = useMemo(() => {
    return combinedUserRegistry.filter(u => {
      // Role filter
      if (roleFilter !== 'all') {
        if (roleFilter === 'parent' && u.role !== 'parent') return false;
        if (roleFilter === 'staff' && u.role !== 'staff') return false;
        if (roleFilter === 'ot' && u.role !== 'ot') return false;
        if (roleFilter === 'admin' && u.role !== 'admin') return false;
      }
      // Status filter
      if (statusFilter === 'active' && u.status?.toLowerCase() === 'inactive') return false;
      if (statusFilter === 'inactive' && u.status?.toLowerCase() !== 'inactive') return false;
      if (statusFilter === 'linked' && !u.lineUserId) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = u.name?.toLowerCase().includes(q);
        const matchCode = u.code?.toLowerCase().includes(q);
        const matchPhone = u.phone?.toLowerCase().includes(q);
        const matchUid = u.lineUserId?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchPhone && !matchUid) return false;
      }

      return true;
    });
  }, [combinedUserRegistry, roleFilter, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = combinedUserRegistry.length;
    const linked = combinedUserRegistry.filter(u => !!u.lineUserId).length;
    const parentsLinked = combinedUserRegistry.filter(u => u.role === 'parent' && !!u.lineUserId).length;
    const staffLinked = combinedUserRegistry.filter(u => u.role !== 'parent' && !!u.lineUserId).length;
    const inactiveCount = combinedUserRegistry.filter(u => u.status?.toLowerCase() === 'inactive').length;
    return { total, linked, parentsLinked, staffLinked, inactiveCount };
  }, [combinedUserRegistry]);

  // Copy helper
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    Swal.fire({
      icon: 'success',
      title: 'คัดลอกแล้ว',
      text: `คัดลอก ${label} เรียบร้อยแล้วค่ะ`,
      timer: 1500,
      showConfirmButton: false
    });
  };

  return (
    <div className="fade-in" style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Top Banner Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)',
        borderRadius: '24px',
        padding: '2rem',
        color: '#FFFFFF',
        marginBottom: '1.75rem',
        boxShadow: '0 10px 30px rgba(49, 46, 129, 0.25)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '9999px', backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', fontSize: '0.82rem', fontWeight: '700', marginBottom: '10px' }}>
              <Sparkles size={16} color="#FDE047" /> ระบบบริหารจัดการ LINE Official Account & Dynamic Rich Menu
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: '800', margin: '0 0 0.5rem 0', letterSpacing: '0.3px' }}>
              จัดการ LINE OA คลินิกฮักดีโฮม 💬
            </h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '0.95rem', maxWidth: '750px', lineHeight: 1.5 }}>
              ควบคุมการแสดงผล Rich Menu 5 รูปแบบ (บุคคลทั่วไป, ผู้ปกครอง, เจ้าหน้าที่, นักบำบัด, ผู้บริหาร) ตรวจสอบการผูก LINE UID และตัดสิทธิ์ Inactive อัตโนมัติ
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={handleDeployAll}
              disabled={isDeploying}
              className="btn"
              style={{
                backgroundColor: '#10B981',
                color: '#FFFFFF',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '14px',
                fontWeight: '700',
                fontSize: '0.92rem',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Zap size={18} />
              {isDeploying ? 'กำลัง Deploy...' : '🚀 Deploy 5 Rich Menus'}
            </button>

            <button
              onClick={handleSyncAllUsers}
              disabled={isSyncingAll}
              className="btn"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                border: '1.5px solid rgba(255, 255, 255, 0.4)',
                padding: '12px 18px',
                borderRadius: '14px',
                fontWeight: '700',
                fontSize: '0.92rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backdropFilter: 'blur(10px)'
              }}
            >
              <RefreshCw size={18} className={isSyncingAll ? 'spin' : ''} />
              {isSyncingAll ? 'กำลังซิงค์...' : '🔄 ซิงค์สิทธิ์ทุกคน'}
            </button>
          </div>
        </div>
      </div>

      {/* 4 Overview Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '1.25rem', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748B' }}>สถานะ LINE OA บอท</span>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10B981', boxShadow: '0 0 10px #10B981' }} />
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0F172A' }}>{lineOaId}</div>
          <div style={{ fontSize: '0.78rem', color: '#10B981', fontWeight: '600', marginTop: '4px' }}>
            ✓ พร้อมใช้งาน (Token Active)
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '1.25rem', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748B' }}>ผูก LINE UID แล้ว</span>
            <Users size={18} color="#0284C7" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0284C7' }}>
            {stats.linked} <span style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: '500' }}>/ {stats.total} รายการ</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
            คิดเป็น {Math.round((stats.linked / (stats.total || 1)) * 100)}% ของฐานข้อมูล
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '1.25rem', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748B' }}>ผู้ปกครองที่ผูกแล้ว</span>
            <span style={{ fontSize: '1.2rem' }}>👶</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#059669' }}>
            {stats.parentsLinked} <span style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: '500' }}>ครอบครัว</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#059669', marginTop: '4px' }}>
            รับการแจ้งเตือนนัด & ดูผล ITP ได้ทันที
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '1.25rem', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748B' }}>เจ้าหน้าที่ / นักบำบัด</span>
            <ShieldCheck size={18} color="#7C3AED" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#7C3AED' }}>
            {stats.staffLinked} <span style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: '500' }}>คน</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#7C3AED', marginTop: '4px' }}>
            พร้อมสลับมุมมอง 3-5 ระดับ
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid #E2E8F0', marginBottom: '1.5rem', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('richmenus')}
          style={{
            padding: '12px 20px',
            border: 'none',
            borderBottom: activeTab === 'richmenus' ? '3px solid #7C3AED' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'richmenus' ? '#7C3AED' : '#64748B',
            fontWeight: '700',
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Layers size={18} /> แผงผัง Rich Menu ทั้ง 5 รูปแบบ
        </button>

        <button
          onClick={() => setActiveTab('customizer')}
          style={{
            padding: '12px 20px',
            border: 'none',
            borderBottom: activeTab === 'customizer' ? '3px solid #7C3AED' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'customizer' ? '#7C3AED' : '#64748B',
            fontWeight: '700',
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Sliders size={18} /> ปรับแต่งปุ่มกดเมนู (Menu Customizer)
        </button>

        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '12px 20px',
            border: 'none',
            borderBottom: activeTab === 'users' ? '3px solid #7C3AED' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'users' ? '#7C3AED' : '#64748B',
            fontWeight: '700',
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Users size={18} /> ทะเบียนผู้ใช้งาน LINE & จัดการสิทธิ์ ({filteredUsers.length})
        </button>

        <button
          onClick={() => setActiveTab('tools')}
          style={{
            padding: '12px 20px',
            border: 'none',
            borderBottom: activeTab === 'tools' ? '3px solid #7C3AED' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'tools' ? '#7C3AED' : '#64748B',
            fontWeight: '700',
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <QrCode size={18} /> ลิงก์เชื่อมต่อ & QR Code ให้ผู้ปกครอง
        </button>
      </div>

      {/* TAB 1: 5 RICH MENU CARDS */}
      {activeTab === 'richmenus' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0, color: '#0F172A' }}>
                โครงสร้าง Rich Menu แบบ Dynamic Role-Based (5 ระดับ)
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '4px 0 0 0' }}>
                ขนาดภาพ 2500 x 1686 px (ตาราง 6 ช่อง: 3x2) พร้อมพิกัดสัมผัสและ Alias ในตัว สามารถกำหนดปุ่มได้อิสระ
              </p>
            </div>

            <div style={{ fontSize: '0.85rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: deployedData?.richmenus?.length >= 5 ? '#10B981' : '#F59E0B' }} />
              สถานะบน LINE Server: <strong>{loadingDeployed ? 'กำลังตรวจสอบ...' : `${deployedData?.richmenus?.length || 0} เมนูติดตั้งแล้ว`}</strong>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.25rem' }}>
            {richMenuCards.map(menu => {
              const activeButtons = (customConfigs?.[menu.key] || DEFAULT_CONFIGS[menu.key] || []).map(s => s.label) || menu.buttons;
              const isCustomImg = !!(customImages[menu.key] && customImages[menu.key] !== 'default');
              const displayImg = isCustomImg ? customImages[menu.key] : menu.image;

              return (
                <div 
                  key={menu.key} 
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '20px',
                    border: `2px solid ${menu.borderColor}`,
                    overflow: 'hidden',
                    boxShadow: '0 6px 18px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  {/* Image Preview */}
                  <div style={{ position: 'relative', width: '100%', height: '220px', backgroundColor: '#F1F5F9', borderBottom: '1px solid #E2E8F0' }}>
                    <img 
                      src={displayImg} 
                      alt={menu.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      backgroundColor: menu.color,
                      color: '#FFFFFF',
                      padding: '4px 12px',
                      borderRadius: '9999px',
                      fontSize: '0.78rem',
                      fontWeight: '800',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                    }}>
                      แบบที่ {menu.number}
                    </div>

                    <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '6px' }}>
                      {isCustomImg && (
                        <div style={{
                          backgroundColor: '#F59E0B',
                          color: '#FFFFFF',
                          padding: '4px 10px',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                        }}>
                          ✨ ภาพกำหนดเอง
                        </div>
                      )}
                      {menu.isDefault && (
                        <div style={{
                          backgroundColor: '#10B981',
                          color: '#FFFFFF',
                          padding: '4px 12px',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                        }}>
                          ⭐ ค่าเริ่มต้น
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: menu.color, margin: 0 }}>
                        {menu.title}
                      </h3>
                    </div>

                    <p style={{ fontSize: '0.82rem', color: '#64748B', lineHeight: 1.4, margin: '0 0 1rem 0' }}>
                      {menu.desc}
                    </p>

                    <div style={{ backgroundColor: menu.bgColor, borderRadius: '12px', padding: '10px 12px', marginBottom: '1rem', border: `1px solid ${menu.borderColor}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: menu.color }}>
                          🔘 6 ปุ่มฟังก์ชันหลัก:
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                          (ปรับแต่งได้)
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px', fontSize: '0.78rem', color: '#334155' }}>
                        {activeButtons.map((b, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ color: menu.color, fontWeight: '700' }}>{i + 1}.</span> {b}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#64748B', borderTop: '1px solid #F1F5F9', paddingTop: '10px', gap: '8px' }}>
                      <button
                        onClick={() => {
                          setSelectedConfigMenu(menu.key);
                          setActiveTab('customizer');
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '10px',
                          border: `1.5px solid ${menu.color}`,
                          backgroundColor: '#FFFFFF',
                          color: menu.color,
                          fontWeight: '700',
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Sliders size={13} /> กำหนดปุ่มกด
                      </button>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>Alias: <code style={{ backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>{menu.alias}</code></span>
                        <a href={menu.image} target="_blank" rel="noreferrer" style={{ color: menu.color, fontWeight: '700', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          ดูภาพจริง <ArrowUpRight size={14} />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB: CUSTOMIZER */}
      {activeTab === 'customizer' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '1.75rem', border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: '800', color: '#7C3AED', backgroundColor: '#FAF5FF', padding: '4px 10px', borderRadius: '9999px', marginBottom: '6px' }}>
                <Sliders size={14} /> ยืดหยุ่นในการอัปเดตและปรับแต่งในอนาคต
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: '800', margin: 0, color: '#0F172A' }}>
                กำหนดปุ่มและคำสั่ง Rich Menu (Custom Action Manager)
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '4px 0 0 0' }}>
                เลือกแบบเมนูที่ต้องการปรับแต่ง แล้วกำหนดชื่อปุ่ม ประเภทคำสั่ง (เปิดหน้าเว็บ/LIFF หรือส่งข้อความแชท) และปลายทางของปุ่มทั้ง 6 ตำแหน่ง
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleResetConfig(selectedConfigMenu)}
                className="btn btn-light"
                style={{ padding: '9px 14px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '600', color: '#64748B', border: '1px solid #CBD5E1' }}
              >
                ↺ คืนค่าเริ่มต้นแบบนี้
              </button>
              <button
                onClick={() => handleSaveConfig(false)}
                disabled={isSavingConfig}
                className="btn"
                style={{
                  backgroundColor: '#4338CA',
                  color: '#FFFFFF',
                  padding: '9px 16px',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                💾 {isSavingConfig ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
              </button>
              <button
                onClick={() => handleSaveConfig(true)}
                disabled={isSavingConfig || isDeploying}
                className="btn"
                style={{
                  backgroundColor: '#10B981',
                  color: '#FFFFFF',
                  padding: '9px 18px',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}
              >
                🚀 {isDeploying ? 'กำลัง Deploy...' : 'บันทึก & Deploy ขึ้น LINE'}
              </button>
            </div>
          </div>

          {/* Menu Selector Buttons */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {richMenuCards.map(menu => {
              const isSelected = selectedConfigMenu === menu.key;
              return (
                <button
                  key={menu.key}
                  onClick={() => setSelectedConfigMenu(menu.key)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '12px',
                    border: isSelected ? `2px solid ${menu.color}` : '1px solid #CBD5E1',
                    backgroundColor: isSelected ? menu.bgColor : '#FFFFFF',
                    color: isSelected ? menu.color : '#475569',
                    fontWeight: '800',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.15s'
                  }}
                >
                  <span>แบบที่ {menu.number}:</span>
                  <span>{menu.title.split(' ')[0]}</span>
                  {menu.isDefault && <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#10B981', color: '#FFF' }}>Default</span>}
                </button>
              );
            })}
          </div>

          {/* Quick Helper Banner */}
          <div style={{ backgroundColor: '#F8FAFC', borderRadius: '14px', padding: '1rem', border: '1px solid #E2E8F0', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ fontSize: '0.85rem', color: '#475569' }}>
              💡 <strong>เทคนิค:</strong> พิกัดปุ่มใน LINE Rich Menu จะเรียงจาก <strong>ซ้ายบน → ขวาบน</strong> (ช่อง 1, 2, 3) และ <strong>ซ้ายล่าง → ขวาล่าง</strong> (ช่อง 4, 5, 6)
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
              หากกำหนดประเภทเป็น <strong>"เปิดลิงก์ URL/LIFF"</strong> สามารถใส่ Path สั้น เช่น <code>?action=services</code> หรือ URL เต็มได้
            </div>
          </div>

          {/* VISUAL LAYOUT PREVIEW CARD (Large, Crisp, 6-Slot Interactive Grid Overlay) */}
          {(() => {
            const currentMenuSpec = richMenuCards.find(m => m.key === selectedConfigMenu) || richMenuCards[0];
            const isCustomImg = !!(customImages[selectedConfigMenu] && customImages[selectedConfigMenu] !== 'default');
            const currentDisplayImage = isCustomImg ? customImages[selectedConfigMenu] : currentMenuSpec.image;

            return (
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                border: `2px solid ${currentMenuSpec.borderColor || '#E2E8F0'}`,
                padding: '1.5rem',
                marginBottom: '1.75rem',
                boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
                position: 'relative'
              }}>
                {/* Card Top Toolbar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '1.25rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: currentMenuSpec.bgColor, border: `1.5px solid ${currentMenuSpec.borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: currentMenuSpec.color, fontWeight: '800', fontSize: '1.15rem' }}>
                      {currentMenuSpec.number}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0, color: '#0F172A' }}>
                          ผังโครงสร้างภาพ & ตำแหน่ง 6 ช่อง (Visual Layout Blueprint)
                        </h3>
                        {isCustomImg && (
                          <span style={{ fontSize: '0.72rem', fontWeight: '800', padding: '3px 8px', borderRadius: '9999px', backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A' }}>
                            ✨ ใช้ภาพที่แนบใหม่ (Custom)
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '2px 0 0 0' }}>
                        แบบที่ {currentMenuSpec.number}: {currentMenuSpec.title} | ขนาดมาตรฐาน 2,500 x 1,686 px (อัตราส่วน 3:2)
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons for Image */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleImageFileChange} 
                      accept="image/png,image/jpeg,image/webp" 
                      style={{ display: 'none' }} 
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn"
                      style={{
                        backgroundColor: '#4338CA',
                        color: '#FFFFFF',
                        padding: '8px 14px',
                        borderRadius: '10px',
                        fontSize: '0.82rem',
                        fontWeight: '700',
                        border: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 8px rgba(67, 56, 202, 0.25)',
                        cursor: 'pointer'
                      }}
                    >
                      <Upload size={15} /> แนบ/เปลี่ยนรูปภาพใหม่
                    </button>

                    {isCustomImg && (
                      <button
                        type="button"
                        onClick={() => handleResetImage(selectedConfigMenu)}
                        className="btn btn-light"
                        style={{
                          padding: '8px 12px',
                          borderRadius: '10px',
                          fontSize: '0.82rem',
                          fontWeight: '600',
                          color: '#DC2626',
                          borderColor: '#FCA5A5',
                          backgroundColor: '#FEF2F2',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          cursor: 'pointer'
                        }}
                        title="ยกเลิกภาพที่แนบ และกลับไปใช้รูปภาพมาตรฐานของคลินิก"
                      >
                        <RotateCcw size={14} /> คืนค่าภาพมาตรฐาน
                      </button>
                    )}

                    <a
                      href="/richmenu_images/richmenu_grid_template.png"
                      download={`hugdeehome_richmenu_template_${selectedConfigMenu}.png`}
                      className="btn btn-light"
                      style={{
                        padding: '8px 12px',
                        borderRadius: '10px',
                        fontSize: '0.82rem',
                        fontWeight: '600',
                        color: '#475569',
                        borderColor: '#CBD5E1',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                      title="ดาวน์โหลดแม่แบบเปล่าขนาด 2500x1686 px สำหรับนำไปออกแบบใน Canva หรือ Photoshop"
                    >
                      <Download size={14} /> โหลดแม่แบบเปล่า
                    </a>

                    <a
                      href={currentDisplayImage}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-light"
                      style={{
                        padding: '8px 12px',
                        borderRadius: '10px',
                        fontSize: '0.82rem',
                        fontWeight: '600',
                        color: '#475569',
                        borderColor: '#CBD5E1',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                      title="ดูรูปภาพขนาดเต็มในแท็บใหม่"
                    >
                      <Maximize2 size={14} /> ดูภาพเต็ม HD
                    </a>
                  </div>
                </div>

                {/* Main Large Image Display with 6 Interactive Slots Grid Overlay */}
                <div 
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0];
                    if (file) processImageFile(file, selectedConfigMenu);
                  }}
                  style={{
                    maxWidth: '880px',
                    margin: '0 auto',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    border: '2px solid #CBD5E1',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                    position: 'relative',
                    aspectRatio: '2500 / 1686',
                    backgroundColor: '#1E293B'
                  }}
                >
                  {/* Background Image */}
                  <img 
                    src={currentDisplayImage} 
                    alt={`Rich Menu ${currentMenuSpec.title}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                    onError={(e) => {
                      e.target.src = currentMenuSpec.image;
                    }}
                  />

                  {/* 6 Grid Slots Overlay (3 cols x 2 rows) */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gridTemplateRows: 'repeat(2, 1fr)'
                  }}>
                    {([0, 1, 2, 3, 4, 5]).map(index => {
                      const slotConfig = customConfigs?.[selectedConfigMenu]?.[index] || DEFAULT_CONFIGS[selectedConfigMenu]?.[index] || {};
                      const isHovered = highlightedSlot === index;
                      const slotTitle = slotConfig.label || `ปุ่มที่ ${index + 1}`;
                      const slotActionType = slotConfig.type === 'message' ? '💬 ข้อความ' : '🔗 ลิงก์';

                      return (
                        <div
                          key={index}
                          onClick={() => scrollToSlot(index)}
                          title={`คลิกเพื่อแก้ไขช่อง ${index + 1}: ${slotTitle}`}
                          style={{
                            border: isHovered ? '3px solid #F59E0B' : '1.5px dashed rgba(255, 255, 255, 0.7)',
                            backgroundColor: isHovered ? 'rgba(245, 158, 11, 0.3)' : 'rgba(0, 0, 0, 0.08)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            padding: '12px',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer',
                            backdropFilter: isHovered ? 'blur(2px)' : 'none',
                            boxShadow: isHovered ? 'inset 0 0 24px rgba(245, 158, 11, 0.5)' : 'none'
                          }}
                        >
                          {/* Slot Badge */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{
                              backgroundColor: currentMenuSpec.color || '#4F46E5',
                              color: '#FFFFFF',
                              fontSize: '0.72rem',
                              fontWeight: '800',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              ช่อง {index + 1}
                            </span>
                            <span style={{
                              backgroundColor: 'rgba(0, 0, 0, 0.65)',
                              color: '#FFFFFF',
                              fontSize: '0.65rem',
                              fontWeight: '600',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backdropFilter: 'blur(4px)'
                            }}>
                              {slotActionType}
                            </span>
                          </div>

                          {/* Live Dynamic Label Pill */}
                          <div style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.94)',
                            color: '#0F172A',
                            padding: '5px 10px',
                            borderRadius: '8px',
                            fontSize: '0.78rem',
                            fontWeight: '800',
                            textAlign: 'center',
                            boxShadow: '0 3px 10px rgba(0,0,0,0.18)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            border: '1px solid rgba(0,0,0,0.1)'
                          }}>
                            {slotTitle}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '0.8rem', color: '#64748B' }}>
                  💡 <strong>เทคนิค:</strong> คลิกที่ช่องบนรูปภาพเพื่อเลื่อนลงไปแก้ไขข้อมูลช่องนั้น หรือลากไฟล์ภาพ (.png, .jpg) มาวางที่กรอบด้านบนเพื่อเปลี่ยนรูปภาพได้ทันที
                </div>
              </div>
            );
          })()}

          {/* 6 Grid Slots (3 Columns x 2 Rows) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            {([0, 1, 2, 3, 4, 5]).map(index => {
              const currentSlot = customConfigs?.[selectedConfigMenu]?.[index] || DEFAULT_CONFIGS[selectedConfigMenu]?.[index] || {
                slot: index + 1,
                label: `ปุ่มที่ ${index + 1}`,
                type: 'uri',
                value: ''
              };

              const slotPositions = [
                'ช่อง 1 (ซ้ายบน)',
                'ช่อง 2 (กลางบน)',
                'ช่อง 3 (ขวาบน)',
                'ช่อง 4 (ซ้ายล่าง)',
                'ช่อง 5 (กลางล่าง)',
                'ช่อง 6 (ขวาล่าง)'
              ];

              return (
                <div
                  key={index}
                  id={`slot-card-${index}`}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: highlightedSlot === index ? '2.5px solid #4F46E5' : '1.5px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    boxShadow: highlightedSlot === index ? '0 0 18px rgba(79, 70, 229, 0.3)' : '0 2px 8px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    transition: 'all 0.25s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#6D28D9', backgroundColor: '#FAF5FF', padding: '3px 10px', borderRadius: '8px' }}>
                      🔘 {slotPositions[index]}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                      Slot #{index + 1}
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                      ชื่อปุ่มที่แสดง (Label):
                    </label>
                    <input
                      type="text"
                      value={currentSlot.label || ''}
                      onChange={(e) => handleSlotChange(selectedConfigMenu, index, 'label', e.target.value)}
                      placeholder="เช่น นัดหมายของน้อง"
                      maxLength={25}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '10px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.88rem',
                        fontWeight: '600',
                        color: '#0F172A'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                        ประเภทคำสั่ง (Action Type):
                      </label>
                      <select
                        value={currentSlot.type || 'uri'}
                        onChange={(e) => handleSlotChange(selectedConfigMenu, index, 'type', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '10px',
                          border: '1px solid #CBD5E1',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          backgroundColor: '#F8FAFC'
                        }}
                      >
                        <option value="uri">🔗 เปิดลิงก์ URL หรือหน้าจอ LIFF Portal</option>
                        <option value="message">💬 ส่งข้อความแชทอัตโนมัติ (Text Message)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                        {currentSlot.type === 'message' ? 'ข้อความแชทที่จะส่ง:' : 'ปลายทางคำสั่ง (URL / Action Path):'}
                      </label>
                      <input
                        type="text"
                        value={currentSlot.value || ''}
                        onChange={(e) => handleSlotChange(selectedConfigMenu, index, 'value', e.target.value)}
                        placeholder={currentSlot.type === 'message' ? 'ระบุข้อความที่ส่งเข้าแชท...' : 'เช่น ?action=services หรือ https://...'}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '10px',
                          border: '1px solid #CBD5E1',
                          fontSize: '0.85rem',
                          fontFamily: 'monospace'
                        }}
                      />
                    </div>
                  </div>

                  {/* Preset quick picks */}
                  <div style={{ marginTop: '4px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: '600', marginBottom: '4px' }}>
                      เลือกด่วน (Quick Presets):
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {[
                        { label: 'บริการของเรา', type: 'uri', value: '?action=services' },
                        { label: 'ลงทะเบียนคนไข้ใหม่', type: 'uri', value: '?action=register-patient' },
                        { label: 'เชื่อมต่อบัญชี LINE', type: 'uri', value: '?action=line-link' },
                        { label: 'โทรคลินิก', type: 'uri', value: '?action=call' },
                        { label: 'ลงเวลางาน', type: 'uri', value: '?action=checkin' },
                        { label: 'แผน ITP', type: 'uri', value: '?action=parent-itp' },
                        { label: 'นัดหมาย', type: 'uri', value: '?action=parent-appointments' },
                        { label: 'ยอด & แต้ม', type: 'uri', value: '?action=parent-courses' },
                        { label: 'ฝึกที่บ้าน', type: 'uri', value: '?action=parent-homeprogram' },
                        { label: 'Check-in เคาน์เตอร์', type: 'uri', value: '?action=reception-intake' },
                        { label: 'สลับมุมมอง', type: 'uri', value: `?action=menu-switch&role=${selectedConfigMenu}` },
                        { label: 'คุยกับครู', type: 'message', value: 'ขออนุญาตติดต่อเจ้าหน้าที่เรื่องวันนัดหมายของน้องค่ะ 🤎' }
                      ].map((preset, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => {
                            handleSlotChange(selectedConfigMenu, index, 'label', preset.label);
                            handleSlotChange(selectedConfigMenu, index, 'type', preset.type);
                            handleSlotChange(selectedConfigMenu, index, 'value', preset.value);
                          }}
                          style={{
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            border: '1px solid #E2E8F0',
                            backgroundColor: '#F8FAFC',
                            color: '#475569',
                            cursor: 'pointer'
                          }}
                        >
                          + {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #F1F5F9', paddingTop: '1.25rem' }}>
            <button
              onClick={() => handleResetConfig(selectedConfigMenu)}
              className="btn btn-light"
              style={{ padding: '10px 18px', borderRadius: '12px', fontSize: '0.88rem', fontWeight: '600' }}
            >
              ↺ คืนค่าเริ่มต้นแบบนี้
            </button>
            <button
              onClick={() => handleSaveConfig(false)}
              disabled={isSavingConfig}
              className="btn"
              style={{
                backgroundColor: '#4338CA',
                color: '#FFFFFF',
                padding: '10px 20px',
                borderRadius: '12px',
                fontSize: '0.88rem',
                fontWeight: '700',
                border: 'none'
              }}
            >
              💾 {isSavingConfig ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าปุ่ม'}
            </button>
            <button
              onClick={() => handleSaveConfig(true)}
              disabled={isSavingConfig || isDeploying}
              className="btn"
              style={{
                backgroundColor: '#10B981',
                color: '#FFFFFF',
                padding: '10px 22px',
                borderRadius: '12px',
                fontSize: '0.88rem',
                fontWeight: '700',
                border: 'none',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
              }}
            >
              🚀 {isDeploying ? 'กำลัง Deploy...' : 'บันทึก & Deploy ขึ้น LINE ทันที'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: USER REGISTRY & ACCESS CONTROL */}
      {activeTab === 'users' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '1.5rem', border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
          
          {/* Search & Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '280px' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={18} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ, รหัสพนักงาน, เลข HN, หรือเบอร์โทร..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    borderRadius: '12px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '0.9rem'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{ padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '0.88rem', fontWeight: '600' }}
              >
                <option value="all">บทบาททั้งหมด</option>
                <option value="parent">👶 ผู้ปกครอง (Parent)</option>
                <option value="staff">🔵 เจ้าหน้าที่ (Staff)</option>
                <option value="ot">🟠 นักกิจกรรมบำบัด (OT)</option>
                <option value="admin">🟣 ผู้ดูแลระบบ (Admin)</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '0.88rem', fontWeight: '600' }}
              >
                <option value="all">สถานะทั้งหมด</option>
                <option value="linked">✓ ผูก LINE แล้ว</option>
                <option value="active">🟢 Active เท่านั้น</option>
                <option value="inactive">🔴 Inactive (ตัดสิทธิ์)</option>
              </select>
            </div>
          </div>

          {/* User Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#475569', fontSize: '0.82rem', fontWeight: '800' }}>
                  <th style={{ padding: '12px 14px' }}>ชื่อ-นามสกุล / ผู้รับบริการ</th>
                  <th style={{ padding: '12px 14px' }}>รหัสประจำตัว</th>
                  <th style={{ padding: '12px 14px' }}>บทบาท (Role)</th>
                  <th style={{ padding: '12px 14px' }}>เบอร์โทรศัพท์</th>
                  <th style={{ padding: '12px 14px' }}>LINE User ID</th>
                  <th style={{ padding: '12px 14px' }}>สถานะ</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>การปรับเปลี่ยน Rich Menu</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>
                      <Users size={36} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.5 }} />
                      ไม่พบข้อมูลผู้ใช้งานที่ตรงตามเงื่อนไข
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => {
                    const isInactive = user.status?.toLowerCase() === 'inactive';
                    const hasUid = !!user.lineUserId;

                    return (
                      <tr key={user.id} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: isInactive ? '#FEF2F230' : 'transparent' }}>
                        <td style={{ padding: '12px 14px', fontWeight: '700', color: '#0F172A' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <SmartAvatar src={user.avatarUrl} name={user.name} size={32} />
                            <div>
                              <div>{user.name}</div>
                              <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                                {user.sourceType === 'user' ? 'พนักงานคลินิก' : 'ผู้รับบริการ'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '12px 14px', fontSize: '0.85rem', fontWeight: '600', color: '#0284C7' }}>
                          {user.code}
                        </td>

                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            backgroundColor: user.role === 'admin' ? '#FAF5FF' : (user.role === 'ot' ? '#FFF7ED' : (user.role === 'staff' ? '#F0F9FF' : '#ECFDF5')),
                            color: user.role === 'admin' ? '#7C3AED' : (user.role === 'ot' ? '#EA580C' : (user.role === 'staff' ? '#0284C7' : '#059669'))
                          }}>
                            {user.roleLabel}
                          </span>
                        </td>

                        <td style={{ padding: '12px 14px', fontSize: '0.85rem', color: '#334155' }}>
                          {user.phone}
                        </td>

                        <td style={{ padding: '12px 14px' }}>
                          {hasUid ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#059669', fontWeight: '600' }} title={user.lineUserId}>
                              <CheckCircle2 size={14} color="#059669" /> ผูกแล้ว ({user.lineUserId.substring(0, 8)}...)
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>ยังไม่ผูก</span>
                          )}
                        </td>

                        <td style={{ padding: '12px 14px' }}>
                          {isInactive ? (
                            <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700', backgroundColor: '#FEF2F2', color: '#DC2626' }}>
                              Inactive (ตัดสิทธิ์)
                            </span>
                          ) : (
                            <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700', backgroundColor: '#F0FDF4', color: '#16A34A' }}>
                              Active
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          {hasUid && !isInactive ? (
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <select
                                defaultValue=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleForceSwitchUser(user, e.target.value);
                                    e.target.value = "";
                                  }
                                }}
                                style={{ padding: '4px 8px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.78rem', cursor: 'pointer' }}
                              >
                                <option value="" disabled>สลับเมนู...</option>
                                <option value="guest">🟢 1. ทั่วไป (Guest)</option>
                                <option value="parent">🟡 2. ผู้ปกครอง (Parent)</option>
                                <option value="staff">🔵 3. เจ้าหน้าที่ (Staff)</option>
                                <option value="ot">🟠 4. นักบำบัด (OT)</option>
                                <option value="admin">🟣 5. ผู้ดูแล (Admin)</option>
                              </select>

                              <button
                                onClick={() => handleForceSwitchUser(user, 'guest')}
                                className="btn btn-light"
                                style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#DC2626', borderColor: '#FCA5A5' }}
                                title="ปลดสิทธิ์กลับเป็นคนทั่วไป"
                              >
                                <UserX size={14} />
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                              {isInactive ? 'ถูกตัดสิทธิ์แล้ว' : 'รอผู้ใช้เชื่อมต่อ'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: QR CODE & INVITATION TOOLS */}
      {activeTab === 'tools' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
          
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '1.75rem', border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#059669', marginBottom: '1rem' }}>
              <QrCode size={24} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0 }}>
                QR Code สำหรับผู้ปกครอง & พนักงาน
              </h3>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#64748B', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              สามารถพิมพ์ QR Code นี้ไปติดที่เคาน์เตอร์ต้อนรับ หรือส่งให้ผู้ปกครองในแชท LINE เพื่อให้สแกนเชื่อมต่อและเปิดใช้งานเมนูผู้ปกครองอัตโนมัติ:
            </p>

            <div style={{ textAlign: 'center', padding: '1.5rem', backgroundColor: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0', marginBottom: '1.5rem' }}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(liffLinkUrl)}`}
                alt="QR Code Link"
                style={{ width: '200px', height: '200px', borderRadius: '12px', border: '4px solid #FFFFFF', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
              />
              <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#0F172A', marginTop: '10px' }}>
                สแกนเพื่อเชื่อมต่อระบบ LINE OA ฮักดีโฮม
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text"
                readOnly
                value={liffLinkUrl}
                style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.82rem', backgroundColor: '#F1F5F9' }}
              />
              <button
                onClick={() => copyToClipboard(liffLinkUrl, 'ลิงก์เชื่อมต่อ')}
                className="btn btn-primary"
                style={{ padding: '10px 14px', borderRadius: '10px', fontWeight: '700', fontSize: '0.85rem', backgroundColor: '#059669', borderColor: '#059669', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Copy size={16} /> คัดลอก
              </button>
            </div>
            <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#64748B' }}>
              LIFF ID: <code>{liffId}</code> | LINE OA ID: <code>{lineOaId}</code>
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '1.75rem', border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#7C3AED', marginBottom: '1rem' }}>
              <ShieldAlert size={24} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0 }}>
                นโยบายความปลอดภัย & กฎเกณฑ์ Inactive
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '14px', padding: '1rem' }}>
                <div style={{ fontWeight: '800', fontSize: '0.9rem', color: '#991B1B', marginBottom: '4px' }}>
                  🚫 กฎการตัดสิทธิ์ Inactive อัตโนมัติ (Automated Inactive Revocation)
                </div>
                <p style={{ fontSize: '0.82rem', color: '#7F1D1D', margin: 0, lineHeight: 1.45 }}>
                  เมื่อใดที่พนักงานลาออก หรือผู้รับบริการพ้นสภาพการรักษา และถูกปรับสถานะเป็น <code>Inactive</code> ในระบบ ระบบจะทำการ Unlink Rich Menu ทันที และดีดผู้ใช้กลับไปเป็น <strong>บุคคลทั่วไป (Guest)</strong> เพื่อป้องกันการเข้าถึงข้อมูลภายในคลินิก 100%
                </p>
              </div>

              <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '14px', padding: '1rem' }}>
                <div style={{ fontWeight: '800', fontSize: '0.9rem', color: '#1E40AF', marginBottom: '4px' }}>
                  🔄 การสลับดูเมนูข้ามระดับ (Multi-Role Switching)
                </div>
                <p style={{ fontSize: '0.82rem', color: '#1E3A8A', margin: 0, lineHeight: 1.45 }}>
                  • <strong>เจ้าหน้าที่ (Staff):</strong> สลับดูได้ 2 แบบ (แบบที่ 1 บุคคลทั่วไป ↔ แบบที่ 3 เจ้าหน้าที่)<br />
                  • <strong>นักบำบัด (OT):</strong> สลับดูได้ 2 แบบ (แบบที่ 1 บุคคลทั่วไป ↔ แบบที่ 4 นักกิจกรรมบำบัด)<br />
                  • <strong>ผู้ดูแล (Admin):</strong> สลับดูได้อิสระครบทั้ง 5 รูปแบบ (1, 2, 3, 4, 5)
                </p>
              </div>

              <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '14px', padding: '1rem' }}>
                <div style={{ fontWeight: '800', fontSize: '0.9rem', color: '#166534', marginBottom: '4px' }}>
                  👶 รองรับผู้ปกครองมีบุตรหลานหลายคน (Multi-Child Support)
                </div>
                <p style={{ fontSize: '0.82rem', color: '#14532D', margin: 0, lineHeight: 1.45 }}>
                  หากเบอร์โทรศัพท์หนึ่งเบอร์ผูกกับเด็กมากกว่า 1 คน ในหน้า LIFF Portal ผู้ปกครองสามารถเลือกคลิกสลับดูข้อมูลของน้องแต่ละคนได้โดยอิสระ
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
