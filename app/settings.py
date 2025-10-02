import tkinter as tk
from tkinter import ttk


class SettingsDialog(tk.Toplevel):
    """Settings dialog for app preferences"""
    
    def __init__(self, parent, storage, theme_manager, on_apply=None):
        super().__init__(parent)
        self.storage = storage
        self.theme = theme_manager
        self.on_apply = on_apply
        
        self.title("Settings")
        self.geometry("500x400")
        self.resizable(False, False)
        self.transient(parent)
        
        colors = self.theme.get_colors()
        self.configure(bg=colors["bg"])
        
        # Build UI
        self._build_ui()
        
        # Load current settings
        self._load_settings()
        
        # Center on parent
        self.grab_set()
    
    def _build_ui(self):
        """Build settings UI"""
        colors = self.theme.get_colors()
        
        # Main container
        main = ttk.Frame(self)
        main.pack(fill="both", expand=True, padx=20, pady=20)
        
        # Title
        title = ttk.Label(main, text="Settings", font=("Helvetica", 18, "bold"))
        title.pack(anchor="w", pady=(0, 20))
        
        # Theme section
        theme_frame = ttk.Frame(main)
        theme_frame.pack(fill="x", pady=(0, 20))
        
        ttk.Label(theme_frame, text="Appearance", font=("Helvetica", 14, "bold")).pack(anchor="w", pady=(0, 10))
        
        theme_row = ttk.Frame(theme_frame)
        theme_row.pack(fill="x")
        ttk.Label(theme_row, text="Theme:").pack(side="left", padx=(0, 10))
        
        self.theme_var = tk.StringVar(value=self.theme.current)
        theme_combo = ttk.Combobox(theme_row, textvariable=self.theme_var, width=15, state="readonly")
        theme_combo['values'] = ["dark", "light"]
        theme_combo.pack(side="left")
        
        # Editor section
        editor_frame = ttk.Frame(main)
        editor_frame.pack(fill="x", pady=(0, 20))
        
        ttk.Label(editor_frame, text="Editor", font=("Helvetica", 14, "bold")).pack(anchor="w", pady=(0, 10))
        
        # Default font
        font_row = ttk.Frame(editor_frame)
        font_row.pack(fill="x", pady=(0, 10))
        ttk.Label(font_row, text="Default Font:").pack(side="left", padx=(0, 10))
        
        self.font_var = tk.StringVar(value="Helvetica")
        font_combo = ttk.Combobox(font_row, textvariable=self.font_var, width=15, state="readonly")
        font_combo['values'] = ["Helvetica", "Arial", "Times New Roman", "Courier New", "Georgia", "Verdana"]
        font_combo.pack(side="left")
        
        # Default font size
        size_row = ttk.Frame(editor_frame)
        size_row.pack(fill="x", pady=(0, 10))
        ttk.Label(size_row, text="Default Font Size:").pack(side="left", padx=(0, 10))
        
        self.size_var = tk.StringVar(value="14")
        size_combo = ttk.Combobox(size_row, textvariable=self.size_var, width=5, state="readonly")
        size_combo['values'] = [str(i) for i in range(8, 73, 2)]
        size_combo.pack(side="left")
        
        # Spell check
        spell_row = ttk.Frame(editor_frame)
        spell_row.pack(fill="x")
        
        self.spell_var = tk.BooleanVar(value=True)
        spell_check = ttk.Checkbutton(spell_row, text="Enable spell check", variable=self.spell_var)
        spell_check.pack(side="left")
        
        # Auto-save section
        autosave_frame = ttk.Frame(main)
        autosave_frame.pack(fill="x", pady=(0, 20))
        
        ttk.Label(autosave_frame, text="Auto-save", font=("Helvetica", 14, "bold")).pack(anchor="w", pady=(0, 10))
        
        autosave_row = ttk.Frame(autosave_frame)
        autosave_row.pack(fill="x")
        
        self.autosave_var = tk.BooleanVar(value=True)
        autosave_check = ttk.Checkbutton(autosave_row, text="Enable auto-save", variable=self.autosave_var)
        autosave_check.pack(side="left")
        
        # Buttons
        btn_frame = ttk.Frame(main)
        btn_frame.pack(fill="x", pady=(20, 0))
        
        ttk.Button(btn_frame, text="Cancel", command=self.destroy).pack(side="right", padx=(10, 0))
        ttk.Button(btn_frame, text="Apply", style="Accent.TButton", command=self._apply).pack(side="right")
    
    def _load_settings(self):
        """Load current settings"""
        self.theme_var.set(self.storage.get_setting("theme", "dark"))
        self.font_var.set(self.storage.get_setting("default_font", "Helvetica"))
        self.size_var.set(str(self.storage.get_setting("default_font_size", 14)))
        self.spell_var.set(self.storage.get_setting("spell_check", True))
        self.autosave_var.set(self.storage.get_setting("autosave", True))
    
    def _apply(self):
        """Apply settings"""
        self.storage.set_setting("theme", self.theme_var.get())
        self.storage.set_setting("default_font", self.font_var.get())
        self.storage.set_setting("default_font_size", int(self.size_var.get()))
        self.storage.set_setting("spell_check", self.spell_var.get())
        self.storage.set_setting("autosave", self.autosave_var.get())
        
        if self.on_apply:
            self.on_apply()
        
        self.destroy()
