import tkinter as tk
from tkinter import ttk


class NotionTheme:
    """Notion-inspired color palette"""
    # Dark theme colors (Notion-like)
    BG_DARK = "#191919"  # Main background
    BG_SIDEBAR_DARK = "#252525"  # Sidebar background
    BG_EDITOR_DARK = "#1e1e1e"  # Editor background
    BG_HOVER_DARK = "#2f2f2f"  # Hover state
    BG_ACTIVE_DARK = "#373737"  # Active/selected state
    
    FG_PRIMARY_DARK = "#e3e3e3"  # Main text
    FG_SECONDARY_DARK = "#9b9b9b"  # Secondary text
    FG_TERTIARY_DARK = "#6f6f6f"  # Tertiary/disabled text
    
    ACCENT_BLUE = "#2e7cf6"  # Primary accent
    ACCENT_BLUE_HOVER = "#3d8bff"  # Hover accent
    
    BORDER_DARK = "#2f2f2f"  # Borders
    DIVIDER_DARK = "#373737"  # Dividers
    
    # Light theme colors
    BG_LIGHT = "#ffffff"
    BG_SIDEBAR_LIGHT = "#f7f7f5"
    BG_EDITOR_LIGHT = "#ffffff"
    BG_HOVER_LIGHT = "#f1f1ef"
    BG_ACTIVE_LIGHT = "#e9e9e7"
    
    FG_PRIMARY_LIGHT = "#37352f"
    FG_SECONDARY_LIGHT = "#787774"
    FG_TERTIARY_LIGHT = "#9b9a97"
    
    BORDER_LIGHT = "#e9e9e7"
    DIVIDER_LIGHT = "#e3e2e0"


class ThemeManager:
    def __init__(self, root: tk.Misc):
        self.root = root
        self.style = ttk.Style(root)
        self.current = "dark"
        self.colors = NotionTheme()

    def apply(self, name: str):
        self.current = name if name in {"light", "dark"} else "dark"
        if name == "light":
            self._apply_light()
        else:
            self._apply_dark()

    def _apply_dark(self):
        c = self.colors
        self.root.configure(bg=c.BG_DARK)
        self.style.theme_use("clam")
        
        # Frame styles
        self.style.configure("TFrame", background=c.BG_DARK)
        self.style.configure("Sidebar.TFrame", background=c.BG_SIDEBAR_DARK)
        self.style.configure("Toolbar.TFrame", background=c.BG_DARK, borderwidth=0)
        
        # Label styles
        self.style.configure("TLabel", background=c.BG_DARK, foreground=c.FG_PRIMARY_DARK)
        self.style.configure("Sidebar.TLabel", background=c.BG_SIDEBAR_DARK, foreground=c.FG_PRIMARY_DARK)
        self.style.configure("Secondary.TLabel", background=c.BG_DARK, foreground=c.FG_SECONDARY_DARK)
        
        # Button styles
        self.style.configure("TButton", 
                           background=c.BG_HOVER_DARK, 
                           foreground=c.FG_PRIMARY_DARK,
                           borderwidth=0,
                           relief="flat",
                           padding=(12, 6))
        self.style.map("TButton", 
                      background=[("active", c.BG_ACTIVE_DARK), ("pressed", c.BG_ACTIVE_DARK)])
        
        self.style.configure("Accent.TButton",
                           background=c.ACCENT_BLUE,
                           foreground="#ffffff",
                           borderwidth=0,
                           relief="flat",
                           padding=(12, 6))
        self.style.map("Accent.TButton",
                      background=[("active", c.ACCENT_BLUE_HOVER), ("pressed", c.ACCENT_BLUE)])
        
        self.style.configure("Toolbar.TButton",
                           background=c.BG_DARK,
                           foreground=c.FG_SECONDARY_DARK,
                           borderwidth=0,
                           relief="flat",
                           padding=(8, 4))
        self.style.map("Toolbar.TButton",
                      background=[("active", c.BG_HOVER_DARK)])
        
        # Treeview
        self.style.configure("Treeview", 
                           background=c.BG_SIDEBAR_DARK, 
                           fieldbackground=c.BG_SIDEBAR_DARK, 
                           foreground=c.FG_PRIMARY_DARK,
                           borderwidth=0)
        self.style.map("Treeview",
                      background=[("selected", c.BG_ACTIVE_DARK)])
        
        # Entry
        self.style.configure("TEntry",
                           fieldbackground=c.BG_EDITOR_DARK,
                           foreground=c.FG_PRIMARY_DARK,
                           borderwidth=1,
                           relief="solid")
        
        # Combobox
        self.style.configure("TCombobox",
                           fieldbackground=c.BG_EDITOR_DARK,
                           foreground=c.FG_PRIMARY_DARK,
                           borderwidth=1)

    def _apply_light(self):
        c = self.colors
        self.root.configure(bg=c.BG_LIGHT)
        self.style.theme_use("clam")
        
        # Frame styles
        self.style.configure("TFrame", background=c.BG_LIGHT)
        self.style.configure("Sidebar.TFrame", background=c.BG_SIDEBAR_LIGHT)
        self.style.configure("Toolbar.TFrame", background=c.BG_LIGHT, borderwidth=0)
        
        # Label styles
        self.style.configure("TLabel", background=c.BG_LIGHT, foreground=c.FG_PRIMARY_LIGHT)
        self.style.configure("Sidebar.TLabel", background=c.BG_SIDEBAR_LIGHT, foreground=c.FG_PRIMARY_LIGHT)
        self.style.configure("Secondary.TLabel", background=c.BG_LIGHT, foreground=c.FG_SECONDARY_LIGHT)
        
        # Button styles
        self.style.configure("TButton",
                           background=c.BG_HOVER_LIGHT,
                           foreground=c.FG_PRIMARY_LIGHT,
                           borderwidth=0,
                           relief="flat",
                           padding=(12, 6))
        self.style.map("TButton",
                      background=[("active", c.BG_ACTIVE_LIGHT), ("pressed", c.BG_ACTIVE_LIGHT)])
        
        self.style.configure("Accent.TButton",
                           background=c.ACCENT_BLUE,
                           foreground="#ffffff",
                           borderwidth=0,
                           relief="flat",
                           padding=(12, 6))
        self.style.map("Accent.TButton",
                      background=[("active", c.ACCENT_BLUE_HOVER), ("pressed", c.ACCENT_BLUE)])
        
        self.style.configure("Toolbar.TButton",
                           background=c.BG_LIGHT,
                           foreground=c.FG_SECONDARY_LIGHT,
                           borderwidth=0,
                           relief="flat",
                           padding=(8, 4))
        self.style.map("Toolbar.TButton",
                      background=[("active", c.BG_HOVER_LIGHT)])
        
        # Treeview
        self.style.configure("Treeview",
                           background=c.BG_SIDEBAR_LIGHT,
                           fieldbackground=c.BG_SIDEBAR_LIGHT,
                           foreground=c.FG_PRIMARY_LIGHT,
                           borderwidth=0)
        self.style.map("Treeview",
                      background=[("selected", c.BG_ACTIVE_LIGHT)])
        
        # Entry
        self.style.configure("TEntry",
                           fieldbackground=c.BG_EDITOR_LIGHT,
                           foreground=c.FG_PRIMARY_LIGHT,
                           borderwidth=1,
                           relief="solid")
        
        # Combobox
        self.style.configure("TCombobox",
                           fieldbackground=c.BG_EDITOR_LIGHT,
                           foreground=c.FG_PRIMARY_LIGHT,
                           borderwidth=1)
    
    def get_colors(self):
        """Get current theme colors"""
        c = self.colors
        if self.current == "dark":
            return {
                "bg": c.BG_DARK,
                "bg_sidebar": c.BG_SIDEBAR_DARK,
                "bg_editor": c.BG_EDITOR_DARK,
                "bg_hover": c.BG_HOVER_DARK,
                "bg_active": c.BG_ACTIVE_DARK,
                "fg_primary": c.FG_PRIMARY_DARK,
                "fg_secondary": c.FG_SECONDARY_DARK,
                "fg_tertiary": c.FG_TERTIARY_DARK,
                "accent": c.ACCENT_BLUE,
                "border": c.BORDER_DARK,
                "divider": c.DIVIDER_DARK,
            }
        else:
            return {
                "bg": c.BG_LIGHT,
                "bg_sidebar": c.BG_SIDEBAR_LIGHT,
                "bg_editor": c.BG_EDITOR_LIGHT,
                "bg_hover": c.BG_HOVER_LIGHT,
                "bg_active": c.BG_ACTIVE_LIGHT,
                "fg_primary": c.FG_PRIMARY_LIGHT,
                "fg_secondary": c.FG_SECONDARY_LIGHT,
                "fg_tertiary": c.FG_TERTIARY_LIGHT,
                "accent": c.ACCENT_BLUE,
                "border": c.BORDER_LIGHT,
                "divider": c.DIVIDER_LIGHT,
            }
