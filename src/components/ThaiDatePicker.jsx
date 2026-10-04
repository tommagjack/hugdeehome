import React, { useState, useEffect, useMemo } from 'react';

const THAI_MONTHS = [
  { value: 1, name: 'มกราคม' },
  { value: 2, name: 'กุมภาพันธ์' },
  { value: 3, name: 'มีนาคม' },
  { value: 4, name: 'เมษายน' },
  { value: 5, name: 'พฤษภาคม' },
  { value: 6, name: 'มิถุนายน' },
  { value: 7, name: 'กรกฎาคม' },
  { value: 8, name: 'สิงหาคม' },
  { value: 9, name: 'กันยายน' },
  { value: 10, name: 'ตุลาคม' },
  { value: 11, name: 'พฤศจิกายน' },
  { value: 12, name: 'ธันวาคม' }
];

export const calculateAgeFromParts = (day, month, yearBE) => {
  if (!day || !month || !yearBE) return { years: 0, months: 0, text: '0 ปี 0 เดือน' };
  
  const d = parseInt(day, 10);
  const m = parseInt(month, 10) - 1;
  let y = parseInt(yearBE, 10);
  if (y > 2400) {
    y = y - 543;
  }

  const birthDate = new Date(y, m, d);
  if (isNaN(birthDate.getTime())) return { years: 0, months: 0, text: '0 ปี 0 เดือน' };

  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();

  if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
    years--;
    months += 12;
  }
  if (today.getDate() < birthDate.getDate()) {
    months--;
  }
  if (months < 0) {
    months = 11;
  }

  return {
    years: Math.max(0, years),
    months: Math.max(0, months),
    text: `${Math.max(0, years)} ปี ${Math.max(0, months)} เดือน`
  };
};

export const parseRawDateToParts = (rawDate) => {
  if (!rawDate) return { day: '', month: '', yearBE: '' };

  const str = String(rawDate).trim();
  // Format YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (ymdMatch) {
    let year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    if (year < 2400) year += 543;
    return { day: String(day), month: String(month), yearBE: String(year) };
  }

  // Format DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    let year = parseInt(dmyMatch[3], 10);
    if (year < 2400) year += 543;
    return { day: String(day), month: String(month), yearBE: String(year) };
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    let year = d.getFullYear();
    if (year < 2400) year += 543;
    return {
      day: String(d.getDate()),
      month: String(d.getMonth() + 1),
      yearBE: String(year)
    };
  }

  return { day: '', month: '', yearBE: '' };
};

export default function ThaiDatePicker({ 
  value, 
  onChange, 
  required = false, 
  disabled = false,
  showAgeBadge = true
}) {
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [yearBE, setYearBE] = useState('');

  // Sync state when value prop changes
  useEffect(() => {
    const parts = parseRawDateToParts(value);
    setDay(parts.day);
    setMonth(parts.month);
    setYearBE(parts.yearBE);
  }, [value]);

  // Current Thai Buddhist Era year
  const currentYearBE = useMemo(() => {
    return new Date().getFullYear() + 543;
  }, []);

  // List of years from currentYearBE + 1 down to currentYearBE - 40
  const yearOptions = useMemo(() => {
    const years = [];
    for (let y = currentYearBE; y >= currentYearBE - 40; y--) {
      years.push(y);
    }
    return years;
  }, [currentYearBE]);

  // Number of days in selected month/year
  const maxDays = useMemo(() => {
    if (!month) return 31;
    const m = parseInt(month, 10);
    let y = parseInt(yearBE, 10);
    if (!y) y = currentYearBE;
    const yAD = y > 2400 ? y - 543 : y;
    return new Date(yAD, m, 0).getDate();
  }, [month, yearBE, currentYearBE]);

  const daysOptions = useMemo(() => {
    const days = [];
    for (let d = 1; d <= maxDays; d++) {
      days.push(d);
    }
    return days;
  }, [maxDays]);

  const ageInfo = useMemo(() => {
    return calculateAgeFromParts(day, month, yearBE);
  }, [day, month, yearBE]);

  const handleUpdate = (newDay, newMonth, newYearBE) => {
    setDay(newDay);
    setMonth(newMonth);
    setYearBE(newYearBE);

    if (newDay && newMonth && newYearBE) {
      const dNum = parseInt(newDay, 10);
      const mNum = parseInt(newMonth, 10);
      let yNum = parseInt(newYearBE, 10);
      const yAD = yNum > 2400 ? yNum - 543 : yNum;

      const dateAD = `${yAD}-${String(mNum).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
      const dateBE = `${yNum}-${String(mNum).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
      const age = calculateAgeFromParts(newDay, newMonth, newYearBE);

      if (onChange) {
        onChange(dateAD, dateBE, age.text);
      }
    } else {
      if (onChange) {
        onChange('', '', '0 ปี 0 เดือน');
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%' }}>
      <div style={{ display: 'flex', gap: '0.5rem', width: '100%', flexWrap: 'wrap' }}>
        {/* วัน */}
        <div style={{ flex: '1 1 80px', minWidth: '70px' }}>
          <select
            className="form-control"
            value={day}
            disabled={disabled}
            required={required}
            onChange={(e) => handleUpdate(e.target.value, month, yearBE)}
            style={{ fontSize: '0.9rem', padding: '0.45rem 0.5rem' }}
          >
            <option value="">-- วัน --</option>
            {daysOptions.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* เดือน */}
        <div style={{ flex: '2 1 120px', minWidth: '110px' }}>
          <select
            className="form-control"
            value={month}
            disabled={disabled}
            required={required}
            onChange={(e) => handleUpdate(day, e.target.value, yearBE)}
            style={{ fontSize: '0.9rem', padding: '0.45rem 0.5rem' }}
          >
            <option value="">-- เดือน --</option>
            {THAI_MONTHS.map(m => (
              <option key={m.value} value={m.value}>{m.name}</option>
            ))}
          </select>
        </div>

        {/* ปี พ.ศ. */}
        <div style={{ flex: '1.5 1 100px', minWidth: '95px' }}>
          <select
            className="form-control"
            value={yearBE}
            disabled={disabled}
            required={required}
            onChange={(e) => handleUpdate(day, month, e.target.value)}
            style={{ fontSize: '0.9rem', padding: '0.45rem 0.5rem', fontWeight: 600, color: 'var(--secondary)' }}
          >
            <option value="">-- ปี พ.ศ. --</option>
            {yearOptions.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {showAgeBadge && day && month && yearBE && (
        <div style={{ fontSize: '0.8rem', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
          <span>คำนวณอายุ:</span>
          <span style={{ backgroundColor: '#eef6fc', padding: '2px 8px', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
            {ageInfo.text}
          </span>
        </div>
      )}
    </div>
  );
}
