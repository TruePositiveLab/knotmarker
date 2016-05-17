import os
import glob
import io
import Image
from .models import *


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


def grab(dirpath):
    kmarks = glob.glob(os.path.join(dirpath, '*.kmark'))

    boards_coords = []
    for kmark in kmarks:
        print(kmark)
        with open(kmark, 'r') as f:
            coords = f.readline().strip('\n').split()[1:]
            filename = kmark.split('/')[-1:][0][0:14]

            picpath = os.path.join(dirpath, filename + '.undistorted.png')
            pic = None
            if os.path.isfile(picpath):
                with open(picpath, 'r') as f1:
                    pic = f1.read()

            pic_thumb = Image.open(io.BytesIO(pic))
            pic_thumb.thumbnail(thumb_size)
            pic_thumb_b_arr = io.BytesIO()
            pic_thumb.save(pic_thumb_b_arr, format='PNG')
            pic_thumb_b_arr = pic_thumb_b_arr.getvalue()

            coordobj = PictureWithBoardCoordinates(
                filename, *coords, pic=pic, pic_thumb=pic_thumb_b_arr)
            boards_coords.append(coordobj)

    for coordobj in boards_coords:
        image = MarkedUpImage(filename=coordobj.filename)
        image.image.put(coordobj.pic, content_type='image/png')
        image.image_thumbnail.put(
            coordobj.pic_thumbnail, content_type='image/png')
        image.rect = Rect(x=coordobj.x,
                          y=coordobj.y,
                          w=coordobj.w,
                          h=coordobj.h)
        image.save()
