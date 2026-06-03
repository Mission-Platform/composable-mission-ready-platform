FROM emscripten/emsdk:5.0.7-arm64 AS build

# System deps needed to build Hunspell from source
RUN apt-get update -qq && apt-get install -y --no-install-recommends \
    autoconf \
    automake \
    autopoint \
    gettext \
    libtool \
    wget \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# ── 1. Download & cross-compile Hunspell to a static WASM library ────────────
ARG HUNSPELL_VERSION=1.7.2
RUN wget -q \
    "https://github.com/hunspell/hunspell/releases/download/v${HUNSPELL_VERSION}/hunspell-${HUNSPELL_VERSION}.tar.gz" \
    -O hunspell.tar.gz \
  && tar xzf hunspell.tar.gz \
  && rm hunspell.tar.gz

WORKDIR /build/hunspell-${HUNSPELL_VERSION}
RUN autoreconf -vfi \
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

RUN npm install -g typescript@^5

RUN mkdir -p /output && \
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
    libhunspell.a \
    -o /output/hunspell.js

FROM scratch
COPY --from=build /output /
