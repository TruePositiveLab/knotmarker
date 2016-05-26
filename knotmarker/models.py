from .application import db

from mongoengine import Q
from mongoengine.queryset import queryset_manager
from flask.ext.security import UserMixin, RoleMixin
import pytz
from datetime import datetime


class Point(db.EmbeddedDocument):
    x = db.FloatField(required=True)
    y = db.FloatField(required=True)


class Rect(db.EmbeddedDocument):
    x = db.FloatField(required=True)
    y = db.FloatField(required=True)
    w = db.FloatField(required=True)
    h = db.FloatField(required=True)


class Polygon(db.EmbeddedDocument):
    type = db.StringField(required=True)
    stroke_color = db.StringField(required=True)
    points = db.ListField(db.EmbeddedDocumentField('Point'))
    occluded = db.BooleanField(required=True, default=False)


class UserPolygon(db.EmbeddedDocument):
    username = db.StringField(required=True)
    polygons = db.ListField(db.EmbeddedDocumentField('Polygon'))


def utcnow():
    dt = datetime.utcnow()
    return dt.replace(tzinfo=pytz.utc)


class MarkedUpImage(db.Document):
    created_at = db.DateTimeField(default=utcnow, required=True)
    filename = db.StringField(primary_key=True, max_length=255, required=True)
    image = db.FileField()
    image_thumbnail = db.FileField()
    rect = db.EmbeddedDocumentField('Rect')
    users_polygons = db.ListField(db.EmbeddedDocumentField('UserPolygon'))

    def __unicode__(self):
        return self.filename

    @queryset_manager
    def polygons(cls, queryset, pic_id, current_user):
        return queryset.filter(filename=pic_id,
                               users_polygons__username=current_user.email)

    @queryset_manager
    def image_by_id(cls, queryset, pic_id):
        return queryset.filter(filename=pic_id)

    @queryset_manager
    def next_image(cls, queryset, pic_id,
                   current_user=None, without_markup=False):
        qs = queryset.filter(filename__gt=pic_id)
        if without_markup:
            qs = qs.filter(
                Q(users_polygons__not__match={"username": current_user.email}))
        return qs.first()

    @queryset_manager
    def previous_image(cls, queryset, pic_id):
        return queryset.filter(filename__lt=pic_id)\
            .order_by('-filename').first()

    meta = {
        'allow_inheritance': True,
        'indexes': ['-created_at', 'filename'],
        'ordering': ['filename']
    }


class Role(db.Document, RoleMixin):
    name = db.StringField(max_length=80, unique=True)
    description = db.StringField(max_length=255)


class User(db.Document, UserMixin):
    email = db.StringField(max_length=255)
    password = db.StringField(max_length=255)
    active = db.BooleanField(default=True)
    confirmed_at = db.DateTimeField()
    roles = db.ListField(db.ReferenceField(Role), default=[])
