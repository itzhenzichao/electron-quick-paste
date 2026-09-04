!macro customInstall
!macroend

!macro customUnInstall
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "NianYiTuo"
  RMDir /r "$APPDATA\NianYiTuo"
  RMDir /r "$LOCALAPPDATA\NianYiTuo"
!macroend
