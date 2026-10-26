@echo off
chcp 65001 >nul
rem 還原：雙擊 .bat / .cmd 回到 Windows 原本的黑色視窗執行（移除「設定 bat 用自製桌面開啟.cmd」加的設定）。
for %%T in (batfile cmdfile) do (
  reg delete "HKCU\Software\Classes\%%T\shell\open" /f >nul 2>&1
  reg delete "HKCU\Software\Classes\%%T\shell\runclassic" /f >nul 2>&1
)
echo 已還原：雙擊 .bat / .cmd 會用 Windows 原本的方式執行。
