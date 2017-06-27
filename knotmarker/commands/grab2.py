import glob
import io
import logging
import os
import json

from flask.ext.script import Command
from flask.ext.script import Option
from PIL import Image

from knotmarker.models import MarkedUpImage, Rect, Category, User, UserPolygon, Polygon, Point
from mongoengine import DoesNotExist

import pprint

logger = logging.getLogger(__name__)


class PictureWithBoardCoordinates(object):

    def __init__(self, filename, x=0, y=0, w=0, h=0, pic=None, pic_thumb=None):
        self.filename = filename
        self.x = x
        self.y = y
        self.w = w
        self.h = h
        self.pic = pic
        self.pic_thumb = pic_thumb

thumb_size = 150, 150

def to_polygon(p):
    points = [Point(**pt) for pt in p['points']]
    center = sum(points, Point(x=0, y=0))
    center /= len(points)

    return Polygon(
        type=p['type'],
        points=points,
        stroke_color=p['stroke_color'],
        center=center)

def markup2polygon(markup):
    return [to_polygon(p)
            for p in markup]


class Grab(Command):
    "Reads directory of images with markup"

    option_list = (
        Option('--dirpath', '-d', dest='dir_path', help='Source directory'),
        Option('--category', '-c', dest='category_name', help='Category name')
    )

    def run(self, dir_path, category_name):
        kmarks = glob.glob(os.path.join(dir_path, '*.json'))
        try:
            curr_cat = Category.objects().get(name=category_name)
        except DoesNotExist:
            print("\'{0}\' does not exist!".format(category_name))
            return

        try:
            system = User.objects().get(email='system')
        except DoesNotExist:
            print("User 'system' does not exist")

        boards_coords = []
        for kmark in kmarks:
            logger.info("Reading json %s", kmark)

            with open(kmark) as f:
                markup = json.load(f)

            filename = kmark.split('/')[-1:][0].replace(".undistorted.json", "")

            picpath = os.path.join(dir_path, filename + '.undistorted.png')
            pic = None
            if os.path.isfile(picpath):
                with open(picpath, 'rb') as f1:
                    pic = f1.read()

            try:
                pic_thumb = Image.open(io.BytesIO(pic))
                coords = [0, 0, pic_thumb.width, pic_thumb.height]
            except:
                logger.error('Cannot read image file "%s", skip',
                             picpath, exc_info=1)
                continue

            pic_thumb.thumbnail(thumb_size)
            pic_thumb_b_arr = io.BytesIO()
            pic_thumb.save(pic_thumb_b_arr, format='PNG')
            pic_thumb_b_arr = pic_thumb_b_arr.getvalue()


            coordobj = PictureWithBoardCoordinates(
                filename, *coords, pic=pic, pic_thumb=pic_thumb_b_arr)

            image = MarkedUpImage(filename=coordobj.filename)
            image.image.put(coordobj.pic, content_type='image/png')
            image.image_thumbnail.put(
                coordobj.pic_thumb, content_type='image/png')
            image.rect = Rect(x=coordobj.x,
                              y=coordobj.y,
                              w=coordobj.w,
                              h=coordobj.h)
            image.width = coordobj.w
            image.height = coordobj.h
            image.category = curr_cat
            image.users_polygons += [UserPolygon(
                user=system,
                polygons=markup2polygon(markup)
            )]
            pprint.pprint(markup)
            try:
                image.save()
            except Exception as e:
                pprint.pprint(e.errors)
