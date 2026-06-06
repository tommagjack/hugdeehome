import React, { useState, useMemo } from 'react';
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
  onVoidReceipt, 
  onEditDraftReceipt, 
  onPrintReceipt,
  onDeleteReceipt,
  currentUser
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMonth, setFilterMonth] = useState('All'); // All, 01-12
  const [filterYear, setFilterYear] = useState('2026');   // All, 2026, ฯลฯ

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
        id: ['id', 'เลขที่เอกสาร', 'เลขที่บิล', 'รหัสเอกสาร', 'เลขที่'],
        hn: ['hn', 'รหัส hn', 'รหัสผู้ป่วย', 'hn ผู้ป่วย'],
        date: ['date', 'วันที่ออกบิล', 'วันที่', 'วันที่บิล'],
        items: ['items', 'รายการซื้อ', 'รายการสินค้า', 'สินค้า'],
        discountValue: ['discountvalue', 'ส่วนลด'],
        discountType: ['discounttype', 'ประเภทส่วนลด'],
        discountReason: ['discountreason', 'เหตุผลส่วนลด'],
        promotionId: ['promotionid', 'รหัสโปรโมชั่น', 'โปรโมชั่น'],
        paymentMethod: ['paymentmethod', 'ชำระโดย', 'วิธีชำระเงิน'],
        bankAccountId: ['bankaccountid', 'บัญชีธนาคาร', 'ธนาคาร'],
        slipUrl: ['slipurl', 'ลิงก์สลิป', 'รูปสลิป'],
        totalAmount: ['totalamount', 'ยอดสุทธิ', 'ยอดรวม', 'จำนวนเงิน'],
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

      if (setReceipts) {
        setReceipts(prev => {
          let currentReceipts = [...prev];

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

          return currentReceipts;
        });
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
      showCancelButton: true,
      confirmButtonColor: 'var(--danger)',
      cancelButtonColor: 'var(--dark-light)',
      confirmButtonText: 'ยืนยันการลบถาวร',
      cancelButtonText: 'ยกเลิก'
    }).then((result) => {
      if (result.isConfirmed) {
        if (onDeleteReceipt) {
          onDeleteReceipt(id);
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
          r.id.toLowerCase().includes(query) ||
          r.hn.toLowerCase().includes(query) ||
          r.patientName.toLowerCase().includes(query) ||
          (r.patientNickname && r.patientNickname.toLowerCase().includes(query));

        // กรองปี
        const dateParts = r.date.split('-'); // YYYY-MM-DD
        const year = dateParts[0];
        const month = dateParts[1];
        
        const matchesYear = filterYear === 'All' || year === filterYear;
        const matchesMonth = filterMonth === 'All' || month === filterMonth;

        return matchesQuery && matchesYear && matchesMonth;
      })
      .sort((a, b) => b.id.localeCompare(a.id)); // เรียงรหัสใบเสร็จล่าสุดขึ้นก่อน (ใหม่ไปเก่า)
  }, [receipts, patients, searchQuery, filterMonth, filterYear]);

  // จัดการยกเลิกบิล (Void)
  const handleVoidClick = (id) => {
    Swal.fire({
      title: `ยกเลิกใบเสร็จนี้? [เลขที่: ${id}]`,
      text: "ยอดขายจะถูกดึงออกจาก Dashboard และจำนวนคอร์สบริการในบิลนี้จะถูกหักล้างออกคืนให้ผู้ป่วยทันที!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--danger)',
      cancelButtonColor: 'var(--dark-light)',
      confirmButtonText: 'ยืนยันการยกเลิก (Void)',
      cancelButtonText: 'ยกเลิก'
    }).then((result) => {
      if (result.isConfirmed) {
        onVoidReceipt(id);
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
                <option value="2026">2569 (2026)</option>
                <option value="2027">2570 (2027)</option>
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
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '4rem', color: 'var(--dark-light)' }}>
                    ไม่พบข้อมูลบิลการเงินตามเงื่อนไขที่ระบุ
                  </td>
                </tr>
              ) : (
                filteredReceipts.map((r) => {
                  const isVoided = r.status === 'ยกเลิก';
                  const isDraft = r.status === 'รอชำระเงิน';
                  
                  return (
                    <tr key={r.id} style={{ opacity: isVoided ? 0.6 : 1 }}>
                      <td style={{ fontWeight: 700, color: 'var(--secondary)', fontFamily: 'monospace' }}>
                        {r.id}
                      </td>
                      <td>{new Date(r.date).toLocaleDateString('th-TH')}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.patientName}</div>
                        {/* แสดงชื่อเล่นในวงเล็บต่อท้าย HN ลูกค้าเสมอตามสเปก */}
                        <div style={{ fontSize: '0.75rem', color: 'var(--dark-light)' }}>
                          HN: {r.hn} ({r.patientNickname ? `น้อง${r.patientNickname}` : 'ไม่มีชื่อเล่น'})
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

                          {/* บิลดราฟท์แก้ไขได้ */}
                          {isDraft && (
                            <button 
                              className="btn btn-light btn-icon-only" 
                              title="ดึงข้อมูลกลับไปจ่ายเงินต่อที่ POS"
                              onClick={() => handleEditDraft(r)}
                            >
                              <Edit size={16} color="var(--secondary)" />
                            </button>
                          )}

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
        
        <div style={{ fontSize: '0.8rem', color: 'var(--dark-light)', textAlign: 'right', marginTop: '1rem' }}>
          รวมเอกสารทั้งหมด {filteredReceipts.length} รายการ (เรียงจากเลขบิลล่าสุด)
        </div>
      </div>
    </div>
  );
}
