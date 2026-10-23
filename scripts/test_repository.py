"""Exercise icon validation and catalog/package consistency using disposable fixtures."""
import copy
import json
from pathlib import Path
import shutil
import tempfile
import unittest
from check_repository import validate

ROOT = Path(__file__).resolve().parents[1]

class IconTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        shutil.copy(ROOT / 'LICENSE', self.root)
        self.catalog = json.loads((ROOT / 'catalog.json').read_text())
        # This existing package keeps tests focused on icon metadata, not a new package.
        self.catalog['abilities'] = self.catalog['abilities'][:1]
        self.entry = self.catalog['abilities'][0]
        self.icon = {'background': '#102030', 'foreground': '#ffffff', 'paths': ['M2 2 L22 2 L12 22 Z']}
        self.entry['icon'] = copy.deepcopy(self.icon)
        d = self.root / self.entry['path']; d.mkdir(parents=True)
        for name in ['README.md', 'CHANGELOG.md']:
            (d / name).write_text('Fixture\n')
        self.manifest = {'id': 'spotify', 'name': 'Spotify', 'icon': copy.deepcopy(self.icon)}
    def run_check(self):
        (self.root / 'catalog.json').write_text(json.dumps(self.catalog))
        (self.root / self.entry['path'] / 'ability.json').write_text(json.dumps(self.manifest))
        return validate(self.root)
    def test_valid_icon_passes(self):
        self.assertEqual(self.run_check(), [])
    def test_icon_drift_fails(self):
        self.manifest['icon']['background'] = '#ffffff'
        self.assertTrue(any('icon' in e for e in self.run_check()))
    def test_unsafe_or_malformed_geometry_fails(self):
        for icon in [None, {}, {'background': 'red', 'foreground': '#ffffff', 'paths': ['M0 0']},
                     {**self.icon, 'paths': ['<svg onload="alert(1)">']},
                     {**self.icon, 'paths': ['M0']}, {**self.icon, 'paths': ['L0 0']},
                     {**self.icon, 'paths': ['M0 0 A1 1 0 2 0 2 2']},
                     {**self.icon, 'paths': ['M0 0 L1e999 2']},
                     {**self.icon, 'paths': ['M0 0 L1 2,']},
                     {**self.icon, 'paths': ['M0 0'] * 13},
                     {**self.icon, 'url': 'https://example.invalid/icon.svg'}]:
            with self.subTest(icon=icon):
                self.entry['icon'] = icon; self.manifest['icon'] = icon
                self.assertTrue(any('icon' in e for e in self.run_check()))

if __name__ == '__main__':
    unittest.main()
