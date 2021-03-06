from flask import make_response
from flask import render_template, redirect, url_for
from flask import request
from flask.ext.security import current_user
from flask.ext.security import login_required

from .application import app
from .models import MarkedUpImage, User, Category


@app.route("/")
@login_required
def index():
    return render_template('index.html')


@app.route("/gallery")
@login_required
def gallery():
    page_num = int(request.args.get('page'))
    pcs_per_page = int(request.args.get('cnt'))
    cat_id = request.args.get('cat')
    if cat_id is None or cat_id == '':
        curr_cat = Category.objects.first()
        args = {
            'page': page_num,
            'cnt': pcs_per_page,
            'cat': curr_cat.id
        }
        return redirect(url_for('gallery', **args))
    else:
        curr_cat = Category.objects.get(id=cat_id)
    pics_in_cat = MarkedUpImage.objects().filter(category=curr_cat)
    pictures = pics_in_cat.skip(pcs_per_page * (page_num - 1)).limit(pcs_per_page)
    len_of_pictures = pics_in_cat.count()
    num_of_pages = int(len_of_pictures / pcs_per_page + 1)
    categories = Category.objects()
    context = {
        'pictures': pictures,
        'num_of_pages': num_of_pages,
        'curr_num': page_num,
        'pcs_per_page': pcs_per_page,
        'current_user': current_user,
        'categories': categories,
        'curr_category': curr_cat,
        'is_gallery': True
    }
    return render_template('gallery.html', **context)


@app.route('/pic/<string:pic_id>/<string:user_id>')
@login_required
def edit_image(pic_id, user_id):
    if str(current_user.id) == user_id or current_user.has_role('admin'):
        markedup_image = MarkedUpImage.image_by_id(pic_id).first()
        category = markedup_image.category
        filename = markedup_image.filename
        next_pic_wo_markup = MarkedUpImage.next_image(filename,
                                                      category,
                                                      current_user,
                                                      without_markup=True)
        user_email = ''
        if current_user.has_role('admin') and str(current_user.id) != user_id:
            user_email = User.objects.filter(id=user_id).first().email

        context = {
            'pic_id': pic_id,
            'user_id': user_id,
            'next_pic': MarkedUpImage.next_image(filename, category),
            'prev_pic': MarkedUpImage.previous_image(filename, category),
            'next_pic_without_markup': next_pic_wo_markup,
            'users_polygons': markedup_image.users_polygons,
            'user_email': user_email,
            'pic_filename': markedup_image.filename
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
