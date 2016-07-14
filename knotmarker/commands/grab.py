import glob
import io
import logging
import os

from flask.ext.script import Command
from flask.ext.script import Option
from PIL import Image

from knotmarker.models import MarkedUpImage
from knotmarker.models import Rect

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


class Grab(Command):
    "Reads directory of images with markup"

    option_list = (
        Option('--dirpath', '-d', dest='dir_path', help='Source directory'),
    )

    def run(self, dir_path):
        kmarks = glob.glob(os.path.join(dir_path, '*.kmark'))

        boards_coords = []
        for kmark in kmarks:
            logger.info("Reading kmark %s", kmark)
            with open(kmark, 'r') as f:
                coords = f.readline().strip('\n').split()[1:]

            filename = kmark.split('/')[-1:][0].replace(".kmark", "")

            picpath = os.path.join(dir_path, filename + '.undistorted.png')
            pic = None
            if os.path.isfile(picpath):
                with open(picpath, 'rb') as f1:
                    pic = f1.read()

            try:
                pic_thumb = Image.open(io.BytesIO(pic))
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
            image.save()
