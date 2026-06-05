import React from 'react';
import { 
  Coins, 
  Plus, 
  Trash2 
} from 'lucide-react';
import Swal from 'sweetalert2';

export default function SalarySettings({ salaryRules, setSalaryRules }) {
  // ฟังก์ชันเพิ่มรายการรับใหม่
  const handleAddEarning = () => {
    const newEarn = {
      id: 'earn-' + Date.now(),
      name: '',
      type: 'คงที่',
      value: 0
    };
    setSalaryRules({
      ...salaryRules,
      earnings: [...(salaryRules.earnings || []), newEarn]
    });
  };

  // ฟังก์ชันเพิ่มรายการหักใหม่
  const handleAddDeduction = () => {
    const newDed = {
      id: 'ded-' + Date.now(),
      name: '',
      type: 'เปอร์เซ็นต์ (%)',
      value: 0,
      maxLimit: ''
    };
    setSalaryRules({
      ...salaryRules,
      deductions: [...(salaryRules.deductions || []), newDed]
    });
  };

  // ลบรายการรับ
  const handleDeleteEarning = (id) => {
    setSalaryRules({
      ...salaryRules,
      earnings: salaryRules.earnings.filter(item => item.id !== id)
    });
  };

  // ลบรายการหัก
  const handleDeleteDeduction = (id) => {
    setSalaryRules({
      ...salaryRules,
      deductions: salaryRules.deductions.filter(item => item.id !== id)
    });
  };

  // อัปเดตฟิลด์ในรายการรับ
  const handleUpdateEarning = (id, field, val) => {
    const updated = salaryRules.earnings.map(item => {
      if (item.id === id) {
        return { ...item, [field]: val };
      }
      return item;
    });
    setSalaryRules({ ...salaryRules, earnings: updated });
  };

  // อัปเดตฟิลด์ในรายการหัก
  const handleUpdateDeduction = (id, field, val) => {
    const updated = salaryRules.deductions.map(item => {
      if (item.id === id) {
        return { ...item, [field]: val };
      }
      return item;
    });
    setSalaryRules({ ...salaryRules, deductions: updated });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="page-header">
        <h1 className="page-title">
          <Coins size={28} />
          ตั้งค่ารายการรับและหักเงินเดือน
        </h1>
      </div>

      <div className="salary-rule-container">
        
        {/* ส่วนที่ 1: รายการรับ */}
        <div className="salary-rule-section">
          <div className="salary-rule-header">
            <h3 className="salary-rule-title-earn">รายการรับ</h3>
            <button 
              className="btn btn-light" 
              onClick={handleAddEarning}
              style={{ color: 'var(--success)', backgroundColor: '#e6f7ed', border: '1px solid #ccefdc', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <Plus size={16} /> เพิ่มรายการรับ
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {(!salaryRules.earnings || salaryRules.earnings.length === 0) ? (
              <div style={{ fontStyle: 'italic', color: 'var(--dark-light)', fontSize: '0.9rem', padding: '1rem', textAlign: 'center' }}>
                ไม่มีรายการรับมาตรฐาน (กรุณากดเพิ่มรายการรับ)
              </div>
            ) : (
              salaryRules.earnings.map((item) => (
                <div key={item.id} className="salary-rule-row">
                  <div style={{ flex: 3 }}>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="ชื่อรายการรับ เช่น ค่าทำงานล่วงเวลา (OT)"
                      value={item.name}
                      onChange={(e) => handleUpdateEarning(item.id, 'name', e.target.value)}
                    />
                  </div>
                  <div style={{ flex: 1.5, minWidth: '100px' }}>
                    <select 
                      className="form-control"
                      value={item.type}
                      onChange={(e) => handleUpdateEarning(item.id, 'type', e.target.value)}
                    >
                      <option value="คงที่">คงที่</option>
                      <option value="เปอร์เซ็นต์ (%)">เปอร์เซ็นต์ (%)</option>
                    </select>
                  </div>
                  <div style={{ flex: 1.5, minWidth: '100px' }}>
                    <input 
                      type="number" 
                      className="form-control" 
                      placeholder="จำนวนเงิน"
                      step="0.01"
                      min="0"
                      value={item.value || ''}
                      onChange={(e) => handleUpdateEarning(item.id, 'value', Number(e.target.value) || 0)}
                    />
                  </div>
                  <button 
                    className="btn btn-light btn-icon-only" 
                    onClick={() => handleDeleteEarning(item.id)}
                    style={{ border: '1px solid var(--border)', padding: '0.45rem' }}
                    title="ลบรายการ"
                  >
                    <Trash2 size={15} color="var(--danger)" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ส่วนที่ 2: รายการหัก */}
        <div className="salary-rule-section">
          <div className="salary-rule-header">
            <h3 className="salary-rule-title-deduct">รายการหัก</h3>
            <button 
              className="btn btn-light" 
              onClick={handleAddDeduction}
              style={{ color: 'var(--danger)', backgroundColor: '#fdf2f2', border: '1px solid #fde2e2', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <Plus size={16} /> เพิ่มรายการหัก
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {(!salaryRules.deductions || salaryRules.deductions.length === 0) ? (
              <div style={{ fontStyle: 'italic', color: 'var(--dark-light)', fontSize: '0.9rem', padding: '1rem', textAlign: 'center' }}>
                ไม่มีรายการหักมาตรฐาน (กรุณากดเพิ่มรายการหัก)
              </div>
            ) : (
              salaryRules.deductions.map((item) => (
                <div key={item.id} className="salary-rule-row">
                  <div style={{ flex: 3 }}>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="ชื่อรายการหัก เช่น ภาษี (Tax)"
                      value={item.name}
                      onChange={(e) => handleUpdateDeduction(item.id, 'name', e.target.value)}
                    />
                  </div>
                  <div style={{ flex: 1.5, minWidth: '100px' }}>
                    <select 
                      className="form-control"
                      value={item.type}
                      onChange={(e) => handleUpdateDeduction(item.id, 'type', e.target.value)}
                    >
                      <option value="เปอร์เซ็นต์ (%)">เปอร์เซ็นต์ (%)</option>
                      <option value="คงที่">คงที่</option>
                    </select>
                  </div>
                  <div style={{ flex: 1.2, minWidth: '80px' }}>
                    <input 
                      type="number" 
                      className="form-control" 
                      placeholder="จำนวน"
                      step="0.01"
                      min="0"
                      value={item.value || ''}
                      onChange={(e) => handleUpdateDeduction(item.id, 'value', Number(e.target.value) || 0)}
                    />
                  </div>
                  <div style={{ flex: 1.8, minWidth: '120px' }}>
                    <input 
                      type="number" 
                      className="form-control" 
                      placeholder="ไม่เกิน (บาท)"
                      min="0"
                      value={item.maxLimit || ''}
                      onChange={(e) => handleUpdateDeduction(item.id, 'maxLimit', e.target.value ? Number(e.target.value) : '')}
                    />
                  </div>
                  <button 
                    className="btn btn-light btn-icon-only" 
                    onClick={() => handleDeleteDeduction(item.id)}
                    style={{ border: '1px solid var(--border)', padding: '0.45rem' }}
                    title="ลบรายการ"
                  >
                    <Trash2 size={15} color="var(--danger)" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
      
      <div style={{ backgroundColor: 'var(--light)', border: '1px solid var(--border-light)', padding: '1rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--dark-light)' }}>
        ℹ️ <strong>คำแนะนำ:</strong> ค่าตั้งต้นของรายการรับและหักจะถูกใช้เป็นฐานในการคำนวณเงินเดือนโดยอัตโนมัติเมื่อสร้างรายการคำนวณเงินเดือนในรอบถัดไป
      </div>
    </div>
  );
}
