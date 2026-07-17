#!/bin/bash
# เคลื่อนย้ายไปยังไดเรกทอรีปัจจุบันของไฟล์สคริปต์
cd "$(dirname "$0")"
clear
echo "==============================================="
echo " กำลังเรียกใช้งาน ESP32 IoT Dashboard แบบ Local App (Linux)"
echo "==============================================="

# ตรวจสอบว่ามี node หรือไม่
if ! command -v node &> /dev/null
then
    echo "❌ ไม่พบการติดตั้ง Node.js บนระบบของคุณ!"
    echo "โปรดติดตั้ง Node.js ก่อนใช้งาน (เช่น sudo apt install nodejs npm)"
    read -p "กด Enter เพื่อปิด..."
    exit 1
fi

node local-launcher.js
if [ $? -ne 0 ]; then
    echo ""
    echo "[ข้อผิดพลาด] เกิดข้อผิดพลาดในการรันแอปพลิเคชัน"
    read -p "กด Enter เพื่อปิด..."
fi
