import tkinter as tk
from tkinter import ttk, messagebox, simpledialog


class ProjectSidebar(ttk.Frame):
    """Integrated sidebar with chapter/character/planning navigation"""
    
    def __init__(self, parent, theme, project_manager, on_open_file=None, on_create_item=None):
        super().__init__(parent, style="Sidebar.TFrame")
        self.theme = theme
        self.project_manager = project_manager
        self.on_open_file = on_open_file
        self.on_create_item = on_create_item
        self.colors = theme.get_colors()
        
        self._build_ui()
    
    def _build_ui(self):
        """Build sidebar UI"""
        # Header with project name and popout button
        header = tk.Frame(self, bg=self.colors["bg_toolbar"], height=40)
        header.pack(fill="x")
        header.pack_propagate(False)
        
        self.project_label = tk.Label(
            header,
            text="📚 No Project",
            font=("SF Pro", 12, "bold"),
            bg=self.colors["bg_toolbar"],
            fg=self.colors["fg_bright"]
        )
        self.project_label.pack(side="left", padx=15, pady=10)
        
        # Popout button
        popout_btn = tk.Button(
            header,
            text="⧉",
            font=("SF Pro", 14),
            bg=self.colors["bg_toolbar"],
            fg=self.colors["fg_secondary"],
            borderwidth=0,
            padx=8,
            pady=4,
            cursor="hand2",
            command=self._popout_sidebar
        )
        popout_btn.pack(side="right", padx=10)
        
        # Notebook for tabs
        self.notebook = ttk.Notebook(self)
        self.notebook.pack(fill="both", expand=True)
        
        # Chapters tab
        self.chapters_frame = self._build_chapters_tab()
        self.notebook.add(self.chapters_frame, text="📖 Chapters")
        
        # Characters tab
        self.characters_frame = self._build_characters_tab()
        self.notebook.add(self.characters_frame, text="👥 Characters")
        
        # Planning tab
        self.planning_frame = self._build_planning_tab()
        self.notebook.add(self.planning_frame, text="📝 Planning")
    
    def _build_chapters_tab(self):
        """Build chapters tab"""
        frame = ttk.Frame(self.notebook, style="Sidebar.TFrame")
        
        # Toolbar
        toolbar = tk.Frame(frame, bg=self.colors["bg_sidebar"], height=40)
        toolbar.pack(fill="x")
        toolbar.pack_propagate(False)
        
        ttk.Button(
            toolbar,
            text="+ Chapter",
            command=self._add_chapter,
            style="Sidebar.TButton"
        ).pack(side="left", padx=10, pady=6)
        
        ttk.Button(
            toolbar,
            text="+ Scene",
            command=self._add_scene,
            style="Sidebar.TButton"
        ).pack(side="left", padx=(0, 10), pady=6)
        
        # Chapter list
        list_frame = tk.Frame(frame, bg=self.colors["bg_sidebar"])
        list_frame.pack(fill="both", expand=True)
        
        scrollbar = ttk.Scrollbar(list_frame)
        scrollbar.pack(side="right", fill="y")
        
        self.chapters_tree = ttk.Treeview(
            list_frame,
            yscrollcommand=scrollbar.set,
            show="tree",
            selectmode="browse"
        )
        self.chapters_tree.pack(side="left", fill="both", expand=True)
        scrollbar.config(command=self.chapters_tree.yview)
        
        # Bindings
        self.chapters_tree.bind("<Double-1>", self._on_chapter_double_click)
        self.chapters_tree.bind("<Button-3>", self._on_chapter_right_click)
        
        # Context menu
        self.chapter_menu = tk.Menu(self, tearoff=0)
        self.chapter_menu.add_command(label="Open", command=self._open_selected_chapter)
        self.chapter_menu.add_command(label="Add Scene", command=self._add_scene)
        self.chapter_menu.add_separator()
        self.chapter_menu.add_command(label="Rename", command=self._rename_chapter)
        self.chapter_menu.add_command(label="Delete", command=self._delete_chapter)
        
        return frame
    
    def _build_characters_tab(self):
        """Build characters tab"""
        frame = ttk.Frame(self.notebook, style="Sidebar.TFrame")
        
        # Toolbar
        toolbar = tk.Frame(frame, bg=self.colors["bg_sidebar"], height=40)
        toolbar.pack(fill="x")
        toolbar.pack_propagate(False)
        
        ttk.Button(
            toolbar,
            text="+ Character",
            command=self._add_character,
            style="Sidebar.TButton"
        ).pack(side="left", padx=10, pady=6)
        
        # Character list
        list_frame = tk.Frame(frame, bg=self.colors["bg_sidebar"])
        list_frame.pack(fill="both", expand=True)
        
        scrollbar = ttk.Scrollbar(list_frame)
        scrollbar.pack(side="right", fill="y")
        
        self.characters_tree = ttk.Treeview(
            list_frame,
            yscrollcommand=scrollbar.set,
            show="tree",
            selectmode="browse"
        )
        self.characters_tree.pack(side="left", fill="both", expand=True)
        scrollbar.config(command=self.characters_tree.yview)
        
        # Bindings
        self.characters_tree.bind("<Double-1>", self._on_character_double_click)
        
        return frame
    
    def _build_planning_tab(self):
        """Build planning tab"""
        frame = ttk.Frame(self.notebook, style="Sidebar.TFrame")
        
        # Toolbar
        toolbar = tk.Frame(frame, bg=self.colors["bg_sidebar"], height=40)
        toolbar.pack(fill="x")
        toolbar.pack_propagate(False)
        
        ttk.Button(
            toolbar,
            text="+ Note",
            command=self._add_note,
            style="Sidebar.TButton"
        ).pack(side="left", padx=10, pady=6)
        
        # Planning categories
        categories_frame = tk.Frame(frame, bg=self.colors["bg_sidebar"])
        categories_frame.pack(fill="both", expand=True, padx=10, pady=10)
        
        categories = [
            ("📋 Plot Outline", "plot"),
            ("🎯 Story Arcs", "arcs"),
            ("🌍 World Building", "world"),
            ("💡 Ideas", "ideas"),
            ("📚 Research", "research")
        ]
        
        self.planning_trees = {}
        
        for label, key in categories:
            # Category header
            cat_header = tk.Label(
                categories_frame,
                text=label,
                font=("SF Pro", 11, "bold"),
                bg=self.colors["bg_sidebar"],
                fg=self.colors["fg_primary"],
                anchor="w"
            )
            cat_header.pack(fill="x", pady=(10, 5))
            
            # Category tree
            tree = ttk.Treeview(
                categories_frame,
                show="tree",
                selectmode="browse",
                height=3
            )
            tree.pack(fill="x", pady=(0, 5))
            tree.bind("<Double-1>", lambda e, k=key: self._on_planning_double_click(e, k))
            
            self.planning_trees[key] = tree
        
        return frame
    
    def refresh(self):
        """Refresh sidebar content"""
        if not self.project_manager.current_project:
            self.project_label.configure(text="📚 No Project")
            return
        
        self.project_label.configure(text=f"📚 {self.project_manager.current_project}")
        
        # Refresh chapters
        self._refresh_chapters()
        
        # Refresh characters
        self._refresh_characters()
        
        # Refresh planning
        self._refresh_planning()
    
    def _refresh_chapters(self):
        """Refresh chapters list"""
        self.chapters_tree.delete(*self.chapters_tree.get_children())
        
        chapters = self.project_manager.list_chapters()
        for chapter in chapters:
            self.chapters_tree.insert(
                "",
                "end",
                text=f"  📄 {chapter['title']}",
                values=(chapter['path'],)
            )
    
    def _refresh_characters(self):
        """Refresh characters list"""
        self.characters_tree.delete(*self.characters_tree.get_children())
        
        characters = self.project_manager.list_characters()
        for char in characters:
            self.characters_tree.insert(
                "",
                "end",
                text=f"  👤 {char['name']}",
                values=(char['path'],)
            )
    
    def _refresh_planning(self):
        """Refresh planning lists"""
        for category, tree in self.planning_trees.items():
            tree.delete(*tree.get_children())
            
            notes = self.project_manager.list_notes(category)
            for note in notes:
                tree.insert(
                    "",
                    "end",
                    text=f"  📝 {note['title']}",
                    values=(note['path'],)
                )
    
    # Chapter actions
    def _add_chapter(self):
        """Add new chapter"""
        title = simpledialog.askstring("New Chapter", "Chapter title:", parent=self)
        if title:
            filepath = self.project_manager.create_chapter(title)
            if filepath:
                self._refresh_chapters()
                if self.on_open_file:
                    self.on_open_file(filepath)
    
    def _add_scene(self):
        """Add scene to selected chapter"""
        selection = self.chapters_tree.selection()
        if not selection:
            messagebox.showinfo("No Chapter Selected", "Please select a chapter first.", parent=self)
            return
        
        item = self.chapters_tree.item(selection[0])
        chapter_path = item['values'][0] if item['values'] else None
        
        if not chapter_path:
            return
        
        scene_title = simpledialog.askstring("New Scene", "Scene title:", parent=self)
        if scene_title:
            import os
            chapter_file = os.path.basename(chapter_path)
            self.project_manager.create_scene(chapter_file, scene_title)
            if self.on_open_file:
                self.on_open_file(chapter_path)
    
    def _on_chapter_double_click(self, event):
        """Handle chapter double-click"""
        self._open_selected_chapter()
    
    def _open_selected_chapter(self):
        """Open selected chapter"""
        selection = self.chapters_tree.selection()
        if not selection:
            return
        
        item = self.chapters_tree.item(selection[0])
        filepath = item['values'][0] if item['values'] else None
        
        if filepath and self.on_open_file:
            self.on_open_file(filepath)
    
    def _on_chapter_right_click(self, event):
        """Handle chapter right-click"""
        item = self.chapters_tree.identify_row(event.y)
        if item:
            self.chapters_tree.selection_set(item)
            self.chapter_menu.tk_popup(event.x_root, event.y_root)
    
    def _rename_chapter(self):
        """Rename selected chapter"""
        # TODO: Implement rename
        messagebox.showinfo("Rename", "Rename coming soon!", parent=self)
    
    def _delete_chapter(self):
        """Delete selected chapter"""
        # TODO: Implement delete
        messagebox.showinfo("Delete", "Delete coming soon!", parent=self)
    
    # Character actions
    def _add_character(self):
        """Add new character"""
        name = simpledialog.askstring("New Character", "Character name:", parent=self)
        if name:
            filepath = self.project_manager.create_character(name)
            if filepath:
                self._refresh_characters()
                if self.on_open_file:
                    self.on_open_file(filepath)
    
    def _on_character_double_click(self, event):
        """Handle character double-click"""
        selection = self.characters_tree.selection()
        if not selection:
            return
        
        item = self.characters_tree.item(selection[0])
        filepath = item['values'][0] if item['values'] else None
        
        if filepath and self.on_open_file:
            self.on_open_file(filepath)
    
    # Planning actions
    def _add_note(self):
        """Add new planning note"""
        # Ask for category
        category = simpledialog.askstring(
            "New Note",
            "Category (plot/arcs/world/ideas/research):",
            parent=self
        )
        if not category:
            return
        
        title = simpledialog.askstring("New Note", "Note title:", parent=self)
        if title:
            filepath = self.project_manager.create_note(category, title)
            if filepath:
                self._refresh_planning()
                if self.on_open_file:
                    self.on_open_file(filepath)
    
    def _on_planning_double_click(self, event, category):
        """Handle planning note double-click"""
        tree = self.planning_trees[category]
        selection = tree.selection()
        if not selection:
            return
        
        item = tree.item(selection[0])
        filepath = item['values'][0] if item['values'] else None
        
        if filepath and self.on_open_file:
            self.on_open_file(filepath)
    
    def _popout_sidebar(self):
        """Pop out sidebar to separate window"""
        # Create popout window
        popout = tk.Toplevel(self.winfo_toplevel())
        popout.title("Novelist - Sidebar")
        popout.geometry("350x700")
        popout.configure(bg=self.colors["bg_sidebar"])
        
        # Create new sidebar in popout
        sidebar = ProjectSidebar(
            popout,
            self.theme,
            self.project_manager,
            on_open_file=self.on_open_file,
            on_create_item=self.on_create_item
        )
        sidebar.pack(fill="both", expand=True)
        sidebar.refresh()
        
        # Hide main sidebar
        self.pack_forget()
        
        # When popout closes, show main sidebar again
        def on_popout_close():
            self.pack(side="left", fill="both")
            popout.destroy()
        
        popout.protocol("WM_DELETE_WINDOW", on_popout_close)
