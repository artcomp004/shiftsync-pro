@echo off
title ShiftSync Pro - Extension Installer
color 0A

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║      ShiftSync Pro - VS Code Extension Installer        ║
echo  ║         Recommended by Antigravity AI                   ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

echo  [1/14] Installing ESLint...
call code --install-extension dbaeumer.vscode-eslint --force 2>nul

echo  [2/14] Installing Prettier...
call code --install-extension esbenp.prettier-vscode --force 2>nul

echo  [3/14] Installing Code Spell Checker...
call code --install-extension streetsidesoftware.code-spell-checker --force 2>nul

echo  [4/14] Installing Color Highlight...
call code --install-extension naumovs.color-highlight --force 2>nul

echo  [5/14] Installing CSS Peek...
call code --install-extension pranaygp.vscode-css-peek --force 2>nul

echo  [6/14] Installing IntelliSense for CSS...
call code --install-extension zignd.html-css-class-completion --force 2>nul

echo  [7/14] Installing Auto Rename Tag...
call code --install-extension formulahendry.auto-rename-tag --force 2>nul

echo  [8/14] Installing GitLens...
call code --install-extension eamodio.gitlens --force 2>nul

echo  [9/14] Installing Error Lens...
call code --install-extension usernamehw.errorlens --force 2>nul

echo  [10/14] Installing Path Intellisense...
call code --install-extension christian-kohler.path-intellisense --force 2>nul

echo  [11/14] Installing Better Comments...
call code --install-extension aaron-bond.better-comments --force 2>nul

echo  [12/14] Installing Thunder Client...
call code --install-extension rangav.vscode-thunder-client --force 2>nul

echo  [13/14] Installing DotENV...
call code --install-extension mikestead.dotenv --force 2>nul

echo  [14/14] Installing Console Ninja...
call code --install-extension wallabyjs.console-ninja --force 2>nul

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║                                                          ║
echo  ║   ✅  All 14 extensions installed successfully!          ║
echo  ║                                                          ║
echo  ║   Please reload VS Code to activate all extensions.      ║
echo  ║   Press Ctrl+Shift+P  then  "Developer: Reload Window"  ║
echo  ║                                                          ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

pause
