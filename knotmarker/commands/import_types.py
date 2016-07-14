import csv

from flask.ext.script import Command
from flask.ext.script import Option

from knotmarker.models import PolygonType


class TypesImporter(Command):

    option_list = (
        Option('--types', '-t', dest='types_csv',
               help='File with types definition'),
    )

    def run(self, types_csv):
        with open(types_csv) as csv_file:
            reader = csv.DictReader(csv_file)
            for row in reader:
                polygon_type = PolygonType(**row)
                polygon_type.creator = 'system'
                polygon_type.save()
