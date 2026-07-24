# ESP32 IoT Dashboard & Web Control Panel

ระบบแดชบอร์ดสำหรับควบคุมและมอนิเตอร์อุปกรณ์ ESP32 IoT แบบ Real-time รองรับทั้งการเชื่อมต่อผ่าน Supabase Cloud Database และโหมดจำลอง Local Simulation

## 🚀 คุณสมบัติเด่น (Features)
- **มอนิเตอร์เซนเซอร์แบบ Real-time**: แสดงผลอุณหภูมิ, ความชื้น, แสง, สวิตช์ และค่าเซนเซอร์ต่างๆ
- **ฐานข้อมูล Supabase Cloud**: รองรับการเชื่อมต่อและจัดเก็บข้อมูลประวัติย้อนหลังด้วย Supabase
- **ระบบสลับโหมดอัตโนมัติ**: รองรับทั้งโหมด Cloud Sync และ Local Simulation กรณีไม่มีสัญญาณอินเทอร์เน็ต
- **ESP32 Code Generator**: สร้างโค้ด Arduino สำหรับนำไปแฟลชลงบอร์ด ESP32 ได้ทันที
- **Local Desktop Launcher**: สคริปต์ `local-launcher.js` และ `run-linux.sh` สำหรับรันใช้งานแบบออฟไลน์บนเครื่องคอมพิวเตอร์

## 🛠️ วิธีการรันใช้งานแบบ Local (Local App)
1. ดาวน์โหลดไฟล์โปรเจกต์ (ZIP) และทำการแตกไฟล์ทั้งหมด
2. รันคำสั่งผ่าน Terminal หรือเรียกใช้สคริปต์รันโปรเจกต์:
   ```bash
   node local-launcher.js
   ```
3. ตัวระบบจะทำการตรวจสอบ Dependencies และสั่งสร้าง Production Build พร้อมเปิดใช้งานโดยอัตโนมัติ

## 🌐 การ Deploy บน Render (Render Hosting)
- **Build Command**: `npm run build`
- **Start Command**: `npm run start` (หรือ `node dist/server.cjs`)
- **Environment Variables**: ตั้งค่า `SUPABASE_URL` และ `SUPABASE_KEY` (หรือ `SUPABASE_PUBLISHABLE_KEY`) ในหน้า Environment ของ Render
- ตัวระบบเป็น Full-Stack Express Server ที่รวมทั้ง API และ Static Frontend ซึ่งรันได้อย่างดีบน Render Web Service
