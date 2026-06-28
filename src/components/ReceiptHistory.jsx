import React, { useState, useMemo } from 'react';
import { formatPatientNickname } from '../utils/format';
import { 
  History, 
  Search, 
  Filter, 
  Edit, 
  Printer, 
  XOctagon, 
  Coins, 
  Calendar,
  Trash2,
  Download,
  Upload
} from 'lucide-react';
import Swal from 'sweetalert2';
import { exportToCSV, parseCSV } from '../utils/csvHelper';

export default function ReceiptHistory({ 
  patients, 
  receipts, 
  setReceipts,
  services,
  bankAccounts = [],
  onVoidReceipt, 
  onEditDraftReceipt, 
  onPrintReceipt,
  onDeleteReceipt,
  currentUser
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMonth, setFilterMonth] = useState('All'); // All, 01-12
  const [filterYear, setFilterYear] = useState('All');   // All, 2026, ฯลฯ
  const [currentPage, setCurrentPage] = useState(1);

  const uniqueYears = useMemo(() => {
    const years = new Set();
    receipts.forEach(r => {
      if (r.date) {
        const yr = String(r.date).split('-')[0];
        if (yr && yr.length === 4) {
          years.add(yr);
        }
      }
    });
    const currentYear = new Date().getFullYear().toString();
    years.add(currentYear);
    years.add('2025');
    years.add('2026');
    years.add('2027');
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [receipts]);

  // สำหรับการแก้ไขบิล
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState(null);
  
  const [editDate, setEditDate] = useState('');
  const [editHn, setEditHn] = useState('');
  const [patientSearchText, setPatientSearchText] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  
  const [editPaymentMethod, setEditPaymentMethod] = useState('เงินสด');
  const [editBankAccountId, setEditBankAccountId] = useState('');
  const [editStatus, setEditStatus] = useState('ชำระเงินแล้ว');
  
  const [editDiscountValue, setEditDiscountValue] = useState(0);
  const [editDiscountType, setEditDiscountType] = useState('flat');
  const [editDiscountReason, setEditDiscountReason] = useState('');
  const [editItems, setEditItems] = useState([]);
  const [editVoidReason, setEditVoidReason] = useState('');
  const [editRewardDiscountAmount, setEditRewardDiscountAmount] = useState(0);

  // ซิงค์คำค้นตาม editHn
  React.useEffect(() => {
    if (editHn) {
      const p = patients.find(item => item.hn === editHn);
      if (p) {
        setPatientSearchText(`HN: ${p.hn} | ${formatPatientNickname(p.nickname)} (${p.title}${p.firstname} ${p.lastname})`);
      } else {
        setPatientSearchText('');
      }
    } else {
      setPatientSearchText('');
    }
  }, [editHn, patients]);

  // กรองผู้ป่วยในขณะค้นหา
  const filteredActivePatients = useMemo(() => {
    const q = patientSearchText.trim().toLowerCase();
    if (!q || q.startsWith('hn:')) return patients;
    return patients.filter(p => 
      String(p.hn).toLowerCase().includes(q) || 
      String(p.nickname).toLowerCase().includes(q) || 
      `${p.title}${p.firstname} ${p.lastname}`.toLowerCase().includes(q)
    );
  }, [patients, patientSearchText]);

  const handleEditClick = (receipt) => {
    setEditingReceipt(receipt);
    setEditDate(receipt.date);
    setEditHn(receipt.hn);
    setEditPaymentMethod(receipt.paymentMethod || 'เงินสด');
    setEditBankAccountId(receipt.bankAccountId || '');
    setEditStatus(receipt.status || 'ชำระเงินแล้ว');
    setEditDiscountValue(receipt.discountValue || 0);
    setEditDiscountType(receipt.discountType || 'flat');
    setEditDiscountReason(receipt.discountReason || '');
    setEditItems(receipt.items ? receipt.items.map(it => ({ ...it })) : []);
    setEditVoidReason(receipt.voidReason || '');
    setEditRewardDiscountAmount(receipt.rewardDiscountAmount || 0);
    setShowEditModal(true);
  };

  const handleAddItem = () => {
    setEditItems([...editItems, { name: 'สินค้า/บริการใหม่', quantity: 1, price: 0, code: 'MANUAL_ADD', type: 'บริการ' }]);
  };

  const handleRemoveItem = (index) => {
    setEditItems(editItems.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index, field, value) => {
    setEditItems(editItems.map((it, idx) => {
      if (idx === index) {
        return {
          ...it,
          [field]: field === 'quantity' ? parseInt(value) || 0 : field === 'price' ? parseFloat(value) || 0 : value
        };
      }
      return it;
    }));
  };

  const handleSaveEditReceipt = (e) => {
    e.preventDefault();
    if (!editHn) {
      Swal.fire('กรุณาเลือกผู้รับบริการ', 'กรุณาระบุตัวตนของผู้รับบริการสำหรับบิลนี้', 'error');
      return;
    }
    if (editItems.length === 0) {
      Swal.fire('ไม่มีรายการซื้อ', 'กรุณาเพิ่มรายการสินค้าหรือบริการอย่างน้อย 1 รายการ', 'error');
      return;
    }
    if (editStatus === 'ยกเลิก' && !editVoidReason.trim()) {
      Swal.fire('กรุณาระบุเหตุผลในการยกเลิก', 'หากปรับสถานะเป็นยกเลิก ต้องระบุเหตุผลการยกเลิกเสมอ', 'error');
      return;
    }

    const subtotal = editItems.reduce((sum, it) => sum + (it.price * it.quantity), 0);
    let discount = 0;
    if (editDiscountType === 'flat') {
      discount = editDiscountValue;
    } else {
      discount = subtotal * (editDiscountValue / 100);
    }
    const finalTotal = Math.max(0, subtotal - discount - editRewardDiscountAmount);

    const updatedReceipt = {
      ...editingReceipt,
      hn: editHn,
      date: editDate,
      paymentMethod: editPaymentMethod,
      bankAccountId: editPaymentMethod === 'โอนเงิน' ? editBankAccountId : '',
      status: editStatus,
      discountValue: editDiscountValue,
      discountType: editDiscountType,
      discountReason: editDiscountReason,
      rewardDiscountAmount: editRewardDiscountAmount,
      items: editItems,
      totalAmount: finalTotal,
      voidReason: editStatus === 'ยกเลิก' ? editVoidReason.trim() : ''
    };

    setReceipts(prev => prev.map(r => r.id === editingReceipt.id ? updatedReceipt : r));
    setShowEditModal(false);

    Swal.fire({
      icon: 'success',
      title: 'แก้ไขเอกสารการเงินสำเร็จ',
      text: `บันทึกการแก้ไขเลขที่ ${editingReceipt.id} เรียบร้อยแล้ว`,
      timer: 1500,
      showConfirmButton: false
    });
  };

  // รีเซ็ตหน้าเมื่อเปลี่ยนตัวกรองหรือคำค้นหา
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterMonth, filterYear]);

  // ตรวจสอบบทบาทของบัญชีผู้ใช้
  const isAdmin = currentUser?.role === 'Admin';

  const handleExportCSV = () => {
    const headers = [
      'เลขที่เอกสาร', 'รหัส HN', 'วันที่ออกบิล', 'รายการซื้อ',
      'ส่วนลด', 'ประเภทส่วนลด', 'เหตุผลส่วนลด', 'รหัสโปรโมชั่น',
      'ชำระโดย', 'บัญชีธนาคาร', 'ลิงก์สลิป', 'ยอดสุทธิ',
      'สถานะ', 'ผู้ทำรายการ', 'วันเวลาที่สร้าง'
    ];

    const rows = receipts.map(r => [
      r.id,
      r.hn,
      r.date,
      r.items.map(it => `${it.name}:${it.quantity}:${it.price}:${it.code || ''}:${it.type || ''}`).join('|'),
      r.discountValue || 0,
      r.discountType || 'flat',
      r.discountReason || '',
      r.promotionId || '',
      r.paymentMethod || 'เงินสด',
      r.bankAccountId || '',
      r.slipUrl || '',
      r.totalAmount || 0,
      r.status || 'ชำระเงินแล้ว',
      r.createdBy || '',
      r.created_at || ''
    ]);

    exportToCSV('receipt_history.csv', headers, rows);
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const parsed = parseCSV(text);

      if (parsed.length < 2) {
        Swal.fire({
          icon: 'error',
          title: 'ไฟล์ว่างเปล่า',
          text: 'ไม่พบข้อมูลในไฟล์ CSV ที่อัปโหลด',
          confirmButtonColor: 'var(--secondary)'
        });
        return;
      }

      const csvHeaders = parsed[0].map(h => h.trim().toLowerCase());
      const rows = parsed.slice(1);

      const indexMap = {};
      const headersMap = {
        id: ['id', 'เลขที่เอกสาร', 'เลขที่บิล', 'รหัสเอกสาร', 'เลขที่', 'no'],
        hn: ['hn', 'รหัส hn', 'รหัสผู้ป่วย', 'hn ผู้ป่วย'],
        date: ['date', 'วันที่ออกบิล', 'วันที่', 'วันที่บิล'],
        items: ['items', 'รายการซื้อ', 'รายการสินค้า', 'สินค้า', 'cartitems'],
        discountValue: ['discountvalue', 'ส่วนลด'],
        discountType: ['discounttype', 'ประเภทส่วนลด'],
        discountReason: ['discountreason', 'เหตุผลส่วนลด'],
        promotionId: ['promotionid', 'รหัสโปรโมชั่น', 'โปรโมชั่น'],
        paymentMethod: ['paymentmethod', 'ชำระโดย', 'วิธีชำระเงิน', 'method'],
        bankAccountId: ['bankaccountid', 'บัญชีธนาคาร', 'ธนาคาร'],
        slipUrl: ['slipurl', 'ลิงก์สลิป', 'รูปสลิป'],
        totalAmount: ['totalamount', 'ยอดสุทธิ', 'ยอดรวม', 'จำนวนเงิน', 'amount'],
        status: ['status', 'สถานะ'],
        createdBy: ['createdby', 'ผู้ทำรายการ', 'ผู้สร้าง'],
        created_at: ['created_at', 'วันเวลาที่สร้าง', 'วันที่บันทึก']
      };

      Object.keys(headersMap).forEach(key => {
        const matchingHeaders = headersMap[key];
        const idx = csvHeaders.findIndex(h => matchingHeaders.includes(h));
        if (idx !== -1) {
          indexMap[key] = idx;
        }
      });

      if (indexMap.id === undefined || indexMap.hn === undefined || indexMap.date === undefined || indexMap.items === undefined) {
        Swal.fire({
          icon: 'error',
          title: 'รูปแบบคอลัมน์ไม่ถูกต้อง',
          text: 'กรุณาตรวจสอบว่ามีคอลัมน์ เลขที่เอกสาร, รหัส HN, วันที่ออกบิล และ รายการซื้อ อย่างน้อยที่สุด',
          confirmButtonColor: 'var(--secondary)'
        });
        return;
      }

      let addedCount = 0;
      let updatedCount = 0;
      let invalidHnCount = 0;
      let errorCount = 0;

      let currentReceipts = [...receipts];

      rows.forEach(row => {
        if (row.length === 0 || (row.length === 1 && row[0] === '')) return;

        const val = (key) => {
          const idx = indexMap[key];
          return idx !== undefined && row[idx] !== undefined ? row[idx].trim() : '';
        };

        const id = val('id');
        const hn = val('hn');
        const date = val('date');
        const rawItems = val('items');

        if (!id || !hn || !date || !rawItems) {
          errorCount++;
          return;
        }

        const patientExists = patients.some(p => p.hn === hn);
        if (!patientExists) {
          invalidHnCount++;
          return;
        }

        const parsedItems = parseItems(rawItems, services || []);

        const receiptData = {
          id,
          hn,
          date,
          items: parsedItems,
          discountValue: parseFloat(val('discountValue')) || 0,
          discountType: val('discountType') || 'flat',
          discountReason: val('discountReason') || '',
          promotionId: val('promotionId') || '',
          paymentMethod: val('paymentMethod') || 'เงินสด',
          bankAccountId: val('bankAccountId') || '',
          slipUrl: val('slipUrl') || '',
          totalAmount: parseFloat(val('totalAmount')) || 0,
          status: val('status') || 'ชำระเงินแล้ว',
          createdBy: val('createdBy') || currentUser?.fullname || 'ผู้ดูแลระบบ',
          created_at: val('created_at') || new Date().toISOString()
        };

        const existingIdx = currentReceipts.findIndex(r => r.id === id);
        if (existingIdx !== -1) {
          currentReceipts[existingIdx] = receiptData;
          updatedCount++;
        } else {
          currentReceipts.push(receiptData);
          addedCount++;
        }
      });

      if (setReceipts) {
        setReceipts(currentReceipts);
      }

      Swal.fire({
        icon: 'success',
        title: 'นำเข้าข้อมูลสำเร็จ',
        html: `
          <div style="font-family: var(--font-family); text-align: left; font-size: 0.95rem; line-height: 1.6;">
            นำเข้าใหม่: <strong>${addedCount}</strong> รายการ<br/>
            อัปเดตข้อมูลเดิม: <strong>${updatedCount}</strong> รายการ<br/>
            ข้ามเนื่องจาก HN ไม่มีในระบบ: <strong style="color:var(--warning)">${invalidHnCount}</strong> รายการ<br/>
            ข้ามเนื่องจากข้อมูลไม่ครบถ้วน: <strong style="color:var(--danger)">${errorCount}</strong> รายการ
          </div>
        `,
        confirmButtonColor: 'var(--secondary)'
      });

      e.target.value = '';
    };

    reader.readAsText(file);
  };

  const parseItems = (rawStr, servicesList) => {
    if (!rawStr) return [];
    const cleanStr = rawStr.trim();
    if (cleanStr.startsWith('[') && cleanStr.endsWith(']')) {
      try {
        const arr = JSON.parse(cleanStr);
        if (Array.isArray(arr)) {
          return arr.map(item => {
            const name = item.name || item.desc || 'สินค้า/บริการ';
            const quantity = parseInt(item.qty || item.quantity) || 1;
            const price = parseFloat(item.price) || 0;
            const code = item.code || item.id || 'MANUAL_ADD';
            const type = item.type || (item.unit === 'คอร์ส' || item.unit === 'ครั้ง' ? 'บริการ' : 'สินค้า');
            return {
              name,
              quantity,
              price,
              code,
              type
            };
          });
        }
      } catch (e) {
        console.error('Failed to parse items as JSON, falling back to text parsing', e);
      }
    }
    const parts = rawStr.split('|');
    return parts.map(part => {
      const trimmed = part.trim();
      if (trimmed.includes(':')) {
        const [name, qtyStr, priceStr, code, type] = trimmed.split(':');
        return {
          name: name || 'สินค้า/บริการ',
          quantity: parseInt(qtyStr) || 1,
          price: parseFloat(priceStr) || 0,
          code: code || 'MANUAL_ADD',
          type: type || 'บริการ'
        };
      } else {
        let name = trimmed;
        let quantity = 1;
        
        const qtyMatch = trimmed.match(/(.+)\s+[xX*]\s*(\d+)$/) || trimmed.match(/(.+)\s*(\d+)\s*$/);
        if (qtyMatch) {
          name = qtyMatch[1].trim();
          quantity = parseInt(qtyMatch[2]) || 1;
        }
        
        const orig = servicesList.find(s => s.code.toLowerCase() === name.toLowerCase() || s.name.toLowerCase() === name.toLowerCase());
        if (orig) {
          return {
            code: orig.code,
            name: orig.name,
            price: orig.price,
            quantity,
            type: orig.category || 'บริการ'
          };
        } else {
          return {
            code: 'MANUAL_ADD',
            name,
            price: 0,
            quantity,
            type: 'บริการ'
          };
        }
      }
    });
  };

  const handleDeleteClick = (id) => {
    Swal.fire({
      title: `ลบใบเสร็จ/ใบแจ้งหนี้ถาวร? [เลขที่: ${id}]`,
      text: "การลบนี้จะลบข้อมูลออกจากระบบอย่างถาวรและไม่สามารถเรียกคืนได้!",
      icon: 'warning',
      input: 'text',
      inputPlaceholder: 'กรุณาระบุเหตุผลในการลบ (ห้ามเว้นว่าง)...',
      inputAttributes: {
        required: 'true'
      },
      showCancelButton: true,
      confirmButtonColor: 'var(--danger)',
      cancelButtonColor: 'var(--dark-light)',
      confirmButtonText: 'ยืนยันการลบถาวร',
      cancelButtonText: 'ยกเลิก',
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return 'กรุณาระบุเหตุผลในการลบใบเสร็จ!';
        }
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const reason = result.value.trim();
        if (onDeleteReceipt) {
          onDeleteReceipt(id, reason);
          Swal.fire({
            title: 'ลบข้อมูลสำเร็จ',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
          });
        }
      }
    });
  };

  // ตัวเลือกเดือน
  const thaiMonths = [
    { value: '01', name: 'มกราคม' },
    { value: '02', name: 'กุมภาพันธ์' },
    { value: '03', name: 'มีนาคม' },
    { value: '04', name: 'เมษายน' },
    { value: '05', name: 'พฤษภาคม' },
    { value: '06', name: 'มิถุนายน' },
    { value: '07', name: 'กรกฎาคม' },
    { value: '08', name: 'สิงหาคม' },
    { value: '09', name: 'กันยายน' },
    { value: '10', name: 'ตุลาคม' },
    { value: '11', name: 'พฤศจิกายน' },
    { value: '12', name: 'ธันวาคม' }
  ];

  // คัดกรองใบเสร็จทั้งหมด
  const filteredReceipts = useMemo(() => {
    return receipts
      .map(r => {
        const patient = patients.find(p => p.hn === r.hn);
        return {
          ...r,
          patientName: patient ? `${patient.title}${patient.firstname} ${patient.lastname}` : 'ไม่พบชื่อผู้ป่วย',
          patientNickname: patient ? patient.nickname : ''
        };
      })
      .filter(r => {
        // ค้นหา
        const query = searchQuery.trim().toLowerCase();
        const matchesQuery = 
          String(r.id || '').toLowerCase().includes(query) ||
          String(r.hn || '').toLowerCase().includes(query) ||
          String(r.patientName || '').toLowerCase().includes(query) ||
          (r.patientNickname && String(r.patientNickname).toLowerCase().includes(query));

        // กรองปี
        const dateParts = String(r.date || '').split('-'); // YYYY-MM-DD
        const year = dateParts[0];
        const month = dateParts[1];
        
        const matchesYear = filterYear === 'All' || year === filterYear;
        const matchesMonth = filterMonth === 'All' || month === filterMonth;

        return matchesQuery && matchesYear && matchesMonth;
      })
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.id || '').localeCompare(String(a.id || ''))); // เรียงรหัสใบเสร็จล่าสุดขึ้นก่อน (ใหม่ไปเก่า)
  }, [receipts, patients, searchQuery, filterMonth, filterYear]);

  const paginatedReceipts = useMemo(() => {
    const itemsPerPage = 20;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredReceipts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredReceipts, currentPage]);

  const maxPages = Math.ceil(filteredReceipts.length / 20) || 1;

  // จัดการยกเลิกบิล (Void)
  const handleVoidClick = (id) => {
    Swal.fire({
      title: `ยกเลิกใบเสร็จนี้? [เลขที่: ${id}]`,
      text: "ยอดขายจะถูกดึงออกจาก Dashboard และจำนวนคอร์สบริการในบิลนี้จะถูกหักล้างออกคืนให้ผู้ป่วยทันที!",
      icon: 'warning',
      input: 'text',
      inputPlaceholder: 'กรุณาระบุเหตุผลในการยกเลิก (ห้ามเว้นว่าง)...',
      inputAttributes: {
        required: 'true'
      },
      showCancelButton: true,
      confirmButtonColor: 'var(--danger)',
      cancelButtonColor: 'var(--dark-light)',
      confirmButtonText: 'ยืนยันการยกเลิก (Void)',
      cancelButtonText: 'ยกเลิก',
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return 'กรุณาระบุเหตุผลในการยกเลิก!';
        }
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const reason = result.value.trim();
        onVoidReceipt(id, reason);
        Swal.fire({
          title: 'ยกเลิกใบเสร็จเรียบร้อยแล้ว',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  };

  // จัดการแก้ไขบิลร่าง (Draft) ดึงกลับไปหน้า POS
  const handleEditDraft = (receipt) => {
    onEditDraftReceipt(receipt);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="page-header">
        <h1 className="page-title">
          <History size={28} />
          ประวัติใบเสร็จและใบแจ้งหนี้ (Receipt History)
        </h1>
        <div className="page-actions">
          <button className="btn btn-light" onClick={handleExportCSV} title="ส่งออกประวัติการเงินเป็นไฟล์ CSV">
            <Download size={16} /> Export CSV
          </button>
          <label className="btn btn-light" style={{ cursor: 'pointer', margin: 0 }} title="นำเข้าประวัติการเงินผ่านไฟล์ CSV">
            <Upload size={16} /> Import CSV
            <input type="file" accept=".csv" onChange={handleImportCSV} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      <div className="card-3xl">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem' }}>ค้นหาและตรวจสอบเอกสารการเงิน</h2>
        
        {/* แถบค้นหาและตัวกรองวันเดือนปี */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
          <div className="search-input-wrapper" style={{ flex: 2, minWidth: '280px' }}>
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              className="form-control" 
              placeholder="ค้นหาตามเลขที่บิล, HN, ชื่อ หรือชื่อเล่นผู้รับบริการ..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '280px' }}>
            <div style={{ flex: 1 }}>
              <select 
                className="form-control"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
              >
                <option value="All">-- แสดงทุกเดือน --</option>
                {thaiMonths.map(m => (
                  <option key={m.value} value={m.value}>{m.name}</option>
                ))}
              </select>
            </div>
            
            <div style={{ flex: 1 }}>
              <select 
                className="form-control"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
              >
                <option value="All">-- ทุกปี --</option>
                {uniqueYears.map(yr => {
                  const bcYear = parseInt(yr, 10) + 543;
                  return (
                    <option key={yr} value={yr}>
                      {bcYear} ({yr})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        {/* ตารางแสดงข้อมูลใบเสร็จ */}
        <div className="table-container">
          <table className="hdh-table">
            <thead>
              <tr>
                <th>เลขที่เอกสาร</th>
                <th>วันที่ออกบิล</th>
                <th>ข้อมูลผู้รับบริการ</th>
                <th>รายการซื้อ</th>
                <th>ชำระโดย</th>
                <th style={{ textAlign: 'right' }}>ยอดสุทธิ</th>
                <th style={{ textAlign: 'center' }}>สถานะ</th>
                <th style={{ textAlign: 'center' }}>การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {paginatedReceipts.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '4rem', color: 'var(--dark-light)' }}>
                    ไม่พบข้อมูลบิลการเงินตามเงื่อนไขที่ระบุ
                  </td>
                </tr>
              ) : (
                paginatedReceipts.map((r) => {
                  const isVoided = r.status === 'ยกเลิก';
                  const isDraft = r.status === 'รอชำระเงิน';
                  
                  return (
                    <tr key={r.id} style={{ opacity: isVoided ? 0.6 : 1 }}>
                      <td style={{ fontWeight: 700, color: 'var(--secondary)', fontFamily: 'monospace' }}>
                        {r.id}
                      </td>
                      <td>{new Date(r.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.patientName}</div>
                        {/* แสดงชื่อเล่นในวงเล็บต่อท้าย HN ลูกค้าเสมอตามสเปก */}
                        <div style={{ fontSize: '0.75rem', color: 'var(--dark-light)' }}>
                          HN: {r.hn} ({r.patientNickname ? formatPatientNickname(r.patientNickname) : 'ไม่มีชื่อเล่น'})
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem' }}>
                          {r.items.map((it, idx) => (
                            <div key={idx}>
                              • {it.name} x{it.quantity}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem' }}>
                          {r.paymentMethod}
                          {r.bankAccountId && (
                            <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--dark-light)' }}>
                              โอนเข้า: {r.bankAccountId}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ 
                        textAlign: 'right', 
                        fontWeight: 700, 
                        textDecoration: isVoided ? 'line-through' : 'none',
                        color: isVoided ? 'var(--danger)' : 'var(--dark)'
                      }}>
                        ฿{r.totalAmount.toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${
                          r.status === 'ชำระเงินแล้ว' ? 'badge-success' : 
                          r.status === 'รอชำระเงิน' ? 'badge-warning' : 'badge-danger'
                        }`}>
                          {r.status}
                        </span>
                        {r.status === 'ยกเลิก' && r.voidReason && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.25rem', maxWidth: '150px', wordBreak: 'break-word', textAlign: 'center' }}>
                            เหตุผล: {r.voidReason}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                          
                          {/* บิลพิมพ์ */}
                          <button 
                            className="btn btn-light btn-icon-only" 
                            title="พิมพ์บิล (PDF)"
                            onClick={() => onPrintReceipt(r.id)}
                          >
                            <Printer size={16} color="var(--info)" />
                          </button>

                          {/* บิลดราฟท์ดึงกลับไปจ่ายเงินต่อ */}
                          {isDraft && (
                            <button 
                              className="btn btn-light btn-icon-only" 
                              title="ดึงข้อมูลกลับไปจ่ายเงินต่อที่ POS"
                              onClick={() => handleEditDraft(r)}
                            >
                              <Coins size={16} color="var(--warning)" />
                            </button>
                          )}

                          {/* แก้ไขบิลโดยตรงผ่าน Modal */}
                          <button 
                            className="btn btn-light btn-icon-only" 
                            title="แก้ไขเอกสารการเงิน"
                            onClick={() => handleEditClick(r)}
                          >
                            <Edit size={16} color="var(--secondary)" />
                          </button>

                          {/* บิลชำระแล้วสั่งยกเลิก (Void) ได้ */}
                          {r.status === 'ชำระเงินแล้ว' && (
                            <button 
                              className="btn btn-light btn-icon-only" 
                              title="ยกเลิกใบเสร็จนี้ (Void)"
                              onClick={() => handleVoidClick(r.id)}
                            >
                              <XOctagon size={16} color="var(--danger)" />
                            </button>
                          )}

                          {/* ปุ่มลบใบเสร็จถาวรสำหรับบทบาท Admin เท่านั้นตามสเปก */}
                          {isAdmin && (
                            <button 
                              className="btn btn-light btn-icon-only" 
                              title="ลบใบเสร็จนี้ถาวร"
                              onClick={() => handleDeleteClick(r.id)}
                            >
                              <Trash2 size={16} color="var(--danger)" />
                            </button>
                          )}

                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {maxPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>
            <button 
              className="btn btn-light" 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              type="button"
            >
              ก่อนหน้า
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>หน้า</span>
              <select 
                value={currentPage} 
                onChange={(e) => setCurrentPage(Number(e.target.value))}
                style={{
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.88rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                {Array.from({ length: maxPages }, (_, i) => i + 1).map(page => (
                  <option key={page} value={page}>{page}</option>
                ))}
              </select>
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>/ {maxPages}</span>
            </div>
            <button 
              className="btn btn-light" 
              disabled={currentPage === maxPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              type="button"
            >
              ถัดไป
            </button>
          </div>
        )}
        
        <div style={{ fontSize: '0.8rem', color: 'var(--dark-light)', textAlign: 'right', marginTop: '1rem' }}>
          แสดง {filteredReceipts.length === 0 ? 0 : (currentPage - 1) * 20 + 1} - {Math.min(currentPage * 20, filteredReceipts.length)} จากทั้งหมด {filteredReceipts.length} รายการ (เรียงจากเลขบิลล่าสุด)
        </div>
      </div>

      {/* Modal: แก้ไขเอกสารการเงิน (Edit Receipt Modal) */}
      {showEditModal && editingReceipt && (
        <div className="modal-overlay">
          <div className="modal-content-wrapper" style={{ maxWidth: '750px', width: '90%' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>แก้ไขเอกสารการเงิน [เลขที่: {editingReceipt.id}]</h3>
              <button className="close-modal-btn" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveEditReceipt}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '70vh', overflowY: 'auto' }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">วันที่ออกบิล <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={editDate} 
                      onChange={(e) => setEditDate(e.target.value)} 
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">ผู้รับบริการ <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="text"
                        className="form-control"
                        placeholder="-- ค้นหาด้วย HN หรือชื่อเล่น --"
                        value={patientSearchText}
                        onChange={(e) => {
                          setPatientSearchText(e.target.value);
                          setEditHn('');
                          setShowPatientDropdown(true);
                        }}
                        onFocus={() => setShowPatientDropdown(true)}
                        onBlur={() => {
                          setTimeout(() => setShowPatientDropdown(false), 200);
                        }}
                        required
                      />
                      <input type="hidden" value={editHn} required />
                      {showPatientDropdown && (
                        <div 
                          className="card-md"
                          style={{ 
                            position: 'absolute', 
                            top: '100%', 
                            left: 0, 
                            right: 0, 
                            maxHeight: '180px', 
                            overflowY: 'auto', 
                            zIndex: 1100,
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
                              ไม่พบข้อมูลผู้รับบริการ
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
                                  setEditHn(p.hn);
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">วิธีชำระเงิน <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <select 
                      className="form-control" 
                      value={editPaymentMethod} 
                      onChange={(e) => setEditPaymentMethod(e.target.value)}
                    >
                      <option value="เงินสด">เงินสด</option>
                      <option value="โอนเงิน">โอนเงิน (สแกน QR / บัญชี)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">โอนเข้าบัญชีธนาคาร</label>
                    <select 
                      className="form-control"
                      value={editBankAccountId}
                      onChange={(e) => setEditBankAccountId(e.target.value)}
                      disabled={editPaymentMethod !== 'โอนเงิน'}
                      required={editPaymentMethod === 'โอนเงิน'}
                    >
                      <option value="">-- เลือกบัญชีธนาคาร --</option>
                      {bankAccounts.map(bank => (
                        <option key={bank.id} value={bank.id}>
                          {bank.bankName} - {bank.accountNo} ({bank.accountName})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">สถานะบิล <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <select 
                      className="form-control" 
                      value={editStatus} 
                      onChange={(e) => setEditStatus(e.target.value)}
                    >
                      <option value="ชำระเงินแล้ว">ชำระเงินแล้ว</option>
                      <option value="รอชำระเงิน">รอชำระเงิน</option>
                      <option value="ยกเลิก">ยกเลิก</option>
                    </select>
                  </div>
                </div>

                {editStatus === 'ยกเลิก' && (
                  <div className="form-group" style={{ border: '1px solid var(--danger-light, #fee2e2)', padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: '#fff5f5' }}>
                    <label className="form-label" style={{ color: 'var(--danger)', fontWeight: 600 }}>
                      เหตุผลในการยกเลิก <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="กรุณาระบุเหตุผลในการยกเลิกใบเสร็จ (เช่น ลูกค้าเปลี่ยนใจ, คีย์ข้อมูลผิด ฯลฯ)"
                      value={editVoidReason}
                      onChange={(e) => setEditVoidReason(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 2fr', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">ส่วนลดเพิ่มเติม</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      min="0"
                      value={editDiscountValue} 
                      onChange={(e) => setEditDiscountValue(parseFloat(e.target.value) || 0)} 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">ประเภทส่วนลด</label>
                    <select 
                      className="form-control" 
                      value={editDiscountType} 
                      onChange={(e) => setEditDiscountType(e.target.value)}
                    >
                      <option value="flat">บาท (฿)</option>
                      <option value="percent">เปอร์เซ็นต์ (%)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">เหตุผลส่วนลด / บันทึกเพิ่มเติม</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="ระบุเหตุผลส่วนลดหรือโปรโมชั่น..." 
                      value={editDiscountReason} 
                      onChange={(e) => setEditDiscountReason(e.target.value)} 
                    />
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>รายการสินค้า/บริการในบิล</label>
                    <button type="button" className="btn btn-outline btn-sm" onClick={handleAddItem} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                      + เพิ่มรายการ
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {editItems.map((item, index) => (
                      <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input 
                          type="text" 
                          className="form-control" 
                          style={{ flex: 3 }}
                          placeholder="ชื่อสินค้าหรือบริการ" 
                          value={item.name} 
                          onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                          required
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--dark-light)' }}>จำนวน:</span>
                          <input 
                            type="number" 
                            className="form-control" 
                            style={{ width: '70px' }}
                            min="1" 
                            value={item.quantity} 
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            required
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--dark-light)' }}>ราคา (฿):</span>
                          <input 
                            type="number" 
                            className="form-control" 
                            style={{ width: '100px' }}
                            min="0" 
                            value={item.price} 
                            onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                            required
                          />
                        </div>
                        <button 
                          type="button" 
                          className="btn btn-light btn-icon-only" 
                          onClick={() => handleRemoveItem(index)}
                          style={{ padding: '0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="ลบรายการนี้"
                        >
                          <Trash2 size={14} color="var(--danger)" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ 
                  backgroundColor: 'var(--light)', 
                  padding: '1rem', 
                  borderRadius: 'var(--radius-md)', 
                  marginTop: '0.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ fontSize: '0.9rem', color: 'var(--dark-light)' }}>ยอดรวมสินค้า: </span>
                    <strong style={{ fontSize: '1rem' }}>
                      ฿{editItems.reduce((sum, it) => sum + (it.price * it.quantity), 0).toLocaleString()}
                    </strong>
                    {editDiscountValue > 0 && (
                      <span style={{ fontSize: '0.85rem', color: 'var(--danger)', marginLeft: '1rem' }}>
                        ส่วนลด: -{editDiscountType === 'flat' ? `฿${editDiscountValue}` : `${editDiscountValue}%`}
                      </span>
                    )}
                    {editRewardDiscountAmount > 0 && (
                      <span style={{ fontSize: '0.85rem', color: '#008080', marginLeft: '1rem' }}>
                        ส่วนลดแลกรางวัล: -฿{editRewardDiscountAmount.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div>
                    <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>ยอดสุทธิที่จะบันทึก: </span>
                    <strong style={{ fontSize: '1.4rem', color: 'var(--secondary)' }}>
                      ฿{Math.max(0, editItems.reduce((sum, it) => sum + (it.price * it.quantity), 0) - (editDiscountType === 'flat' ? editDiscountValue : editItems.reduce((sum, it) => sum + (it.price * it.quantity), 0) * (editDiscountValue / 100)) - editRewardDiscountAmount).toLocaleString()}
                    </strong>
                  </div>
                </div>

              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', padding: '1rem', borderTop: '1px solid var(--border)' }}>
                <button type="button" className="btn btn-light" onClick={() => setShowEditModal(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-secondary">บันทึกการแก้ไข</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
