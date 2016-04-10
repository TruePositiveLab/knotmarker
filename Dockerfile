FROM python:3
ADD . /code
WORKDIR /code
RUN pip install -r requirements.txt
EXPOSE 8080
CMD gunicorn app:app --bind 0.0.0.0:8080 --worker-class aiohttp.worker.GunicornWebWorker
