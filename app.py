"""
KnotMarker web version
"""

import asyncio
import glob
import os
import random
import sqlite3
import sys
import uuid
import json
from itertools import chain

# from detector_cluster import process_image

import aiohttp
from aiohttp import web
import aiohttp_jinja2
import jinja2

from aiohttp_session import get_session, session_middleware, setup as session_setup
from aiohttp_session.cookie_storage import EncryptedCookieStorage


ENV = os.environ

DEFAULT_SESSION_KEY = "YWJjYXNrZGphc2RmYXNkc2RhamtsanNkYWFzZGFzZGY="
SESSION_KEY = ENV.get("KNOTMARKER_SESSION_KEY", DEFAULT_SESSION_KEY)

IMAGES_PATH = ENV.get("KNOTMARKER_IMAGES_PATH", "../surface")
DATABASE_PATH = ENV.get("KNOTMARKER_DATABASE", "knotmarker.sqlite")


def init_session(session, request):
    """Writes uid to session

    :session: TODO
    :returns: TODO

    """
    if session.new or "uid" not in session:
        session['uid'] = uuid.uuid4().hex
    if 'images_available' not in session:
        session['images_available'] = len(request.app['images_list'])
    return session


@aiohttp_jinja2.template('index.jinja2')
def handle(request):
    """ handles index page

    :request: aiohttp request
    :returns: dict of template variables
    """
    session = yield from get_session(request)
    session = init_session(session, request)
    return {
        'defects': request.app['defects'],
        'images_available': session['images_available']
    }


def select_next_image(app, uid):
    """
    """

    curr = app["database"].cursor()
    curr.execute(
        'SELECT DISTINCT(image) FROM marks WHERE uid = ?',
        (uid,))
    last_images = set(chain.from_iterable(curr.fetchall()))

    images = list(app['images_list'] - last_images)
    if images:
        return random.choice(images), len(images)
    else:
        return None, 0


def process_image(image_path):
    """Current implementation loads file with markup

    :image_path: TODO
    :returns: TODO

    """
    image_name, _ = os.path.splitext(image_path)
    with open(image_name + "json") as markup_f:
        return json.load(markup_f)


@asyncio.coroutine
def websocket_endpoint(request):
    """TODO: Docstring for websocket_endpoint.

    :request: TODO
    :returns: TODO

    """
    session = yield from get_session(request)
    ws = web.WebSocketResponse()
    yield from ws.prepare(request)

    app = request.app

    while not ws.closed:
        try:
            msg = yield from ws.receive()
            if msg.tp == aiohttp.MsgType.text:
                data = json.loads(msg.data)
                if data["type"] == "requestImage":
                    new_image, images_available = select_next_image(
                        app, session["uid"])
                    ws.send_str(json.dumps({
                        "type": "imagesAvailable",
                        "value": images_available
                    }))
                    if new_image is not None:
                        with open(new_image, 'rb') as image_f:
                            ws.send_bytes(image_f.read())
                else:
                    if data["type"] == "imageLoaded":
                        defects = process_image(new_image)
                        for defect in defects:
                            ws.send_str(json.dumps({
                                "type": "defect",
                                "rect": defect
                            }))
                        ws.send_str(json.dumps({
                            "type": "imageProcessed"
                        }))
                    else:
                        conn = app["database"]
                        cursor = conn.cursor()

                        cursor.execute("""
                        insert into marks (uid, image, defect_type, x, y, width, height)
                        values (?, ?, ?, ?, ?, ?, ?)
                        """, [session["uid"], new_image, data["type"]] + data["defect"])
                        conn.commit()
        except aiohttp.errors.WSClientDisconnectedError:
                print('ws connection closed with exception %s',
                      ws.exception())

    return ws


def create_database():
    """Create sqlite database for knotmarker
    :returns: TODO

    """
    conn = sqlite3.connect(DATABASE_PATH)

    curr = conn.cursor()

    curr.execute("""
    CREATE TABLE IF NOT EXISTS marks (
        id INTEGER PRIMARY KEY,
        uid TEXT,
        image TEXT,
        defect_type TEXT,
        x INTEGER,
        y INTEGER,
        width INTEGER,
        height INTEGER,
        created DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)
    return conn


@asyncio.coroutine
def on_shutdown(app):
    """Closes all resources used by application

    :app: TODO
    :returns: TODO

    """
    conn = app['database']
    conn.commit()
    conn.close()


def list_images(root):
    for dirname, dirnames, filenames in os.walk(root):
        for filename in filenames:
            if filename.endswith('.png'):
                yield os.path.join(dirname, filename)


def create_app(args):
    """Main entry point

    :args: TODO
    :returns: TODO

    """
    app = web.Application()

    session_setup(app,
                  EncryptedCookieStorage(SESSION_KEY, cookie_name='KNOTMARKER_COOKIE'))

    aiohttp_jinja2.setup(app,
                         loader=jinja2.FileSystemLoader('./templates'))
    app['images_list'] = set(list_images(IMAGES_PATH))
    app['defects'] = [
        ('darken', 'd', 'Потемнение'),
        ('knot_defect', 'f', 'Сучок с дефектами'),
        ('knot_decay', 'y', 'Табачный сучок'),
        ('knot_encased', 'e', 'Несросшийся сучок'),
        ('knot_sound', 'k', 'Здоровый сучок'),
        ('knot_pin', 'o', 'Очень маленький сучок'),
        ('krack', 'c', 'Трещина'),
        ('mechanical', 'm', 'Механическое повреждение'),
        ('pith', 'p', 'Сердцевина'),
        ('tar', 't', 'Смоляной карман'),
        ('unknown', 'u', 'Неизвестный дефект'),
        ('none', 'n', 'Дефекта нет'),
        ('multiple', 'q', 'На изображении несколько дефектов'),
    ]
    app['database'] = create_database()
    app.on_shutdown.append(on_shutdown)
    app.router.add_route('GET', '/', handle, name='index')
    app.router.add_route('*', '/ws', websocket_endpoint, name='websocket')
    return app

    # web.run_app(app)

app = create_app(sys.argv[1:])

if __name__ == '__main__':
    web.run_app(app)
