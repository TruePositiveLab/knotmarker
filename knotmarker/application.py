from flask import Flask, render_template, make_response, jsonify, request
from flask.ext.mongoengine import MongoEngine
from flask_mail import Mail
from flask.ext.security import Security, MongoEngineUserDatastore, current_user

import dotenv

# web.run_app(app)

app = Flask(__name__)

app.config['MAIL_SERVER'] = dotenv.get(
    'KNOTMARKER_MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = 465
app.config['MAIL_USE_SSL'] = True
app.config['MAIL_USERNAME'] = dotenv.get(
    'KNOTMARKER_MAIL_USERNAME', 'knotmarker@gmail.com')
app.config['MAIL_PASSWORD'] = dotenv.get('KNOTMARKER_MAIL_PASSWORD')

mail = Mail(app)

app.config["MONGODB_SETTINGS"] = {'DB': "knotmarker"}
app.config["SECRET_KEY"] = dotenv.get('KNOTMARKER_SECRET_KEY')
app.config["SECURITY_REGISTERABLE"] = True
app.config["SECURITY_CONFIRMABLE"] = True

SENTRY_DSN = dotenv.get('KNOTMARKER_SENTRY_DSN', None)

if SENTRY_DSN:
    import logging
    from raven.contrib.flask import Sentry
    app.config['SENTRY_USER_ATTRS'] = ['email']
    sentry = Sentry(app, logging=True, level=logging.ERROR, dsn=SENTRY_DSN)
else:
    sentry = None


@app.context_processor
def inject_sentry():
    if sentry:
        return {
            'public_dsn': sentry.client.get_public_dsn('http')
        }
    else:
        return {
            'public_dsn': None
        }


@app.context_processor
def inject_user():
    return dict(current_user=current_user)

db = MongoEngine(app)

from .models import User, Role, MarkedUpImage, Polygon

user_datastore = MongoEngineUserDatastore(db, User, Role)
security = Security(app, user_datastore)

from .views import *
