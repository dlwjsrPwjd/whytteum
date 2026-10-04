' Task Scheduler launcher: runs run-collect.cmd without a console window (0 = hidden, True = wait)
' Keep this file ASCII-only: wscript reads it in the system ANSI code page, not UTF-8.
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
Set shell = CreateObject("WScript.Shell")
exitCode = shell.Run("cmd /c """ & scriptDir & "\run-collect.cmd""", 0, True)
WScript.Quit exitCode
