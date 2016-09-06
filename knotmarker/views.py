from flask import make_response
from flask import render_template
from flask import request
from flask.ext.security import current_user
from flask.ext.security import login_required

from .application import app
from .models import MarkedUpImage, User


@app.route("/")
@login_required
def index():
    return render_template('index.html')


@app.route("/gallery")
@login_required
def gallery():
    page_num = int(request.args.get('page'))
    pcs_per_page = int(request.args.get('cnt'))
    pictures = MarkedUpImage.objects().skip(
        pcs_per_page * (page_num - 1)).limit(pcs_per_page)
    len_of_pictures = MarkedUpImage.objects().count()
    num_of_pages = int(len_of_pictures / pcs_per_page + 1)

    context = {
        'pictures': pictures,
        'num_of_pages': num_of_pages,
        'curr_num': page_num,
        'pcs_per_page': pcs_per_page,
        'current_user': current_user
    }
    return render_template('gallery.html', **context)


@app.route('/pic/<string:pic_id>/<string:user_id>')
@login_required
def edit_image(pic_id, user_id):
    if str(current_user.id) == user_id or current_user.has_role('admin'):
        next_pic_wo_markup = MarkedUpImage.next_image(pic_id,
                                                      current_user,
                                                      without_markup=True)
        markedup_image = MarkedUpImage.image_by_id(pic_id).first()

        user_email = ''
        if current_user.has_role('admin') and str(current_user.id) != user_id:
            user_email = User.objects.filter(id=user_id).first().email

        context = {
            'pic_id': pic_id,
            'user_id': user_id,
            'next_pic': MarkedUpImage.next_image(pic_id),
            'prev_pic': MarkedUpImage.previous_image(pic_id),
            'next_pic_without_markup': next_pic_wo_markup,
            'users_polygons': markedup_image.users_polygons,
            'user_email': user_email
        }
        return render_template('editor.html', **context)


@app.route('/pic/<string:pic_id>.png')
def get_image(pic_id):
    markedup_image = MarkedUpImage.image_by_id(pic_id).first()
    image = markedup_image.image.read()
    response = make_response(image)
    response.headers['Content-Type'] = 'image/png'
    return response


@app.route('/pic/thumb/<string:pic_id>.png')
def get_image_thumbnail(pic_id):
    markedup_image = MarkedUpImage.image_by_id(pic_id).first()
    image = markedup_image.image_thumbnail.read()
    response = make_response(image)
    response.headers['Content-Type'] = 'image/png'
    return response


@app.errorhandler(500)
def error_handler(error):
    return render_template('error_handler.html')
