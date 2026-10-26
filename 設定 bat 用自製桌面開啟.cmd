@echo off
chcp 65001 >nul
rem 讓這個 Windows 帳號雙擊 .bat / .cmd 時，改在自製桌面的終端機開新分頁執行。
rem 只改目前使用者的設定（HKCU），不需要系統管理員；用「還原 bat 開啟方式.cmd」可以完全復原。
rem 右鍵選單會多一個「用原本的視窗執行」，需要時仍可用傳統的黑色視窗。
set "LAUNCHER=%~dp0開啟於自製桌面.vbs"
if not exist "%LAUNCHER%" (
  echo 找不到 "%LAUNCHER%"
  exit /b 1
)
for %%T in (batfile cmdfile) do (
  reg add "HKCU\Software\Classes\%%T\shell\open\command" /ve /t REG_SZ /d "\"%SystemRoot%\System32\wscript.exe\" \"%LAUNCHER%\" \"%%1\"" /f >nul
  reg add "HKCU\Software\Classes\%%T\shell\runclassic" /ve /t REG_SZ /d "用原本的視窗執行" /f >nul
  reg add "HKCU\Software\Classes\%%T\shell\runclassic\command" /ve /t REG_SZ /d "\"%SystemRoot%\System32\cmd.exe\" /c \"\"%%1\" %%*\"" /f >nul
)
echo 完成：雙擊 .bat / .cmd 會在自製桌面開啟。
