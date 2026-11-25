@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo   正在启动「手机传照片」服务...
echo   启动后看下面显示的网址，手机连同一个 WiFi 打开就行。
echo.

set "PY=D:\ComfyUI\python\python.exe"
if not exist "%PY%" set "PY=python"

"%PY%" phone_upload_server.py

echo.
echo   服务已结束。按任意键关闭窗口。
pause >nul
