import React, { useState, useEffect, useMemo } from 'react';
import { formatPatientNickname } from '../utils/format';
import { 
  ShoppingCart, 
  Trash2, 
  RotateCcw, 
  Plus, 
  Minus, 
  Tag, 
  Coins, 
  Image as ImageIcon,
  CheckCircle,
  FileCheck2,
  Gift,
  Users,
  Layers,
  Split
} from 'lucide-react';
import Swal from 'sweetalert2';

export default function ReceiptPOS({ 
  patients, 
  services, 
  promotions, 
  bankAccounts, 
  receipts, 
  onSaveReceipt,
  selectedHn,
  setSelectedHn,
  cart,
  setCart,
  discountType,
  setDiscountType,
  discountValue,
  setDiscountValue,
  discountReason,
  setDiscountReason,
  selectedPromoCode,
  setSelectedPromoCode,
  paymentMethod,
  setPaymentMethod,
  selectedBankId,
  setSelectedBankId,
  slipAttached,
  setSlipAttached,
  slipName,
  setSlipName,
  currentUser,
  rewards = [],
  editingReceiptId = null,
  editingReceiptDate = null,
  onCancelEdit = null
}) {

  // กรองผู้ป่วยที่ Active
  const activePatients = useMemo(() => {
    return patients.filter(p => p.status === 'Active');
  }, [patients]);

  const [patientSearchText, setPatientSearchText] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  const [customBillId, setCustomBillId] = useState('');
  const [customDate, setCustomDate] = useState(() => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${today.getFullYear()}-${mm}-${dd}`;
  });

  useEffect(() => {
    if (editingReceiptId) {
      setCustomBillId(editingReceiptId);
    } else {
      setCustomBillId('');
    }
  }, [editingReceiptId]);

  useEffect(() => {
    if (editingReceiptDate) {
      setCustomDate(editingReceiptDate);
    } else {
      const today = new Date();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      setCustomDate(`${today.getFullYear()}-${mm}-${dd}`);
    }
  }, [editingReceiptDate]);

  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItemQty, setCustomItemQty] = useState(1);

  const [newDiscountReason, setNewDiscountReason] = useState('');
  const [newDiscountValue, setNewDiscountValue] = useState('');
  const [newDiscountType, setNewDiscountType] = useState('flat'); // flat, percentage

  // --- สถานะสำหรับโหมดแบ่งบิล (Split Bill) ---
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [activeSplitIndex, setActiveSplitIndex] = useState(0);
  const [splitBills, setSplitBills] = useState([]);
  const [paymentMode, setPaymentMode] = useState('consolidated'); // 'consolidated' = ชำระรวมยอดเดียว, 'separate' = ชำระแยกบิล
  const [consolidatedPaymentMethod, setConsolidatedPaymentMethod] = useState('เงินสด');
  const [consolidatedBankId, setConsolidatedBankId] = useState('');
  const [consolidatedSlipAttached, setConsolidatedSlipAttached] = useState(false);
  const [consolidatedSlipName, setConsolidatedSlipName] = useState('');
  const [customItemTarget, setCustomItemTarget] = useState('current'); // 'current' = เฉพาะบิลนี้, 'all' = ทุกบิลย่อย
  const [discountTarget, setDiscountTarget] = useState('current'); // 'current' = เฉพาะบิลนี้, 'all' = ทุกบิลย่อย

  // Sync patientSearchText when selectedHn updates
  useEffect(() => {
    if (selectedHn) {
      const p = activePatients.find(item => item.hn === selectedHn);
      if (p) {
        setPatientSearchText(`HN: ${p.hn} | ${formatPatientNickname(p.nickname)} (${p.title}${p.firstname} ${p.lastname})`);
      } else {
        setPatientSearchText('');
      }
    } else {
      setPatientSearchText('');
    }
  }, [selectedHn, activePatients]);

  const filteredActivePatients = useMemo(() => {
    const q = patientSearchText.trim().toLowerCase();
    if (!q || q.startsWith('hn:')) return activePatients;
    return activePatients.filter(p => 
      String(p.hn || '').toLowerCase().includes(q) || 
      String(p.nickname || '').toLowerCase().includes(q) ||
      String(p.firstname || '').toLowerCase().includes(q) ||
      String(p.lastname || '').toLowerCase().includes(q)
    );
  }, [activePatients, patientSearchText]);

  // คำนวณคะแนนสะสมของคนไข้ปัจจุบันแบบเรียลไทม์
  const patientPointsBalance = useMemo(() => {
    if (!selectedHn) return 0;
    const patientReceipts = receipts.filter(r => r.hn === selectedHn && r.status === 'ชำระเงินแล้ว');
    let pointsEarned = 0;
    let pointsUsed = 0;

    patientReceipts.forEach(r => {
      r.items.forEach(item => {
        if (item.type === 'บริการ') {
          if (item.code === 'TRANSFER_OUT' || item.code === 'TRANSFER_IN' || item.code === 'MANUAL_ADD') {
            // ข้ามคอร์ส
          } else if (item.code === 'SV02' || item.code === '001-IA' || (item.name && item.name.includes('ประเมินพัฒนาการ'))) {
            // ข้ามประเมินพัฒนาการครั้งแรก
          } else {
            const sessionsPerUnit = item.sessionsPerUnit || (item.code === 'SV03' ? 10 : 1);
            const sessions = item.quantity * sessionsPerUnit;
            pointsEarned += sessions;
          }
        } else if (item.type === 'คะแนน') {
          if (item.code === 'POINT_ADD_MANUAL' || item.code === 'POINT_TRANSFER_IN') {
            pointsEarned += item.quantity;
          } else if (item.code === 'POINT_TRANSFER_OUT' || item.code === 'REWARD_REDEEM' || item.code === 'POINT_DEDUCT_MANUAL') {
            pointsUsed += item.quantity;
          }
        }
      });
    });

    return pointsEarned - pointsUsed;
  }, [selectedHn, receipts]);

  // กรองของรางวัลที่ยังมีโควตา สัญญากิจกรรมใช้งานได้ และคะแนนสะสมของลูกค้าเพียงพอ
  const redeemableRewards = useMemo(() => {
    if (!selectedHn) return [];
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    return (rewards || []).filter(r => {
      const usedCount = receipts ? receipts.filter(rec => (rec.promotionId === r.code || rec.rewardId === r.code) && rec.status !== 'ยกเลิก').length : 0;
      const remainingQuota = Math.max(0, r.maxUses - usedCount);
      const isExpired = !(todayStr >= r.startDate && todayStr <= r.endDate);
      const isPointsEnough = patientPointsBalance >= r.points;
      
      return !isExpired && remainingQuota > 0 && isPointsEnough;
    });
  }, [rewards, receipts, selectedHn, patientPointsBalance]);

  // กรองสินค้า/บริการที่ Active จากวันที่ปัจจุบัน
  const activeServices = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return services.filter(s => {
      const start = s.startDate || '1970-01-01';
      const end = s.endDate || '2999-12-31';
      return todayStr >= start && todayStr <= end;
    });
  }, [services]);

  // กรองโปรโมชั่นที่ Active
  const activePromotions = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return promotions.filter(p => {
      const start = p.startDate || '1970-01-01';
      const end = p.endDate || '2999-12-31';
      const usedCount = receipts ? receipts.filter(r => r.promotionId === p.code && r.status !== 'ยกเลิก').length : 0;
      return p.type !== 'activity_log' && todayStr >= start && todayStr <= end && usedCount < p.maxUses;
    });
  }, [promotions, receipts]);

  // คำนวณรหัสบิลใบเสร็จลำดับถัดไป (HDRYYYYMM-XXXX) - รองรับการตัดรหัสย่อย -01, -02 ออก
  const generateNextBillId = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const prefix = `HDR${yyyy}${mm}-`;

    const matchingReceipts = receipts.filter(r => r.id && r.id.startsWith(prefix));
    if (matchingReceipts.length === 0) {
      return `${prefix}0001`;
    }

    const serials = matchingReceipts.map(r => {
      const withoutPrefix = r.id.slice(prefix.length);
      const baseNumStr = withoutPrefix.split('-')[0];
      return parseInt(baseNumStr, 10) || 0;
    });
    const maxSerial = Math.max(...serials);
    const nextSerial = maxSerial + 1;
    const padded = nextSerial.toString().padStart(4, '0');
    return `${prefix}${padded}`;
  };

  // สร้างอ็อบเจกต์บิลย่อยว่าง
  const createEmptySplitBill = (index) => ({
    idSuffix: String(index + 1).padStart(2, '0'),
    hn: '',
    patientSearchText: '',
    cart: [],
    discountType: 'flat',
    discountValue: 0,
    discountReason: '',
    selectedPromoCode: '',
    paymentMethod: 'เงินสด',
    selectedBankId: '',
    slipAttached: false,
    slipName: '',
    status: 'ชำระเงินแล้ว'
  });

  // เปิดโหมดแบ่งบิล (Split Bill)
  const handleEnableSplitMode = () => {
    const bill1 = {
      idSuffix: '01',
      hn: selectedHn,
      patientSearchText: patientSearchText,
      cart: [...cart],
      discountType: discountType,
      discountValue: discountValue,
      discountReason: discountReason,
      selectedPromoCode: selectedPromoCode,
      paymentMethod: paymentMethod,
      selectedBankId: selectedBankId,
      slipAttached: slipAttached,
      slipName: slipName,
      status: 'ชำระเงินแล้ว'
    };
    const bill2 = createEmptySplitBill(1);
    setSplitBills([bill1, bill2]);
    setIsSplitMode(true);
    setActiveSplitIndex(0);
    setConsolidatedPaymentMethod(paymentMethod || 'เงินสด');
    setConsolidatedBankId(selectedBankId || '');
    setConsolidatedSlipAttached(slipAttached || false);
    setConsolidatedSlipName(slipName || '');

    Swal.fire({
      icon: 'success',
      title: 'เปิดโหมดแบ่งบิล (Split Bill)',
      text: 'ระบบสร้างแท็บบิลย่อย 2 รายการเรียบร้อย สามารถสลับแท็บเพื่อเลือกผู้รับบริการและรายการสินค้าของแต่ละบิลได้ทันที',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2500
    });
  };

  // ปิด/ยกเลิกโหมดแบ่งบิล
  const handleDisableSplitMode = () => {
    Swal.fire({
      title: 'ยกเลิกโหมดแบ่งบิล?',
      text: 'ระบบจะปิดโหมดแบ่งบิล และคงเฉพาะข้อมูลของบิลที่เปิดอยู่ปัจจุบันไว้',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันยกเลิก',
      cancelButtonText: 'กลับ',
      confirmButtonColor: 'var(--danger)'
    }).then(res => {
      if (res.isConfirmed) {
        setIsSplitMode(false);
        setSplitBills([]);
        setActiveSplitIndex(0);
      }
    });
  };

  // สลับแท็บบิลย่อย
  const handleSwitchSplitTab = (targetIdx) => {
    if (targetIdx === activeSplitIndex || targetIdx < 0 || targetIdx >= splitBills.length) return;
    
    // 1. บันทึกข้อมูลแท็บปัจจุบัน
    const currentSnapshot = {
      idSuffix: String(activeSplitIndex + 1).padStart(2, '0'),
      hn: selectedHn,
      patientSearchText: patientSearchText,
      cart: [...cart],
      discountType: discountType,
      discountValue: discountValue,
      discountReason: discountReason,
      selectedPromoCode: selectedPromoCode,
      paymentMethod: paymentMethod,
      selectedBankId: selectedBankId,
      slipAttached: slipAttached,
      slipName: slipName,
      status: 'ชำระเงินแล้ว'
    };
    const updated = [...splitBills];
    updated[activeSplitIndex] = currentSnapshot;
    setSplitBills(updated);

    // 2. ดึงข้อมูลแท็บเป้าหมายมาใส่ state
    const target = updated[targetIdx];
    setSelectedHn(target.hn || '');
    setPatientSearchText(target.patientSearchText || '');
    setCart(target.cart || []);
    setDiscountType(target.discountType || 'flat');
    setDiscountValue(target.discountValue || 0);
    setDiscountReason(target.discountReason || '');
    setSelectedPromoCode(target.selectedPromoCode || '');
    setPaymentMethod(target.paymentMethod || 'เงินสด');
    setSelectedBankId(target.selectedBankId || '');
    setSlipAttached(target.slipAttached || false);
    setSlipName(target.slipName || '');
    setActiveSplitIndex(targetIdx);
  };

  // เพิ่มบิลย่อยใหม่ (Tab)
  const handleAddSplitTab = () => {
    const currentSnapshot = {
      idSuffix: String(activeSplitIndex + 1).padStart(2, '0'),
      hn: selectedHn,
      patientSearchText: patientSearchText,
      cart: [...cart],
      discountType: discountType,
      discountValue: discountValue,
      discountReason: discountReason,
      selectedPromoCode: selectedPromoCode,
      paymentMethod: paymentMethod,
      selectedBankId: selectedBankId,
      slipAttached: slipAttached,
      slipName: slipName,
      status: 'ชำระเงินแล้ว'
    };
    const newIndex = splitBills.length;
    const newBill = createEmptySplitBill(newIndex);
    const updated = [...splitBills];
    updated[activeSplitIndex] = currentSnapshot;
    updated.push(newBill);
    setSplitBills(updated);

    // เคลียร์ฟอร์มสำหรับแท็บใหม่
    setSelectedHn('');
    setPatientSearchText('');
    setCart([]);
    setDiscountType('flat');
    setDiscountValue(0);
    setDiscountReason('');
    setSelectedPromoCode('');
    setPaymentMethod('เงินสด');
    setSelectedBankId('');
    setSlipAttached(false);
    setSlipName('');
    setActiveSplitIndex(newIndex);
  };

  // ลบบิลย่อย
  const handleRemoveSplitTab = (removeIdx) => {
    if (splitBills.length <= 2) {
      // ถ้าเหลือ 2 บิลแล้วลบออก จะกลับสู่โหมดบิลเดี่ยว
      const remainIdx = removeIdx === 0 ? 1 : 0;
      const remainTab = splitBills[remainIdx];
      setSelectedHn(remainTab.hn || '');
      setPatientSearchText(remainTab.patientSearchText || '');
      setCart(remainTab.cart || []);
      setDiscountType(remainTab.discountType || 'flat');
      setDiscountValue(remainTab.discountValue || 0);
      setDiscountReason(remainTab.discountReason || '');
      setSelectedPromoCode(remainTab.selectedPromoCode || '');
      setPaymentMethod(remainTab.paymentMethod || 'เงินสด');
      setSelectedBankId(remainTab.selectedBankId || '');
      setSlipAttached(remainTab.slipAttached || false);
      setSlipName(remainTab.slipName || '');
      setIsSplitMode(false);
      setSplitBills([]);
      setActiveSplitIndex(0);
      return;
    }

    const updated = splitBills.filter((_, idx) => idx !== removeIdx);
    let newActive = activeSplitIndex;
    if (activeSplitIndex === removeIdx) {
      newActive = Math.max(0, removeIdx - 1);
      const target = updated[newActive];
      setSelectedHn(target.hn || '');
      setPatientSearchText(target.patientSearchText || '');
      setCart(target.cart || []);
      setDiscountType(target.discountType || 'flat');
      setDiscountValue(target.discountValue || 0);
      setDiscountReason(target.discountReason || '');
      setSelectedPromoCode(target.selectedPromoCode || '');
      setPaymentMethod(target.paymentMethod || 'เงินสด');
      setSelectedBankId(target.selectedBankId || '');
      setSlipAttached(target.slipAttached || false);
      setSlipName(target.slipName || '');
    } else if (activeSplitIndex > removeIdx) {
      newActive = activeSplitIndex - 1;
    }
    setSplitBills(updated);
    setActiveSplitIndex(newActive);
  };

  // แนบสลิปชำระเงินรวมยอดเดียว
  const handleConsolidatedSlipUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const today = new Date();
      const yy = today.getFullYear().toString().slice(-2);
      const folderName = `${yy}-IN-RECEIPTS`;
      const fileName = `${yy}-IN-SPLIT-${file.name}`;

      fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder: folderName,
          filename: fileName,
          base64Data: reader.result
        })
      })
      .then(res => {
        if (!res.ok) throw new Error('อัปโหลดสลิปใบเสร็จล้มเหลว');
        return res.json();
      })
      .then(data => {
        setConsolidatedSlipAttached(true);
        setConsolidatedSlipName(data.url);
        Swal.fire({
          icon: 'success',
          title: 'อัปโหลดสำเร็จ',
          text: `แนบสลิป ${file.name} เรียบร้อย`,
          timer: 1200,
          showConfirmButton: false
        });
      })
      .catch(err => {
        console.error(err);
        Swal.fire('อัปโหลดล้มเหลว', 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์', 'error');
      });
    };
    reader.readAsDataURL(file);
  };

  // ฟังก์ชันคำนวณยอดเงินของบิลใดๆ อย่างบริสุทธิ์ (Pure Calculation)
  const calculateSingleBillFinancials = (b, isCurrentActive = false) => {
    if (isCurrentActive) {
      return {
        subtotal: cartSubtotal,
        discountAmount: discountAmount,
        rewardsDiscountAmount: rewardsDiscountAmount,
        total: cartTotal,
        cartCount: (cart || []).reduce((sum, i) => sum + i.quantity, 0)
      };
    }

    const bCart = b.cart || [];
    const flatSub = bCart
      .filter(item => !item.isReward && !(item.description || '').includes('[price_type:percent]'))
      .reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const percentSum = bCart
      .filter(item => !item.isReward && (item.description || '').includes('[price_type:percent]'))
      .reduce((sum, item) => sum + (((item.price / 100) * flatSub) * item.quantity), 0);
    const regSubtotal = flatSub + percentSum;
    
    const allSubtotal = bCart
      .filter(item => !(item.description || '').includes('[price_type:percent]'))
      .reduce((sum, item) => sum + (item.price * item.quantity), 0) +
      bCart
      .filter(item => (item.description || '').includes('[price_type:percent]'))
      .reduce((sum, item) => sum + (((item.price / 100) * flatSub) * item.quantity), 0);

    let discountsList = [];
    if (b.discountReason) {
      try {
        const parsed = JSON.parse(b.discountReason);
        if (Array.isArray(parsed)) discountsList = parsed;
      } catch {
        /* ignore parse error */
      }
    }
    let discAmt = 0;
    if (discountsList.length > 0) {
      discountsList.forEach(d => {
        if (d.type === 'flat' || d.type === 'บาท') {
          discAmt += Number(d.value);
        } else {
          discAmt += (regSubtotal * Number(d.value)) / 100;
        }
      });
    } else if (Number(b.discountValue) > 0) {
      if (b.discountType === 'flat') discAmt = Number(b.discountValue);
      else discAmt = (regSubtotal * Number(b.discountValue)) / 100;
    }
    discAmt = Math.min(discAmt, regSubtotal);

    const netBeforeReward = Math.max(0, regSubtotal - discAmt);
    const rItem = bCart.find(i => i.isReward);
    let rewDiscAmt = 0;
    if (rItem) {
      if (rItem.rewardType === 'สินค้า') {
        rewDiscAmt = rItem.price * rItem.quantity;
      } else if (rItem.rewardType === 'ส่วนลด') {
        if (rItem.rewardCondition === 'ส่วนลดเงินสด') {
          rewDiscAmt = Math.min(rItem.discountVal * rItem.quantity, netBeforeReward);
        } else if (rItem.rewardCondition === 'ส่วนลดเป็นเปอร์เซ็นต์') {
          rewDiscAmt = Math.min((netBeforeReward * rItem.discountVal) / 100, netBeforeReward);
        }
      }
    }

    const finalTotal = Math.max(0, allSubtotal - discAmt - rewDiscAmt);
    return {
      subtotal: allSubtotal,
      discountAmount: discAmt,
      rewardsDiscountAmount: rewDiscAmt,
      total: finalTotal,
      cartCount: bCart.reduce((sum, i) => sum + i.quantity, 0)
    };
  };

  // รีเซ็ตฟอร์ม (ปุ่มสีแดง)
  const handleResetForm = () => {
    if (isSplitMode) {
      Swal.fire({
        title: 'รีเซ็ตข้อมูลบิล',
        text: 'เลือกรูปแบบการรีเซ็ตที่ต้องการ',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: `รีเซ็ตเฉพาะบิลนี้ (บิลที่ ${activeSplitIndex + 1})`,
        cancelButtonText: 'ยกเลิก',
        showDenyButton: true,
        denyButtonText: 'รีเซ็ตทั้งหมดและปิดโหมดแบ่งบิล',
        confirmButtonColor: 'var(--secondary)',
        denyButtonColor: 'var(--danger)'
      }).then(res => {
        if (res.isConfirmed) {
          setSelectedHn('');
          setPatientSearchText('');
          setCart([]);
          setDiscountType('flat');
          setDiscountValue(0);
          setDiscountReason('');
          setSelectedPromoCode('');
          setPaymentMethod('เงินสด');
          setSelectedBankId('');
          setSlipAttached(false);
          setSlipName('');
          Swal.fire({
            icon: 'info',
            title: `รีเซ็ตบิลย่อยที่ ${activeSplitIndex + 1} เรียบร้อย`,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 1500
          });
        } else if (res.isDenied) {
          setIsSplitMode(false);
          setSplitBills([]);
          setActiveSplitIndex(0);
          setSelectedHn('');
          setPatientSearchText('');
          setCart([]);
          setDiscountType('flat');
          setDiscountValue(0);
          setDiscountReason('');
          setSelectedPromoCode('');
          setPaymentMethod('เงินสด');
          setSelectedBankId('');
          setSlipAttached(false);
          setSlipName('');
          setCustomBillId('');
          const today = new Date();
          const mm = String(today.getMonth() + 1).padStart(2, '0');
          const dd = String(today.getDate()).padStart(2, '0');
          setCustomDate(`${today.getFullYear()}-${mm}-${dd}`);
          if (onCancelEdit) onCancelEdit();
          Swal.fire({
            icon: 'info',
            title: 'รีเซ็ตและปิดโหมดแบ่งบิลเรียบร้อย',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 1500
          });
        }
      });
      return;
    }

    setSelectedHn('');
    setCart([]);
    setDiscountType('flat');
    setDiscountValue(0);
    setDiscountReason('');
    setSelectedPromoCode('');
    setPaymentMethod('เงินสด');
    setSelectedBankId('');
    setSlipAttached(false);
    setSlipName('');
    setCustomBillId('');
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setCustomDate(`${today.getFullYear()}-${mm}-${dd}`);
    
    if (onCancelEdit) {
      onCancelEdit();
    }
    
    Swal.fire({
      icon: 'info',
      title: 'รีเซ็ตตะกร้าสินค้าเรียบร้อย',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 1500
    });
  };

  // เพิ่มสินค้าเข้าตะกร้า
  const addToCart = (item) => {
    const existing = cart.find(c => c.code === item.code);
    if (existing) {
      if (existing.isReward) {
        Swal.fire({
          icon: 'warning',
          title: 'จำกัดของรางวัล',
          text: 'ของรางวัลจำกัดจำนวนสูงสุด 1 ชิ้นต่อใบเสร็จ',
          confirmButtonColor: 'var(--secondary)'
        });
        return;
      }
      setCart(cart.map(c => c.code === item.code ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  // เพิ่มค่าบริการ/สินค้าอื่นๆ เข้าตะกร้าสินค้า
  const handlePostCustomItem = () => {
    if (!customItemName.trim()) {
      Swal.fire({ icon: 'warning', title: 'ระบุชื่อรายการบริการ/สินค้า', confirmButtonColor: 'var(--secondary)' });
      return;
    }
    const priceNum = Number(customItemPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      Swal.fire({ icon: 'warning', title: 'ราคารายการไม่ถูกต้อง', confirmButtonColor: 'var(--secondary)' });
      return;
    }
    const qtyNum = parseInt(customItemQty, 10);
    if (isNaN(qtyNum) || qtyNum < 1) {
      Swal.fire({ icon: 'warning', title: 'จำนวนรายการไม่ถูกต้อง', confirmButtonColor: 'var(--secondary)' });
      return;
    }

    const newCustomItem = {
      code: `CUSTOM_FEE_${Date.now()}`,
      name: customItemName.trim(),
      price: priceNum,
      category: 'อื่นๆ',
      sessionsPerUnit: 1,
      description: 'ค่าบริการ/สินค้าอื่นๆ เพิ่มเติม'
    };

    if (isSplitMode && customItemTarget === 'all') {
      const updatedActiveCart = [...cart, { ...newCustomItem, quantity: qtyNum }];
      setCart(updatedActiveCart);

      const currentSnapshot = {
        idSuffix: String(activeSplitIndex + 1).padStart(2, '0'),
        hn: selectedHn,
        patientSearchText: patientSearchText,
        cart: updatedActiveCart,
        discountType: discountType,
        discountValue: discountValue,
        discountReason: discountReason,
        selectedPromoCode: selectedPromoCode,
        paymentMethod: paymentMethod,
        selectedBankId: selectedBankId,
        slipAttached: slipAttached,
        slipName: slipName,
        status: 'ชำระเงินแล้ว'
      };

      const updatedSplit = splitBills.map((b, idx) => {
        if (idx === activeSplitIndex) return currentSnapshot;
        return {
          ...b,
          cart: [...(b.cart || []), { ...newCustomItem, quantity: qtyNum }]
        };
      });
      setSplitBills(updatedSplit);

      Swal.fire({
        icon: 'success',
        title: 'เพิ่มรายการในทุกบิลย่อยแล้ว',
        text: `เพิ่ม "${newCustomItem.name}" ลงในบิลย่อยทั้ง ${splitBills.length} บิลเรียบร้อย`,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500
      });
    } else {
      setCart([...cart, { ...newCustomItem, quantity: qtyNum }]);
      Swal.fire({
        icon: 'success',
        title: isSplitMode ? `เพิ่มในบิลที่ ${activeSplitIndex + 1} แล้ว` : 'เพิ่มรายการอื่นๆ แล้ว',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1000
      });
    }

    setCustomItemName('');
    setCustomItemPrice('');
    setCustomItemQty(1);
  };

  // จัดการเพิ่มส่วนลดเพิ่มเติม (หลายรายการ)
  const handleAddDiscount = () => {
    if (!newDiscountReason.trim()) {
      Swal.fire({ icon: 'warning', title: 'ระบุเหตุผล/ชื่อส่วนลด', confirmButtonColor: 'var(--secondary)' });
      return;
    }
    const val = Number(newDiscountValue);
    if (isNaN(val) || val <= 0) {
      Swal.fire({ icon: 'warning', title: 'ระบุมูลค่าส่วนลดที่ถูกต้อง', confirmButtonColor: 'var(--secondary)' });
      return;
    }

    const newDisc = {
      id: `DISC_${additionalDiscounts.length + 1}_${val}`,
      reason: newDiscountReason.trim(),
      type: newDiscountType,
      value: val
    };

    const updated = [...additionalDiscounts, newDisc];
    const newReason = JSON.stringify(updated);
    setDiscountReason(newReason);

    let total = 0;
    updated.forEach(d => {
      if (d.type === 'flat' || d.type === 'บาท') {
        total += Number(d.value);
      } else {
        total += (regularCartSubtotal * Number(d.value)) / 100;
      }
    });
    setDiscountValue(total);
    setDiscountType('multiple');

    if (isSplitMode && discountTarget === 'all') {
      const currentSnapshot = {
        idSuffix: String(activeSplitIndex + 1).padStart(2, '0'),
        hn: selectedHn,
        patientSearchText: patientSearchText,
        cart: [...cart],
        discountType: 'multiple',
        discountValue: total,
        discountReason: newReason,
        selectedPromoCode: selectedPromoCode,
        paymentMethod: paymentMethod,
        selectedBankId: selectedBankId,
        slipAttached: slipAttached,
        slipName: slipName,
        status: 'ชำระเงินแล้ว'
      };

      const updatedSplit = splitBills.map((b, idx) => {
        if (idx === activeSplitIndex) return currentSnapshot;

        let bDiscounts = [];
        if (b.discountReason) {
          try {
            const parsed = JSON.parse(b.discountReason);
            if (Array.isArray(parsed)) bDiscounts = parsed;
          } catch {
            /* ignore parse error */
          }
        }
        if (bDiscounts.length === 0 && Number(b.discountValue) > 0) {
          bDiscounts = [{
            id: `legacy_${b.idSuffix || idx}`,
            reason: b.discountReason || 'ส่วนลดพิเศษ',
            type: b.discountType || 'flat',
            value: Number(b.discountValue)
          }];
        }

        const bUpdatedDiscounts = [...bDiscounts, { ...newDisc, id: `DISC_${bDiscounts.length + 1}_${idx}` }];

        const bCart = b.cart || [];
        const flatSub = bCart
          .filter(item => !item.isReward && !(item.description || '').includes('[price_type:percent]'))
          .reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const percentSum = bCart
          .filter(item => !item.isReward && (item.description || '').includes('[price_type:percent]'))
          .reduce((sum, item) => sum + (((item.price / 100) * flatSub) * item.quantity), 0);
        const bRegSubtotal = flatSub + percentSum;

        let bTotal = 0;
        bUpdatedDiscounts.forEach(d => {
          if (d.type === 'flat' || d.type === 'บาท') {
            bTotal += Number(d.value);
          } else {
            bTotal += (bRegSubtotal * Number(d.value)) / 100;
          }
        });

        return {
          ...b,
          discountReason: JSON.stringify(bUpdatedDiscounts),
          discountValue: bTotal,
          discountType: 'multiple'
        };
      });

      setSplitBills(updatedSplit);

      Swal.fire({
        icon: 'success',
        title: 'เพิ่มส่วนลดในทุกบิลย่อยแล้ว',
        text: `เพิ่มส่วนลด "${newDisc.reason}" ลงในบิลย่อยทั้ง ${splitBills.length} บิลเรียบร้อย`,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500
      });
    }

    setNewDiscountReason('');
    setNewDiscountValue('');
  };

  const handleDeleteDiscount = (id) => {
    const discToDelete = additionalDiscounts.find(d => d.id === id);
    const updated = additionalDiscounts.filter(d => d.id !== id);
    let newReason = '';
    let total = 0;
    let newType = 'flat';

    if (updated.length === 0) {
      setDiscountReason('');
      setDiscountValue(0);
      setDiscountType('flat');
    } else {
      newReason = JSON.stringify(updated);
      setDiscountReason(newReason);
      updated.forEach(d => {
        if (d.type === 'flat' || d.type === 'บาท') {
          total += Number(d.value);
        } else {
          total += (regularCartSubtotal * Number(d.value)) / 100;
        }
      });
      setDiscountValue(total);
      setDiscountType('multiple');
      newType = 'multiple';
    }

    if (isSplitMode && discountTarget === 'all' && discToDelete) {
      const currentSnapshot = {
        idSuffix: String(activeSplitIndex + 1).padStart(2, '0'),
        hn: selectedHn,
        patientSearchText: patientSearchText,
        cart: [...cart],
        discountType: newType,
        discountValue: total,
        discountReason: newReason,
        selectedPromoCode: selectedPromoCode,
        paymentMethod: paymentMethod,
        selectedBankId: selectedBankId,
        slipAttached: slipAttached,
        slipName: slipName,
        status: 'ชำระเงินแล้ว'
      };

      const updatedSplit = splitBills.map((b, idx) => {
        if (idx === activeSplitIndex) return currentSnapshot;

        let bDiscounts = [];
        if (b.discountReason) {
          try {
            const parsed = JSON.parse(b.discountReason);
            if (Array.isArray(parsed)) bDiscounts = parsed;
          } catch {
            /* ignore parse error */
          }
        }

        const bFiltered = bDiscounts.filter(d => d.id !== id && d.reason !== discToDelete.reason);
        if (bFiltered.length === 0) {
          return {
            ...b,
            discountReason: '',
            discountValue: 0,
            discountType: 'flat'
          };
        }

        const bCart = b.cart || [];
        const flatSub = bCart
          .filter(item => !item.isReward && !(item.description || '').includes('[price_type:percent]'))
          .reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const percentSum = bCart
          .filter(item => !item.isReward && (item.description || '').includes('[price_type:percent]'))
          .reduce((sum, item) => sum + (((item.price / 100) * flatSub) * item.quantity), 0);
        const bRegSubtotal = flatSub + percentSum;

        let bTotal = 0;
        bFiltered.forEach(d => {
          if (d.type === 'flat' || d.type === 'บาท') {
            bTotal += Number(d.value);
          } else {
            bTotal += (bRegSubtotal * Number(d.value)) / 100;
          }
        });

        return {
          ...b,
          discountReason: JSON.stringify(bFiltered),
          discountValue: bTotal,
          discountType: 'multiple'
        };
      });

      setSplitBills(updatedSplit);
    }
  };

  // เพิ่มของรางวัลเข้าตะกร้าสินค้า
  const addRewardToCart = (reward) => {
    // 1. ตรวจสอบว่าในตะกร้ามีของรางวัลแล้วหรือยัง (จำกัด 1 รายการต่อใบเสร็จ)
    const hasReward = cart.some(i => i.isReward);
    if (hasReward) {
      Swal.fire({
        icon: 'warning',
        title: 'จำกัดของรางวัล',
        text: 'สามารถแลกของรางวัลได้สูงสุด 1 รายการต่อ 1 ใบเสร็จเท่านั้น (หากต้องการแลกเพิ่ม กรุณาแยกใบเสร็จใหม่)',
        confirmButtonColor: 'var(--secondary)'
      });
      return;
    }

    // 2. ตรวจสอบแต้มสะสม
    if (patientPointsBalance < reward.points) {
      Swal.fire({
        icon: 'error',
        title: 'คะแนนไม่เพียงพอ',
        text: `คะแนนสะสมของลูกค้าไม่เพียงพอ (ต้องการ ${reward.points} คะแนน, มีอยู่ ${patientPointsBalance} คะแนน)`,
        confirmButtonColor: 'var(--secondary)'
      });
      return;
    }

    // 3. ประกอบข้อมูลไอเทมรางวัล
    const rewardCartItem = {
      code: reward.code,
      name: reward.type === 'สินค้า' ? `[แลกของรางวัล] ${reward.name}` : `[แลกส่วนลด] ${reward.name}`,
      price: reward.type === 'สินค้า' ? Number(reward.fullPrice) : 0,
      quantity: 1,
      category: 'ของรางวัล',
      isReward: true,
      rewardType: reward.type,
      pointsCost: Number(reward.points),
      discountVal: reward.type === 'ส่วนลด' ? Number(reward.value) : 0,
      rewardCondition: reward.condition
    };

    setCart([...cart, rewardCartItem]);
    
    Swal.fire({
      icon: 'success',
      title: 'เพิ่มของรางวัลแล้ว',
      text: `เพิ่ม ${reward.name} ลงในตะกร้าสินค้าเรียบร้อย`,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 1500
    });
  };

  // ลดจำนวนในตะกร้า
  const decreaseQty = (code) => {
    const existing = cart.find(c => c.code === code);
    if (!existing) return;
    if (existing.quantity === 1) {
      setCart(cart.filter(c => c.code !== code));
    } else {
      setCart(cart.map(c => c.code === code ? { ...c, quantity: c.quantity - 1 } : c));
    }
  };

  // ลบรายการในตะกร้า
  const removeFromCart = (code) => {
    setCart(cart.filter(c => c.code !== code));
  };

  // ค้นหารายการของรางวัลในตะกร้า (จำกัดที่ 1 รายการ)
  const rewardItem = useMemo(() => {
    return cart.find(item => item.isReward);
  }, [cart]);

  // คำนวณยอดรวมของสินค้าปกติ (ไม่รวมของรางวัล) - รองรับราคาแบบเปอร์เซ็นต์
  const regularCartSubtotal = useMemo(() => {
    const flatSub = cart
      .filter(item => !item.isReward && !(item.description || '').includes('[price_type:percent]'))
      .reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const percentSum = cart
      .filter(item => !item.isReward && (item.description || '').includes('[price_type:percent]'))
      .reduce((sum, item) => sum + (((item.price / 100) * flatSub) * item.quantity), 0);
    return flatSub + percentSum;
  }, [cart]);

  // คำนวณยอดรวมทั้งหมดในตะกร้า (สินค้าปกติ + ของรางวัล)
  const cartSubtotal = useMemo(() => {
    const flatSub = cart
      .filter(item => !(item.description || '').includes('[price_type:percent]'))
      .reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const percentSum = cart
      .filter(item => (item.description || '').includes('[price_type:percent]'))
      .reduce((sum, item) => sum + (((item.price / 100) * flatSub) * item.quantity), 0);
    return flatSub + percentSum;
  }, [cart]);

  // พาร์สข้อมูลส่วนลดเพิ่มเติมทั้งหมดที่มีอยู่ในปัจจุบัน
  const additionalDiscounts = useMemo(() => {
    if (!discountReason) return [];
    try {
      const parsed = JSON.parse(discountReason);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* ignore parse error */
    }
    if (Number(discountValue) > 0) {
      return [{ id: 'legacy', reason: discountReason || 'ส่วนลดพิเศษ', type: discountType, value: Number(discountValue) }];
    }
    return [];
  }, [discountReason, discountValue, discountType]);

  // คำนวณยอดรวมส่วนลดเพิ่มเติมทั้งหมดที่มีอยู่ในระบบ
  const discountAmount = useMemo(() => {
    let total = 0;
    additionalDiscounts.forEach(d => {
      if (d.type === 'flat' || d.type === 'บาท') {
        total += Number(d.value);
      } else {
        total += (regularCartSubtotal * Number(d.value)) / 100;
      }
    });
    return Math.min(total, regularCartSubtotal);
  }, [additionalDiscounts, regularCartSubtotal]);

  // ยอดสุทธิก่อนหักของรางวัล
  const netBeforeRewards = useMemo(() => {
    return Math.max(0, regularCartSubtotal - discountAmount);
  }, [regularCartSubtotal, discountAmount]);

  // คำนวณยอดส่วนลดแลกของรางวัล (On-Top)
  const rewardsDiscountAmount = useMemo(() => {
    if (!rewardItem) return 0;
    if (rewardItem.rewardType === 'สินค้า') {
      // แลกสินค้าฟรี: ส่วนลด 100% ของราคาสินค้านั้น
      return rewardItem.price * rewardItem.quantity;
    } else if (rewardItem.rewardType === 'ส่วนลด') {
      // แลกส่วนลด: คำนวณแบบ On-Top
      if (rewardItem.rewardCondition === 'ส่วนลดเงินสด') {
        return Math.min(rewardItem.discountVal * rewardItem.quantity, netBeforeRewards);
      } else if (rewardItem.rewardCondition === 'ส่วนลดเป็นเปอร์เซ็นต์') {
        return Math.min((netBeforeRewards * rewardItem.discountVal) / 100, netBeforeRewards);
      }
    }
    return 0;
  }, [rewardItem, netBeforeRewards]);

  // ยอดสุทธิรวมสุดท้ายที่ต้องชำระ
  const cartTotal = useMemo(() => {
    const total = cartSubtotal - discountAmount - rewardsDiscountAmount;
    return Math.max(0, total);
  }, [cartSubtotal, discountAmount, rewardsDiscountAmount]);

  // เลือกคูปองโปรโมชั่น
  const handleApplyPromotion = (promoCode) => {
    if (!promoCode) {
      setSelectedPromoCode('');
      setDiscountValue(0);
      setDiscountReason('');

      if (isSplitMode && discountTarget === 'all') {
        const currentSnapshot = {
          idSuffix: String(activeSplitIndex + 1).padStart(2, '0'),
          hn: selectedHn,
          patientSearchText: patientSearchText,
          cart: [...cart],
          discountType: 'flat',
          discountValue: 0,
          discountReason: '',
          selectedPromoCode: '',
          paymentMethod: paymentMethod,
          selectedBankId: selectedBankId,
          slipAttached: slipAttached,
          slipName: slipName,
          status: 'ชำระเงินแล้ว'
        };

        const updatedSplit = splitBills.map((b, idx) => {
          if (idx === activeSplitIndex) return currentSnapshot;
          return {
            ...b,
            selectedPromoCode: '',
            discountValue: 0,
            discountReason: '',
            discountType: 'flat'
          };
        });
        setSplitBills(updatedSplit);
      }
      return;
    }

    const promo = activePromotions.find(p => p.code === promoCode);
    if (!promo) return;

    const promoReason = `โปรโมชั่น: ${promo.name} (${promo.description})`;
    setSelectedPromoCode(promo.code);
    setDiscountType(promo.type); // flat หรือ percentage
    setDiscountValue(promo.value);
    setDiscountReason(promoReason);

    if (isSplitMode && discountTarget === 'all') {
      const currentSnapshot = {
        idSuffix: String(activeSplitIndex + 1).padStart(2, '0'),
        hn: selectedHn,
        patientSearchText: patientSearchText,
        cart: [...cart],
        discountType: promo.type,
        discountValue: promo.value,
        discountReason: promoReason,
        selectedPromoCode: promo.code,
        paymentMethod: paymentMethod,
        selectedBankId: selectedBankId,
        slipAttached: slipAttached,
        slipName: slipName,
        status: 'ชำระเงินแล้ว'
      };

      const updatedSplit = splitBills.map((b, idx) => {
        if (idx === activeSplitIndex) return currentSnapshot;
        return {
          ...b,
          selectedPromoCode: promo.code,
          discountType: promo.type,
          discountValue: promo.value,
          discountReason: promoReason
        };
      });
      setSplitBills(updatedSplit);

      Swal.fire({
        icon: 'success',
        title: 'ใช้โปรโมชั่นกับทุกบิลย่อยแล้ว',
        text: `ปรับใช้โปรโมชั่น "${promo.name}" กับบิลย่อยทั้ง ${splitBills.length} บิลเรียบร้อย`,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500
      });
    }
  };

  // แนบไฟล์สลิปจริงและอัปโหลดไปเซิร์ฟเวอร์
  const handleSlipUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const today = new Date();
      const beYear = today.getFullYear() + 543;
      const yy = String(beYear).slice(-2);
      const folderName = 'Income-expenses';
      const fileName = `${yy}-IN-${file.name}`;

      fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder: folderName,
          filename: fileName,
          base64Data: reader.result
        })
      })
      .then(res => {
        if (!res.ok) throw new Error('อัปโหลดสลิปใบเสร็จล้มเหลว');
        return res.json();
      })
      .then(data => {
        setSlipAttached(true);
        setSlipName(data.url);
        Swal.fire({
          icon: 'success',
          title: 'อัปโหลดสำเร็จ',
          text: `แนบสลิป ${file.name} เรียบร้อย`,
          timer: 1200,
          showConfirmButton: false
        });
      })
      .catch(err => {
        console.error(err);
        Swal.fire('อัปโหลดล้มเหลว', 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์', 'error');
      });
    };
    reader.readAsDataURL(file);
  };

  // บันทึกบิล (draft = บันทึกร่าง, paid = รับชำระเงินสำเร็จ)
  const saveInvoice = (statusType) => {
    if (!selectedHn) {
      Swal.fire({ icon: 'warning', title: 'กรุณาเลือกผู้รับบริการ', confirmButtonColor: 'var(--secondary)' });
      return;
    }
    if (cart.length === 0) {
      Swal.fire({ icon: 'warning', title: 'ไม่มีสินค้าในตะกร้า', confirmButtonColor: 'var(--secondary)' });
      return;
    }
    if (discountAmount > 0 && !discountReason.trim()) {
      Swal.fire({ 
        icon: 'warning', 
        title: 'ระบุเหตุผลส่วนลด', 
        text: 'เนื่องจากมีการให้ส่วนลด กรุณากรอกระบุเหตุผลส่วนลดด้วยครับ', 
        confirmButtonColor: 'var(--secondary)' 
      });
      return;
    }
    if (paymentMethod === 'โอนเงิน' && statusType === 'ชำระเงินแล้ว') {
      if (!selectedBankId) {
        Swal.fire({ icon: 'warning', title: 'กรุณาเลือกบัญชีธนาคารโอนเข้า', confirmButtonColor: 'var(--secondary)' });
        return;
      }
    }

    const proceedSave = (editReason = '') => {
      const today = new Date();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');

      const billId = (currentUser?.role === 'Admin' && customBillId.trim()) ? customBillId.trim() : generateNextBillId();

      // ตรวจสอบเลขที่ใบเสร็จซ้ำในระบบ (ป้องกันการทับบิลเดิมที่ไม่ใช่บิลร่าง)
      const isDuplicate = receipts.some(r => r.id === billId && r.id !== editingReceiptId);
      if (isDuplicate) {
        Swal.fire({
          icon: 'error',
          title: 'เลขที่ใบเสร็จซ้ำในระบบ',
          text: `หมายเลขใบเสร็จ ${billId} มีการใช้งานไปแล้ว กรุณากรอกเลขอื่น`,
          confirmButtonColor: 'var(--secondary)'
        });
        return;
      }

      const invoiceDate = (currentUser?.role === 'Admin' && customDate) ? customDate : `${today.getFullYear()}-${mm}-${dd}`;

      const flatSub = cart
        .filter(item => !item.isReward && !(item.description || '').includes('[price_type:percent]'))
        .reduce((sum, item) => sum + (item.price * item.quantity), 0);

      const finalItems = cart.map(item => {
        const isPercent = (item.description || '').includes('[price_type:percent]');
        const calculatedPrice = isPercent ? ((item.price / 100) * flatSub) : item.price;
        const cleanName = item.name.replace(/\([\d.]+%\)$/, '').trim();
        const displayName = isPercent ? `${cleanName} (${item.price}%)` : cleanName;

        return {
          code: item.code,
          name: displayName,
          price: calculatedPrice,
          quantity: item.quantity,
          type: item.category,
          sessionsPerUnit: item.sessionsPerUnit || 1
        };
      });

      if (rewardItem) {
        finalItems.push({
          code: 'REWARD_REDEEM',
          name: `แลกของรางวัล ${rewardItem.name.replace('[แลกของรางวัล] ', '').replace('[แลกส่วนลด] ', '')} (${rewardItem.code})`,
          price: 0,
          quantity: rewardItem.pointsCost,
          type: 'คะแนน',
          sessionsPerUnit: 1
        });
      }

      // แนบประวัติการแก้ไขบิล
      if (editingReceiptId && editReason) {
        const originalReceipt = receipts.find(r => r.id === editingReceiptId);
        const existingAudit = originalReceipt && originalReceipt.items ? originalReceipt.items.find(it => it && it.isAudit) : {};
        const auditItem = {
          ...existingAudit,
          isAudit: true,
          editReason: editReason,
          editBy: currentUser?.fullname || currentUser?.username || 'ผู้ดูแลระบบ',
          editAt: new Date().toISOString()
        };
        
        if (statusType === 'ยกเลิก') {
          auditItem.voidReason = editReason;
          auditItem.voidBy = currentUser?.fullname || currentUser?.username || 'ผู้ดูแลระบบ';
          auditItem.voidAt = new Date().toISOString();
        }

        finalItems.push(auditItem);
      }

      const newInvoice = {
        id: billId,
        hn: selectedHn,
        date: invoiceDate, // วันที่ออกเอกสารจริง
        items: finalItems,
        discountType,
        discountValue: Number(discountValue),
        discountReason,
        promotionId: selectedPromoCode,
        rewardId: rewardItem ? rewardItem.code : '',
        rewardDiscountAmount: rewardsDiscountAmount, // บันทึกยอดส่วนลดจากการแลกรางวัล
        paymentMethod,
        bankAccountId: paymentMethod === 'โอนเงิน' ? selectedBankId : '',
        slipUrl: paymentMethod === 'โอนเงิน' && slipAttached ? slipName : '',
        status: statusType, // 'ชำระเงินแล้ว' หรือ 'รอชำระเงิน'
        totalAmount: cartTotal,
        created_at: new Date().toISOString(),
        createdBy: currentUser?.fullname || 'ผู้ดูแลระบบ'
      };

      onSaveReceipt(newInvoice);

      if (statusType === 'ชำระเงินแล้ว') {
        Swal.fire({
          icon: 'success',
          title: 'ออกใบเสร็จสำเร็จ!',
          text: `หมายเลขใบเสร็จ: ${billId} | อัปเดตคอร์สเข้าระบบทันที`,
          showConfirmButton: true,
          confirmButtonText: 'พิมพ์ใบเสร็จ (PDF)',
          confirmButtonColor: 'var(--secondary)',
          showCancelButton: true,
          cancelButtonText: 'ปิดหน้าต่าง'
        }).then((result) => {
          if (result.isConfirmed) {
            window.printReceiptById(billId);
          }
        });
      } else {
        Swal.fire({
          icon: 'info',
          title: 'บันทึกร่างใบแจ้งหนี้สำเร็จ!',
          text: `หมายเลขร่าง: ${billId} (ยอดเงินและคอร์สจะยังไม่ถูกคำนวณเข้าระบบ)`,
          confirmButtonColor: 'var(--secondary)'
        });
      }

      // ล้างฟอร์ม
      handleResetForm();
    };

    if (editingReceiptId) {
      Swal.fire({
        title: 'ระบุเหตุผลในการแก้ไขเอกสาร',
        input: 'text',
        inputPlaceholder: 'กรุณาระบุเหตุผล เช่น คีย์ยอดเงินผิด, เปลี่ยนช่องชำระเงิน ฯลฯ',
        inputValidator: (value) => {
          if (!value || !value.trim()) {
            return 'กรุณากรอกเหตุผลในการแก้ไขเอกสารครับ';
          }
        },
        showCancelButton: true,
        confirmButtonText: 'บันทึกการแก้ไข',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: 'var(--secondary)'
      }).then((result) => {
        if (result.isConfirmed) {
          proceedSave(result.value.trim());
        }
      });
    } else {
      proceedSave();
    }
  };

  // ยอดรวมทั้งหมดของทุกบิลย่อยในโหมดแบ่งบิล
  const allSplitTotal = useMemo(() => {
    if (!isSplitMode || splitBills.length === 0) return cartTotal;
    return splitBills.reduce((sum, b, idx) => {
      const fin = calculateSingleBillFinancials(b, idx === activeSplitIndex);
      return sum + fin.total;
    }, 0);
  }, [isSplitMode, splitBills, activeSplitIndex, cartTotal]);

  const previewMasterBillId = useMemo(() => {
    if (currentUser?.role === 'Admin' && customBillId.trim()) {
      return customBillId.trim();
    }
    return generateNextBillId();
  }, [currentUser, customBillId, receipts]);

  // บันทึกบิลในโหมดแบ่งบิล (Split Bill)
  const saveSplitInvoices = (statusType) => {
    // 1. รวม Snapshot ล่าสุดของแท็บที่กำลังเปิดอยู่
    const currentTabSnapshot = {
      idSuffix: String(activeSplitIndex + 1).padStart(2, '0'),
      hn: selectedHn,
      patientSearchText: patientSearchText,
      cart: [...cart],
      discountType: discountType,
      discountValue: discountValue,
      discountReason: discountReason,
      selectedPromoCode: selectedPromoCode,
      paymentMethod: paymentMethod,
      selectedBankId: selectedBankId,
      slipAttached: slipAttached,
      slipName: slipName,
      status: statusType
    };
    const allTabs = splitBills.map((b, idx) => idx === activeSplitIndex ? { ...b, ...currentTabSnapshot } : b);

    // 2. ตรวจสอบความถูกต้องของทุกบิล
    for (let i = 0; i < allTabs.length; i++) {
      const tab = allTabs[i];
      if (!tab.hn) {
        Swal.fire({
          icon: 'warning',
          title: `บิลย่อยที่ ${i + 1} ยังไม่ได้เลือกผู้รับบริการ`,
          text: 'กรุณาเลือกผู้รับบริการให้ครบทุกบิลย่อยก่อนทำรายการครับ',
          confirmButtonColor: 'var(--secondary)'
        }).then(() => {
          handleSwitchSplitTab(i);
        });
        return;
      }
      if (!tab.cart || tab.cart.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: `บิลย่อยที่ ${i + 1} ยังไม่มีรายการสินค้า`,
          text: 'กรุณาเลือกรายการสินค้าหรือบริการอย่างน้อย 1 รายการในแต่ละบิลย่อยครับ',
          confirmButtonColor: 'var(--secondary)'
        }).then(() => {
          handleSwitchSplitTab(i);
        });
        return;
      }
      const fin = calculateSingleBillFinancials(tab, i === activeSplitIndex);
      if (fin.discountAmount > 0 && !tab.discountReason) {
        Swal.fire({
          icon: 'warning',
          title: `ระบุเหตุผลส่วนลดในบิลย่อยที่ ${i + 1}`,
          text: 'เนื่องจากมีการให้ส่วนลด กรุณากรอกระบุเหตุผลส่วนลดด้วยครับ',
          confirmButtonColor: 'var(--secondary)'
        }).then(() => {
          handleSwitchSplitTab(i);
        });
        return;
      }
    }

    // ตรวจสอบช่องทางการชำระเงิน
    if (paymentMode === 'consolidated') {
      if (consolidatedPaymentMethod === 'โอนเงิน' && statusType === 'ชำระเงินแล้ว' && !consolidatedBankId) {
        Swal.fire({
          icon: 'warning',
          title: 'กรุณาเลือกบัญชีธนาคารคลินิก',
          text: 'สำหรับการชำระเงินรวมยอดเดียวผ่านการโอนเงิน กรุณาเลือกบัญชีธนาคารโอนเข้าด้วยครับ',
          confirmButtonColor: 'var(--secondary)'
        });
        return;
      }
    } else {
      // Separate payment validation
      for (let i = 0; i < allTabs.length; i++) {
        const tab = allTabs[i];
        if (tab.paymentMethod === 'โอนเงิน' && statusType === 'ชำระเงินแล้ว' && !tab.selectedBankId) {
          Swal.fire({
            icon: 'warning',
            title: `บิลย่อยที่ ${i + 1} ยังไม่ได้เลือกบัญชีธนาคาร`,
            text: 'สำหรับการชำระเงินแยกบิล กรุณาเลือกบัญชีธนาคารโอนเข้าของแต่ละบิลด้วยครับ',
            confirmButtonColor: 'var(--secondary)'
          }).then(() => {
            handleSwitchSplitTab(i);
          });
          return;
        }
      }
    }

    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const invoiceDate = (currentUser?.role === 'Admin' && customDate) ? customDate : `${today.getFullYear()}-${mm}-${dd}`;
    const masterBillId = previewMasterBillId;

    const isDuplicate = receipts.some(r => r.id === masterBillId || (r.id && r.id.startsWith(`${masterBillId}-`)));
    if (isDuplicate) {
      Swal.fire({
        icon: 'error',
        title: 'เลขที่เอกสารซ้ำในระบบ',
        text: `หมายเลขเอกสาร ${masterBillId} มีการใช้งานไปแล้ว กรุณาระบุเลขอื่น`,
        confirmButtonColor: 'var(--secondary)'
      });
      return;
    }

    const finalInvoices = allTabs.map((tab, idx) => {
      const subBillId = `${masterBillId}-${String(idx + 1).padStart(2, '0')}`;
      const fin = calculateSingleBillFinancials(tab, idx === activeSplitIndex);

      const flatSub = tab.cart
        .filter(item => !item.isReward && !(item.description || '').includes('[price_type:percent]'))
        .reduce((sum, item) => sum + (item.price * item.quantity), 0);

      const finalItems = tab.cart.map(item => {
        const isPercent = (item.description || '').includes('[price_type:percent]');
        const calculatedPrice = isPercent ? ((item.price / 100) * flatSub) : item.price;
        const cleanName = item.name.replace(/\([\d.]+%\)$/, '').trim();
        const displayName = isPercent ? `${cleanName} (${item.price}%)` : cleanName;

        return {
          code: item.code,
          name: displayName,
          price: calculatedPrice,
          quantity: item.quantity,
          type: item.category,
          sessionsPerUnit: item.sessionsPerUnit || 1
        };
      });

      const rItem = tab.cart.find(item => item.isReward);
      if (rItem) {
        finalItems.push({
          code: 'REWARD_REDEEM',
          name: `แลกของรางวัล ${rItem.name.replace('[แลกของรางวัล] ', '').replace('[แลกส่วนลด] ', '')} (${rItem.code})`,
          price: 0,
          quantity: rItem.pointsCost,
          type: 'คะแนน',
          sessionsPerUnit: 1
        });
      }

      const finalPaymentMethod = paymentMode === 'consolidated' ? consolidatedPaymentMethod : tab.paymentMethod;
      const finalBankId = paymentMode === 'consolidated'
        ? (consolidatedPaymentMethod === 'โอนเงิน' ? consolidatedBankId : '')
        : (tab.paymentMethod === 'โอนเงิน' ? tab.selectedBankId : '');
      const finalSlipUrl = paymentMode === 'consolidated'
        ? (consolidatedPaymentMethod === 'โอนเงิน' && consolidatedSlipAttached ? consolidatedSlipName : '')
        : (tab.paymentMethod === 'โอนเงิน' && tab.slipAttached ? tab.slipName : '');
      const finalStatus = paymentMode === 'consolidated' ? statusType : (tab.status || statusType);

      return {
        id: subBillId,
        parentBillId: masterBillId,
        splitIndex: idx + 1,
        splitTotal: allTabs.length,
        hn: tab.hn,
        date: invoiceDate,
        items: finalItems,
        discountType: tab.discountType || 'flat',
        discountValue: Number(tab.discountValue) || 0,
        discountReason: tab.discountReason || '',
        promotionId: tab.selectedPromoCode || '',
        rewardId: rItem ? rItem.code : '',
        rewardDiscountAmount: fin.rewardsDiscountAmount,
        paymentMethod: finalPaymentMethod,
        bankAccountId: finalBankId,
        slipUrl: finalSlipUrl,
        status: finalStatus,
        totalAmount: fin.total,
        created_at: new Date().toISOString(),
        createdBy: currentUser?.fullname || 'ผู้ดูแลระบบ'
      };
    });

    onSaveReceipt(finalInvoices);

    const grandTotal = finalInvoices.reduce((s, i) => s + i.totalAmount, 0);

    if (statusType === 'ชำระเงินแล้ว') {
      Swal.fire({
        icon: 'success',
        title: 'ออกใบเสร็จแบ่งบิลสำเร็จ!',
        html: `
          <div style="text-align: left; font-size: 0.9rem;">
            <div style="margin-bottom: 0.5rem;"><strong>เลขที่เอกสารหลัก:</strong> <span style="font-family: monospace; color: var(--secondary); font-weight: bold;">${masterBillId}</span></div>
            <div style="margin-bottom: 0.5rem;">สร้างบิลย่อยเรียบร้อยแล้วทั้งหมด <strong>${finalInvoices.length}</strong> ใบ:</div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.5rem 0.75rem; margin-bottom: 0.75rem;">
              ${finalInvoices.map(inv => {
                const p = patients.find(pat => pat.hn === inv.hn);
                const name = p ? `${p.firstname} (น้อง${p.nickname})` : inv.hn;
                return `
                  <div style="display: flex; justify-content: space-between; padding: 0.25rem 0; border-bottom: 1px dashed #e2e8f0;">
                    <span><strong style="font-family: monospace;">${inv.id}:</strong> ${name}</span>
                    <span style="font-weight: bold; color: var(--secondary);">฿${inv.totalAmount.toLocaleString()}</span>
                  </div>
                `;
              }).join('')}
            </div>
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1rem; color: var(--secondary);">
              <span>ยอดรวมชำระทั้งสิ้น:</span>
              <span>฿${grandTotal.toLocaleString()}</span>
            </div>
          </div>
        `,
        showConfirmButton: true,
        confirmButtonText: 'พิมพ์ใบเสร็จทั้งหมด (PDF)',
        confirmButtonColor: 'var(--secondary)',
        showCancelButton: true,
        cancelButtonText: 'ปิดหน้าต่าง'
      }).then((result) => {
        if (result.isConfirmed) {
          if (window.printReceiptDirect) {
            window.printReceiptDirect(finalInvoices);
          } else if (window.printReceiptById) {
            window.printReceiptById(finalInvoices.map(i => i.id));
          }
        }
      });
    } else {
      Swal.fire({
        icon: 'info',
        title: 'บันทึกร่างใบแจ้งหนี้แบ่งบิลสำเร็จ!',
        html: `
          <div style="text-align: left; font-size: 0.9rem;">
            <p>บันทึกร่างบิลย่อยคุมโดย <strong>${masterBillId}</strong> จำนวน <strong>${finalInvoices.length}</strong> ใบ เรียบร้อยแล้ว</p>
            <p>ยอดรวมทั้งสิ้น: <strong>฿${grandTotal.toLocaleString()}</strong></p>
          </div>
        `,
        confirmButtonColor: 'var(--secondary)'
      });
    }

    // ล้างฟอร์มและปิด Split Mode
    setSelectedHn('');
    setCart([]);
    setDiscountType('flat');
    setDiscountValue(0);
    setDiscountReason('');
    setSelectedPromoCode('');
    setPaymentMethod('เงินสด');
    setSelectedBankId('');
    setSlipAttached(false);
    setSlipName('');
    setIsSplitMode(false);
    setSplitBills([]);
    setActiveSplitIndex(0);
    setConsolidatedPaymentMethod('เงินสด');
    setConsolidatedBankId('');
    setConsolidatedSlipAttached(false);
    setConsolidatedSlipName('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="page-header">
        <h1 className="page-title">
          <ShoppingCart size={28} />
          ออกใบเสร็จรับเงิน (POS)
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {!editingReceiptId && (
            !isSplitMode ? (
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
                onClick={handleEnableSplitMode}
              >
                <Split size={16} /> แบ่งบิล / เพิ่มผู้รับบริการ (Split Bill)
              </button>
            ) : (
              <button 
                type="button" 
                className="btn btn-light" 
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderColor: '#d97706', color: '#d97706', fontWeight: 600 }}
                onClick={handleDisableSplitMode}
              >
                <RotateCcw size={14} /> ยกเลิกโหมดแบ่งบิล
              </button>
            )
          )}
          <button className="btn btn-danger" onClick={handleResetForm}>
            <RotateCcw size={16} />
            รีเซ็ตฟอร์ม (เคลียร์ตะกร้า)
          </button>
        </div>
      </div>

      {/* แถบและข้อมูลโหมดแบ่งบิล (Split Bill Mode) */}
      {isSplitMode && (
        <div style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          {/* Header แถบแบ่งบิล */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ 
                backgroundColor: 'var(--secondary)', 
                color: 'white', 
                padding: '0.35rem 0.6rem', 
                borderRadius: 'var(--radius-md)', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.35rem', 
                fontSize: '0.85rem', 
                fontWeight: 700 
              }}>
                <Split size={16} /> โหมดแบ่งบิล (Split Bill)
              </div>
              <span style={{ fontSize: '0.9rem', color: '#1e40af' }}>
                เลขที่เอกสารหลักคุมรายการ: <strong style={{ fontFamily: 'monospace', fontSize: '1rem' }}>{previewMasterBillId}</strong>
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem' }}>
              <span style={{ color: '#1e40af' }}>
                กำลังคีย์บิลที่: <strong>{activeSplitIndex + 1}</strong> จากทั้งหมด <strong>{splitBills.length}</strong> บิล
              </span>
              <span style={{ 
                backgroundColor: '#dbeafe', 
                color: '#1d4ed8', 
                padding: '0.2rem 0.6rem', 
                borderRadius: '12px', 
                fontWeight: 700 
              }}>
                ยอดรวมทุกบิล: ฿{allSplitTotal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* แถบแท็บสลับบิลย่อย */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {splitBills.map((b, idx) => {
              const p = patients.find(pat => pat.hn === (idx === activeSplitIndex ? selectedHn : b.hn));
              const name = p ? (p.nickname ? `น้อง${p.nickname}` : p.firstname) : ((idx === activeSplitIndex ? selectedHn : b.hn) || `ผู้รับบริการ ${idx + 1}`);
              const isActive = idx === activeSplitIndex;
              const fin = calculateSingleBillFinancials(b, isActive);
              const subBillCode = `${previewMasterBillId}-${String(idx + 1).padStart(2, '0')}`;

              return (
                <div
                  key={idx}
                  onClick={() => handleSwitchSplitTab(idx)}
                  style={{
                    padding: '0.6rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    backgroundColor: isActive ? 'var(--secondary)' : 'white',
                    color: isActive ? 'white' : 'var(--dark)',
                    border: isActive ? '2px solid var(--secondary)' : '1px solid #cbd5e1',
                    boxShadow: isActive ? 'var(--shadow-md)' : 'none',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ fontSize: '0.75rem', opacity: isActive ? 0.9 : 0.7, fontFamily: 'monospace' }}>
                        {subBillCode}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.95rem' }}>
                      บิลที่ {idx + 1}: {name}
                    </div>
                  </div>

                  <span style={{
                    fontSize: '0.8rem',
                    backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                    color: isActive ? 'white' : 'var(--secondary)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontWeight: 700
                  }}>
                    ฿{fin.total.toLocaleString()}
                  </span>

                  {splitBills.length > 2 && (
                    <button
                      type="button"
                      title="ลบบิลย่อยนี้"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveSplitTab(idx);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: isActive ? 'rgba(255,255,255,0.8)' : 'var(--danger)',
                        cursor: 'pointer',
                        padding: '0 2px',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '1rem',
                        marginLeft: '0.2rem'
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}

            {/* ปุ่มเพิ่มบิลย่อย */}
            <button
              type="button"
              className="btn btn-light"
              style={{
                padding: '0.6rem 1rem',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: 'white',
                border: '1px dashed #0284c7',
                color: '#0284c7',
                fontWeight: 600
              }}
              onClick={handleAddSplitTab}
            >
              <Plus size={16} /> เพิ่มบิลย่อย
            </button>
          </div>
        </div>
      )}

      {editingReceiptId && (
        <div style={{ 
          backgroundColor: '#fff3cd', 
          color: '#856404', 
          padding: '1rem 1.25rem', 
          borderRadius: 'var(--radius-md)', 
          border: '1px solid #ffeeba', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div>
            <strong>⚠️ โหมดแก้ไขเอกสารการเงิน เลขที่: {editingReceiptId}</strong>
            {editingReceiptDate && <span style={{ marginLeft: '0.75rem', fontSize: '0.9rem' }}>(วันที่เดิม: {new Date(editingReceiptDate).toLocaleDateString('th-TH')})</span>}
          </div>
          <button 
            type="button" 
            className="btn btn-danger" 
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            onClick={handleResetForm}
          >
            <RotateCcw size={14} /> ยกเลิกการแก้ไข / ล้างฟอร์ม
          </button>
        </div>
      )}

      <div className="pos-layout">
        
        {/* ค้นหาผู้ป่วยและรายการบริการ (ฝั่งซ้าย) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* ข้อมูลลูกค้า */}
          <div className="card-3xl">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>ข้อมูลผู้รับบริการ</h2>
              {selectedHn && (
                <div style={{
                  backgroundColor: '#e0efff',
                  color: '#0066cc',
                  padding: '0.25rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  <Coins size={14} />
                  คะแนนสะสมคงเหลือ: {patientPointsBalance.toLocaleString()} แต้ม
                </div>
              )}
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">เลือกผู้รับบริการ (ลูกค้า Active)</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text"
                  className="form-control"
                  placeholder="-- ค้นหาด้วย HN หรือชื่อเล่น --"
                  value={patientSearchText}
                  onChange={(e) => {
                    setPatientSearchText(e.target.value);
                    setSelectedHn('');
                    setShowPatientDropdown(true);
                  }}
                  onFocus={() => setShowPatientDropdown(true)}
                  onBlur={() => {
                    setTimeout(() => setShowPatientDropdown(false), 200);
                  }}
                  required
                />
                
                {showPatientDropdown && (
                  <div 
                    className="card-md"
                    style={{ 
                      position: 'absolute', 
                      top: '100%', 
                      left: 0, 
                      right: 0, 
                      maxHeight: '200px', 
                      overflowY: 'auto', 
                      zIndex: 1000,
                      backgroundColor: 'white',
                      border: '1px solid var(--border)',
                      boxShadow: 'var(--shadow-lg)',
                      borderRadius: 'var(--radius-md)',
                      marginTop: '0.25rem',
                      padding: '0.5rem 0'
                    }}
                  >
                    {filteredActivePatients.length === 0 ? (
                      <div style={{ padding: '0.5rem 1rem', color: 'var(--dark-light)', fontSize: '0.85rem' }}>
                        ไม่พบข้อมูลผู้ป่วย
                      </div>
                    ) : (
                      filteredActivePatients.map(p => (
                        <div 
                          key={p.hn} 
                          style={{ 
                            padding: '0.5rem 1rem', 
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            transition: 'background-color 0.2s',
                            backgroundColor: 'transparent'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--light)'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                          onClick={() => {
                            setSelectedHn(p.hn);
                            setPatientSearchText(`HN: ${p.hn} | ${formatPatientNickname(p.nickname)} (${p.title}${p.firstname} ${p.lastname})`);
                            setShowPatientDropdown(false);
                          }}
                        >
                          HN: {p.hn} | {formatPatientNickname(p.nickname)} ({p.title}{p.firstname} {p.lastname})
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* รายการสินค้าและบริการ */}
          <div className="card-3xl">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>รายการคอร์สและสินค้าเสริมพัฒนาการ</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
              {activeServices.map(service => (
                <div 
                  key={service.code}
                  style={{
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    backgroundColor: 'var(--white)',
                    transition: 'var(--transition)',
                    cursor: 'pointer'
                  }}
                  onClick={() => addToCart(service)}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--secondary)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-light)'}
                >
                  <div>
                    <span className={`badge ${service.category === 'บริการ' ? 'badge-info' : 'badge-secondary'}`} style={{ marginBottom: '0.5rem' }}>
                      {service.category}
                    </span>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--dark)' }}>{service.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--dark-light)', marginTop: '0.25rem' }}>
                      {(service.description || '').replace(/\[price_type:.*?\]/g, '').trim() || 'ไม่มีรายละเอียดเพิ่มเติม'}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', borderTop: '1px solid var(--border-light)', paddingTop: '0.5rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--secondary)' }}>
                      {(service.description || '').includes('[price_type:percent]') ? `${service.price}%` : `฿${service.price.toLocaleString()}`}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--dark-light)' }}>รหัส: {service.code}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* เพิ่มค่าบริการ/สินค้าอื่นๆ (Custom Fee) */}
            <div style={{ borderTop: '1px dashed var(--border-light)', marginTop: '1.5rem', paddingTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--secondary)' }}>
                  <Plus size={16} /> เพิ่มค่าบริการ / สินค้าอื่น ๆ เพิ่มเติม (Custom Item / Fee)
                </div>
                {isSplitMode && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 'var(--radius-full)', padding: '2px', fontSize: '0.75rem' }}>
                    <button
                      type="button"
                      style={{
                        border: 'none',
                        borderRadius: 'var(--radius-full)',
                        padding: '4px 10px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        transition: 'all 0.2s',
                        backgroundColor: customItemTarget === 'current' ? 'var(--secondary)' : 'transparent',
                        color: customItemTarget === 'current' ? '#fff' : '#64748b'
                      }}
                      onClick={() => setCustomItemTarget('current')}
                    >
                      เฉพาะบิลนี้ (บิลที่ {activeSplitIndex + 1})
                    </button>
                    <button
                      type="button"
                      style={{
                        border: 'none',
                        borderRadius: 'var(--radius-full)',
                        padding: '4px 10px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        transition: 'all 0.2s',
                        backgroundColor: customItemTarget === 'all' ? 'var(--secondary)' : 'transparent',
                        color: customItemTarget === 'all' ? '#fff' : '#64748b'
                      }}
                      onClick={() => setCustomItemTarget('all')}
                    >
                      ทุกบิลย่อย ({splitBills.length} บิล)
                    </button>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '2 1 200px' }}>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="ระบุชื่อรายการบริการ/สินค้าอื่นๆ..." 
                    value={customItemName} 
                    onChange={(e) => setCustomItemName(e.target.value)} 
                  />
                </div>
                <div style={{ flex: '1 1 100px', maxWidth: '150px' }}>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="ราคาต่อหน่วย..." 
                    value={customItemPrice} 
                    onChange={(e) => setCustomItemPrice(e.target.value)} 
                  />
                </div>
                <div style={{ flex: '1 1 100px', maxWidth: '120px' }}>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="จำนวน..." 
                    min="1"
                    value={customItemQty} 
                    onChange={(e) => setCustomItemQty(e.target.value)} 
                  />
                </div>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ padding: '0.5rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                  onClick={handlePostCustomItem}
                >
                  <Plus size={16} /> {isSplitMode && customItemTarget === 'all' ? `เพิ่มในทุกบิลย่อย (${splitBills.length})` : 'เพิ่มเข้ารายการ'}
                </button>
              </div>
            </div>
          </div>

          {/* เซกชันของรางวัลที่สามารถแลกได้ */}
          <div className="card-3xl" style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Coins size={20} color="var(--warning)" style={{ color: '#0066cc' }} />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>ของรางวัลที่สามารถแลกได้ด้วยคะแนนสะสม</h2>
            </div>
            
            {!selectedHn ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--dark-light)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}>
                กรุณาเลือกผู้รับบริการด้านบน เพื่อตรวจสอบของรางวัลที่สามารถแลกได้
              </div>
            ) : redeemableRewards.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--dark-light)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}>
                ไม่มีของรางวัลที่แต้มสะสมเพียงพอสำหรับการแลกในขณะนี้ (แต้มคงเหลือปัจจุบัน: {patientPointsBalance} แต้ม)
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                {redeemableRewards.map(reward => {
                  const usedCount = receipts ? receipts.filter(rec => (rec.promotionId === reward.code || rec.rewardId === reward.code) && rec.status !== 'ยกเลิก').length : 0;
                  const remainingQuota = Math.max(0, reward.maxUses - usedCount);
                  
                  return (
                    <div 
                      key={reward.code}
                      style={{
                        border: '1px solid #bcd8f3',
                        borderRadius: 'var(--radius-md)',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        backgroundColor: '#f0f7ff',
                        transition: 'var(--transition)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                          <span className="badge" style={{ backgroundColor: '#0066cc', color: 'white' }}>
                            ใช้ {reward.points} แต้ม
                          </span>
                          <span className="badge" style={{ backgroundColor: 'var(--secondary-light)', color: 'var(--secondary)' }}>
                            {reward.type}
                          </span>
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--dark)' }}>{reward.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--dark-light)', marginTop: '0.25rem' }}>
                          {reward.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--dark-light)', marginTop: '0.25rem' }}>
                          เหลือสิทธิ์: {remainingQuota} / {reward.maxUses} สิทธิ์
                        </div>
                      </div>
                      
                      <div style={{ marginTop: '1rem', borderTop: '1px solid #bcd8f3', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--dark-light)', display: 'flex', justifyContent: 'space-between' }}>
                          <span>มูลค่า:</span>
                          <span style={{ fontWeight: 600, color: 'var(--dark)' }}>
                            {reward.condition === 'ส่วนลดเป็นเปอร์เซ็นต์' 
                              ? `ส่วนลด ${reward.value}%` 
                              : reward.condition === 'ส่วนลดเงินสด' 
                                ? `ส่วนลด ฿${Number(reward.value).toLocaleString()}`
                                : reward.type === 'สินค้า' || reward.condition === 'แลกสินค้าฟรี'
                                  ? `ราคาปกติ ฿${Number(reward.fullPrice).toLocaleString()}`
                                  : `ส่วนลด ฿${Number(reward.value).toLocaleString()}`}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{
                            width: '100%',
                            padding: '0.4rem',
                            fontSize: '0.8rem',
                            backgroundColor: '#008080',
                            borderColor: '#008080',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.25rem'
                          }}
                          onClick={() => addRewardToCart(reward)}
                        >
                          <Coins size={12} />
                          แลกรางวัล
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* ตะกร้าสินค้าและการชำระเงิน (ฝั่งขวา) */}
        <div className="card-3xl" style={{ position: 'sticky', top: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingCart size={18} />
            ตะกร้าสินค้า ({cart.reduce((sum, i) => sum + i.quantity, 0)} ชิ้น)
          </h2>

          {/* รายการในตะกร้า */}
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--dark-light)' }}>
              ไม่มีสินค้าในตะกร้า คลิกบริการฝั่งซ้ายเพื่อเลือกรายการ
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '0.25rem', borderBottom: '1px solid var(--border-light)', marginBottom: '1rem' }}>
              {cart.map(item => (
                <div key={item.code} className="cart-item">
                  <div style={{ flex: 1 }}>
                    <div className="cart-item-name" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: item.isReward ? '#008080' : 'inherit', fontWeight: item.isReward ? 600 : 'normal' }}>
                      {item.isReward && <Gift size={14} color="#008080" />}
                      {item.name}
                    </div>
                    <div className="cart-item-price">
                      {item.isReward ? (
                        <span style={{ color: '#008080', fontSize: '0.8rem', fontWeight: 500 }}>
                          ใช้ {item.pointsCost} แต้ม {item.rewardType === 'สินค้า' ? `(ราคาปกติ ฿${item.price.toLocaleString()})` : `(ส่วนลด ฿${item.discountVal.toLocaleString()})`}
                        </span>
                      ) : (
                        `฿${item.price.toLocaleString()} x ${item.quantity}`
                      )}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="cart-qty-ctrl">
                      <button type="button" className="cart-qty-btn" onClick={() => decreaseQty(item.code)}>
                        <Minus size={12} />
                      </button>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{item.quantity}</span>
                      {!item.isReward ? (
                        <button type="button" className="cart-qty-btn" onClick={() => addToCart(item)}>
                          <Plus size={12} />
                        </button>
                      ) : (
                        <button type="button" className="cart-qty-btn" disabled style={{ opacity: 0.3, cursor: 'not-allowed' }}>
                          <Plus size={12} />
                        </button>
                      )}
                    </div>

                    <button 
                      type="button" 
                      onClick={() => removeFromCart(item.code)}
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ข้อมูลเอกสารใบเสร็จ (เฉพาะ Admin) */}
          {currentUser?.role === 'Admin' && (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.75rem', 
              padding: '1rem', 
              backgroundColor: 'var(--light)', 
              borderRadius: 'var(--radius-md)', 
              border: '1px solid var(--border)', 
              marginBottom: '1rem' 
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--secondary)' }}>
                ตั้งค่าเลขที่บิลและวันที่ (เฉพาะผู้ดูแลระบบ)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.5rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>เลขที่ใบเสร็จ</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem' }}
                    placeholder={generateNextBillId()}
                    value={customBillId} 
                    onChange={(e) => setCustomBillId(e.target.value)} 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>วันที่ออกใบเสร็จ</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem' }}
                    value={customDate} 
                    onChange={(e) => setCustomDate(e.target.value)} 
                  />
                </div>
              </div>
            </div>
          )}

          {/* โปรโมชั่นและส่วนลด */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
            {isSplitMode && (
              <div style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 'var(--radius-md)',
                padding: '0.5rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
                flexWrap: 'wrap'
              }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e40af' }}>
                  ขอบเขตส่วนลด:
                </span>
                <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#dbeafe', borderRadius: 'var(--radius-full)', padding: '2px', fontSize: '0.75rem' }}>
                  <button
                    type="button"
                    style={{
                      border: 'none',
                      borderRadius: 'var(--radius-full)',
                      padding: '3px 8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      transition: 'all 0.2s',
                      backgroundColor: discountTarget === 'current' ? 'var(--secondary)' : 'transparent',
                      color: discountTarget === 'current' ? '#fff' : '#1e40af'
                    }}
                    onClick={() => setDiscountTarget('current')}
                  >
                    เฉพาะบิลนี้ (บิลที่ {activeSplitIndex + 1})
                  </button>
                  <button
                    type="button"
                    style={{
                      border: 'none',
                      borderRadius: 'var(--radius-full)',
                      padding: '3px 8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      transition: 'all 0.2s',
                      backgroundColor: discountTarget === 'all' ? 'var(--secondary)' : 'transparent',
                      color: discountTarget === 'all' ? '#fff' : '#1e40af'
                    }}
                    onClick={() => setDiscountTarget('all')}
                  >
                    ทุกบิลย่อย ({splitBills.length} บิล)
                  </button>
                </div>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Tag size={14} /> เลือกใช้โปรโมชั่น / คูปอง
              </label>
              <select 
                className="form-control" 
                value={selectedPromoCode}
                onChange={(e) => handleApplyPromotion(e.target.value)}
              >
                <option value="">-- ไม่ใช้โปรโมชั่น --</option>
                {activePromotions.map(promo => (
                  <option key={promo.code} value={promo.code}>
                    {promo.code} | {promo.name}
                  </option>
                ))}
              </select>
            </div>

            {/* ส่วนลดแบบแมนนวล - แบบระบุได้หลายรายการ */}
            <div style={{ border: '1px solid var(--border-light)', padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--dark)' }}>
                  กำหนดส่วนลดเพิ่มเติม
                </div>
                {isSplitMode && (
                  <span style={{ fontSize: '0.7rem', color: discountTarget === 'all' ? '#2563eb' : '#64748b', fontWeight: 600 }}>
                    {discountTarget === 'all' ? `(ใช้กับทุกบิลย่อย ${splitBills.length} บิล)` : `(เฉพาะบิลที่ ${activeSplitIndex + 1})`}
                  </span>
                )}
              </div>

              {/* รายการส่วนลดที่เพิ่มแล้ว */}
              {additionalDiscounts.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.75rem' }}>
                  {additionalDiscounts.map((d) => {
                    const calculatedAmt = (d.type === 'flat' || d.type === 'บาท') 
                      ? Number(d.value) 
                      : ((regularCartSubtotal * Number(d.value)) / 100);
                    return (
                      <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fdf2f2', border: '1px solid #fbd5d5', borderRadius: 'var(--radius-sm)', padding: '0.35rem 0.5rem', fontSize: '0.8rem', color: '#c81e1e' }}>
                        <span style={{ fontWeight: 500, textAlign: 'left' }}>
                          {d.reason} {d.type === 'percentage' || d.type === 'percent' || d.type === 'percentage' ? `(${d.value}%)` : ''}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ fontWeight: 700 }}>-฿{calculatedAmt.toLocaleString()}</span>
                          <button 
                            type="button" 
                            onClick={() => handleDeleteDiscount(d.id)}
                            style={{ background: 'none', border: 'none', color: '#c81e1e', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ช่องกรอกเพิ่มส่วนลดใหม่ */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ fontSize: '0.8rem', padding: '0.3rem 0.5rem' }} 
                  placeholder="ระบุเหตุผล/ชื่อส่วนลด..." 
                  value={newDiscountReason} 
                  onChange={(e) => setNewDiscountReason(e.target.value)} 
                />
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <input 
                    type="number" 
                    className="form-control" 
                    style={{ fontSize: '0.8rem', padding: '0.3rem 0.5rem', flex: 1 }} 
                    placeholder="มูลค่า..." 
                    min="0.01"
                    step="any"
                    value={newDiscountValue} 
                    onChange={(e) => setNewDiscountValue(e.target.value)} 
                  />
                  <select 
                    className="form-control" 
                    style={{ fontSize: '0.8rem', padding: '0.3rem 0.5rem', width: '100px' }} 
                    value={newDiscountType} 
                    onChange={(e) => setNewDiscountType(e.target.value)}
                  >
                    <option value="flat">บาท (฿)</option>
                    <option value="percentage">เปอร์เซ็นต์ (%)</option>
                  </select>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ padding: '0.3rem 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', gap: '0.2rem' }}
                    onClick={handleAddDiscount}
                  >
                    <Plus size={12} /> {isSplitMode && discountTarget === 'all' ? `เพิ่มทุกบิล (${splitBills.length})` : 'เพิ่ม'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ยอดเงินสะสม */}
          <div style={{ backgroundColor: 'var(--light)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
            <div className="cart-summary-line">
              <span>ยอดรวมสินค้า</span>
              <span>฿{cartSubtotal.toLocaleString()}</span>
            </div>
            {discountAmount > 0 && (
              <div className="cart-summary-line" style={{ color: 'var(--danger)' }}>
                <span>{selectedPromoCode ? `ส่วนลดคูปอง/โปรโมชั่น (${selectedPromoCode})` : 'ส่วนลดเพิ่มเติม (Manual)'}</span>
                <span>-฿{discountAmount.toLocaleString()}</span>
              </div>
            )}
            {rewardsDiscountAmount > 0 && rewardItem && (
              <div className="cart-summary-line" style={{ color: '#008080', fontWeight: 600 }}>
                <span>{rewardItem.rewardType === 'สินค้า' ? 'ส่วนลดแลกแต้มสะสม (สินค้า)' : 'ส่วนลดแลกแต้มสะสม'}</span>
                <span>-฿{rewardsDiscountAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="cart-summary-total">
              <span>ยอดสุทธิ</span>
              <span>฿{cartTotal.toLocaleString()}</span>
            </div>
          </div>

          {/* สรุปภาพรวมแบ่งบิล (แสดงเมื่ออยู่ในโหมดแบ่งบิล) */}
          {isSplitMode && (
            <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0369a1', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Split size={16} /> สรุปภาพรวมแบ่งบิล ({splitBills.length} ผู้รับบริการ)
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0284c7', backgroundColor: '#e0f2fe', padding: '2px 6px', borderRadius: '4px' }}>
                  คุมด้วย: {previewMasterBillId}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto' }}>
                {splitBills.map((b, idx) => {
                  const p = patients.find(pat => pat.hn === (idx === activeSplitIndex ? selectedHn : b.hn));
                  const name = p ? (p.nickname ? `น้อง${p.nickname}` : p.firstname) : ((idx === activeSplitIndex ? selectedHn : b.hn) || `ผู้รับบริการ ${idx + 1}`);
                  const fin = calculateSingleBillFinancials(b, idx === activeSplitIndex);
                  const isCurrent = idx === activeSplitIndex;
                  return (
                    <div 
                      key={idx} 
                      onClick={() => handleSwitchSplitTab(idx)}
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        fontSize: '0.85rem', 
                        padding: '0.4rem 0.6rem', 
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: isCurrent ? '#e0f2fe' : 'transparent',
                        border: isCurrent ? '1px solid #bae6fd' : '1px solid transparent',
                        cursor: 'pointer',
                        color: isCurrent ? '#0369a1' : '#334155'
                      }}
                      title="คลิกเพื่อสลับแก้ไขบิลนี้"
                    >
                      <span style={{ fontWeight: isCurrent ? 700 : 500 }}>
                        {isCurrent ? '👉 ' : ''}บิลที่ {idx + 1} ({name}):
                      </span>
                      <span style={{ fontWeight: 700, color: isCurrent ? '#0284c7' : 'inherit' }}>
                        ฿{fin.total.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div style={{ borderTop: '1px dashed #7dd3fc', marginTop: '0.75rem', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.05rem', color: '#0369a1' }}>
                <span>ยอดรวมชำระทั้งสิ้น:</span>
                <span>฿{allSplitTotal.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* สลับรูปแบบการชำระเงิน (เมื่ออยู่ในโหมดแบ่งบิล) */}
          {isSplitMode && (
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e40af' }}>
                รูปแบบการชำระเงินของชุดบิลนี้
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  type="button"
                  className={`btn ${paymentMode === 'consolidated' ? 'btn-secondary' : 'btn-light'}`}
                  style={{ fontSize: '0.82rem', padding: '0.5rem 0.4rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                  onClick={() => setPaymentMode('consolidated')}
                >
                  <Users size={14} /> ชำระรวมยอดเดียว
                </button>
                <button
                  type="button"
                  className={`btn ${paymentMode === 'separate' ? 'btn-secondary' : 'btn-light'}`}
                  style={{ fontSize: '0.82rem', padding: '0.5rem 0.4rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                  onClick={() => setPaymentMode('separate')}
                >
                  <Layers size={14} /> ชำระแยกทีละบิล
                </button>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
                {paymentMode === 'consolidated' 
                  ? '💡 จ่ายรวมยอดเดียวครั้งเดียว (สลิป/หลักฐานเดียว) ระบบจะบันทึกทุกบิลย่อยเป็นชำระเงินแล้วพร้อมกัน' 
                  : '💡 กำหนดช่องทางชำระเงินและสถานะแยกอิสระในแต่ละแท็บบิลย่อย'}
              </div>
            </div>
          )}

          {/* วิธีชำระเงิน */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Coins size={14} /> ช่องทางชำระเงิน {isSplitMode && (paymentMode === 'consolidated' ? '(สำหรับทุกบิลย่อย)' : `(เฉพาะบิลย่อยที่ ${activeSplitIndex + 1})`)}
              </label>
              <select 
                className="form-control" 
                value={isSplitMode && paymentMode === 'consolidated' ? consolidatedPaymentMethod : paymentMethod} 
                onChange={(e) => {
                  if (isSplitMode && paymentMode === 'consolidated') {
                    setConsolidatedPaymentMethod(e.target.value);
                  } else {
                    setPaymentMethod(e.target.value);
                  }
                }}
              >
                <option value="เงินสด">เงินสด</option>
                <option value="โอนเงิน">โอนเงิน (สแกน QR / บัญชี)</option>
              </select>
            </div>

            {((isSplitMode && paymentMode === 'consolidated' && consolidatedPaymentMethod === 'โอนเงิน') ||
              ((!isSplitMode || paymentMode === 'separate') && paymentMethod === 'โอนเงิน')) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--border-light)', borderRadius: 'var(--radius-md)' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">โอนเข้าบัญชีธนาคารคลินิก</label>
                  <select 
                    className="form-control"
                    value={isSplitMode && paymentMode === 'consolidated' ? consolidatedBankId : selectedBankId}
                    onChange={(e) => {
                      if (isSplitMode && paymentMode === 'consolidated') {
                        setConsolidatedBankId(e.target.value);
                      } else {
                        setSelectedBankId(e.target.value);
                      }
                    }}
                  >
                    <option value="">-- เลือกบัญชีธนาคาร --</option>
                    {bankAccounts.map(bank => (
                      <option key={bank.id} value={bank.id}>
                        {bank.bankName} - {bank.accountNo} ({bank.accountName})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">แนบรูปภาพสลิปหลักฐาน (แนบหรือไม่แนบก็ได้)</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    className="form-control" 
                    onChange={isSplitMode && paymentMode === 'consolidated' ? handleConsolidatedSlipUpload : handleSlipUpload}
                  />
                  {(isSplitMode && paymentMode === 'consolidated' ? consolidatedSlipAttached : slipAttached) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>
                        ✓ แนบสลิปเรียบร้อย: {(isSplitMode && paymentMode === 'consolidated' ? consolidatedSlipName : slipName).split('/').pop()}
                      </span>
                      <button
                        type="button"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--danger)',
                          fontSize: '0.75rem',
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          padding: 0
                        }}
                        onClick={() => {
                          if (isSplitMode && paymentMode === 'consolidated') {
                            setConsolidatedSlipAttached(false);
                            setConsolidatedSlipName('');
                          } else {
                            setSlipAttached(false);
                            setSlipName('');
                          }
                        }}
                      >
                        ลบรูป
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ปุ่มทำรายการ */}
          {!isSplitMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ width: '100%', padding: '0.8rem 1rem', fontSize: '1rem', fontWeight: 700 }}
                onClick={() => saveInvoice('ชำระเงินแล้ว')}
                disabled={cart.length === 0 || !selectedHn}
              >
                <CheckCircle size={18} />
                รับชำระเงิน (ออกใบเสร็จสำเร็จ)
              </button>
              
              <button 
                type="button" 
                className="btn btn-light" 
                style={{ width: '100%', padding: '0.6rem 1rem' }}
                onClick={() => saveInvoice('รอชำระเงิน')}
                disabled={cart.length === 0 || !selectedHn}
              >
                <FileCheck2 size={16} />
                บันทึกร่าง (รอชำระเงิน)
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ width: '100%', padding: '0.85rem 1rem', fontSize: '1rem', fontWeight: 700 }}
                onClick={() => saveSplitInvoices('ชำระเงินแล้ว')}
              >
                <CheckCircle size={18} />
                รับชำระเงินทั้งหมด (ออกบิลย่อย {splitBills.length} ใบ)
              </button>
              
              <button 
                type="button" 
                className="btn btn-light" 
                style={{ width: '100%', padding: '0.65rem 1rem' }}
                onClick={() => saveSplitInvoices('รอชำระเงิน')}
              >
                <FileCheck2 size={16} />
                บันทึกร่างทั้งหมด (รอชำระเงิน {splitBills.length} ใบ)
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
