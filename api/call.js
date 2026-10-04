// Serverless HTML Call Redirector for LINE Official Account Rich Menus
export default function handler(req, res) {
  const { phone } = req.query;
  const rawPhone = phone || '0946753557';
  const cleanPhone = rawPhone.replace(/\D/g, '') || '0946753557';
  
  // Format Thai phone number for display (e.g. 094-675-3557)
  const phoneFormatted = cleanPhone.length === 10
    ? `${cleanPhone.slice(0, 3)}-${cleanPhone.slice(3, 6)}-${cleanPhone.slice(6)}`
    : (cleanPhone.length === 9 ? `${cleanPhone.slice(0, 2)}-${cleanPhone.slice(2, 5)}-${cleanPhone.slice(5)}` : cleanPhone);

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>โทรติดต่อคลินิกกิจกรรมบำบัดบ้านฮักดี</title>
  <style>
    body {
      font-family: 'Prompt', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #FEF8F1;
      color: #2B2D42;
      padding: 1.5rem;
      box-sizing: border-box;
      text-align: center;
    }
    .card {
      background: #FFFFFF;
      padding: 2.5rem 2rem;
      border-radius: 24px;
      box-shadow: 0 10px 30px rgba(193, 155, 108, 0.15);
      max-width: 380px;
      width: 100%;
      border: 1px solid #E5DCCF;
    }
    .phone-icon {
      font-size: 3.2rem;
      margin-bottom: 1rem;
    }
    h1 {
      font-size: 1.35rem;
      margin: 0 0 0.5rem 0;
      color: #2B2D42;
      font-weight: 700;
    }
    p {
      color: #64748B;
      font-size: 0.95rem;
      margin: 0 0 1.5rem 0;
      line-height: 1.5;
    }
    .phone-number {
      font-size: 1.85rem;
      font-weight: 800;
      color: #C19B6C;
      letter-spacing: 1px;
      margin-bottom: 1.75rem;
      background: #FDFBF7;
      padding: 10px;
      border-radius: 12px;
      border: 1px dashed #C19B6C;
    }
    .call-btn {
      display: block;
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      color: #FFFFFF;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 9999px;
      font-size: 1.15rem;
      font-weight: 700;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
      transition: transform 0.15s ease;
    }
    .call-btn:active {
      transform: scale(0.97);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="phone-icon">📞</div>
    <h1>โทรติดต่อคลินิกบ้านฮักดี</h1>
    <p>กำลังเชื่อมต่อไปยังหมายเลขโทรศัพท์ของคลินิก...</p>
    <div class="phone-number">${phoneFormatted}</div>
    <a href="tel:${cleanPhone}" class="call-btn">โทรออกทันที 📞</a>
  </div>
  <script>
    setTimeout(function() {
      window.location.href = "tel:${cleanPhone}";
    }, 300);
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (typeof res.send === 'function') {
    return res.status(200).send(html);
  } else {
    res.statusCode = 200;
    return res.end(html);
  }
}
