import subprocess
import os
from typing import Tuple


class GitIntegration:
    def _run(self, args, cwd=None) -> Tuple[bool, str]:
        try:
            p = subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True)
            ok = p.returncode == 0
            out = (p.stdout or "") + (p.stderr or "")
            return ok, out.strip()
        except FileNotFoundError:
            return False, "git not found on system PATH"

    def init_repo(self, root: str):
        os.makedirs(root, exist_ok=True)
        return self._run(["init"], cwd=root)

    def status(self, root: str):
        return self._run(["status", "--short", "--branch"], cwd=root)

    def commit_all(self, root: str, message: str):
        ok, out = self._run(["add", "-A"], cwd=root)
        if not ok:
            return ok, out
        return self._run(["commit", "-m", message], cwd=root)

    def set_remote(self, root: str, name: str, url: str):
        # Try to set if exists, else add
        ok, out = self._run(["remote", "get-url", name], cwd=root)
        if ok:
            return self._run(["remote", "set-url", name, url], cwd=root)
        return self._run(["remote", "add", name, url], cwd=root)

    def get_current_branch(self, root: str) -> Tuple[bool, str]:
        return self._run(["rev-parse", "--abbrev-ref", "HEAD"], cwd=root)

    def push(self, root: str, remote: str, branch: str, set_upstream: bool = True):
        args = ["push", remote, branch]
        if set_upstream:
            args.insert(1, "-u")
        return self._run(args, cwd=root)

    def pull(self, root: str, remote: str, branch: str):
        return self._run(["pull", remote, branch], cwd=root)
