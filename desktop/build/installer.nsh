# Scrum Master — custom NSIS hooks (auto-discovered as build/installer.nsh).
#
# Adds an optional "start with Windows" choice to the assisted installer:
#   * customPageAfterChangeDir — a checkbox page shown after the install
#     folder page (assisted installer only; silent installs skip pages)
#   * customInstall            — writes/removes the Run key to match the
#     choice made on that page
#   * customUnInstall          — removes the Run key on a real uninstall,
#     but keeps it during upgrades (those pass --updated to the old
#     uninstaller, so the entry survives every update)
#
# The Run entry lives under HKCU for per-user installs and HKLM for
# per-machine installs (SHELL_CONTEXT follows the install mode, and the
# script runs with SetRegView 64 on 64-bit Windows).

!define SM_RUN_KEY "Software\Microsoft\Windows\CurrentVersion\Run"

# Declared globally — shared by the page functions and customInstall.
Var smStartupCheckbox
Var smStartupEnabled # "1" = run at logon, "0" = don't, "" = page never shown (silent install)

!macro customPageAfterChangeDir
  Page custom smStartupPageCreate smStartupPageLeave

  Function smStartupPageCreate
    !insertmacro MUI_HEADER_TEXT "Startup options" "Should Scrum Master start with Windows?"

    nsDialogs::Create 1018
    Pop $0
    ${If} $0 == error
      Abort
    ${EndIf}

    ${NSD_CreateLabel} 0 0 100% 44u "Start Scrum Master as soon as you sign in to Windows, so your tasks, reminders and reports are ready right away. You can change this any time in Windows Settings (Startup apps)."
    Pop $0

    ${NSD_CreateCheckBox} 0 58u 100% 20u "Start Scrum Master automatically when I sign in"
    Pop $smStartupCheckbox

    # Preserve a previous choice; a brand-new install starts enabled.
    ReadRegStr $1 SHELL_CONTEXT "${SM_RUN_KEY}" "${PRODUCT_FILENAME}"
    ReadRegStr $2 SHELL_CONTEXT "${INSTALL_REGISTRY_KEY}" InstallLocation
    ${If} $1 != ""
      ${NSD_Check} $smStartupCheckbox
    ${ElseIf} $2 == ""
      ${NSD_Check} $smStartupCheckbox
    ${EndIf}

    nsDialogs::Show
  FunctionEnd

  Function smStartupPageLeave
    ${NSD_GetState} $smStartupCheckbox $1
    ${If} $1 == ${BST_CHECKED}
      StrCpy $smStartupEnabled "1"
    ${Else}
      StrCpy $smStartupEnabled "0"
    ${EndIf}
  FunctionEnd
!macroend

!macro customInstall
  # "" (silent install, page never shown) leaves any existing entry alone.
  ${If} "$smStartupEnabled" == "1"
    WriteRegStr SHELL_CONTEXT "${SM_RUN_KEY}" "${PRODUCT_FILENAME}" '"$appExe"'
  ${ElseIf} "$smStartupEnabled" == "0"
    DeleteRegValue HKCU "${SM_RUN_KEY}" "${PRODUCT_FILENAME}"
    DeleteRegValue SHELL_CONTEXT "${SM_RUN_KEY}" "${PRODUCT_FILENAME}"
  ${EndIf}
  ClearErrors
!macroend

!macro customUnInstall
  ${IfNot} ${isUpdated}
    DeleteRegValue HKCU "${SM_RUN_KEY}" "${PRODUCT_FILENAME}"
    DeleteRegValue SHELL_CONTEXT "${SM_RUN_KEY}" "${PRODUCT_FILENAME}"
    ClearErrors
  ${EndIf}
!macroend
