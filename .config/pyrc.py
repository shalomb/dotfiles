#!/usr/bin/env python3

# .pythonstartup

import json
import yaml
import os
import sys
import requests
from icecream import ic
from pathlib import Path
# import stackprinter

from rich import print, print_json, pretty, traceback, inspect
from datetime import datetime
import time
from importlib import reload
from pprint import pp


# stackprinter.set_excepthook(style='darkbg2')  # for jupyter notebooks try style='lightbg'

sleep = time.sleep

now = datetime.now

# https://realpython.com/python-repl/#colorizing-repl-output-with-rich
pretty.install()
traceback.install(show_locals=True)

i = inspect


def n():
    return now().strftime("%FT%T.%f")

sys.ps1='\x01\x1b[1;49;33m\x02>\x01\x1b[0m\x02 '
sys.ps2='\x01\x1b[1;49;31m\x02.\x01\x1b[0m\x02 '
