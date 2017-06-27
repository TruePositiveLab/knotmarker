# vim: set ft=Dockerfile :
FROM gliderlabs/alpine
MAINTAINER Vladislav Bortnikov bortnikov.vladislav@e-sakha.ru

ADD image build
ADD requirements.txt build/requirements.txt

WORKDIR /app
ADD knotmarker /app/knotmarker
ADD manage.py /app/manage.py

RUN /build/install_packages.sh && /build/compile_typescript.sh && /build/cleanup.sh

RUN mkdir /app-data

ENTRYPOINT ["/sbin/tini", "--"]

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:4000", "knotmarker.application:app"]
EXPOSE 4000
