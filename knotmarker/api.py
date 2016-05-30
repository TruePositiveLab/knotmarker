from flask import request
from flask.ext.security import current_user
from flask.ext.security import login_required
from flask_restful import Api
from flask_restful import fields
from flask_restful import marshal_with
from flask_restful import Resource
from typings import Any
from typings import Dict
from typings import Iterable

from .application import app
from .models import MarkedUpImage
from .models import Polygon

api = Api(app)


class PolygonTypes(Resource):

    @login_required
    def get(self) -> Any:
        return {
            'types': [
                {'type': 'darken',
                 'readable_name': 'Потемнение'},
                {'type': 'knot_defect',
                 'readable_name': 'Сучок с дефектом'},
                {'type': 'knot_decay',
                 'readable_name': 'Табачный сучок'},
                {'type': 'knot_encased',
                 'readable_name': 'Несросшийся сучок'},
                {'type': 'knot_sound',
                 'readable_name': 'Здоровый сучок'},
                {'type': 'knot_pin',
                 'readable_name': 'Очень маленький сучок'},
                {'type': 'crack',
                 'readable_name': 'Трещина'},
                {'type': 'mechanical',
                 'readable_name': 'Механическое повреждение'},
                {'type': 'pith',
                 'readable_name': 'Сердцевина'},
                {'type': 'tar',
                 'readable_name': 'Смоляной карман'},
                {'type': 'unknown',
                 'readable_name': 'Неизвестный дефект'},
            ],
        }

point_fields = {
    'x': fields.Integer,
    'y': fields.Integer
}

polygon_fields = {
    'type': fields.String,
    'stroke_color': fields.String,
    'points': fields.List(fields.Nested(point_fields)),
    'occluded': fields.Boolean
}

rect_fields = {
    'x': fields.Integer,
    'y': fields.Integer,
    'w': fields.Integer,
    'h': fields.Integer
}

polygons_by_image_fields = {
    'status': fields.String,
    'polygons': fields.List(fields.Nested(polygon_fields)),
    'rect': fields.Nested(rect_fields)
}


def stroke_color(value: Any) -> str:
    return str(value)


class PolygonsByImage(Resource):

    @login_required
    @marshal_with(polygons_by_image_fields)
    def get(self, pic_id: str) -> Dict[str, Any]:
        image = MarkedUpImage.polygons(pic_id, current_user).first()
        res = []  # type: Iterable[Any]

        if image is None:
            return {
                'status': 'ok',
                'polygons': res,
                'rect': MarkedUpImage.objects(filename=pic_id).first().rect
            }

        for up in image.users_polygons:
            if up.username == current_user.email:
                res = up.polygons
                break

        return {
            'status': 'ok',
            'polygons': res,
            'rect': image.rect
        }

    def to_polygons(self, json: Iterable[Any]) -> Iterable[Polygon]:
        polygons = []
        for poly in json:
            polygons.append(Polygon(**poly))
        return polygons

    @login_required
    def post(self, pic_id: str) -> Dict[str, Any]:
        # TODO: request validation
        polygons = MarkedUpImage.polygons(pic_id, current_user)

        if len(polygons) == 0:
            MarkedUpImage.image_by_id(pic_id).upsert_one(
                add_to_set__users_polygons={'username': current_user.email})
            polygons = MarkedUpImage.polygons(pic_id, current_user)

        polygons.upsert_one(
            set__users_polygons__S__polygons=self.to_polygons(request.json))
        return {'status': 'ok'}

api.add_resource(PolygonTypes, '/polygon_types')
api.add_resource(PolygonsByImage, '/pic/<string:pic_id>/polygons')
