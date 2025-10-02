import tkinter as tk
from tkinter import ttk, filedialog, messagebox, simpledialog
from pathlib import Path

from .themes_vscode import VSCodeTheme
from .project_manager import ProjectManager
from .sidebar_new import ProjectSidebar
from .tutorial import TutorialDialog, QuickTipDialog


APP_TITLE = "Novelist"


class SimpleEditor(tk.Text):
    """Simple, beautiful text editor"""
    
    def __init__(self, parent, theme, **kwargs):
        self.theme = theme
        colors = theme.get_colors()
        
        super().__init__(
            parent,
            wrap="word",
            undo=True,
            bg=colors["bg_editor"],
            fg=colors["fg_primary"],
            insertbackground=colors["accent_orange"],
            selectbackground=colors["bg_selected"],
            selectforeground=colors["fg_bright"],
            relief="flat",
            borderwidth=0,
            padx=40,
            pady=40,
            spacing1=4,
            spacing2=2,
            spacing3=4,
            font=("SF Pro", 14),
            **kwargs
        )
        
        # Configure tags for markdown-like styling
        self._configure_tags()
    
    def _configure_tags(self):
        """Configure text tags for styling"""
        colors = self.theme.get_colors()
        
        # Headings
        self.tag_configure("h1", font=("SF Pro", 24, "bold"), foreground=colors["fg_bright"], spacing1=10, spacing3=10)
        self.tag_configure("h2", font=("SF Pro", 20, "bold"), foreground=colors["fg_bright"], spacing1=8, spacing3=8)
        self.tag_configure("h3", font=("SF Pro", 17, "bold"), foreground=colors["fg_primary"], spacing1=6, spacing3=6)
        
        # Emphasis
        self.tag_configure("bold", font=("SF Pro", 14, "bold"))
        self.tag_configure("italic", font=("SF Pro", 14, "italic"))
        
        # Lists
        self.tag_configure("list", lmargin1=20, lmargin2=40)


class NovelistApp(tk.Tk):
    """Main Novelist application - extremely user-friendly"""
    
    def __init__(self):
        super().__init__()
        
        # Initialize managers
        self.project_manager = ProjectManager()
        self.current_file = None
        self.is_modified = False
        
        # Window setup
        self.title(APP_TITLE)
        self.geometry("1400x900")
        self.minsize(900, 600)
        
        # Theme
        self.theme = VSCodeTheme(self)
        self.theme.apply()
        colors = self.theme.get_colors()
        
        self.configure(bg=colors["bg_editor"])
        
        # Check if first run
        settings_file = Path.home() / ".novelist" / "settings.json"
        self.is_first_run = not settings_file.exists()
        
        # Build UI
        self._build_ui()
        
        # Show tutorial on first run
        if self.is_first_run:
            self.after(500, self._show_tutorial)
        else:
            # Show welcome if no project is open
            self.after(500, self._show_welcome_if_needed)
        
        # Mark settings as created
        settings_file.parent.mkdir(parents=True, exist_ok=True)
        settings_file.touch()
    
    def _build_ui(self):
        """Build main UI"""
        colors = self.theme.get_colors()
        
        # Main container
        self.main_container = tk.Frame(self, bg=colors["bg_editor"])
        self.main_container.pack(fill="both", expand=True)
        
        # Build sidebar
        self.sidebar = ProjectSidebar(
            self.main_container,
            self.theme,
            self.project_manager,
            on_open_file=self._open_file,
            on_create_item=self._on_create_item
        )
        self.sidebar.pack(side="left", fill="y")
        
        # Editor container
        editor_container = tk.Frame(self.main_container, bg=colors["bg_editor"])
        editor_container.pack(side="left", fill="both", expand=True)
        
        # Toolbar
        self._build_toolbar(editor_container)
        
        # Editor
        self.editor = SimpleEditor(editor_container, self.theme)
        self.editor.pack(fill="both", expand=True)
        
        # Bind text changes
        self.editor.bind("<<Modified>>", self._on_text_modified)
        self.editor.bind("<KeyRelease>", self._auto_save_trigger)
        
        # Build menu
        self._build_menu()
        
        # Status bar
        self._build_status_bar()
        
        # Auto-save timer
        self._setup_autosave()
    
    def _build_toolbar(self, parent):
        """Build simple toolbar"""
        colors = self.theme.get_colors()
        
        toolbar = tk.Frame(parent, bg=colors["bg_toolbar"], height=50)
        toolbar.pack(fill="x")
        toolbar.pack_propagate(False)
        
        # Left side - project actions
        left_frame = tk.Frame(toolbar, bg=colors["bg_toolbar"])
        left_frame.pack(side="left", padx=15)
        
        ttk.Button(
            left_frame,
            text="📁 New Project",
            command=self._new_project,
            style="Icon.TButton"
        ).pack(side="left", padx=5)
        
        ttk.Button(
            left_frame,
            text="📂 Open Project",
            command=self._open_project,
            style="Icon.TButton"
        ).pack(side="left", padx=5)
        
        # Separator
        sep = tk.Frame(toolbar, width=2, bg=colors["divider"])
        sep.pack(side="left", fill="y", padx=10, pady=10)
        
        # Middle - formatting
        middle_frame = tk.Frame(toolbar, bg=colors["bg_toolbar"])
        middle_frame.pack(side="left", padx=5)
        
        tk.Label(
            middle_frame,
            text="Font:",
            bg=colors["bg_toolbar"],
            fg=colors["fg_secondary"],
            font=("SF Pro", 10)
        ).pack(side="left", padx=(0, 5))
        
        self.font_size_var = tk.StringVar(value="14")
        font_sizes = ttk.Combobox(
            middle_frame,
            textvariable=self.font_size_var,
            values=[str(i) for i in range(10, 25)],
            width=5,
            state="readonly"
        )
        font_sizes.pack(side="left", padx=5)
        font_sizes.bind("<<ComboboxSelected>>", self._change_font_size)
        
        # Right side - help
        right_frame = tk.Frame(toolbar, bg=colors["bg_toolbar"])
        right_frame.pack(side="right", padx=15)
        
        ttk.Button(
            right_frame,
            text="❓ Help",
            command=self._show_tutorial,
            style="Icon.TButton"
        ).pack(side="right", padx=5)
    
    def _build_menu(self):
        """Build menu bar"""
        menubar = tk.Menu(self)
        
        # File menu
        file_menu = tk.Menu(menubar, tearoff=0)
        file_menu.add_command(label="New Project...", command=self._new_project, accelerator="Cmd+N")
        file_menu.add_command(label="Open Project...", command=self._open_project, accelerator="Cmd+O")
        file_menu.add_separator()
        file_menu.add_command(label="Save", command=self._save_file, accelerator="Cmd+S")
        file_menu.add_separator()
        file_menu.add_command(label="Export Book...", command=self._export_book, accelerator="Cmd+E")
        file_menu.add_separator()
        file_menu.add_command(label="Quit", command=self.quit, accelerator="Cmd+Q")
        menubar.add_cascade(label="File", menu=file_menu)
        
        # Edit menu
        edit_menu = tk.Menu(menubar, tearoff=0)
        edit_menu.add_command(label="Undo", command=lambda: self.editor.event_generate("<<Undo>>"), accelerator="Cmd+Z")
        edit_menu.add_command(label="Redo", command=lambda: self.editor.event_generate("<<Redo>>"), accelerator="Cmd+Shift+Z")
        edit_menu.add_separator()
        edit_menu.add_command(label="Cut", command=lambda: self.editor.event_generate("<<Cut>>"), accelerator="Cmd+X")
        edit_menu.add_command(label="Copy", command=lambda: self.editor.event_generate("<<Copy>>"), accelerator="Cmd+C")
        edit_menu.add_command(label="Paste", command=lambda: self.editor.event_generate("<<Paste>>"), accelerator="Cmd+V")
        menubar.add_cascade(label="Edit", menu=edit_menu)
        
        # View menu
        view_menu = tk.Menu(menubar, tearoff=0)
        view_menu.add_command(label="Toggle Sidebar", command=self._toggle_sidebar, accelerator="Cmd+B")
        menubar.add_cascade(label="View", menu=view_menu)
        
        # Help menu
        help_menu = tk.Menu(menubar, tearoff=0)
        help_menu.add_command(label="Show Tutorial", command=self._show_tutorial)
        help_menu.add_command(label="Quick Tip", command=self._show_quick_tip)
        help_menu.add_separator()
        help_menu.add_command(label="About Novelist", command=self._show_about)
        menubar.add_cascade(label="Help", menu=help_menu)
        
        self.config(menu=menubar)
        
        # Keyboard shortcuts
        self.bind_all("<Command-n>", lambda e: self._new_project())
        self.bind_all("<Command-o>", lambda e: self._open_project())
        self.bind_all("<Command-s>", lambda e: self._save_file())
        self.bind_all("<Command-e>", lambda e: self._export_book())
        self.bind_all("<Command-b>", lambda e: self._toggle_sidebar())
    
    def _build_status_bar(self):
        """Build status bar"""
        colors = self.theme.get_colors()
        
        status_bar = tk.Frame(self, bg=colors["bg_toolbar"], height=25)
        status_bar.pack(side="bottom", fill="x")
        status_bar.pack_propagate(False)
        
        self.status_label = tk.Label(
            status_bar,
            text="Ready",
            bg=colors["bg_toolbar"],
            fg=colors["fg_secondary"],
            font=("SF Pro", 10),
            anchor="w"
        )
        self.status_label.pack(side="left", padx=15)
        
        self.word_count_label = tk.Label(
            status_bar,
            text="0 words",
            bg=colors["bg_toolbar"],
            fg=colors["fg_secondary"],
            font=("SF Pro", 10)
        )
        self.word_count_label.pack(side="right", padx=15)
    
    def _toggle_sidebar(self):
        """Toggle sidebar visibility"""
        if self.sidebar.winfo_viewable():
            self.sidebar.pack_forget()
        else:
            self.sidebar.pack(side="left", fill="y", before=self.main_container.winfo_children()[1])
    
    def _change_font_size(self, event=None):
        """Change editor font size"""
        size = int(self.font_size_var.get())
        self.editor.configure(font=("SF Pro", size))
        self.editor._configure_tags()
    
    # Project management
    def _new_project(self):
        """Create new project"""
        name = simpledialog.askstring(
            "New Project",
            "What's your book called?\n\n(This will create a folder in Documents/Novelist/)",
            parent=self
        )
        
        if not name:
            return
        
        if self.project_manager.create_project(name):
            self.project_manager.open_project(name)
            self.sidebar.refresh()
            self._set_status(f"Created project: {name}")
            
            # Open welcome chapter
            chapters = self.project_manager.list_chapters()
            if chapters:
                self._open_file(chapters[0]["path"])
            
            # Show quick tip
            self.after(500, lambda: QuickTipDialog(
                self,
                self.theme,
                "Great! Your project is created.\n\nClick any chapter in the sidebar to edit it, or create a new one with the '+ Chapter' button."
            ))
        else:
            messagebox.showerror("Error", "Project already exists!", parent=self)
    
    def _open_project(self):
        """Open existing project"""
        projects = self.project_manager.list_projects()
        
        if not projects:
            messagebox.showinfo(
                "No Projects",
                "You don't have any projects yet!\n\nCreate one with 'New Project'.",
                parent=self
            )
            return
        
        # Simple dialog to choose project
        dialog = tk.Toplevel(self)
        dialog.title("Open Project")
        dialog.geometry("400x500")
        dialog.transient(self)
        dialog.grab_set()
        
        colors = self.theme.get_colors()
        dialog.configure(bg=colors["bg_editor"])
        
        tk.Label(
            dialog,
            text="Choose a project to open:",
            font=("SF Pro", 14, "bold"),
            bg=colors["bg_editor"],
            fg=colors["fg_bright"]
        ).pack(pady=20)
        
        listbox = tk.Listbox(
            dialog,
            bg=colors["bg_sidebar"],
            fg=colors["fg_primary"],
            selectbackground=colors["bg_selected"],
            font=("SF Pro", 12),
            relief="flat",
            borderwidth=0
        )
        listbox.pack(fill="both", expand=True, padx=20, pady=(0, 20))
        
        for project in projects:
            listbox.insert("end", f"📚 {project}")
        
        def open_selected():
            selection = listbox.curselection()
            if selection:
                project_name = projects[selection[0]]
                self.project_manager.open_project(project_name)
                self.sidebar.refresh()
                self._set_status(f"Opened project: {project_name}")
                dialog.destroy()
                
                # Open first chapter
                chapters = self.project_manager.list_chapters()
                if chapters:
                    self._open_file(chapters[0]["path"])
        
        ttk.Button(
            dialog,
            text="Open Project",
            command=open_selected,
            style="Accent.TButton"
        ).pack(pady=(0, 20))
        
        listbox.bind("<Double-1>", lambda e: open_selected())
    
    def _open_file(self, filepath):
        """Open a file in the editor"""
        try:
            content = self.project_manager.read_file(filepath)
            self.editor.delete("1.0", tk.END)
            self.editor.insert("1.0", content)
            self.editor.edit_reset()
            
            self.current_file = filepath
            self.is_modified = False
            
            # Update title
            filename = Path(filepath).stem.replace('_', ' ').title()
            self.title(f"{APP_TITLE} - {filename}")
            
            self._set_status(f"Opened: {filename}")
            self._update_word_count()
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to open file:\n{e}", parent=self)
    
    def _save_file(self):
        """Save current file"""
        if not self.current_file:
            self._set_status("No file open")
            return
        
        try:
            content = self.editor.get("1.0", tk.END)
            self.project_manager.write_file(self.current_file, content)
            self.is_modified = False
            self.editor.edit_modified(False)
            self._set_status("✓ Saved")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save:\n{e}", parent=self)
    
    def _export_book(self):
        """Export entire book to one file"""
        if not self.project_manager.current_project:
            messagebox.showinfo(
                "No Project",
                "Please open a project first!",
                parent=self
            )
            return
        
        # Ask where to save
        output_path = filedialog.asksaveasfilename(
            title="Export Book",
            defaultextension=".md",
            filetypes=[("Markdown", "*.md"), ("Text", "*.txt"), ("All Files", "*.*")],
            initialfile=f"{self.project_manager.current_project}.md"
        )
        
        if not output_path:
            return
        
        try:
            self.project_manager.export_book(output_path)
            messagebox.showinfo(
                "Success!",
                f"Your book has been exported to:\n\n{output_path}\n\nYou can now share it or format it for publishing!",
                parent=self
            )
        except Exception as e:
            messagebox.showerror("Error", f"Failed to export:\n{e}", parent=self)
    
    def _on_create_item(self, item_type):
        """Handle item creation from sidebar"""
        self.sidebar.refresh()
    
    def _on_text_modified(self, event=None):
        """Handle text modification"""
        if self.editor.edit_modified():
            self.is_modified = True
            self.editor.edit_modified(False)
    
    def _auto_save_trigger(self, event=None):
        """Trigger auto-save timer"""
        # Cancel existing timer if any
        if hasattr(self, '_autosave_timer'):
            self.after_cancel(self._autosave_timer)
        
        # Set new timer for 2 seconds after last keystroke
        self._autosave_timer = self.after(2000, self._auto_save)
    
    def _auto_save(self):
        """Auto-save current file"""
        if self.is_modified and self.current_file:
            self._save_file()
    
    def _setup_autosave(self):
        """Setup periodic auto-save"""
        # Save every 60 seconds if modified
        if self.is_modified and self.current_file:
            self._save_file()
        self.after(60000, self._setup_autosave)
    
    def _update_word_count(self):
        """Update word count"""
        content = self.editor.get("1.0", tk.END)
        words = len(content.split())
        self.word_count_label.configure(text=f"{words:,} words")
    
    def _set_status(self, text):
        """Set status bar text"""
        self.status_label.configure(text=text)
        # Clear after 5 seconds
        self.after(5000, lambda: self.status_label.configure(text="Ready"))
    
    # Help and tutorials
    def _show_tutorial(self):
        """Show tutorial"""
        TutorialDialog(self, self.theme, on_complete=self._on_tutorial_complete)
    
    def _on_tutorial_complete(self):
        """Handle tutorial completion"""
        if not self.project_manager.current_project:
            # Prompt to create first project
            self.after(100, self._new_project)
    
    def _show_welcome_if_needed(self):
        """Show welcome message if no project is open"""
        if not self.project_manager.current_project:
            colors = self.theme.get_colors()
            welcome_text = """# Welcome to Novelist! 📚

You're ready to start writing.

## Quick Start

1. Click **"📁 New Project"** in the toolbar
2. Give your book a name
3. Start writing!

## Need Help?

Click the **❓ Help** button anytime for a tutorial.

---

*Your work is automatically saved to files in Documents/Novelist/*
"""
            self.editor.insert("1.0", welcome_text)
            self.editor.configure(state="disabled")
    
    def _show_quick_tip(self):
        """Show a quick tip"""
        tips = [
            "💡 Your work auto-saves every 2 seconds after you stop typing!",
            "💡 Press Cmd+B to hide/show the sidebar for distraction-free writing.",
            "💡 Each chapter is a separate file - easy to organize and share!",
            "💡 Use the '+ Scene' button to break chapters into smaller sections.",
            "💡 Export your finished book with File > Export Book.",
            "💡 Character profiles help you keep track of everyone in your story!",
            "💡 Use the Planning tab to outline your plot and story arcs."
        ]
        
        import random
        tip = random.choice(tips)
        QuickTipDialog(self, self.theme, tip)
    
    def _show_about(self):
        """Show about dialog"""
        messagebox.showinfo(
            "About Novelist",
            f"{APP_TITLE}\n\nA beautiful, simple app for writing your novel.\n\nVersion 2.0\nDesigned for writers, by writers.",
            parent=self
        )


def main():
    app = NovelistApp()
    app.mainloop()


if __name__ == "__main__":
    main()
