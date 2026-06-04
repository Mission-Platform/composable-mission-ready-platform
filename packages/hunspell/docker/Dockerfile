# syntax=docker/dockerfile:1
FROM emscripten/emsdk:5.0.7 AS build

# System deps needed to build Hunspell from source + ccache for compiler caching
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update -qq && apt-get install -y --no-install-recommends \
    autoconf \
    automake \
    autopoint \
    ccache \
    gettext \
    libtool \
    wget \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Configure ccache: store in a BuildKit cache mount so it persists across builds
ARG CCACHE_DIR=/root/.ccache
ENV CCACHE_DIR=${CCACHE_DIR}
ENV CCACHE_MAXSIZE=500M
ENV PATH="/usr/lib/ccache:${PATH}"

WORKDIR /build

# ── 1. Download & cross-compile Hunspell to a static WASM library ────────────
ARG HUNSPELL_VERSION=1.7.2
RUN --mount=type=cache,target=/root/.wget-cache \
    wget -q \
    "https://github.com/hunspell/hunspell/releases/download/v${HUNSPELL_VERSION}/hunspell-${HUNSPELL_VERSION}.tar.gz" \
    -O /root/.wget-cache/hunspell-${HUNSPELL_VERSION}.tar.gz \
  && cp /root/.wget-cache/hunspell-${HUNSPELL_VERSION}.tar.gz hunspell.tar.gz \
  && tar xzf hunspell.tar.gz \
  && rm hunspell.tar.gz

WORKDIR /build/hunspell-${HUNSPELL_VERSION}
RUN --mount=type=cache,target=/root/.ccache \
    autoreconf -vfi \
  && emconfigure ./configure \
      --disable-shared \
      --enable-static \
      --without-readline \
  && emmake make -j"$(nproc)" \
  && cp src/hunspell/.libs/libhunspell-1.7.a /build/libhunspell.a

WORKDIR /build

# ── 2. Compile the wrapper + WASM into a single self-contained JS file ────────
#
#  SINGLE_FILE=1  – base64-inlines the .wasm binary so the output is one file.
#                   This avoids the need for consumers to configure WASM URL
#                   resolution in their bundler or worker environment.
#  MODULARIZE=1   – wraps the output in a factory function `createHunspell()`.
#  EXPORT_ES6=1   – emits an ES module with a default export.
#  ENVIRONMENT    – limits polyfill surface to web + worker contexts only.
COPY hunspell_wrapper.cpp .

RUN --mount=type=cache,target=/root/.npm \
    npm install -g typescript@^5

RUN --mount=type=cache,target=/root/.ccache \
    mkdir -p /output && \
    emcc -O2 -c \
    -I hunspell-${HUNSPELL_VERSION}/src \
    hunspell-${HUNSPELL_VERSION}/src/parsers/textparser.cxx \
    -o textparser.o && \
    emcc \
    -O2 \
    -flto \
    --bind \
    --emit-tsd /output/hunspell.d.ts \
    -s WASM=1 \
    -s MODULARIZE=1 \
    -s EXPORT_ES6=1 \
    -s EXPORT_NAME=createHunspell \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s SINGLE_FILE=0 \
    -s ENVIRONMENT=web,worker \
    -s FILESYSTEM=1 \
    -s LZ4=1 \
    -s NO_EXIT_RUNTIME=1 \
    -s EMBIND_AOT=1 \
    -I hunspell-${HUNSPELL_VERSION}/src \
    hunspell_wrapper.cpp \
    textparser.o \
    libhunspell.a \
    -o /output/hunspell.js

FROM scratch
COPY --from=build /output /
