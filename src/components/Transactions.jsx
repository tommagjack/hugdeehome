import { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Download, 
  Upload, 
  Plus, 
  Trash2, 
  Edit, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  FileCheck2,
  X
} from 'lucide-react';
import Swal from 'sweetalert2';
import { exportToCSV, parseCSV } from '../utils/csvHelper';

const monthThaiNames = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const monthThaiToNum = {
  'มกราคม': 1,
  'กุมภาพันธ์': 2,
  'มีนาคม': 3,
  'เมษายน': 4,
  'พฤษภาคม': 5,
  'มิถุนายน': 6,
  'กรกฎาคม': 7,
  'สิงหาคม': 8,
  'กันยายน': 9,
  'ตุลาคม': 10,
  'พฤศจิกายน': 11,
  'ธันวาคม': 12
};

const trHeadersMap = {
  date: ['date', 'วันที่', 'วันที่ (yyyy-mm-dd)', 'วันที่ (dd/mm/yyyy)', 'วันที่ (dd/mm/bbbb)', 'วันที่ทำรายการ', 'วันที่ทำรายการ (yyyy-mm-dd)', 'วันที่ทำรายการ (yyyy_mm_dd)'],
  type: ['type', 'ประเภท', 'ประเภท (รายรับ/รายจ่าย)', 'ประเภทรายการ'],
  description: ['description', 'รายการ', 'รายละเอียด', 'คำอธิบาย', 'ชื่อรายการ'],
  category: ['category', 'หมวดหมู่', 'ประเภทรายการ', 'กลุ่มงาน'],
  amount: ['amount', 'จำนวนเงิน', 'ยอดเงิน', 'จำนวน', 'ยอดเงินสุทธิ']
};

// แปลงวันที่ YYYY-MM-DD เป็นพ.ศ. DD/MM/BBBB
const formatDateBE = (dateStr) => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parts[1];
    const day = parts[2];
    const beYear = year + 543;
    return `${day}/${month}/${beYear}`;
  }
  return dateStr;
};

// แปลงปี พ.ศ. ค.ศ.
const getYearBE = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return String(parseInt(parts[0], 10) + 543);
  }
  return '';
};

// แปลงเดือนเป็นชื่อเดือนไทย
const getMonthThai = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const monthIdx = parseInt(parts[1], 10) - 1;
    return monthThaiNames[monthIdx] || '';
  }
  return '';
};

export default function Transactions({ 
  transactions = [], 
  setTransactions, 
  receipts = [], 
  payrolls = [], 
  patients = [] 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All'); // All, income, expense

  // สถานะจัดการ Modal เพิ่ม/แก้ไข
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // สถานะฟอร์ม
  const [tDate, setTDate] = useState('2026-06-05');
  const [tType, setTType] = useState('income'); // income, expense
  const [tDescription, setTDescription] = useState('');
  const [tCategory, setTCategory] = useState('ค่าเคส');
  const [tAmount, setTAmount] = useState('');
  const [tSlipName, setTSlipName] = useState('');
  const [tSlipAttached, setTSlipAttached] = useState(false);

  // สถานะแบ่งหน้า (Pagination)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // รีเซ็ตหน้าเมื่อเปลี่ยนตัวกรองหรือคำค้นหา
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, yearFilter, monthFilter, typeFilter]);

  // ซิงค์บิลและรายจ่ายเงินเดือนพนักงานโดยอัตโนมัติ
  useEffect(() => {
    setTransactions(prev => {
      const paidReceipts = receipts.filter(r => r.status === 'ชำระเงินแล้ว');
      const validPayrolls = payrolls;
      const existingRefIds = new Set(prev.map(t => t.refId).filter(Boolean));
      const newSynced = [];

      paidReceipts.forEach(r => {
        if (!existingRefIds.has(r.id)) {
          const patient = patients.find(p => p.hn === r.hn);
          const patientName = patient ? `${patient.title}${patient.firstname} ${patient.lastname}` : `HN ${r.hn}`;
          newSynced.push({
            id: `TX-RC-${r.id}`,
            date: r.date,
            type: 'income',
            description: `อ้างอิงใบเสร็จ ${r.id} ของ ${patientName} (${r.hn})`,
            category: 'ค่าเคส',
            amount: r.totalAmount,
            refId: r.id,
            slipUrl: r.slipUrl || '',
            created_at: new Date().toISOString()
          });
        }
      });

      validPayrolls.forEach(p => {
        if (!existingRefIds.has(p.id)) {
          let txDate;
          if (p.created_at) {
            txDate = p.created_at.split('T')[0];
          } else {
            const mNum = monthThaiToNum[p.month] || 5;
            txDate = `2026-${String(mNum).padStart(2, '0')}-28`;
          }

          newSynced.push({
            id: `TX-PR-${p.id}`,
            date: txDate,
            type: 'expense',
            description: `เงินเดือน ${monthThaiToNum[p.month] || p.month} ของคุณ ${p.employeeName}`,
            category: 'รายจ่ายคงที่',
            amount: p.netPay,
            refId: p.id,
            slipUrl: '',
            created_at: new Date().toISOString()
          });
        }
      });

      if (newSynced.length > 0) {
        return [...prev, ...newSynced];
      }
      return prev;
    });
  }, [receipts, payrolls, patients, setTransactions]);

  // เปลี่ยนหมวดหมู่ตัวเลือกอัตโนมัติเมื่อเลือกประเภท
  const handleTypeChange = (typeVal) => {
    setTType(typeVal);
    if (typeVal === 'income') {
      setTCategory('ค่าเคส');
    } else {
      setTCategory('รายจ่ายคงที่');
    }
  };

  // ดึงรายการปีที่มีข้อมูลทั้งหมด (เพื่อนำมาสร้างตัวกรอง)
  const uniqueYears = useMemo(() => {
    const years = new Set();
    transactions.forEach(t => {
      const yr = getYearBE(t.date);
      if (yr) years.add(yr);
    });
    // เพิ่มปีปัจจุบัน พ.ศ. 2569 เป็นทางเลือก
    years.add('2569');
    return Array.from(years).sort((a, b) => b - a); // ใหม่ไปเก่า
  }, [transactions]);

  // คัดกรองและค้นหาข้อมูลธุรกรรม
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => {
        // ค้นหา
        const query = searchQuery.trim().toLowerCase();
        const matchesQuery = !query ? true : (
          String(t.description || '').toLowerCase().includes(query) ||
          String(t.category || '').toLowerCase().includes(query) ||
          String(t.date || '').includes(query) ||
          formatDateBE(t.date).includes(query)
        );

        // กรองปี
        const matchesYear = yearFilter === 'All' || getYearBE(t.date) === yearFilter;

        // กรองเดือน
        const matchesMonth = monthFilter === 'All' || getMonthThai(t.date) === monthFilter;

        // กรองประเภท
        const matchesType = typeFilter === 'All' || t.type === typeFilter;

        return matchesQuery && matchesYear && matchesMonth && matchesType;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date) || b.id.localeCompare(a.id)); // เรียงวันที่ใหม่ไปเก่า
  }, [transactions, searchQuery, yearFilter, monthFilter, typeFilter]);

  // คำนวณยอดเงินรวม (รายรับ, รายจ่าย, คงเหลือสุทธิ)
  const financialSummary = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach(t => {
      if (t.type === 'income') {
        income += t.amount;
      } else {
        expense += t.amount;
      }
    });
    return {
      income,
      expense,
      balance: income - expense
    };
  }, [filteredTransactions]);

  // จัดการตัวเลขแบ่งหน้า
  const totalItems = filteredTransactions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // รีเซ็ตฟอร์ม
  const resetForm = () => {
    setEditingId(null);
    setTDate('2026-06-05');
    setTType('income');
    setTDescription('');
    setTCategory('ค่าเคส');
    setTAmount('');
    setTSlipName('');
    setTSlipAttached(false);
  };

  // เมื่อต้องการแก้ไขรายการ
  const handleEditClick = (t) => {
    setEditingId(t.id);
    setTDate(t.date);
    setTType(t.type);
    setTDescription(t.description);
    setTCategory(t.category);
    setTAmount(t.amount);
    setTSlipName(t.slipUrl ? 'slip_uploaded.png' : '');
    setTSlipAttached(!!t.slipUrl);
    setShowModal(true);
  };

  // เมื่อยืนยันการลบรายการ
  const handleDeleteClick = (id) => {
    Swal.fire({
      title: 'ลบรายการธุรกรรมการเงินนี้?',
      text: 'ข้อมูลที่ลบจะไม่สามารถกู้คืนกลับมาได้!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--danger)',
      cancelButtonColor: 'var(--dark-light)',
      confirmButtonText: 'ยืนยันลบ',
      cancelButtonText: 'ยกเลิก'
    }).then(res => {
      if (res.isConfirmed) {
        setTransactions(transactions.filter(t => t.id !== id));
        Swal.fire({ icon: 'success', title: 'ลบข้อมูลสำเร็จ', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
      }
    });
  };

  // บันทึกฟอร์ม
  const handleSaveSubmit = (e) => {
    e.preventDefault();
    if (!tDescription || !tAmount) {
      Swal.fire('ข้อมูลไม่ครบ', 'กรุณากรอกรายละเอียดและจำนวนเงิน', 'warning');
      return;
    }

    const transactionData = {
      id: editingId || `TX-${Date.now()}`,
      date: tDate,
      type: tType,
      description: tDescription,
      category: tCategory,
      amount: Number(tAmount) || 0,
      slipUrl: tSlipAttached ? 'temp_attached_slip_url' : '',
      refId: editingId ? transactions.find(t => t.id === editingId)?.refId || '' : ''
    };

    if (editingId) {
      setTransactions(transactions.map(t => t.id === editingId ? transactionData : t));
      Swal.fire({ icon: 'success', title: 'อัปเดตข้อมูลสำเร็จ', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
    } else {
      setTransactions([...transactions, transactionData]);
      Swal.fire({ icon: 'success', title: 'เพิ่มรายการสำเร็จ', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
    }

    setShowModal(false);
    resetForm();
  };

  // ซิงค์ข้อมูลจาก POS Receipts และ Payrolls
  const handleSyncData = () => {
    // 1. ดึงบิล POS ที่ชำระเงินแล้ว
    const paidReceipts = receipts.filter(r => r.status === 'ชำระเงินแล้ว');
    // 2. ดึงบัญชีเงินเดือนพนักงาน
    const validPayrolls = payrolls; // ถือว่าบันทึกจ่ายแล้ว

    let syncCount = 0;
    const newSyncedTransactions = [];

    // ดึงรหัสอ้างอิงที่มีอยู่แล้ว
    const existingRefIds = new Set(transactions.map(t => t.refId).filter(Boolean));

    // ซิงค์บิล POS -> รายรับ
    paidReceipts.forEach(r => {
      if (!existingRefIds.has(r.id)) {
        // หาชื่อคนไข้
        const patient = patients.find(p => p.hn === r.hn);
        const patientName = patient ? `${patient.title}${patient.firstname} ${patient.lastname}` : `HN ${r.hn}`;
        
        newSyncedTransactions.push({
          id: `TX-RC-${r.id}`,
          date: r.date,
          type: 'income',
          description: `อ้างอิงใบเสร็จ ${r.id} ของ ${patientName} (${r.hn})`,
          category: 'ค่าเคส',
          amount: r.totalAmount,
          refId: r.id,
          slipUrl: r.slipUrl || '',
          created_at: new Date().toISOString()
        });
        syncCount++;
      }
    });

    // ซิงค์บัญชีเงินเดือน -> รายจ่าย
    validPayrolls.forEach(p => {
      if (!existingRefIds.has(p.id)) {
        // หาวันที่ (จาก created_at หรือสร้างวันที่จ่าย 28 ของเดือนนั้น)
        let txDate;
        if (p.created_at) {
          txDate = p.created_at.split('T')[0];
        } else {
          const mNum = monthThaiToNum[p.month] || 5;
          txDate = `2026-${String(mNum).padStart(2, '0')}-28`;
        }

        newSyncedTransactions.push({
          id: `TX-PR-${p.id}`,
          date: txDate,
          type: 'expense',
          description: `เงินเดือน ${monthThaiToNum[p.month] || p.month} ของคุณ ${p.employeeName}`,
          category: 'รายจ่ายคงที่',
          amount: p.netPay,
          refId: p.id,
          slipUrl: '',
          created_at: new Date().toISOString()
        });
        syncCount++;
      }
    });

    if (syncCount > 0) {
      setTransactions([...transactions, ...newSyncedTransactions]);
      Swal.fire({
        icon: 'success',
        title: 'ซิงค์ข้อมูลเรียบร้อย',
        html: `<div style="text-align: left; font-family: var(--font-family);">ดึงรายการธุรกรรมการเงินมาเพิ่มได้ <strong>${syncCount}</strong> รายการสำเร็จ! (แบ่งเป็นรายการบิลและรายจ่ายพนักงานที่ไม่เคยซิงค์มาก่อน)</div>`,
        confirmButtonColor: 'var(--secondary)'
      });
    } else {
      Swal.fire({
        icon: 'info',
        title: 'ไม่มีข้อมูลใหม่',
        text: 'ไม่พบบิลการจ่ายเงินหรือบัญชีเงินเดือนพนักงานใหม่ที่ยังไม่ได้ถูกซิงค์ข้อมูล',
        confirmButtonColor: 'var(--secondary)'
      });
    }
  };

  // ส่งออกธุรกรรม CSV
  const handleExportCSV = () => {
    const headers = [
      'วันที่ทำรายการ (YYYY-MM-DD)', 'ประเภท (รายรับ/รายจ่าย)', 'รายการ', 'หมวดหมู่', 'จำนวนเงิน'
    ];

    let rows;
    if (transactions.length === 0) {
      rows = [
        ['2026-06-05', 'รายรับ', 'ค่าเคสประเมินพัฒนาการคนไข้ใหม่', 'ค่าเคส', '1200.00']
      ];
      Swal.fire({
        title: 'ส่งออกไฟล์เทมเพลต',
        text: 'เนื่องจากไม่มีข้อมูลธุรกรรมในระบบ ระบบจะส่งออกเป็นไฟล์เทมเพลตตัวอย่าง',
        icon: 'info',
        confirmButtonColor: 'var(--secondary)'
      });
    } else {
      rows = transactions.map(t => [
        t.date,
        t.type === 'income' ? 'รายรับ' : 'รายจ่าย',
        t.description,
        t.category,
        t.amount
      ]);
    }

    exportToCSV('transactions_list.csv', headers, rows);
  };

  // นำเข้าธุรกรรม CSV
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
          text: 'ไม่พบข้อมูลธุรกรรมในไฟล์ CSV ที่อัปโหลด',
          confirmButtonColor: 'var(--secondary)'
        });
        return;
      }

      const csvHeaders = parsed[0].map(h => h.trim().toLowerCase());
      const rows = parsed.slice(1);

      const indexMap = {};
      Object.keys(trHeadersMap).forEach(key => {
        const matchingHeaders = trHeadersMap[key];
        const idx = csvHeaders.findIndex(h => matchingHeaders.includes(h));
        if (idx !== -1) {
          indexMap[key] = idx;
        }
      });

      if (indexMap.date === undefined || indexMap.type === undefined || indexMap.description === undefined || indexMap.category === undefined || indexMap.amount === undefined) {
        Swal.fire({
          icon: 'error',
          title: 'รูปแบบคอลัมน์ไม่ถูกต้อง',
          text: 'กรุณาตรวจสอบว่ามีคอลัมน์ วันที่, ประเภท, รายการ, หมวดหมู่ และ จำนวนเงิน ครบถ้วน',
          confirmButtonColor: 'var(--secondary)'
        });
        return;
      }

      let addedCount = 0;
      let errorCount = 0;
      const importedTransactions = [];

      rows.forEach((row, index) => {
        if (row.length === 0 || (row.length === 1 && row[0] === '')) return;

        const val = (key) => {
          const idx = indexMap[key];
          return idx !== undefined && row[idx] !== undefined ? row[idx].trim() : '';
        };

        const dateRaw = val('date');
        const typeRaw = val('type');
        const description = val('description');
        const category = val('category');
        const amountRaw = val('amount');

        // ตรวจสอบข้อมูลบังคับ
        if (!dateRaw || !typeRaw || !description || !category || !amountRaw) {
          errorCount++;
          return;
        }

        // แปลงรูปแบบวันที่ (รองรับ DD/MM/YYYY, DD/MM/BE และ YYYY-MM-DD)
        let formattedDate = dateRaw;
        if (dateRaw.includes('/')) {
          const dParts = dateRaw.split('/');
          if (dParts.length === 3) {
            let year = parseInt(dParts[2], 10);
            // ถ้าเป็นปี พ.ศ. เกิน 2500 ให้ลบ 543
            if (year > 2500) {
              year = year - 543;
            }
            formattedDate = `${year}-${dParts[1].padStart(2, '0')}-${dParts[0].padStart(2, '0')}`;
          }
        }

        // กำหนดประเภท
        let type = 'income';
        const typeLower = typeRaw.toLowerCase();
        if (typeLower.includes('expense') || typeLower.includes('จ่าย') || typeLower.includes('ออก')) {
          type = 'expense';
        }

        importedTransactions.push({
          id: `TX-IM-${Date.now()}-${index}`,
          date: formattedDate,
          type,
          description,
          category,
          amount: Number(amountRaw) || 0,
          refId: '',
          slipUrl: ''
        });
        addedCount++;
      });

      if (importedTransactions.length > 0) {
        setTransactions(prev => [...prev, ...importedTransactions]);
        Swal.fire({
          icon: 'success',
          title: 'นำเข้าข้อมูลธุรกรรมสำเร็จ',
          html: `
            <div style="font-family: var(--font-family); text-align: left; font-size: 0.95rem; line-height: 1.6;">
              นำเข้าใหม่ได้: <strong>${addedCount}</strong> รายการ<br/>
              ข้ามเนื่องจากข้อมูลไม่ครบถ้วน: <strong style="color:var(--danger)">${errorCount}</strong> รายการ
            </div>
          `,
          confirmButtonColor: 'var(--secondary)'
        });
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'ไม่พบคอมมิตข้อมูลใหม่',
          text: 'ข้อมูลที่อัปโหลดไม่ผ่านการตรวจสอบความถูกต้อง',
          confirmButtonColor: 'var(--secondary)'
        });
      }

      e.target.value = '';
    };

    reader.readAsText(file);
  };

  const handleSlipUpload = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setTSlipAttached(true);
      setTSlipName(e.target.files[0].name);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* 1. Page Header */}
      <div className="page-header">
        <h1 className="page-title">
          <DollarSign size={28} />
          ข้อมูลรายรับ-รายจ่าย (ธุรกรรม)
        </h1>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus size={16} /> เพิ่มรายการ
          </button>
          <button className="btn" style={{ backgroundColor: '#28a745', color: '#fff' }} onClick={handleSyncData} title="ซิงค์เงินได้และรายจ่ายเงินเดือน">
            <RefreshCw size={16} /> ซิงค์ข้อมูล (HDR/เงินเดือน)
          </button>
          <button className="btn btn-light" onClick={handleExportCSV} title="ส่งออกตารางธุรกรรมเป็นไฟล์ CSV">
            <Download size={16} /> ส่งออก CSV
          </button>
          <label className="btn btn-light" style={{ cursor: 'pointer', margin: 0 }} title="นำเข้าธุรกรรมผ่านไฟล์ CSV">
            <Upload size={16} /> นำเข้า CSV
            <input type="file" accept=".csv" onChange={handleImportCSV} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {/* 2. Financial Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        
        {/* รายรับ */}
        <div className="card-3xl" style={{ borderLeft: '5px solid var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem' }}>
          <div>
            <div style={{ color: 'var(--dark-light)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>รายรับรวม (ยอดกรอง)</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--success)' }}>
              ฿{financialSummary.income.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ backgroundColor: 'var(--success-light)', padding: '0.75rem', borderRadius: '50%', color: 'var(--success)' }}>
            <TrendingUp size={32} />
          </div>
        </div>

        {/* รายจ่าย */}
        <div className="card-3xl" style={{ borderLeft: '5px solid var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem' }}>
          <div>
            <div style={{ color: 'var(--dark-light)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>รายจ่ายรวม (ยอดกรอง)</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--danger)' }}>
              ฿{financialSummary.expense.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ backgroundColor: 'var(--danger-light)', padding: '0.75rem', borderRadius: '50%', color: 'var(--danger)' }}>
            <TrendingDown size={32} />
          </div>
        </div>

        {/* ยอดคงเหลือ */}
        <div className="card-3xl" style={{ borderLeft: '5px solid var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem' }}>
          <div>
            <div style={{ color: 'var(--dark-light)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>คงเหลือสุทธิ (ยอดกรอง)</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: financialSummary.balance >= 0 ? 'var(--dark)' : 'var(--danger)' }}>
              ฿{financialSummary.balance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ backgroundColor: '#fff8f0', padding: '0.75rem', borderRadius: '50%', color: 'var(--secondary)' }}>
            <FileCheck2 size={32} />
          </div>
        </div>

      </div>

      {/* 3. Search and Filters */}
      <div className="card-3xl" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          
          {/* ช่องค้นหา */}
          <div className="search-input-wrapper" style={{ flex: 1, minWidth: '280px', maxWidth: '400px' }}>
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              className="form-control" 
              placeholder="ค้นหาข้อมูลจาก รายการ, หมวดหมู่, วันที่..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>

          {/* ตัวคัดกรอง */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            
            {/* กรองปี */}
            <select className="form-control" style={{ width: '120px' }} value={yearFilter} onChange={(e) => { setYearFilter(e.target.value); setCurrentPage(1); }}>
              <option value="All">ทุกปี พ.ศ.</option>
              {uniqueYears.map(yr => (
                <option key={yr} value={yr}>ปี {yr}</option>
              ))}
            </select>

            {/* กรองเดือน */}
            <select className="form-control" style={{ width: '130px' }} value={monthFilter} onChange={(e) => { setMonthFilter(e.target.value); setCurrentPage(1); }}>
              <option value="All">ทุกเดือน</option>
              {monthThaiNames.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {/* กรองประเภท */}
            <select className="form-control" style={{ width: '130px' }} value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}>
              <option value="All">ทุกประเภท</option>
              <option value="income">รายรับ (Income)</option>
              <option value="expense">รายจ่าย (Expense)</option>
            </select>

          </div>
        </div>
      </div>

      {/* 4. Transactions Table */}
      <div className="card-3xl">
        <div className="table-container">
          <table className="hdh-table">
            <thead>
              <tr>
                <th style={{ width: '120px' }}>วันที่</th>
                <th style={{ width: '110px' }}>ประเภท</th>
                <th>รายการ</th>
                <th style={{ width: '150px' }}>หมวดหมู่</th>
                <th style={{ width: '160px', textAlign: 'right' }}>จำนวนเงิน</th>
                <th style={{ width: '100px', textAlign: 'center' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--dark-light)' }}>
                    ไม่พบข้อมูลธุรกรรมการเงินในระเวลาที่เลือก
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map(t => (
                  <tr key={t.id}>
                    <td>{formatDateBE(t.date)}</td>
                    <td>
                      <span className={`badge ${t.type === 'income' ? 'badge-success' : 'badge-danger'}`}>
                        {t.type === 'income' ? 'รายรับ' : 'รายจ่าย'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{t.description}</td>
                    <td>
                      <span style={{ fontSize: '0.875rem', backgroundColor: '#f0ece6', padding: '0.25rem 0.6rem', borderRadius: '4px', color: 'var(--dark-light)' }}>
                        {t.category}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: t.type === 'income' ? 'var(--success)' : 'var(--danger)', fontSize: '1.05rem' }}>
                      {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                        <button className="btn btn-light btn-icon-only" onClick={() => handleEditClick(t)} title="แก้ไขข้อมูล">
                          <Edit size={14} color="var(--secondary)" />
                        </button>
                        <button className="btn btn-light btn-icon-only" onClick={() => handleDeleteClick(t.id)} title="ลบข้อมูล">
                          <Trash2 size={14} color="var(--danger)" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--dark-light)' }}>
            แสดง {totalItems === 0 ? 0 : startIndex + 1} ถึง {Math.min(startIndex + itemsPerPage, totalItems)} จากทั้งหมด {totalItems} รายการ
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className="btn btn-light" 
              onClick={() => handlePageChange(currentPage - 1)} 
              disabled={currentPage === 1}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
            >
              ก่อนหน้า
            </button>
            <span style={{ alignSelf: 'center', fontSize: '0.875rem', fontWeight: 600, color: 'var(--dark-light)', padding: '0 0.5rem' }}>
              หน้า {currentPage} / {totalPages}
            </span>
            <button 
              className="btn btn-light" 
              onClick={() => handlePageChange(currentPage + 1)} 
              disabled={currentPage === totalPages}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
            >
              ถัดไป
            </button>
          </div>
        </div>

      </div>

      {/* 5. MODAL: เพิ่ม/แก้ไข ธุรกรรม */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content-wrapper" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>
                {editingId ? 'แก้ไขรายการธุรกรรม' : 'เพิ่มรายการธุรกรรม'}
              </h3>
              <button className="close-modal-btn" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSaveSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* วันที่ */}
                <div className="form-group">
                  <label className="form-label">วันที่ทำรายการ <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={tDate} 
                    onChange={(e) => setTDate(e.target.value)} 
                    required 
                  />
                </div>

                {/* ประเภท */}
                <div className="form-group">
                  <label className="form-label">ประเภทธุรกรรม</label>
                  <select 
                    className="form-control" 
                    value={tType} 
                    onChange={(e) => handleTypeChange(e.target.value)}
                  >
                    <option value="income">รายรับ (Income)</option>
                    <option value="expense">รายจ่าย (Expense)</option>
                  </select>
                </div>

                {/* รายการคำอธิบาย */}
                <div className="form-group">
                  <label className="form-label">รายการรายละเอียด <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="เช่น ค่าน้ำประปา, อ้างอิงเงินโอนแรกเข้า"
                    value={tDescription} 
                    onChange={(e) => setTDescription(e.target.value)} 
                    required 
                  />
                </div>

                {/* หมวดหมู่ (Dynamic) */}
                <div className="form-group">
                  <label className="form-label">หมวดหมู่</label>
                  {tType === 'income' ? (
                    <select 
                      className="form-control" 
                      value={tCategory} 
                      onChange={(e) => setTCategory(e.target.value)}
                    >
                      <option value="ทุน">ทุน</option>
                      <option value="ค่าเคส">ค่าเคส</option>
                      <option value="อื่นๆ">อื่นๆ</option>
                    </select>
                  ) : (
                    <select 
                      className="form-control" 
                      value={tCategory} 
                      onChange={(e) => setTCategory(e.target.value)}
                    >
                      <option value="รายจ่ายคงที่">รายจ่ายคงที่</option>
                      <option value="รายจ่ายผันแปร">รายจ่ายผันแปร</option>
                      <option value="อื่นๆ">อื่นๆ</option>
                    </select>
                  )}
                </div>

                {/* จำนวนเงิน */}
                <div className="form-group">
                  <label className="form-label">จำนวนเงิน (บาท) <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0.01"
                    className="form-control" 
                    placeholder="0.00"
                    value={tAmount} 
                    onChange={(e) => setTAmount(e.target.value)} 
                    required 
                  />
                </div>

                {/* สลิปหลักฐานการชำระเงิน */}
                <div className="form-group">
                  <label className="form-label">หลักฐานการทำรายการ (สลิป/ใบเสร็จ)</label>
                  <div style={{
                    border: '2px dashed var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: '#fafafa',
                    position: 'relative'
                  }}>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleSlipUpload}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: 'pointer'
                      }}
                    />
                    <Upload size={24} color="var(--secondary)" style={{ marginBottom: '0.4rem' }} />
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--dark)' }}>
                      {tSlipAttached ? `แนบไฟล์สำเร็จ: ${tSlipName}` : 'คลิกเพื่อเลือกไฟล์หลักฐาน (Click to upload)'}
                    </div>
                  </div>
                </div>

              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-light" onClick={() => { resetForm(); setShowModal(false); }}>ยกเลิก</button>
                <button type="submit" className="btn btn-secondary">บันทึก</button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
