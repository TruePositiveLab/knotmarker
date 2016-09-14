import flask_admin as admin
from flask_admin.contrib.mongoengine import ModelView
from flask.ext.security import current_user


class UserModelView(ModelView):
    column_exclude_list = ['password']
    def is_accessible(self):
        return current_user.has_role('admin')


class AdminIndexView(admin.AdminIndexView):
    def is_accessible(self):
        return current_user.has_role('admin')