# คู่มือการตั้งค่า CI/CD: Push โค้ดลง Git และ Deploy ผ่าน Firebase อัตโนมัติ

เพื่อให้ระบบสามารถอัปเดตหน้าเว็บบน Firebase Hosting ได้โดยอัตโนมัติทันทีที่คุณทำทำการ **Git Push** โค้ดใหม่ขึ้นไปยัง Git Repository (เช่น GitHub) ระบบได้จัดเตรียมไฟล์คอนฟิก **GitHub Actions Workflow** ไว้ให้เรียบร้อยแล้วที่ `.github/workflows/firebase-hosting.yml`

นี่คือขั้นตอนทั้งหมดในการตั้งค่าและเชื่อมโยงระบบ:

---

## ขั้นตอนที่ 1: เตรียม Git Repository (GitHub)

1. เข้าไปที่เว็บ [GitHub](https://github.com) แล้วสร้าง Repository ใหม่ (แบบ Public หรือ Private ก็ได้)
2. ดาวน์โหลดโค้ดโปรเจกต์นี้ลงเครื่องของคุณ
3. เปิด Terminal หรือ Git Bash ในโฟลเดอร์โปรเจกต์บนเครื่อง แล้วรันคำสั่งเหล่านี้เพื่อเริ่มต้นเชื่อม Git:
   ```bash
   # 1. เริ่มใช้งาน Git ในโฟลเดอร์นี้
   git init

   # 2. เพิ่มไฟล์ทั้งหมดเข้าไปในระบบติดตามของ Git
   git add .

   # 3. บันทึกประวัติการเริ่มสร้างโปรเจกต์
   git commit -m "Initial commit with Firebase GitHub Actions"

   # 4. เปลี่ยนชื่อกิ่งหลักเป็น main
   git branch -M main

   # 5. เชื่อมต่อเข้ากับ GitHub Repository ของคุณ (แทนที่ URL ด้วยของคุณจริง)
   git remote add origin https://github.com/ชื่อผู้ใช้ของคุณ/ชื่อโปรเจกต์ของคุณ.git

   # 6. Push โค้ดก้อนแรกขึ้นไปบน GitHub
   git push -u origin main
   ```

---

## ขั้นตอนที่ 2: ตั้งค่าเชื่อมสิทธิ์ระหว่าง GitHub และ Firebase

เพื่อให้ GitHub ได้รับอนุญาตจาก Firebase ให้ทำหน้าที่ Deploy โค้ดได้ วิธีการที่ง่ายที่สุดคือการใช้ **Firebase CLI** บนเครื่องของคุณช่วยตั้งค่าอัตโนมัติ:

1. เปิด Terminal ในโฟลเดอร์โปรเจกต์ของคุณ แล้วรันคำสั่ง:
   ```bash
   firebase init hosting:github
   ```
2. ระบบจะเปิดเว็บเบราว์เซอร์ให้คุณกดเข้าสู่ระบบและอนุญาตสิทธิ์แก่ **GitHub**
3. **กรอกข้อมูลบน Terminal เมื่อระบบถาม:**
   - **For which GitHub repository would you like to set up a GitHub workflow?**  
     *คำตอบ:* กรอกเป็น `ชื่อผู้ใช้GitHub/ชื่อRepository` (เช่น `itthikon/esp32-dashboard`)
   - **Set up the workflow to run a build script before every deploy?**  
     *คำตอบ:* ตอบ `Yes` (หรือพิมพ์ `y`)
   - **What script should be run before every deploy?**  
     *คำตอบ:* กด Enter ผ่านได้เลยเพื่อใช้ค่าเริ่มต้น (`npm ci && npm run build`)
   - **Set up automatic deploy to site's live channel when a PR is merged?**  
     *คำตอบ:* ตอบ `Yes` (หรือพิมพ์ `y`)
   - **What is the name of the branch associated with your site's live channel?**  
     *คำตอบ:* ตอบ `main` (หรือ `master`)

> 🎉 **สิ่งที่เกิดขึ้นหลังรันเสร็จสิ้น:**
> - Firebase จะสร้าง **Service Account (สิทธิ์แอดมินย่อย)** ขึ้นมาใน Firebase Console
> - Firebase จะนำโทเค็นลับนี้ไปเซฟใส่ในเมนู **GitHub Repository Settings > Secrets and variables > Actions** ของโปรเจกต์ใน GitHub ให้โดยอัตโนมัติในชื่อสัญลักษณ์ `FIREBASE_SERVICE_ACCOUNT` ทำให้พร้อมรันโปรเจกต์ทันที

---

## ขั้นตอนที่ 3: ทดสอบการทำงานของ CI/CD

เมื่อตั้งค่าในขั้นตอนที่ 2 สำเร็จแล้ว ทุกครั้งที่คุณมีการแก้ไขโค้ดใดๆ บนคอมพิวเตอร์ของคุณและส่งขึ้น Git:

```bash
git add .
git commit -m "อัปเดตความเสถียรแดชบอร์ด"
git push origin main
```

1. หน้าต่าง **Actions** ใน GitHub ของคุณจะเริ่มทำงานทันทีโดยเริ่มจำลองคอมพิวเตอร์เครื่องหนึ่งขึ้นมา ดึงโค้ด ลิ๊นต์ ตรวจสอบ และสั่ง `npm run build` จากนั้นจะ Deploy ขึ้น Firebase Hosting ให้อัตโนมัติ
2. คุณจะได้รับลิงก์ Live URL ทันทีในแถบหน้าต่าง Actions เมื่อสำเร็จ
