@echo off
chcp 65001 > nul
echo ========================================================
echo   🌟 اجرای بازی کاروان رؤیاها (Dream Caravan 3D) 🌟
echo ========================================================
echo.
echo در حال باز کردن بازی در مرورگر...
start http://localhost:3000/caravan
echo.
echo اگر سرور در حال اجرا نیست، دستور زیر را اجرا کنید:
echo npm run dev
echo.
pause
