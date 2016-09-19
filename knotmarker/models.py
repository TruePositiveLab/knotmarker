from datetime import datetime

import pytz
from flask.ext.security import RoleMixin
from flask.ext.security import UserMixin
from mongoengine import Q
from mongoengine.queryset import queryset_manager

from .application import db


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
    center = db.EmbeddedDocumentField('Point')
    meta = {'strict': False}


class PolygonType(db.Document):
    readable_name = db.StringField(required=True, unique=True)
    name = db.StringField(required=True, unique=True)
    creator = db.StringField(required=True)
    popularity = db.LongField(default=0)

    meta = {
        'indexes': ['-popularity'],
    }

    @queryset_manager
    def active_types(self, queryset):
        """Returns all system-defined types with most popular user-defined

        :queryset: queryset to filter
        :returns: 'active' types

        """
        return queryset.filter(Q(creator='system') | Q(popularity__gt=5))


class Role(db.Document, RoleMixin):
    name = db.StringField(max_length=80, unique=True)
    description = db.StringField(max_length=255)

    def __unicode__(self):
        return self.name


class Category(db.Document):
    name = db.StringField(max_length=80, unique=True)
    description = db.StringField(max_length=255)

    def __unicode__(self):
        return self.name


class User(db.Document, UserMixin):
    email = db.StringField(max_length=255)
    password = db.StringField(max_length=255)
    active = db.BooleanField(default=True)
    confirmed_at = db.DateTimeField()
    roles = db.ListField(db.ReferenceField(Role), default=[], )


class UserPolygon(db.EmbeddedDocument):
    user = db.ReferenceField(User)
    polygons = db.ListField(db.EmbeddedDocumentField('Polygon'))


def utcnow():
    dt = datetime.utcnow()
    return dt.replace(tzinfo=pytz.utc)


class MarkedUpImage(db.Document):
    created_at = db.DateTimeField(default=utcnow, required=True)
    filename = db.StringField(max_length=255, required=True)
    image = db.FileField()
    image_thumbnail = db.FileField()
    rect = db.EmbeddedDocumentField('Rect')
    users_polygons = db.ListField(db.EmbeddedDocumentField('UserPolygon'))
    category = db.ReferenceField(Category)

    def __unicode__(self):
        return self.filename

    @queryset_manager
    def polygons(cls, queryset, pic_id, user_id):
        return queryset.filter(id=pic_id,
                               users_polygons__user=user_id)

    @queryset_manager
    def image_by_id(cls, queryset, pic_id):
        return queryset.filter(id=pic_id)

    @queryset_manager
    def next_image(cls, queryset, filename, category,
                   current_user=None, without_markup=False):
        qs = queryset.filter(filename__gt=filename, category=category)
        if without_markup:
            qs = qs.filter(
                Q(users_polygons__not__match={"user": current_user}))
        return qs.first()

    @queryset_manager
    def previous_image(cls, queryset, filename, category):
        return queryset.filter(filename__lt=filename, category=category)\
            .order_by('-filename').first()

    meta = {
        'allow_inheritance': True,
        'indexes': ['-created_at', 'filename'],
        'ordering': ['filename']
    }



