/**
 * CSV Helper utilities for Hug Dee Home system
 * Supports parsing CSV strings with quotes and commas, and exporting with UTF-8 BOM for Thai Excel support.
 */

/**
 * Escapes a single CSV field value by doubling any quotes and wrapping the string in quotes
 * if it contains commas, quotes, or newlines.
 */
export const escapeCSVField = (val) => {
  if (val === undefined || val === null) return '';
  let str = String(val);
  if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
    str = '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
};

/**
 * Converts headers and row arrays into a formatted CSV string.
 * @param {string[]} headers 
 * @param {any[][]} rows 
 * @returns {string} CSV string
 */
export const stringifyCSV = (headers, rows) => {
  const headerLine = headers.map(h => escapeCSVField(h)).join(',');
  const rowLines = rows.map(row => row.map(cell => escapeCSVField(cell)).join(','));
  return [headerLine, ...rowLines].join('\r\n') + '\r\n';
};

/**
 * Parses a CSV raw text into a 2D array of rows and columns.
 * Handles double quotes, escaped quotes (""), embedded commas, and multiline cells correctly.
 * @param {string} text 
 * @returns {string[][]} Array of rows (each row is an array of strings)
 */
export const parseCSV = (text) => {
  // Strip BOM if present
  if (text.startsWith('\uFEFF')) {
    text = text.substring(1);
  }
  
  const result = [];
  let row = [''];
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote: "" -> "
        row[row.length - 1] += '"';
        i++; // skip next char
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Move to next column
      row.push('');
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      // End of row
      if (char === '\r' && nextChar === '\n') {
        i++; // skip LF if CRLF
      }
      result.push(row);
      row = [''];
    } else {
      // Normal character
      row[row.length - 1] += char;
    }
  }
  
  // Push the final row if it has contents
  if (row.length > 1 || row[0] !== '') {
    result.push(row);
  }
  
  // Remove trailing empty rows
  while (result.length > 0 && result[result.length - 1].length === 1 && result[result.length - 1][0] === '') {
    result.pop();
  }
  
  return result;
};

/**
 * Exports data to a CSV file and triggers a browser download.
 * Prepends UTF-8 BOM (\uFEFF) to ensure Excel displays Thai characters properly.
 * @param {string} filename 
 * @param {string[]} headers 
 * @param {any[][]} rows 
 */
export const exportToCSV = (filename, headers, rows) => {
  const csvContent = stringifyCSV(headers, rows);
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
