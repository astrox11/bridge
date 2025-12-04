FROM quay.io/realastrox11/astrobridge:latest
RUN git clone https://github.com/astrox11/astrobridge /root/astrobridge
WORKDIR /root/astrobridge
RUN bun install
CMD [ "bun", "start" ]