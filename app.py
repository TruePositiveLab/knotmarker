from flask import Flask, render_template, make_response, jsonify, request
from flask.ext.mongoengine import MongoEngine
from flask_mail import Mail
from flask.ext.security import Security, MongoEngineUserDatastore, login_required, current_user

import os

# web.run_app(app)

app.config['MAIL_SERVER'] = os.environ.get(
    'KNOTMARKER_MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = 465
app.config['MAIL_USE_SSL'] = True
app.config['MAIL_USERNAME'] = os.environ.get(
    'KNOTMARKER_MAIL_USERNAME', 'knotmarker@gmail.com')
app.config['MAIL_PASSWORD'] = os.environ.get('KNOTMARKER_MAIL_PASSWORD')

mail = Mail(app)

app.config["MONGODB_SETTINGS"] = {'DB': "knotmarker"}
app.config["SECRET_KEY"] = os.environ.get('KNOTMARKER_SECRET_KEY')
app.config["SECURITY_REGISTERABLE"] = True
app.config["SECURITY_CONFIRMABLE"] = True

db = MongoEngine(app)

from .models import User, Role, MarkedUpImage, Polygon

user_datastore = MongoEngineUserDatastore(db, User, Role)
security = Security(app, user_datastore)


@app.route("/")
@login_required
def index():
    return render_template('index.html', current_user=current_user)


@app.route("/gallery")
@login_required
def gallery():
    group_size = 4
    page_num = int(request.args.get('page'))
    pcs_per_page = int(request.args.get('cnt'))
    pictures = MarkedUpImage.objects()[pcs_per_page *
                                       (page_num - 1):pcs_per_page * page_num]
    len_of_pictures = MarkedUpImage.objects().count()
    pictures_groups = [pictures[x:x + group_size]
                       for x in range(0, len(pictures), group_size)]
    num_of_pages = len_of_pictures / pcs_per_page + 1
    return render_template('gallery.html', current_user=current_user, pictures=pictures_groups, num_of_pages=num_of_pages, curr_num=page_num, pcs_per_page=pcs_per_page)


@app.route('/pic/<string:pic_id>')
@login_required
def edit_image(pic_id):
    return render_template('editor.html', current_user=current_user, pic_id=pic_id)


@app.route('/pic/<string:pic_id>/polygons', methods=['GET', 'POST'])
@login_required
def polygons(pic_id):
    if request.method == 'GET':
        image = MarkedUpImage.objects(
            filename=pic_id, users_polygons__username=current_user.email).first()
        res = []

        if image is None:
            return jsonify({
                'status': 'ok',
                'polygons': res,
                'rect': MarkedUpImage.objects(filename=pic_id).first().rect
            })

        for up in image.users_polygons:
            if up.username == current_user.email:
                res = up.polygons
                break

        return jsonify({
            'status': 'ok',
            'polygons': res,
            'rect': image.rect
        })

    polygons = MarkedUpImage.polygons(pic_id, current_user)

    if len(polygons) == 0:
        MarkedUpImage.image(pic_id).upsert_one(
            add_to_set__users_polygons={'username': current_user.email})
        polygons = MarkedUpImage.polygons(pic_id, current_user)

    polygons.upsert_one(
        set__users_polygons__S__polygons=to_polygons(request.json))
    return jsonify({'status': 'ok'})


def to_polygons(json):
    polygons = []
    for poly in json:
        polygons.append(Polygon(**poly))
    return polygons


@app.route('/pic/<string:pic_id>.png')
def get_image(pic_id):
    markedup_image = MarkedUpImage.image(pic_id).first()
    image = markedup_image.image.read()
    response = make_response(image)
    response.headers['Content-Type'] = 'image/png'
    return response


@app.route('/pic/thumb/<string:pic_id>.png')
def get_image_thumbnail(pic_id):
    markedup_image = MarkedUpImage.image(pic_id).first()
    image = markedup_image.image_thumb.read()
    response = make_response(image)
    response.headers['Content-Type'] = 'image/png'
    return response
