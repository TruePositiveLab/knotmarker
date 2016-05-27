import dotenv
from flask.ext.script import Manager
from flask.ext.script import Server

from knotmarker import app
from knotmarker.commands import Grab
dotenv.load()

manager = Manager(app)

DEBUG = dotenv.get('KNOTMARKER_DEBUG', False)

manager.add_command("runserver", Server(
    use_debugger=DEBUG,
    use_reloader=DEBUG,
    host='0.0.0.0')
)

manager.add_command("grab", Grab())

if __name__ == "__main__":
    manager.run()
