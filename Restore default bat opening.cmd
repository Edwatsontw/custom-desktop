@echo off
rem Undo "Open bat files in Custom Desktop.cmd": double-clicking a .bat / .cmd uses the normal Windows window again.
for %%T in (batfile cmdfile) do (
  reg delete "HKCU\Software\Classes\%%T\shell\open" /f >nul 2>&1
  reg delete "HKCU\Software\Classes\%%T\shell\runclassic" /f >nul 2>&1
)
echo Restored: double-clicking a .bat / .cmd runs it the normal Windows way.
