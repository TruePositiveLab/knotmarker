from collections import Counter
from typing import Any
from typing import Dict
from typing import Iterable

from flask import request
from flask.ext.security import current_user
from flask.ext.security import login_required
from flask_restful import Api
from flask_restful import fields
from flask_restful import marshal_with
from flask_restful import Resource

from .application import app
from .models import MarkedUpImage
from .models import Polygon
from .models import PolygonType

api = Api(app)

polygon_type_fields = {
    'type': fields.String(attribute='name'),
    'readable_name': fields.String()
}

polygon_types_fields = {
    'types': fields.List(fields.Nested(polygon_type_fields))
}


class PolygonTypes(Resource):

    @login_required
    @marshal_with(polygon_types_fields)
    def get(self) -> Any:
        return {
            'types': PolygonType.active_types()
        }

point_fields = {
    'x': fields.Integer,
    'y': fields.Integer
}

polygon_fields = {
    'type': fields.String,
    'stroke_color': fields.String,
    'points': fields.List(fields.Nested(point_fields)),
    'center': fields.Nested(point_fields)
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
    def get(self, pic_id: str, user_id: str) -> Dict[str, Any]:
        image = MarkedUpImage.polygons(pic_id, user_id).first()
        res = []  # type: Iterable[Any]

        if image is None:
            return {
                'status': 'ok',
                'polygons': res,
                'rect': MarkedUpImage.objects(id=pic_id).first().rect
            }

        for up in image.users_polygons:
            if str(up.user.id) == user_id:
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
    def post(self, pic_id: str, user_id: str) -> Dict[str, Any]:
        # TODO: request validation
        polygons = MarkedUpImage.polygons(pic_id, user_id)

        if len(polygons) == 0:
            MarkedUpImage.image_by_id(pic_id).upsert_one(
                add_to_set__users_polygons={'user': user_id})
            polygons = MarkedUpImage.polygons(pic_id, user_id)

        updated_polygons = self.to_polygons(request.json)

        types_counter = Counter(p.type for p in updated_polygons)

        polygons.upsert_one(
            set__users_polygons__S__polygons=updated_polygons)

        return {'status': 'ok'}

api.add_resource(PolygonTypes, '/polygon_types')
api.add_resource(PolygonsByImage, '/pic/<string:pic_id>/<string:user_id>/polygons')
