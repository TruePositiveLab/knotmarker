import flask_admin as admin
from flask_admin.contrib.mongoengine import ModelView
from flask.ext.security import current_user


class UserModelView(ModelView):
    def is_accessible(self):
        return current_user.has_role('admin')

    def on_model_change(self, form, model, is_created):
        print(form.roles)
        print(model.roles)


class AdminIndexView(admin.AdminIndexView):
    def is_accessible(self):
        return current_user.has_role('admin')