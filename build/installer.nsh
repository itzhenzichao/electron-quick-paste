!macro customCheckAppRunning
  !insertmacro FIND_PROCESS "${APP_EXECUTABLE_FILENAME}" $R0
  ${If} $R0 == 0
    ${If} ${Silent}
      nsExec::Exec `taskkill /f /im "${APP_EXECUTABLE_FILENAME}"`
      Sleep 1500
      !insertmacro FIND_PROCESS "${APP_EXECUTABLE_FILENAME}" $R0
      ${If} $R0 == 0
        SetErrorLevel 2
        Quit
      ${EndIf}
    ${Else}
      nyCheckAgain:
      MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "NianYiTuo 程序还在运行中，请手动关闭后再点击「重试」继续（点击「取消」将退出安装）" IDRETRY nyCheckAgain
      Quit
    ${EndIf}
  ${EndIf}
!macroend

!macro customInstall
!macroend

!macro customUnInstall
  ${ifNot} ${isUpdated}
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "NianYiTuo"
    RMDir /r "$APPDATA\NianYiTuo"
    RMDir /r "$LOCALAPPDATA\NianYiTuo"
  ${endif}
!macroend
