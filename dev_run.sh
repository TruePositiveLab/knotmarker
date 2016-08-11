#!/bin/bash
source venv/bin/activate
export KNOTMARKER_MAIL_PASSWORD=
export KNOTMARKER_SECRET_KEY=
export KNOTMARKER_DEBUG=
python3 manage.py runserver
deactivate