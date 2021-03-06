# pylint: disable=wildcard-import,unused-wildcard-import,wrong-import-position
import logging

import dotenv
from flask import Flask
from flask.ext.mongoengine import MongoEngine
from flask.ext.security import current_user,\
    MongoEngineUserDatastore, Security  # noreorder
from flask.json import JSONEncoder as BaseEncoder
from flask_babelex import Babel
from flask_mail import Mail
from speaklater import is_lazy_string
import flask_admin as admin
from .viewmodels import UserModelView, AdminIndexView

app = Flask(__name__)


class JSONEncoder(BaseEncoder):

    def default(self, o):  # pylint: disable=method-hidden
        if is_lazy_string(o):
            return str(o)

        return BaseEncoder.default(self, o)

app.json_encoder = JSONEncoder

app.config['BABEL_DEFAULT_LOCALE'] = 'ru'
babel = Babel(app)


@babel.localeselector
def get_locale():
    return 'ru'

app.config['MAIL_SERVER'] = dotenv.get(
    'KNOTMARKER_MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = 465
app.config['MAIL_USE_SSL'] = True
app.config['MAIL_USERNAME'] = dotenv.get(
    'KNOTMARKER_MAIL_USERNAME', 'knotmarker@gmail.com')
app.config['MAIL_PASSWORD'] = dotenv.get('KNOTMARKER_MAIL_PASSWORD')

mail = Mail(app)

app.config['MONGODB_DB'] = dotenv.get('KNOTMARKER_MONGODB_DB', 'knotmarker')
app.config['MONGODB_HOST'] = dotenv.get('KNOTMARKER_MONGODB_HOST', 'localhost')
app.config['MONGODB_PORT'] = dotenv.get('KNOTMARKER_MONGODB_PORT', 27017)
app.config["SECRET_KEY"] = bytes(dotenv.get('KNOTMARKER_SECRET_KEY'), 'utf8')
app.config["SECURITY_REGISTERABLE"] = True
app.config["SECURITY_CONFIRMABLE"] = True
app.config["SECURITY_RECOVERABLE"] = True
app.config["SECURITY_CHANGEABLE"] = True
app.config['SECURITY_PASSWORD_HASH'] = 'pbkdf2_sha512'
app.config['SECURITY_PASSWORD_SALT'] = bytes(dotenv.get('KNOTMARKER_PASSWORD_SALT'), 'utf8')

SENTRY_DSN = dotenv.get('KNOTMARKER_SENTRY_DSN', None)

if SENTRY_DSN:
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

#
from .models import User, Role, Category, PolygonType, MarkedUpImage  # noqa
user_datastore = MongoEngineUserDatastore(db, User, Role)
security = Security(app, user_datastore)

@app.before_first_request
def init():
    import datetime
    from .models import Category
    admin_email = 'admin'
    system_email = 'system'
    admin_role = 'admin'
    if not user_datastore.find_user(email=admin_email):
        user_datastore.find_or_create_role(name=admin_role, description='Administrator')
        user_datastore.create_user(email=admin_email, password='123456', confirmed_at=datetime.datetime.now())
        user_datastore.create_user(email=system_email, password='123456', confirmed_at=datetime.datetime.now())
        user_datastore.add_role_to_user(admin_email, admin_role)
        user_datastore.add_role_to_user(system_email, admin_role)

        defaul_cat = Category(name='default', description='default category')
        defaul_cat.save()


admin = admin.Admin(app, 'Knotmarker', index_view=AdminIndexView(), template_mode='bootstrap3')
admin.add_view(UserModelView(User))
admin.add_view(UserModelView(Role))
admin.add_view(UserModelView(Category))
admin.add_view(UserModelView(PolygonType))
admin.add_view(UserModelView(MarkedUpImage))

from .forms import *  # noqa
from .views import *  # noqa
from .api import *  # noqa
from .filters import *
