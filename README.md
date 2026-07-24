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

## 📡 การตั้งค่าการเชื่อมต่อ Supabase
- เข้าไปที่แท็บ **"ตั้งค่า Supabase"** บนหน้าเว็บแดชบอร์ด
- กรอก `SUPABASE_URL` และ `SUPABASE_PUBLISHABLE_KEY` (หรือ Secret Key)
- กดปุ่มบันทึกและทดสอบการเชื่อมต่อ
