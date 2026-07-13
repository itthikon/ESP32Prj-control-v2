# คู่มือการติดตั้งและโฮสต์โปรเจกต์บน Firebase (Firebase Hosting + Functions Deployment Guide)

เนื่องจากโปรเจกต์นี้เป็นแอปพลิเคชันแบบ Full-Stack (React Vite Frontend + Express Node.js Backend) การนำไปโฮสต์บน Firebase จำเป็นต้องแบ่งส่วนการทำงานออกเป็น 2 ส่วนหลัก:
1. **Firebase Hosting** สำหรับจัดเก็บไฟล์ Static (HTML, JS, CSS) ของหน้าบ้าน (Frontend)
2. **Firebase Functions** สำหรับรันระบบหลังบ้าน (Express Backend API) เพื่อรับข้อมูลจาก ESP32 และเชื่อมต่อฐานข้อมูล

---

## ขั้นตอนการเตรียมเครื่องสำหรับการ Deploy

### 1. ติดตั้ง Firebase CLI บนคอมพิวเตอร์ของคุณ
เปิด Terminal/Command Prompt บนเครื่องของคุณ แล้วรันคำสั่งต่อไปนี้เพื่อติดตั้ง Firebase CLI:
```bash
npm install -g firebase-tools
```

### 2. เข้าสู่ระบบ Firebase
รันคำสั่งด้านล่างเพื่อเข้าสู่ระบบผ่านเว็บเบราว์เซอร์:
```bash
firebase login
```

### 3. เริ่มต้นสร้างไฟล์คอนฟิกสำหรับ Firebase ในโฟลเดอร์โปรเจกต์
ดาวน์โหลดโค้ดนี้ลงเครื่อง แล้วเปิดโฟลเดอร์ในเครื่องของคุณ จากนั้นเปิด Terminal แล้วรัน:
```bash
firebase init
```
*เลือกเปิดใช้งานบริการดังนี้:*
- **Hosting**: Configure files for Firebase Hosting
- **Functions**: Configure a Cloud Function for Firebase (เลือกใช้ภาษา **TypeScript**)

---

## การเชื่อมโยง Express Backend เข้ากับ Cloud Functions

เพื่อให้ระบบ Express Server ใน `server.ts` สามารถรันบน Firebase Cloud Functions ได้อย่างสมบูรณ์แบบ ให้แก้ไขตามแนวทางดังนี้:

1. ติดตั้งแพ็กเกจ `firebase-functions` และ `firebase-admin` ในโฟลเดอร์ฝั่ง Backend
2. หุ้ม Express Server ด้วย `https.onRequest` ของ Firebase:

```typescript
// ตัวอย่างการห่อหุ้มใน server.ts หรือ index.ts ของ functions
import * as functions from "firebase-functions";
import express from "express";

const app = express();
// ... เพิ่ม API routes ทั้งหมดตามเดิม ...

// ส่งออกให้ Firebase Functions เรียกใช้งาน
export const api = functions.https.onRequest(app);
```

3. อัปเดตไฟล์ `firebase.json` (ระบบได้จัดเตรียมไฟล์คอนฟิกเริ่มต้นไว้ให้คุณแล้วที่โฟลเดอร์ราก):
```json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "/api/**",
        "function": "api"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

---

## ขั้นตอนการสร้างและ Deploy ขึ้นเซิร์ฟเวอร์จริง

### 1. Build โค้ดของหน้า Frontend
ก่อนทำการ Deploy ทุกครั้ง จะต้องแปลงโค้ด React ให้เป็นไฟล์ Static ใช้งานจริงก่อน:
```bash
npm run build
```

### 2. Deploy ขึ้นระบบ Firebase
รันคำสั่งสั้นๆ นี้เพื่ออัปโหลดทั้งหน้าบ้านและหลังบ้านไปที่โปรเจกต์ของคุณบนคลาวด์:
```bash
firebase deploy
```

เมื่อการอัปโหลดสำเร็จ คุณจะได้ URL ของแอปพลิเคชันจาก Firebase (ลงท้ายด้วย `.web.app` หรือ `.firebaseapp.com`) เพื่อนำไปกรอกลงในโค้ดของบอร์ด ESP32 เพื่อเริ่มส่งข้อมูลจริงได้ทันที!
