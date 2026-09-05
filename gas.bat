@echo off
setlocal EnableDelayedExpansion

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
    echo [STOP] Periksa kondisi repository.
    exit /b 1
)

echo.
echo [2/4] Adding changes...
git add .
if errorlevel 1 (
    echo.
    echo [ERROR] git add gagal.
    echo [STOP] Tidak melanjutkan commit atau push.
    exit /b 1
)

echo.
echo [3/4] Creating commit...
git diff --cached --quiet
if not errorlevel 1 (
    echo [INFO] Tidak ada perubahan untuk di-commit.
) else (
    set "MSG="
    set /p "MSG=Commit message: "

    if not defined MSG (
        echo [ERROR] Commit message tidak boleh kosong.
        exit /b 1
    )

    git commit -m "!MSG!"
    if errorlevel 1 (
        echo.
        echo [ERROR] git commit gagal.
        echo [STOP] Tidak melanjutkan push.
        exit /b 1
    )
)

echo.
echo [4/4] Pushing to GitHub...
git push origin main
if errorlevel 1 (
    echo.
    echo [ERROR] git push gagal.
    exit /b 1
)

echo.
echo ========================================
echo        Git Sync Berhasil
echo ========================================
echo.

git status