FROM nginx:alpine
COPY . /usr/share/nginx/html
COPY default.conf /etc/nginx/conf.d/default.conf
RUN cat /etc/nginx/conf.d/default.conf
EXPOSE 80
