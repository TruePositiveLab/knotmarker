from knotmarker import app

from flask.ext.script import Manager, Server

import dotenv
dotenv.load()

manager = Manager(app)

DEBUG = dotenv.get('KNOTMARKER_DEBUG', False)

manager.add_command("runserver", Server(
    use_debugger=DEBUG,
    use_reloader=DEBUG,
    host='0.0.0.0')
)

if __name__ == "__main__":
    manager.run()
