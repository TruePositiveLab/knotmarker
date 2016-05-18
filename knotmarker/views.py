from .application import app, sentry
from .models import MarkedUpImage, Polygon

from flask import render_template, jsonify, request, make_response
from flask.ext.security import login_required, current_user


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
    return render_template('gallery.html',
                           pictures=pictures,
                           num_of_pages=num_of_pages,
                           curr_num=page_num,
                           pcs_per_page=pcs_per_page)


@app.route('/pic/<string:pic_id>')
@login_required
def edit_image(pic_id):
    context = {
        'pic_id': pic_id,
        'next_pic': MarkedUpImage.next_image(pic_id),
        'prev_pic': MarkedUpImage.previous_image(pic_id),
        'next_pic_without_markup': MarkedUpImage.next_image(pic_id, current_user, without_markup=True)
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
