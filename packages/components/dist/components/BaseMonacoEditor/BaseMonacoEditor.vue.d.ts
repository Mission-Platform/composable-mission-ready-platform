import * as monaco from 'monaco-editor';
export type MonacoEditorCompletionItemProvider = monaco.languages.CompletionItemProvider;
export type MonacoEditorLanguage = 'abap' | 'apex' | 'azcli' | 'bat' | 'bicep' | 'cameligo' | 'clojure' | 'coffee' | 'cpp' | 'csharp' | 'csp' | 'css' | 'cypher' | 'dart' | 'dockerfile' | 'ecl' | 'elixir' | 'flow9' | 'freemarker2' | 'fsharp' | 'go' | 'graphql' | 'handlebars' | 'hcl' | 'html' | 'ini' | 'java' | 'javascript' | 'json' | 'julia' | 'kotlin' | 'less' | 'lexon' | 'liquid' | 'lua' | 'm3' | 'markdown' | 'mdx' | 'mips' | 'msdax' | 'mysql' | 'objective-c' | 'pascal' | 'pascaligo' | 'perl' | 'pgsql' | 'php' | 'pla' | 'postiats' | 'powerquery' | 'powershell' | 'proto' | 'pug' | 'python' | 'qsharp' | 'r' | 'razor' | 'redis' | 'redshift' | 'restructuredtext' | 'ruby' | 'rust' | 'sb' | 'scala' | 'scheme' | 'scss' | 'shell' | 'solidity' | 'sophia' | 'sparql' | 'sql' | 'st' | 'swift' | 'systemverilog' | 'tcl' | 'twig' | 'typescript' | 'typespec' | 'vb' | 'wgsl' | 'xml' | 'yaml' | 'zenscript' | 'plaintext';
export type MonacoEditorTheme = 'vs' | 'vs-dark' | 'hc-black' | 'hc-light';
type __VLS_Props = {
    modelValue?: string;
    language?: MonacoEditorLanguage;
    theme?: MonacoEditorTheme;
    readonly?: boolean;
    minimap?: boolean;
    lineNumbers?: boolean;
    wordWrap?: boolean;
    height?: string;
    fontSize?: number;
    tabSize?: number;
    scrollBeyondLastLine?: boolean;
    automaticLayout?: boolean;
    completionProvider?: MonacoEditorCompletionItemProvider;
    spellCheck?: boolean;
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {
    editor: () => monaco.editor.IStandaloneCodeEditor | null;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "update:modelValue": (value: string) => any;
    change: (value: string) => any;
    blur: () => any;
    focus: () => any;
    ready: (editor: monaco.editor.IStandaloneCodeEditor) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    "onUpdate:modelValue"?: ((value: string) => any) | undefined;
    onChange?: ((value: string) => any) | undefined;
    onBlur?: (() => any) | undefined;
    onFocus?: (() => any) | undefined;
    onReady?: ((editor: monaco.editor.IStandaloneCodeEditor) => any) | undefined;
}>, {
    height: string;
    modelValue: string;
    readonly: boolean;
    fontSize: number;
    language: MonacoEditorLanguage;
    theme: MonacoEditorTheme;
    minimap: boolean;
    lineNumbers: boolean;
    wordWrap: boolean;
    tabSize: number;
    scrollBeyondLastLine: boolean;
    automaticLayout: boolean;
    spellCheck: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
