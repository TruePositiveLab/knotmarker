#!/bin/sh

pip install -r requirements.txt

exec python -m pylint.__main__ $@
