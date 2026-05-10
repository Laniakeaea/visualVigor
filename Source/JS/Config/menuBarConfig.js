/* =========================================
   MenuBar Configuration
   ========================================= */

export const menuLeftBarConfig = [
    { 
        type: 'toggle', 
        text: 'File', 
        i18n: 'Layout.MenuBar.file',
        submenu: [
            { type: 'button', text: 'New', i18n: 'Layout.MenuBar.FileMenu.New', action: 'fileNew' },
            { type: 'button', text: 'Open', i18n: 'Layout.MenuBar.FileMenu.Open', action: 'fileOpen' },
            { type: 'button', text: 'Save', i18n: 'Layout.MenuBar.FileMenu.Save', action: 'fileSave' },
            { type: 'button', text: 'Save As', i18n: 'Layout.MenuBar.FileMenu.SaveAs', action: 'fileSaveAs' },
            { type: 'button', text: 'Export', i18n: 'Layout.MenuBar.FileMenu.Export', action: 'fileExport' }
        ]
    },
    { 
        type: 'toggle', 
        text: 'Edit', 
        i18n: 'Layout.MenuBar.edit', 
        submenu: [
            { type: 'button', text: 'Undo', i18n: 'Layout.MenuBar.EditMenu.Undo', action: 'editUndo' },
            { type: 'button', text: 'Redo', i18n: 'Layout.MenuBar.EditMenu.Redo', action: 'editRedo' }
        ] 
    },
    { 
        type: 'toggle', 
        text: 'Select', 
        i18n: 'Layout.MenuBar.select', 
        submenu: [
            { type: 'button', text: 'Invert', i18n: 'Layout.MenuBar.SelectMenu.Invert', action: 'selectInvert' },
            { type: 'button', text: 'Deselect', i18n: 'Layout.MenuBar.SelectMenu.Deselect', action: 'selectDeselect' }
        ] 
    },
    { 
        type: 'toggle', 
        text: 'View', 
        i18n: 'Layout.MenuBar.view', 
        submenu: [
            { type: 'toggle', text: 'Left Side Panel', i18n: 'Layout.MenuBar.ViewMenu.LeftSidePanel', action: 'viewToggleLeftPanel', active: true },
            { type: 'toggle', text: 'Right Side Panel', i18n: 'Layout.MenuBar.ViewMenu.RightSidePanel', action: 'viewToggleRightPanel', active: true },
            { type: 'toggle', text: 'Bottom Side Panel', i18n: 'Layout.MenuBar.ViewMenu.BottomSidePanel', action: 'viewToggleBottomPanel', active: true },
            { type: 'toggle', text: 'Dual View', i18n: 'Layout.MenuBar.ViewMenu.DualView', action: 'viewToggleDualView', active: true }
            
        ] 
    }
];

export const menuRightBarConfig = [
    { 
        type: 'switch', 
        title: 'Layout.MenuBar.AutoSave',
        action: 'toggleAutoSave' 
    },
    { 
        type: 'icon', 
        id: 'btn-language', 
        iconName: 'sysLanguage', 
        title: 'Layout.MenuBar.Language',
        action: 'toggleLanguage' 
    },
    { 
        type: 'icon', 
        id: 'btn-theme', 
        iconName: 'sysTheme', 
        title: 'Layout.MenuBar.Theme',
        action: 'toggleTheme' 
    },
    { 
        type: 'icon', 
        id: 'btn-collab', 
        iconName: 'sysCollaboration', 
        title: 'Collaboration.Dialog.Title',
        action: 'collabOpenDialog' 
    },
    { 
        type: 'toggle', 
        text: 'Help', 
        i18n: 'Layout.MenuBar.help',
        submenu: [
            { type: 'button', text: 'Software Info', i18n: 'Layout.MenuBar.HelpMenu.SoftwareInfo', action: 'helpSoftwareInfo' },
            { type: 'button', text: 'Shortcuts', i18n: 'Layout.MenuBar.HelpMenu.Shortcuts', action: 'helpShortcuts' },
            { type: 'button', text: 'JS Plugin Guide', i18n: 'Layout.MenuBar.HelpMenu.JSPluginGuide', action: 'helpJSPluginGuide' },
            { type: 'button', text: 'C++ Plugin Guide', i18n: 'Layout.MenuBar.HelpMenu.CppPluginGuide', action: 'helpCppPluginGuide' }
        ]
    }
];
