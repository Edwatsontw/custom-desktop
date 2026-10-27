' Double-click to start Custom Desktop (no black console window).
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
exe = dir & "\node_modules\electron\dist\electron.exe"
If Not fso.FileExists(exe) Then
  MsgBox "Electron is missing. Run npm install in this folder first.", 48, "Custom Desktop"
  WScript.Quit 1
End If
CreateObject("WScript.Shell").Run """" & exe & """ """ & dir & """", 0, False
