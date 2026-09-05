@echo off
setlocal

echo.
echo ========================================
echo        DaPay Git Sync
echo ========================================
echo.

echo [1/4] Checking repository...
git status --short
if errorlevel 1 (
    echo.
    echo [ERROR] Git repository tidak dapat dibaca.
    echo [STOP] Periksa .git/index atau kondisi repository.
    pause
    exit /b 1
)

echo.
echo [2/4] Adding changes...
git add .
if errorlevel 1 (
    echo.
    echo [ERROR] git add gagal.
    echo [STOP] Tidak melanjutkan commit atau push.
    pause
    exit /b 1
)

echo.
echo [3/4] Creating commit...
git diff --cached --quiet
if not errorlevel 1 (
    echo [INFO] Tidak ada perubahan untuk di-commit.
) else (
    git commit -m "update terbaru"
    if errorlevel 1 (
        echo.
        echo [ERROR] git commit gagal.
        echo [STOP] Tidak melanjutkan push.
        pause
        exit /b 1
    )
)

echo.
echo [4/4] Pushing to GitHub...
git push origin main
if errorlevel 1 (
    echo.
    echo [ERROR] git push gagal.
    pause
    exit /b 1
)

echo.
echo ========================================
echo        Git Sync Berhasil
echo ========================================
echo.

git status

pause