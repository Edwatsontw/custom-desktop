' Open a .bat / .cmd in Custom Desktop: it runs in a new terminal tab and the terminal comes forward.
' Use: drag a .bat onto this file, or make it the default way to open .bat files
' (run "Open bat files in Custom Desktop.cmd", see the README).
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
exe = dir & "\node_modules\electron\dist\electron.exe"
If Not fso.FileExists(exe) Then
  MsgBox "Electron is missing. Run npm install in this folder first.", 48, "Custom Desktop"
  WScript.Quit 1
End If
If WScript.Arguments.Count = 0 Then
  MsgBox "Drag a .bat or .cmd file onto this file.", 64, "Custom Desktop"
  WScript.Quit 0
End If
cmd = """" & exe & """ """ & dir & """"
For Each a In WScript.Arguments
  cmd = cmd & " """ & a & """"
Next
CreateObject("WScript.Shell").Run cmd, 0, False
