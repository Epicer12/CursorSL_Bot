"""Compatibility launcher for environments expecting bot.py.

Primary runtime is JavaScript (discord.js) in src/bot.js.
"""

import subprocess
import sys


def main() -> int:
    return subprocess.call(["node", "src/bot.js"])


if __name__ == "__main__":
    sys.exit(main())
