@echo off
rem Double-clicking a .bat / .cmd now runs it in a new Custom Desktop terminal tab, for this Windows account.
rem Changes only the current user's settings (HKCU), no admin needed. "Restore default bat opening.cmd" undoes it.
rem The right-click menu gains "Run in a classic window" for when you want the old black window.
set "LAUNCHER=%~dp0Open in Custom Desktop.vbs"
if not exist "%LAUNCHER%" (
  echo Can't find "%LAUNCHER%"
  exit /b 1
)
for %%T in (batfile cmdfile) do (
  reg add "HKCU\Software\Classes\%%T\shell\open\command" /ve /t REG_SZ /d "\"%SystemRoot%\System32\wscript.exe\" \"%LAUNCHER%\" \"%%1\"" /f >nul
  reg add "HKCU\Software\Classes\%%T\shell\runclassic" /ve /t REG_SZ /d "Run in a classic window" /f >nul
  reg add "HKCU\Software\Classes\%%T\shell\runclassic\command" /ve /t REG_SZ /d "\"%SystemRoot%\System32\cmd.exe\" /c \"\"%%1\" %%*\"" /f >nul
)
echo Done: double-clicking a .bat / .cmd opens it in Custom Desktop.
