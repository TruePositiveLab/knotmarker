from .application import app


@app.template_filter('trim_email')
def trim_email_filter(email):
    return email.split('@')[0]


@app.template_filter('exists_in')
def exists_in_filter(user_id, users_polygons):
    for poly in users_polygons:
        if poly.user.id == user_id:
            return True
    return False
