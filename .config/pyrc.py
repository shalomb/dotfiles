#!/usr/bin/env python3

# .pythonstartup

import atexit
import json
import os
import requests
import sys
import time
import yaml
import re
# import stackprinter

from datetime import datetime
from importlib import reload
from pprint import pp
from icecream import ic
from pathlib import Path

from rich import print, print_json, pretty, traceback, inspect
from rich.panel import Panel
from rich.color import Color
from rich.console import Console

# stackprinter.set_excepthook(style='darkbg2')  # for jupyter notebooks try style='lightbg'

sleep = time.sleep

now = datetime.now

# https://realpython.com/python-repl/#colorizing-repl-output-with-rich
pretty.install()
console = Console()

traceback.install(show_locals=True)

i = inspect
p = console.print
l = console.log


def n():
    return now().strftime("%FT%T.%f")


def bye():
    from rich.console import Console

    p = Console().print
    p()
    p("Alrighty! Catch you on the bright side!")


atexit.register(bye)


sys.ps1 = "\x01\x1b[1;49;33m\x02>\x01\x1b[0m\x02 "
sys.ps2 = "\x01\x1b[1;49;31m\x02.\x01\x1b[0m\x02 "

# i(sys.version)
p()
p(os.getcwd())
p(sys.version)
p()
