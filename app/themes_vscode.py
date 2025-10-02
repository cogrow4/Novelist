import tkinter as tk
from tkinter import ttk


class KimbieDarkTheme:
    """VSCode Kimbie Dark color palette"""
    # Background colors
    BG_EDITOR = "#221a0f"  # Main editor background
    BG_SIDEBAR = "#2a1f13"  # Sidebar background
    BG_TOOLBAR = "#362712"  # Toolbar/titlebar
    BG_HOVER = "#3a2f1f"  # Hover state
    BG_SELECTED = "#463a26"  # Selected state
    BG_ACTIVE = "#4f4328"  # Active element
    
    # Foreground colors
    FG_PRIMARY = "#d3af86"  # Main text
    FG_SECONDARY = "#a57a4c"  # Secondary text
    FG_TERTIARY = "#7e5b34"  # Disabled text
    FG_BRIGHT = "#fbebd4"  # Bright text
    
    # Accent colors (from Kimbie Dark)
    ACCENT_ORANGE = "#dc9656"  # Primary accent (orange)
    ACCENT_YELLOW = "#f79a32"  # Warnings/highlights
    ACCENT_GREEN = "#889b4a"  # Success
    ACCENT_BLUE = "#7aa5c3"  # Info
    ACCENT_PURPLE = "#a06d9b"  # Special
    ACCENT_RED = "#d85896"  # Errors/delete
    
    # Borders and dividers
    BORDER = "#362712"
    DIVIDER = "#3a2f1f"
    
    # Syntax highlighting
    SYNTAX_COMMENT = "#7e5b34"
    SYNTAX_STRING = "#889b4a"
    SYNTAX_NUMBER = "#f79a32"
    SYNTAX_KEYWORD = "#dc9656"
    SYNTAX_FUNCTION = "#7aa5c3"


class VSCodeTheme:
    def __init__(self, root: tk.Misc):
        self.root = root
        self.style = ttk.Style(root)
        self.colors = KimbieDarkTheme()
        self.current = "kimbie_dark"
        
    def apply(self):
        """Apply Kimbie Dark theme"""
        c = self.colors
        
        # Configure root
        self.root.configure(bg=c.BG_EDITOR)
        self.style.theme_use("clam")
        
        # Frame styles
        self.style.configure("TFrame", background=c.BG_EDITOR)
        self.style.configure("Sidebar.TFrame", background=c.BG_SIDEBAR)
        self.style.configure("Toolbar.TFrame", background=c.BG_TOOLBAR, borderwidth=0)
        
        # Label styles
        self.style.configure("TLabel", 
                           background=c.BG_EDITOR, 
                           foreground=c.FG_PRIMARY,
                           font=("SF Pro", 11))
        self.style.configure("Sidebar.TLabel", 
                           background=c.BG_SIDEBAR, 
                           foreground=c.FG_PRIMARY,
                           font=("SF Pro", 11))
        self.style.configure("Title.TLabel",
                           background=c.BG_TOOLBAR,
                           foreground=c.FG_BRIGHT,
                           font=("SF Pro", 13, "bold"))
        self.style.configure("Subtitle.TLabel",
                           background=c.BG_SIDEBAR,
                           foreground=c.FG_SECONDARY,
                           font=("SF Pro", 10))
        
        # Button styles
        self.style.configure("TButton",
                           background=c.BG_HOVER,
                           foreground=c.FG_PRIMARY,
                           borderwidth=0,
                           relief="flat",
                           padding=(12, 6),
                           font=("SF Pro", 11))
        self.style.map("TButton",
                      background=[("active", c.BG_ACTIVE), ("pressed", c.BG_SELECTED)])
        
        # Accent button
        self.style.configure("Accent.TButton",
                           background=c.ACCENT_ORANGE,
                           foreground=c.BG_EDITOR,
                           borderwidth=0,
                           relief="flat",
                           padding=(12, 8),
                           font=("SF Pro", 11, "bold"))
        self.style.map("Accent.TButton",
                      background=[("active", c.ACCENT_YELLOW), ("pressed", c.ACCENT_ORANGE)])
        
        # Icon button (for toolbar)
        self.style.configure("Icon.TButton",
                           background=c.BG_TOOLBAR,
                           foreground=c.FG_SECONDARY,
                           borderwidth=0,
                           relief="flat",
                           padding=(8, 6),
                           font=("SF Pro", 12))
        self.style.map("Icon.TButton",
                      background=[("active", c.BG_HOVER)])
        
        # Sidebar button
        self.style.configure("Sidebar.TButton",
                           background=c.BG_SIDEBAR,
                           foreground=c.FG_PRIMARY,
                           borderwidth=0,
                           relief="flat",
                           padding=(8, 4),
                           font=("SF Pro", 10))
        self.style.map("Sidebar.TButton",
                      background=[("active", c.BG_HOVER)])
        
        # Treeview
        self.style.configure("Treeview",
                           background=c.BG_SIDEBAR,
                           fieldbackground=c.BG_SIDEBAR,
                           foreground=c.FG_PRIMARY,
                           borderwidth=0,
                           font=("SF Pro", 11))
        self.style.map("Treeview",
                      background=[("selected", c.BG_SELECTED)],
                      foreground=[("selected", c.FG_BRIGHT)])
        
        # Entry
        self.style.configure("TEntry",
                           fieldbackground=c.BG_EDITOR,
                           foreground=c.FG_PRIMARY,
                           borderwidth=1,
                           bordercolor=c.BORDER,
                           relief="solid",
                           font=("SF Pro", 11))
        
        # Combobox
        self.style.configure("TCombobox",
                           fieldbackground=c.BG_EDITOR,
                           background=c.BG_HOVER,
                           foreground=c.FG_PRIMARY,
                           borderwidth=1,
                           font=("SF Pro", 11))
        
        # Notebook (tabs)
        self.style.configure("TNotebook",
                           background=c.BG_SIDEBAR,
                           borderwidth=0)
        self.style.configure("TNotebook.Tab",
                           background=c.BG_SIDEBAR,
                           foreground=c.FG_SECONDARY,
                           padding=(12, 6),
                           borderwidth=0,
                           font=("SF Pro", 11))
        self.style.map("TNotebook.Tab",
                      background=[("selected", c.BG_SELECTED)],
                      foreground=[("selected", c.FG_BRIGHT)])
        
        # Scrollbar
        self.style.configure("Vertical.TScrollbar",
                           background=c.BG_SIDEBAR,
                           troughcolor=c.BG_SIDEBAR,
                           borderwidth=0,
                           arrowsize=12)
        
    def get_colors(self):
        """Get current theme colors"""
        c = self.colors
        return {
            "bg_editor": c.BG_EDITOR,
            "bg_sidebar": c.BG_SIDEBAR,
            "bg_toolbar": c.BG_TOOLBAR,
            "bg_hover": c.BG_HOVER,
            "bg_selected": c.BG_SELECTED,
            "bg_active": c.BG_ACTIVE,
            "fg_primary": c.FG_PRIMARY,
            "fg_secondary": c.FG_SECONDARY,
            "fg_tertiary": c.FG_TERTIARY,
            "fg_bright": c.FG_BRIGHT,
            "accent_orange": c.ACCENT_ORANGE,
            "accent_yellow": c.ACCENT_YELLOW,
            "accent_green": c.ACCENT_GREEN,
            "accent_blue": c.ACCENT_BLUE,
            "accent_purple": c.ACCENT_PURPLE,
            "accent_red": c.ACCENT_RED,
            "border": c.BORDER,
            "divider": c.DIVIDER,
        }
