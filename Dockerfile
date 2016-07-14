# vim: set ft=Dockerfile :
FROM gliderlabs/alpine
MAINTAINER Vladislav Bortnikov bortnikov.vladislav@e-sakha.ru

ADD image build
ADD requirements.txt build/requirements.txt

RUN /build/install_packages.sh

WORKDIR /app
ADD knotmarker /app/knotmarker
ADD manage.py /app/manage.py

RUN /build/cleanup.sh

RUN mkdir /app-data

ENTRYPOINT ["gunicorn", "-w", "4", "-b", "0.0.0.0:4000", "knotmarker.application:app"]
EXPOSE 4000
