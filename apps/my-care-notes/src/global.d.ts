// Global augmentations that require this file to be a module (export {} makes it one).

declare global {
  var HunspellEnvironment:
    | {
        getWorker(): Worker;
      }
    | undefined;

  var HarperEnvironment:
    | {
        getWorker(): Worker;
      }
    | undefined;
}

// eslint-disable-next-line unicorn/require-module-specifiers
export {};
