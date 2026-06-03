import * as monaco from 'monaco-editor';
import { type Ref } from 'vue';
/**
 * Applications must configure a Hunspell worker factory on
 * `window.HunspellEnvironment` before using spell-check, similar to the
 * `window.MonacoEnvironment` pattern used to configure Monaco language workers.
 *
 * @example
 * // In your app's main.ts:
 * import HunspellWorker from '@mission-platform/hunspell/worker?worker'
 *
 * window.HunspellEnvironment = {
 *   getWorker: () => new HunspellWorker(),
 * }
 */
declare global {
    interface Window {
        HunspellEnvironment?: {
            getWorker: () => Worker;
        };
    }
}
export declare function useHunspellMonaco(editorRef: Ref<monaco.editor.IStandaloneCodeEditor | null>, enabled: Ref<boolean>, languageRef: Ref<string>): void;
