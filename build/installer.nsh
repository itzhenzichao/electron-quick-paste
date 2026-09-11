# FIND_PROCESS 宏 per-user 分支的命令含 %VAR% 字面文本，nsExec 不展开导致检测永远失效，改用 nsProcess 插件
!ifndef nsProcess::FindProcess
  !include "nsProcess.nsh"
!endif

!macro customCheckAppRunning
  nyCheckAppRunning:
  ${nsProcess::FindProcess} "${APP_EXECUTABLE_FILENAME}" $R0
  ${If} $R0 == 0
    ${If} ${Silent}
      nsExec::Exec `taskkill /f /im "${APP_EXECUTABLE_FILENAME}"`
      Sleep 1500
      ${nsProcess::FindProcess} "${APP_EXECUTABLE_FILENAME}" $R0
      ${If} $R0 == 0
        SetErrorLevel 2
        Quit
      ${EndIf}
    ${Else}
      MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "NianYiTuo 正在运行中，无法继续。请先退出程序，再点击「重试」继续；点击「取消」将退出。" IDRETRY nyCheckAppRunning
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
