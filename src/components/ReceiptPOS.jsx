import React, { useState, useEffect, useMemo } from 'react';
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
  FileCheck2
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
  currentUser
}) {

  // กรองผู้ป่วยที่ Active
  const activePatients = useMemo(() => {
    return patients.filter(p => p.status === 'Active');
  }, [patients]);

  const [patientSearchText, setPatientSearchText] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // Sync patientSearchText when selectedHn updates
  useEffect(() => {
    if (selectedHn) {
      const p = activePatients.find(item => item.hn === selectedHn);
      if (p) {
        setPatientSearchText(`HN: ${p.hn} | น้อง${p.nickname} (${p.title}${p.firstname} ${p.lastname})`);
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
      p.hn.toLowerCase().includes(q) || 
      p.nickname.toLowerCase().includes(q) ||
      p.firstname.toLowerCase().includes(q) ||
      p.lastname.toLowerCase().includes(q)
    );
  }, [activePatients, patientSearchText]);

  // กรองสินค้า/บริการที่ Active จากวันที่ปัจจุบัน (5 มิ.ย. 2026)
  const activeServices = useMemo(() => {
    const todayStr = '2026-06-05';
    return services.filter(s => {
      const start = s.startDate || '1970-01-01';
      const end = s.endDate || '2999-12-31';
      return todayStr >= start && todayStr <= end;
    });
  }, [services]);

  // กรองโปรโมชั่นที่ Active
  const activePromotions = useMemo(() => {
    const todayStr = '2026-06-05';
    return promotions.filter(p => {
      const start = p.startDate || '1970-01-01';
      const end = p.endDate || '2999-12-31';
      const usedCount = receipts ? receipts.filter(r => r.promotionId === p.code && r.status !== 'ยกเลิก').length : 0;
      return todayStr >= start && todayStr <= end && usedCount < p.maxUses;
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
      setCart(cart.map(c => c.code === item.code ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
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

  // คำนวณยอดรวมในตะกร้า
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cart]);

  // คำนวณจำนวนส่วนลดสะสม
  const discountAmount = useMemo(() => {
    if (discountType === 'flat') {
      return Math.min(Number(discountValue), cartSubtotal);
    } else {
      const amt = (cartSubtotal * Number(discountValue)) / 100;
      return Math.min(amt, cartSubtotal);
    }
  }, [discountType, discountValue, cartSubtotal]);

  // ยอดสุทธิหลังหักส่วนลด
  const cartTotal = useMemo(() => {
    const total = cartSubtotal - discountAmount;
    return Math.max(0, total);
  }, [cartSubtotal, discountAmount]);

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

  // แนบไฟล์สลิปปลอม
  const handleSlipUpload = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const origName = file.name;
      const ext = origName.includes('.') ? origName.slice(origName.lastIndexOf('.')) : '.jpg';
      
      const today = new Date();
      const yy = String(today.getFullYear()).slice(-2);
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      
      const formattedName = `${selectedHn || 'UNKNOWN'}-${yy}${mm}${dd}${ext}`;
      setSlipAttached(true);
      setSlipName(formattedName);
    }
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
      if (!slipAttached) {
        Swal.fire({ icon: 'warning', title: 'กรุณาแนบสลิปโอนเงิน', confirmButtonColor: 'var(--secondary)' });
        return;
      }
    }

    const today = new Date();
    const yy = String(today.getFullYear()).slice(-2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const ext = slipName.includes('.') ? slipName.slice(slipName.lastIndexOf('.')) : '.jpg';
    const finalSlipName = slipAttached ? `${selectedHn}-${yy}${mm}${dd}${ext}` : '';

    const billId = generateNextBillId();
    const newInvoice = {
      id: billId,
      hn: selectedHn,
      date: `${today.getFullYear()}-${mm}-${dd}`, // วันที่ออกเอกสารจริง
      items: cart.map(item => ({
        code: item.code,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        type: item.category,
        sessionsPerUnit: item.sessionsPerUnit || 1
      })),
      discountType,
      discountValue: Number(discountValue),
      discountReason,
      promotionId: selectedPromoCode,
      paymentMethod,
      bankAccountId: paymentMethod === 'โอนเงิน' ? selectedBankId : '',
      slipUrl: paymentMethod === 'โอนเงิน' ? finalSlipName : '',
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
          // สั่งพรีวิว PDF เลย
          const savedReceipt = receipts.find(r => r.id === billId) || newInvoice;
          // รอซักครู่แล้วเรียก print
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

      <div className="pos-layout">
        
        {/* ค้นหาผู้ป่วยและรายการบริการ (ฝั่งซ้าย) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* ข้อมูลลูกค้า */}
          <div className="card-3xl">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>ข้อมูลผู้รับบริการ</h2>
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
                            setPatientSearchText(`HN: ${p.hn} | น้อง${p.nickname} (${p.title}${p.firstname} ${p.lastname})`);
                            setShowPatientDropdown(false);
                          }}
                        >
                          HN: {p.hn} | น้อง{p.nickname} ({p.title}{p.firstname} {p.lastname})
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
                      {service.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', borderTop: '1px solid var(--border-light)', paddingTop: '0.5rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--secondary)' }}>฿{service.price.toLocaleString()}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--dark-light)' }}>รหัส: {service.code}</span>
                  </div>
                </div>
              ))}
            </div>
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
                    <div className="cart-item-name">{item.name}</div>
                    <div className="cart-item-price">฿{item.price} x {item.quantity}</div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="cart-qty-ctrl">
                      <button type="button" className="cart-qty-btn" onClick={() => decreaseQty(item.code)}>
                        <Minus size={12} />
                      </button>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{item.quantity}</span>
                      <button type="button" className="cart-qty-btn" onClick={() => addToCart(item)}>
                        <Plus size={12} />
                      </button>
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

            {/* ส่วนลดแบบแมนนวล */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.5rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">กำหนดส่วนลดเพิ่มเติม</label>
                <input 
                  type="number" 
                  className="form-control" 
                  min="0"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">ประเภท</label>
                <select className="form-control" value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
                  <option value="flat">บาท (฿)</option>
                  <option value="percentage">เปอร์เซ็นต์ (%)</option>
                </select>
              </div>
            </div>

            {discountValue > 0 && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ color: 'var(--danger)' }}>เหตุผลการให้ส่วนลด <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="ระบุเหตุผล เช่น คูปองเปิดเทอม, ส่วนลดผู้ปกครอง..." 
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  required
                />
              </div>
            )}
          </div>

          {/* ยอดเงินสะสม */}
          <div style={{ backgroundColor: 'var(--light)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
            <div className="cart-summary-line">
              <span>ยอดรวมสินค้า</span>
              <span>฿{cartSubtotal.toLocaleString()}</span>
            </div>
            {discountAmount > 0 && (
              <div className="cart-summary-line" style={{ color: 'var(--danger)' }}>
                <span>ส่วนลด</span>
                <span>-฿{discountAmount.toLocaleString()}</span>
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
                  <label className="form-label">แนบรูปภาพสลิปหลักฐาน</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    className="form-control" 
                    onChange={handleSlipUpload}
                  />
                  {slipAttached && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--success)', display: 'block', marginTop: '0.25rem' }}>
                      ✓ แนบสลิปเรียบร้อย: {slipName}
                    </span>
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
