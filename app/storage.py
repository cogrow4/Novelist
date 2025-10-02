import json
import os
from pathlib import Path
from typing import Any, Dict


class Storage:
    def __init__(self):
        self.app_dir = Path.home() / ".novelist"
        self.app_dir.mkdir(parents=True, exist_ok=True)
        self.settings_path = self.app_dir / "settings.json"
        self.notes_path = self.app_dir / "notes.json"
        self.project_path = self.app_dir / "project.json"
        self._settings: Dict[str, Any] = {}
        self._notes: Dict[str, Any] = {}
        self._project: Dict[str, Any] = {}
        self._load()

    def _load(self):
        if self.settings_path.exists():
            try:
                self._settings = json.loads(self.settings_path.read_text(encoding="utf-8"))
            except Exception:
                self._settings = {}
        if self.notes_path.exists():
            try:
                self._notes = json.loads(self.notes_path.read_text(encoding="utf-8"))
            except Exception:
                self._notes = {}
        if self.project_path.exists():
            try:
                self._project = json.loads(self.project_path.read_text(encoding="utf-8"))
            except Exception:
                self._project = {}
        # ensure defaults
        self._project.setdefault("chapters", [])

    def _save(self):
        try:
            self.settings_path.write_text(json.dumps(self._settings, indent=2), encoding="utf-8")
            self.notes_path.write_text(json.dumps(self._notes, indent=2), encoding="utf-8")
            self.project_path.write_text(json.dumps(self._project, indent=2), encoding="utf-8")
        except Exception:
            pass

    # Settings API
    def get_setting(self, key: str, default: Any = None) -> Any:
        return self._settings.get(key, default)

    def set_setting(self, key: str, value: Any) -> None:
        self._settings[key] = value
        self._save()

    # Notes / Planning API
    def list_collections(self):
        # e.g., outlines, characters, plot, notes
        if "collections" not in self._notes:
            self._notes["collections"] = {
                "Outlines": [],
                "Characters": [],
                "Plot": [],
                "Notes": [],
            }
        return self._notes["collections"]

    def add_note(self, collection: str, title: str, content: str = ""):
        cols = self.list_collections()
        cols.setdefault(collection, [])
        cols[collection].append({"title": title, "content": content})
        self._save()

    def get_note(self, collection: str, title: str):
        cols = self.list_collections()
        for n in cols.get(collection, []):
            if n.get("title") == title:
                return n
        return None

    def update_note(self, collection: str, title: str, content: str):
        n = self.get_note(collection, title)
        if n is not None:
            n["content"] = content
            self._save()

    def delete_note(self, collection: str, title: str):
        cols = self.list_collections()
        items = cols.get(collection, [])
        cols[collection] = [n for n in items if n.get("title") != title]
        self._save()

    # Project API (Chapters/Scenes)
    def list_chapters(self):
        return self._project.get("chapters", [])

    def add_chapter(self, title: str):
        chapters = self._project.setdefault("chapters", [])
        chapters.append({"title": title, "content": "", "scenes": []})
        self._save()

    def delete_chapter(self, title: str):
        chapters = self._project.setdefault("chapters", [])
        self._project["chapters"] = [c for c in chapters if c.get("title") != title]
        self._save()

    def add_scene(self, chapter_title: str, scene_title: str):
        ch = self._find_chapter(chapter_title)
        if ch is None:
            return
        ch.setdefault("scenes", []).append({"title": scene_title, "content": ""})
        self._save()

    def delete_scene(self, chapter_title: str, scene_title: str):
        ch = self._find_chapter(chapter_title)
        if ch is None:
            return
        ch["scenes"] = [s for s in ch.get("scenes", []) if s.get("title") != scene_title]
        self._save()

    def get_content(self, item: dict) -> str:
        if item.get("type") == "chapter":
            ch = self._find_chapter(item["chapter"])
            return ch.get("content", "") if ch else ""
        if item.get("type") == "scene":
            sc = self._find_scene(item["chapter"], item["scene"])
            return sc.get("content", "") if sc else ""
        return ""

    def set_content(self, item: dict, content: str):
        if item.get("type") == "chapter":
            ch = self._find_chapter(item["chapter"])
            if ch is not None:
                ch["content"] = content
                self._save()
        elif item.get("type") == "scene":
            sc = self._find_scene(item["chapter"], item["scene"])
            if sc is not None:
                sc["content"] = content
                self._save()

    def _find_chapter(self, title: str):
        for ch in self._project.get("chapters", []):
            if ch.get("title") == title:
                return ch
        return None

    def _find_scene(self, ch_title: str, sc_title: str):
        ch = self._find_chapter(ch_title)
        if not ch:
            return None
        for sc in ch.get("scenes", []):
            if sc.get("title") == sc_title:
                return sc
        return None
    
    # Character API
    def list_characters(self):
        """Get list of all characters"""
        return self._project.get("characters", [])
    
    def add_character(self, name: str):
        """Add a new character"""
        characters = self._project.setdefault("characters", [])
        characters.append({
            "name": name,
            "role": "Supporting",
            "age": "",
            "description": "",
            "notes": ""
        })
        self._save()
    
    def get_character(self, name: str):
        """Get character by name"""
        for char in self._project.get("characters", []):
            if char.get("name") == name:
                return char
        return None
    
    def update_character(self, name: str, data: dict):
        """Update character data"""
        char = self.get_character(name)
        if char:
            char.update(data)
            self._save()
    
    def rename_character(self, old_name: str, new_name: str):
        """Rename a character"""
        char = self.get_character(old_name)
        if char:
            char["name"] = new_name
            self._save()
    
    def delete_character(self, name: str):
        """Delete a character"""
        characters = self._project.get("characters", [])
        self._project["characters"] = [c for c in characters if c.get("name") != name]
        self._save()
