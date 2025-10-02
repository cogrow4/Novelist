import tkinter as tk
from tkinter import ttk, messagebox, simpledialog


class CharacterFrame(ttk.Frame):
    """Character management panel"""
    
    def __init__(self, parent, storage, on_character_open=None):
        super().__init__(parent, style="Sidebar.TFrame")
        self.storage = storage
        self.on_character_open = on_character_open
        
        self._build_ui()
        self._refresh_list()
    
    def _build_ui(self):
        """Build character management UI"""
        # Header
        header = ttk.Frame(self, style="Sidebar.TFrame")
        header.pack(fill="x", padx=10, pady=10)
        
        ttk.Label(header, text="Characters", font=("Helvetica", 14, "bold"), style="Sidebar.TLabel").pack(side="left")
        ttk.Button(header, text="+", width=3, command=self._add_character).pack(side="right")
        
        # Character list
        list_frame = ttk.Frame(self, style="Sidebar.TFrame")
        list_frame.pack(fill="both", expand=True, padx=10, pady=(0, 10))
        
        scrollbar = ttk.Scrollbar(list_frame)
        scrollbar.pack(side="right", fill="y")
        
        self.tree = ttk.Treeview(list_frame, yscrollcommand=scrollbar.set, show="tree", selectmode="browse")
        self.tree.pack(side="left", fill="both", expand=True)
        scrollbar.config(command=self.tree.yview)
        
        # Bindings
        self.tree.bind("<Double-1>", self._on_double_click)
        self.tree.bind("<Button-3>", self._on_right_click)
        self.tree.bind("<Button-2>", self._on_right_click)  # macOS
        
        # Context menu
        self.context_menu = tk.Menu(self, tearoff=0)
        self.context_menu.add_command(label="Open", command=self._open_selected)
        self.context_menu.add_command(label="Rename", command=self._rename_selected)
        self.context_menu.add_separator()
        self.context_menu.add_command(label="Delete", command=self._delete_selected)
    
    def _refresh_list(self):
        """Refresh character list"""
        self.tree.delete(*self.tree.get_children())
        
        characters = self.storage.list_characters()
        for char in characters:
            name = char.get("name", "Unnamed")
            self.tree.insert("", "end", text=name, values=(name,))
    
    def _add_character(self):
        """Add new character"""
        name = simpledialog.askstring("New Character", "Character name:", parent=self)
        if name:
            self.storage.add_character(name)
            self._refresh_list()
    
    def _on_double_click(self, event):
        """Handle double-click on character"""
        self._open_selected()
    
    def _open_selected(self):
        """Open selected character"""
        selection = self.tree.selection()
        if not selection:
            return
        
        item = self.tree.item(selection[0])
        name = item["text"]
        
        if self.on_character_open:
            char = self.storage.get_character(name)
            if char:
                self.on_character_open(char)
    
    def _on_right_click(self, event):
        """Handle right-click on character"""
        item = self.tree.identify_row(event.y)
        if item:
            self.tree.selection_set(item)
            self.context_menu.tk_popup(event.x_root, event.y_root)
    
    def _rename_selected(self):
        """Rename selected character"""
        selection = self.tree.selection()
        if not selection:
            return
        
        item = self.tree.item(selection[0])
        old_name = item["text"]
        
        new_name = simpledialog.askstring("Rename Character", "New name:", initialvalue=old_name, parent=self)
        if new_name and new_name != old_name:
            self.storage.rename_character(old_name, new_name)
            self._refresh_list()
    
    def _delete_selected(self):
        """Delete selected character"""
        selection = self.tree.selection()
        if not selection:
            return
        
        item = self.tree.item(selection[0])
        name = item["text"]
        
        if messagebox.askyesno("Delete Character", f"Delete character '{name}'?", parent=self):
            self.storage.delete_character(name)
            self._refresh_list()


class CharacterEditor(tk.Toplevel):
    """Character profile editor"""
    
    def __init__(self, parent, storage, character, theme_manager):
        super().__init__(parent)
        self.storage = storage
        self.character = character
        self.theme = theme_manager
        
        self.title(f"Character: {character.get('name', 'Unnamed')}")
        self.geometry("600x700")
        self.transient(parent)
        
        colors = self.theme.get_colors()
        self.configure(bg=colors["bg"])
        
        self._build_ui()
        self._load_character()
        
        self.grab_set()
    
    def _build_ui(self):
        """Build character editor UI"""
        colors = self.theme.get_colors()
        
        # Main container
        main = ttk.Frame(self)
        main.pack(fill="both", expand=True, padx=20, pady=20)
        
        # Name
        name_frame = ttk.Frame(main)
        name_frame.pack(fill="x", pady=(0, 15))
        
        ttk.Label(name_frame, text="Name:", font=("Helvetica", 12, "bold")).pack(anchor="w", pady=(0, 5))
        self.name_var = tk.StringVar()
        name_entry = ttk.Entry(name_frame, textvariable=self.name_var, font=("Helvetica", 14))
        name_entry.pack(fill="x")
        
        # Role
        role_frame = ttk.Frame(main)
        role_frame.pack(fill="x", pady=(0, 15))
        
        ttk.Label(role_frame, text="Role:", font=("Helvetica", 12, "bold")).pack(anchor="w", pady=(0, 5))
        self.role_var = tk.StringVar()
        role_combo = ttk.Combobox(role_frame, textvariable=self.role_var, state="readonly")
        role_combo['values'] = ["Protagonist", "Antagonist", "Supporting", "Minor"]
        role_combo.pack(fill="x")
        
        # Age
        age_frame = ttk.Frame(main)
        age_frame.pack(fill="x", pady=(0, 15))
        
        ttk.Label(age_frame, text="Age:", font=("Helvetica", 12, "bold")).pack(anchor="w", pady=(0, 5))
        self.age_var = tk.StringVar()
        age_entry = ttk.Entry(age_frame, textvariable=self.age_var)
        age_entry.pack(fill="x")
        
        # Description
        desc_frame = ttk.Frame(main)
        desc_frame.pack(fill="both", expand=True, pady=(0, 15))
        
        ttk.Label(desc_frame, text="Description:", font=("Helvetica", 12, "bold")).pack(anchor="w", pady=(0, 5))
        
        self.desc_text = tk.Text(
            desc_frame,
            wrap="word",
            bg=colors["bg_editor"],
            fg=colors["fg_primary"],
            insertbackground=colors["fg_primary"],
            relief="solid",
            borderwidth=1,
            padx=10,
            pady=10,
            height=10
        )
        self.desc_text.pack(fill="both", expand=True)
        
        # Notes
        notes_frame = ttk.Frame(main)
        notes_frame.pack(fill="both", expand=True, pady=(0, 15))
        
        ttk.Label(notes_frame, text="Notes:", font=("Helvetica", 12, "bold")).pack(anchor="w", pady=(0, 5))
        
        self.notes_text = tk.Text(
            notes_frame,
            wrap="word",
            bg=colors["bg_editor"],
            fg=colors["fg_primary"],
            insertbackground=colors["fg_primary"],
            relief="solid",
            borderwidth=1,
            padx=10,
            pady=10,
            height=8
        )
        self.notes_text.pack(fill="both", expand=True)
        
        # Buttons
        btn_frame = ttk.Frame(main)
        btn_frame.pack(fill="x", pady=(15, 0))
        
        ttk.Button(btn_frame, text="Cancel", command=self.destroy).pack(side="right", padx=(10, 0))
        ttk.Button(btn_frame, text="Save", style="Accent.TButton", command=self._save).pack(side="right")
    
    def _load_character(self):
        """Load character data"""
        self.name_var.set(self.character.get("name", ""))
        self.role_var.set(self.character.get("role", "Supporting"))
        self.age_var.set(self.character.get("age", ""))
        self.desc_text.insert("1.0", self.character.get("description", ""))
        self.notes_text.insert("1.0", self.character.get("notes", ""))
    
    def _save(self):
        """Save character data"""
        old_name = self.character.get("name", "")
        new_name = self.name_var.get()
        
        if not new_name:
            messagebox.showerror("Error", "Character name cannot be empty", parent=self)
            return
        
        # Update character
        self.character["name"] = new_name
        self.character["role"] = self.role_var.get()
        self.character["age"] = self.age_var.get()
        self.character["description"] = self.desc_text.get("1.0", tk.END).strip()
        self.character["notes"] = self.notes_text.get("1.0", tk.END).strip()
        
        # Save to storage
        if old_name != new_name:
            self.storage.rename_character(old_name, new_name)
        
        self.storage.update_character(new_name, self.character)
        
        self.destroy()
