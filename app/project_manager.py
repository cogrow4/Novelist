import os
import json
from pathlib import Path
from typing import List, Dict, Optional


class ProjectManager:
    """Manages folder-based projects in ~/Documents/Novelist/"""
    
    def __init__(self):
        self.base_dir = Path.home() / "Documents" / "Novelist"
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self.current_project = None
        self.current_project_path = None
    
    def list_projects(self) -> List[str]:
        """List all projects"""
        if not self.base_dir.exists():
            return []
        return [d.name for d in self.base_dir.iterdir() if d.is_dir()]
    
    def create_project(self, name: str) -> bool:
        """Create a new project"""
        project_path = self.base_dir / name
        if project_path.exists():
            return False
        
        # Create project structure
        project_path.mkdir(parents=True, exist_ok=True)
        
        # Create folders
        (project_path / "chapters").mkdir(exist_ok=True)
        (project_path / "characters").mkdir(exist_ok=True)
        (project_path / "planning").mkdir(exist_ok=True)
        (project_path / "research").mkdir(exist_ok=True)
        
        # Create project metadata
        metadata = {
            "name": name,
            "created": str(Path.ctime(project_path)),
            "author": "",
            "description": "",
            "chapters": []
        }
        
        with open(project_path / "project.json", "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)
        
        # Create welcome chapter
        self._create_welcome_chapter(project_path)
        
        return True
    
    def _create_welcome_chapter(self, project_path: Path):
        """Create a welcome chapter for new projects"""
        chapters_dir = project_path / "chapters"
        welcome_file = chapters_dir / "01_welcome.md"
        
        welcome_content = """# Welcome to Your Novel!

This is your first chapter. You can:

- **Edit this text** directly - just start typing
- **Create new chapters** using the sidebar
- **Add scenes** to break up your chapters
- **Manage characters** in the Characters tab
- **Plan your story** in the Planning tab

## Getting Started

1. Click the **"📚"** button on the left to see your project structure
2. Create a new chapter by clicking **"+ Chapter"**
3. Double-click any chapter or scene to edit it
4. Your work is automatically saved to files

## Tips

- Each chapter is a separate markdown file
- Use **#** for headings, **bold** for emphasis
- Press **Cmd+S** to save anytime
- Export your finished book from **File > Export Book**

Happy writing! 🎉
"""
        
        with open(welcome_file, "w", encoding="utf-8") as f:
            f.write(welcome_content)
        
        # Update project metadata
        self._add_chapter_to_metadata(project_path, "01_welcome.md", "Welcome to Your Novel!")
    
    def _add_chapter_to_metadata(self, project_path: Path, filename: str, title: str):
        """Add chapter to project metadata"""
        metadata_path = project_path / "project.json"
        with open(metadata_path, "r", encoding="utf-8") as f:
            metadata = json.load(f)
        
        metadata["chapters"].append({
            "file": filename,
            "title": title,
            "scenes": []
        })
        
        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)
    
    def open_project(self, name: str) -> bool:
        """Open an existing project"""
        project_path = self.base_dir / name
        if not project_path.exists():
            return False
        
        self.current_project = name
        self.current_project_path = project_path
        return True
    
    def get_project_structure(self) -> Dict:
        """Get current project structure"""
        if not self.current_project_path:
            return {}
        
        metadata_path = self.current_project_path / "project.json"
        if not metadata_path.exists():
            return {}
        
        with open(metadata_path, "r", encoding="utf-8") as f:
            return json.load(f)
    
    def list_chapters(self) -> List[Dict]:
        """List all chapters in current project"""
        if not self.current_project_path:
            return []
        
        chapters_dir = self.current_project_path / "chapters"
        if not chapters_dir.exists():
            return []
        
        chapters = []
        for file in sorted(chapters_dir.glob("*.md")):
            # Extract chapter number and title from filename
            name = file.stem
            with open(file, "r", encoding="utf-8") as f:
                content = f.read()
                # Get first line as title if it's a heading
                first_line = content.split('\n')[0] if content else name
                if first_line.startswith('#'):
                    title = first_line.lstrip('#').strip()
                else:
                    title = name.replace('_', ' ').title()
            
            chapters.append({
                "file": file.name,
                "path": str(file),
                "title": title,
                "order": name.split('_')[0] if '_' in name else "00"
            })
        
        return sorted(chapters, key=lambda x: x["order"])
    
    def create_chapter(self, title: str) -> Optional[str]:
        """Create a new chapter"""
        if not self.current_project_path:
            return None
        
        chapters_dir = self.current_project_path / "chapters"
        
        # Get next chapter number
        existing = self.list_chapters()
        next_num = len(existing) + 1
        
        # Create filename
        safe_title = title.lower().replace(' ', '_')[:30]
        filename = f"{next_num:02d}_{safe_title}.md"
        filepath = chapters_dir / filename
        
        # Create chapter file
        content = f"# {title}\n\n"
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        
        return str(filepath)
    
    def create_scene(self, chapter_file: str, scene_title: str) -> bool:
        """Create a new scene within a chapter"""
        if not self.current_project_path:
            return False
        
        chapter_path = self.current_project_path / "chapters" / chapter_file
        if not chapter_path.exists():
            return False
        
        # Read existing content
        with open(chapter_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Add scene
        scene_marker = f"\n\n## {scene_title}\n\n"
        content += scene_marker
        
        with open(chapter_path, "w", encoding="utf-8") as f:
            f.write(content)
        
        return True
    
    def read_file(self, filepath: str) -> str:
        """Read a file from the project"""
        file_path = Path(filepath)
        if not file_path.exists():
            return ""
        
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    
    def write_file(self, filepath: str, content: str):
        """Write content to a file"""
        file_path = Path(filepath)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
    
    def export_book(self, output_path: str) -> bool:
        """Export entire book as one markdown file"""
        if not self.current_project_path:
            return False
        
        chapters = self.list_chapters()
        if not chapters:
            return False
        
        # Build complete book
        book_content = []
        
        # Add title page
        metadata = self.get_project_structure()
        book_content.append(f"# {metadata.get('name', 'Untitled')}\n")
        if metadata.get('author'):
            book_content.append(f"**by {metadata['author']}**\n")
        book_content.append("\n---\n\n")
        
        # Add each chapter
        for chapter in chapters:
            content = self.read_file(chapter["path"])
            book_content.append(content)
            book_content.append("\n\n---\n\n")
        
        # Write to file
        full_content = "\n".join(book_content)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(full_content)
        
        return True
    
    def create_character(self, name: str) -> Optional[str]:
        """Create a character profile"""
        if not self.current_project_path:
            return None
        
        characters_dir = self.current_project_path / "characters"
        safe_name = name.lower().replace(' ', '_')
        filename = f"{safe_name}.md"
        filepath = characters_dir / filename
        
        content = f"""# {name}

## Basic Info
- **Role**: 
- **Age**: 
- **Appearance**: 

## Personality


## Background


## Goals & Motivations


## Character Arc


## Notes

"""
        
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        
        return str(filepath)
    
    def list_characters(self) -> List[Dict]:
        """List all characters"""
        if not self.current_project_path:
            return []
        
        characters_dir = self.current_project_path / "characters"
        if not characters_dir.exists():
            return []
        
        characters = []
        for file in sorted(characters_dir.glob("*.md")):
            with open(file, "r", encoding="utf-8") as f:
                content = f.read()
                first_line = content.split('\n')[0] if content else file.stem
                if first_line.startswith('#'):
                    name = first_line.lstrip('#').strip()
                else:
                    name = file.stem.replace('_', ' ').title()
            
            characters.append({
                "file": file.name,
                "path": str(file),
                "name": name
            })
        
        return characters
    
    def create_note(self, category: str, title: str) -> Optional[str]:
        """Create a planning note"""
        if not self.current_project_path:
            return None
        
        category_dir = self.current_project_path / "planning" / category.lower()
        category_dir.mkdir(parents=True, exist_ok=True)
        
        safe_title = title.lower().replace(' ', '_')
        filename = f"{safe_title}.md"
        filepath = category_dir / filename
        
        content = f"# {title}\n\n"
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        
        return str(filepath)
    
    def list_notes(self, category: str = None) -> List[Dict]:
        """List planning notes"""
        if not self.current_project_path:
            return []
        
        planning_dir = self.current_project_path / "planning"
        if not planning_dir.exists():
            return []
        
        notes = []
        if category:
            category_dir = planning_dir / category.lower()
            if category_dir.exists():
                for file in sorted(category_dir.glob("*.md")):
                    notes.append(self._note_info(file, category))
        else:
            # List all notes from all categories
            for cat_dir in planning_dir.iterdir():
                if cat_dir.is_dir():
                    for file in sorted(cat_dir.glob("*.md")):
                        notes.append(self._note_info(file, cat_dir.name))
        
        return notes
    
    def _note_info(self, file: Path, category: str) -> Dict:
        """Get note information"""
        with open(file, "r", encoding="utf-8") as f:
            content = f.read()
            first_line = content.split('\n')[0] if content else file.stem
            if first_line.startswith('#'):
                title = first_line.lstrip('#').strip()
            else:
                title = file.stem.replace('_', ' ').title()
        
        return {
            "file": file.name,
            "path": str(file),
            "title": title,
            "category": category
        }
