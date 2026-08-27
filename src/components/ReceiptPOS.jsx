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
  Gift
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

  // คำนวณรหัสบิลใบเสร็จลำดับถัดไป (HDRYYYYMM-XXXX)
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
      const parts = r.id.split('-');
      const serialPart = parts[parts.length - 1];
      return parseInt(serialPart, 10) || 0;
    });
    const maxSerial = Math.max(...serials);
    const nextSerial = maxSerial + 1;
    const padded = nextSerial.toString().padStart(4, '0');
    return `${prefix}${padded}`;
  };

  // รีเซ็ตฟอร์ม (ปุ่มสีแดง)
  const handleResetForm = () => {
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

    setCart([...cart, { ...newCustomItem, quantity: qtyNum }]);
    setCustomItemName('');
    setCustomItemPrice('');
    setCustomItemQty(1);

    Swal.fire({
      icon: 'success',
      title: 'เพิ่มรายการอื่นๆ แล้ว',
      showConfirmButton: false,
      timer: 1000
    });
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
      id: `DISC_${Date.now()}`,
      reason: newDiscountReason.trim(),
      type: newDiscountType,
      value: val
    };

    const updated = [...additionalDiscounts, newDisc];
    setDiscountReason(JSON.stringify(updated));

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

    setNewDiscountReason('');
    setNewDiscountValue('');
  };

  const handleDeleteDiscount = (id) => {
    const updated = additionalDiscounts.filter(d => d.id !== id);
    if (updated.length === 0) {
      setDiscountReason('');
      setDiscountValue(0);
      setDiscountType('flat');
    } else {
      setDiscountReason(JSON.stringify(updated));
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
    } catch (e) {}
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
      return;
    }

    const promo = activePromotions.find(p => p.code === promoCode);
    if (!promo) return;

    setSelectedPromoCode(promo.code);
    setDiscountType(promo.type); // flat หรือ percentage
    setDiscountValue(promo.value);
    setDiscountReason(`โปรโมชั่น: ${promo.name} (${promo.description})`);
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
        const cleanName = item.name.replace(/\([\d.]+\%\)$/, '').trim();
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="page-header">
        <h1 className="page-title">
          <ShoppingCart size={28} />
          ออกใบเสร็จรับเงิน (POS)
        </h1>
        <button className="btn btn-danger" onClick={handleResetForm}>
          <RotateCcw size={16} />
          รีเซ็ตฟอร์ม (เคลียร์ตะกร้า)
        </button>
      </div>

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
              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--secondary)' }}>
                <Plus size={16} /> เพิ่มค่าบริการ / สินค้าอื่น ๆ เพิ่มเติม (Custom Item / Fee)
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
                  <Plus size={16} /> เพิ่มเข้ารายการ
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
              <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--dark)' }}>
                กำหนดส่วนลดเพิ่มเติม
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
                    <Plus size={12} /> เพิ่ม
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

          {/* วิธีชำระเงิน */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Coins size={14} /> ช่องทางชำระเงิน
              </label>
              <select className="form-control" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="เงินสด">เงินสด</option>
                <option value="โอนเงิน">โอนเงิน (สแกน QR / บัญชี)</option>
              </select>
            </div>

            {paymentMethod === 'โอนเงิน' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--border-light)', borderRadius: 'var(--radius-md)' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">โอนเข้าบัญชีธนาคารคลินิก</label>
                  <select 
                    className="form-control"
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
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
                    onChange={handleSlipUpload}
                  />
                  {slipAttached && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>
                        ✓ แนบสลิปเรียบร้อย: {slipName.split('/').pop()}
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
                          setSlipAttached(false);
                          setSlipName('');
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

        </div>

      </div>
    </div>
  );
}
