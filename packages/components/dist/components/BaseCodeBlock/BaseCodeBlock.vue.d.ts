export type CodeBlockLanguage = 'bash' | 'css' | 'dockerfile' | 'go' | 'ini' | 'javascript' | 'json' | 'markdown' | 'plaintext' | 'python' | 'rust' | 'scss' | 'shell' | 'sql' | 'typescript' | 'xml' | 'yaml';
type __VLS_Props = {
    code: string;
    language?: CodeBlockLanguage;
    filename?: string;
    showLineNumbers?: boolean;
    showCopyButton?: boolean;
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{}>, {
    language: CodeBlockLanguage;
    filename: string;
    showLineNumbers: boolean;
    showCopyButton: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
