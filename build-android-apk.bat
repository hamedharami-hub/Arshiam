@echo off
echo ===================================================
echo     ARSHNAZ - Building Android APK with Widgets
echo ===================================================

set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
set "PATH=%JAVA_HOME%\bin;%PATH%"

echo 1. Building Web Assets in frontend...
cd frontend
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Web build failed!
    cd ..
    pause
    exit /b %ERRORLEVEL%
)

echo 2. Syncing Capacitor Android...
call npx cap sync android
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Capacitor sync failed!
    cd ..
    pause
    exit /b %ERRORLEVEL%
)

echo 3. Compiling Android APK with Gradle...
cd android
call gradlew.bat assembleDebug
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Gradle build failed!
    cd ..\..
    pause
    exit /b %ERRORLEVEL%
)
cd ..\..

echo 4. Copying APK to root...
copy /y "frontend\android\app\build\outputs\apk\debug\app-debug.apk" "ARSHNAZ-debug.apk"
copy /y "frontend\android\app\build\outputs\apk\debug\app-debug.apk" "Arshiam-latest.apk"

echo ===================================================
echo [SUCCESS] APK built successfully!
echo Location: ARSHNAZ-debug.apk
echo Location: frontend\android\app\build\outputs\apk\debug\app-debug.apk
echo ===================================================
if "%1" neq "--no-pause" pause
