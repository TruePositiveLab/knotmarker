import io
import logging
from flask.ext.script import Command
from PIL import Image
from knotmarker.models import MarkedUpImage

logger = logging.getLogger(__name__)


def translate(value, leftMin, leftMax, rightMin, rightMax):
    leftSpan = leftMax - leftMin
    rightSpan = rightMax - rightMin
    valueScaled = float(value - leftMin) / float(leftSpan)
    return rightMin + (valueScaled * rightSpan)


thumb_width = 150
old_width = 808
old_height = 608

class AddSize(Command):

    def run(self):
        imgs = MarkedUpImage.objects().all()
        for img in imgs:
            pic = Image.open(io.BytesIO(img.image.read()))
            print("Size of {0} is {1}".format(img.filename, pic.size))
            width, height = pic.size
            img.width = width
            img.height = height

            thumb_height = int(thumb_width*height/width)
            print("Thumb size is ({0}, {1})".format(thumb_width, thumb_height))
            pic.thumbnail((thumb_width, thumb_height))
            pic_thumb_b_arr = io.BytesIO()
            pic.save(pic_thumb_b_arr, format='PNG')
            img.image_thumbnail.replace(pic_thumb_b_arr.getvalue(), content_type='image/png')

            for up in img.users_polygons:
                for polygon in up.polygons:
                    if polygon.center is not None:
                        polygon.center.x = int(translate(polygon.center.x, 0, old_width, 0, width))
                        polygon.center.y = int(translate(polygon.center.y, 0, old_height, height, 0))
                    for point in polygon.points:
                        point.x = int(translate(point.x, 0, old_width, 0, width))
                        point.y = int(translate(point.y, 0, old_height, height, 0))

            img.save()
