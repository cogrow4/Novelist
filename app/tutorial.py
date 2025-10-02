import tkinter as tk
from tkinter import ttk


class TutorialDialog(tk.Toplevel):
    """Interactive tutorial for first-time users"""
    
    def __init__(self, parent, theme, on_complete=None):
        super().__init__(parent)
        self.theme = theme
        self.on_complete = on_complete
        self.current_step = 0
        
        self.title("Welcome to Novelist!")
        self.geometry("700x500")
        self.resizable(False, False)
        self.transient(parent)
        
        colors = self.theme.get_colors()
        self.configure(bg=colors["bg_editor"])
        
        # Tutorial steps
        self.steps = [
            {
                "title": "Welcome to Novelist! 📚",
                "content": """Novelist is a simple, beautiful app for writing your novel.

Everything is designed to be easy and intuitive.

Let's take a quick tour!""",
                "image": "📚"
            },
            {
                "title": "Creating Your First Project",
                "content": """When you start, you'll create a PROJECT.

Think of a project as a folder for your entire book.

It will contain:
• All your chapters
• Character profiles
• Planning notes

Click "New Project" and give it a name (like "My Novel").""",
                "image": "📁"
            },
            {
                "title": "The Sidebar - Your Command Center",
                "content": """On the left, you'll see the SIDEBAR.

This shows:
• 📖 Chapters - Your book's structure
• 👥 Characters - Character profiles
• 📝 Planning - Outlines and notes

Click any item to open it!

You can also pop out the sidebar into its own window.""",
                "image": "📋"
            },
            {
                "title": "Writing Your Story",
                "content": """The big area in the middle is your EDITOR.

Just click and start typing - it's that simple!

You can:
• Change the font and size (top toolbar)
• Make text Bold, Italic, Underline
• Align your text

Don't worry about saving - it's automatic!""",
                "image": "✍️"
            },
            {
                "title": "Organizing with Chapters",
                "content": """Your book is made up of CHAPTERS.

To create a new chapter:
1. Click the "+ Chapter" button in the sidebar
2. Give it a name
3. Start writing!

Each chapter is a separate file, making it easy to organize.

You can also add SCENES within chapters (smaller sections).""",
                "image": "📑"
            },
            {
                "title": "Character Profiles",
                "content": """Keep track of your characters!

Click the "👥 Characters" tab, then:
1. Click "+ Character"
2. Enter their name
3. Fill in their profile

You can add:
• Physical description
• Personality traits
• Background story
• Character goals""",
                "image": "👥"
            },
            {
                "title": "Planning Your Story",
                "content": """Use the Planning tab to:

• Write plot outlines
• Jot down ideas
• Track story arcs
• Keep research notes

Everything is organized for you!""",
                "image": "📝"
            },
            {
                "title": "Exporting Your Book",
                "content": """When you're done writing, export your book!

Go to: File > Export Book

This combines all your chapters into ONE file.

You can then:
• Share it with beta readers
• Format it for publishing
• Keep a complete backup""",
                "image": "📤"
            },
            {
                "title": "You're Ready to Write!",
                "content": """That's it! You now know everything you need.

Remember:
✅ Your work saves automatically
✅ Click anything to explore
✅ Help menu has more tips

Ready to start your novel?

Click "Start Writing" to begin!""",
                "image": "🎉"
            }
        ]
        
        self._build_ui()
        self._show_step(0)
        
        self.grab_set()
    
    def _build_ui(self):
        """Build tutorial UI"""
        colors = self.theme.get_colors()
        
        # Main container
        main = tk.Frame(self, bg=colors["bg_editor"])
        main.pack(fill="both", expand=True, padx=30, pady=30)
        
        # Icon/Image area
        self.icon_label = tk.Label(
            main,
            text="📚",
            font=("SF Pro", 64),
            bg=colors["bg_editor"],
            fg=colors["accent_orange"]
        )
        self.icon_label.pack(pady=(0, 20))
        
        # Title
        self.title_label = tk.Label(
            main,
            text="",
            font=("SF Pro", 20, "bold"),
            bg=colors["bg_editor"],
            fg=colors["fg_bright"],
            wraplength=600
        )
        self.title_label.pack(pady=(0, 15))
        
        # Content
        self.content_label = tk.Label(
            main,
            text="",
            font=("SF Pro", 13),
            bg=colors["bg_editor"],
            fg=colors["fg_primary"],
            wraplength=600,
            justify="left"
        )
        self.content_label.pack(pady=(0, 30))
        
        # Progress indicator
        progress_frame = tk.Frame(main, bg=colors["bg_editor"])
        progress_frame.pack(pady=(0, 20))
        
        self.progress_dots = []
        for i in range(len(self.steps)):
            dot = tk.Label(
                progress_frame,
                text="●",
                font=("SF Pro", 12),
                bg=colors["bg_editor"],
                fg=colors["fg_tertiary"]
            )
            dot.pack(side="left", padx=3)
            self.progress_dots.append(dot)
        
        # Buttons
        btn_frame = tk.Frame(main, bg=colors["bg_editor"])
        btn_frame.pack(fill="x")
        
        self.skip_btn = ttk.Button(
            btn_frame,
            text="Skip Tutorial",
            command=self._skip,
            style="TButton"
        )
        self.skip_btn.pack(side="left")
        
        self.prev_btn = ttk.Button(
            btn_frame,
            text="← Previous",
            command=self._prev_step,
            style="TButton"
        )
        self.prev_btn.pack(side="left", padx=(10, 0))
        
        self.next_btn = ttk.Button(
            btn_frame,
            text="Next →",
            command=self._next_step,
            style="Accent.TButton"
        )
        self.next_btn.pack(side="right")
    
    def _show_step(self, step_num):
        """Show a tutorial step"""
        if step_num < 0 or step_num >= len(self.steps):
            return
        
        self.current_step = step_num
        step = self.steps[step_num]
        
        # Update content
        self.icon_label.configure(text=step["image"])
        self.title_label.configure(text=step["title"])
        self.content_label.configure(text=step["content"])
        
        # Update progress dots
        colors = self.theme.get_colors()
        for i, dot in enumerate(self.progress_dots):
            if i == step_num:
                dot.configure(fg=colors["accent_orange"])
            elif i < step_num:
                dot.configure(fg=colors["accent_green"])
            else:
                dot.configure(fg=colors["fg_tertiary"])
        
        # Update buttons
        self.prev_btn.configure(state="normal" if step_num > 0 else "disabled")
        
        if step_num == len(self.steps) - 1:
            self.next_btn.configure(text="Start Writing!")
        else:
            self.next_btn.configure(text="Next →")
    
    def _next_step(self):
        """Go to next step"""
        if self.current_step < len(self.steps) - 1:
            self._show_step(self.current_step + 1)
        else:
            self._finish()
    
    def _prev_step(self):
        """Go to previous step"""
        if self.current_step > 0:
            self._show_step(self.current_step - 1)
    
    def _skip(self):
        """Skip tutorial"""
        self._finish()
    
    def _finish(self):
        """Finish tutorial"""
        if self.on_complete:
            self.on_complete()
        self.destroy()


class QuickTipDialog(tk.Toplevel):
    """Quick tip popup for contextual help"""
    
    def __init__(self, parent, theme, tip_text, position=None):
        super().__init__(parent)
        self.theme = theme
        
        # Remove window decorations
        self.overrideredirect(True)
        
        colors = self.theme.get_colors()
        self.configure(bg=colors["accent_orange"])
        
        # Content frame
        content = tk.Frame(self, bg=colors["bg_toolbar"], borderwidth=2, relief="solid")
        content.pack(fill="both", expand=True, padx=2, pady=2)
        
        # Icon
        icon = tk.Label(
            content,
            text="💡",
            font=("SF Pro", 16),
            bg=colors["bg_toolbar"],
            fg=colors["accent_yellow"]
        )
        icon.pack(pady=(8, 4))
        
        # Tip text
        label = tk.Label(
            content,
            text=tip_text,
            font=("SF Pro", 11),
            bg=colors["bg_toolbar"],
            fg=colors["fg_bright"],
            wraplength=300,
            justify="left"
        )
        label.pack(padx=15, pady=(0, 8))
        
        # Got it button
        btn = ttk.Button(
            content,
            text="Got it!",
            command=self.destroy,
            style="Accent.TButton"
        )
        btn.pack(pady=(0, 10))
        
        # Position near parent
        if position:
            self.geometry(f"+{position[0]}+{position[1]}")
        else:
            self.center_on_parent(parent)
        
        # Auto-dismiss after 10 seconds
        self.after(10000, self.destroy)
    
    def center_on_parent(self, parent):
        """Center on parent window"""
        self.update_idletasks()
        x = parent.winfo_x() + (parent.winfo_width() - self.winfo_width()) // 2
        y = parent.winfo_y() + (parent.winfo_height() - self.winfo_height()) // 2
        self.geometry(f"+{x}+{y}")
