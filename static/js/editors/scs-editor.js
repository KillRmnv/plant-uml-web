/**
 * ScS Editor - Monaco-based editor for ScS text
 */

const kLangName = 'scs';

const kKeywords = [
    'sc_const', 'sc_var',
    'sc_node', 'sc_link', 'sc_edge_dcommon', 'sc_edge_ucommon', 'sc_edge_main', 'sc_edge_access',
    'sc_node_tuple', 'sc_node_struct', 'sc_node_role_relation', 'sc_node_norole_relation',
    'sc_node_class', 'sc_node_abstract', 'sc_node_material',
    'sc_edge_pos', 'sc_edge_neg', 'sc_edge_fuz', 'sc_edge_perm', 'sc_edge_temp',
    'sc_node_not_relation', 'sc_node_not_binary_tuple'
];

const kConnectors = [
    '>', '<', '->', '<-', '<>', '..>', '<..', '<=>', '_<=>', '=>', '<=',
    '_=>', '_<=', '_->', '_<-', '-|>', '<|-', '_-|>', '_<|-', '-/>', '</-',
    '_-/>', '_</-', '~>', '<~', '_~>', '_<~', '~|>', '<|~', '_~|>', '_<|~',
    '~/>', '</~', '_~/>', '_</~'
];

function SCsInitGlobal(monaco) {
    monaco.languages.register({ id: kLangName });

    monaco.languages.registerCompletionItemProvider(kLangName, {
        provideCompletionItems: function(model, position) {
            const result = [];

            kKeywords.forEach((key) => {
                result.push({
                    label: key,
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: key
                });
            });

            kConnectors.forEach((key) => {
                result.push({
                    label: key,
                    kind: monaco.languages.CompletionItemKind.Reference,
                    insertText: key
                });
            });

            return { suggestions: result };
        }
    });

    monaco.languages.setLanguageConfiguration(kLangName, {
        comments: {
            lineComment: '//',
            blockComment: ['/*', '*/']
        },
        brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')']
        ],
        autoClosingPairs: [
            { open: '[', close: ']' },
            { open: '{', close: '}' },
            { open: '(', close: ')' },
            { open: '\'', close: '\'', notIn: ['string', 'comment'] },
            { open: '"', close: '"', notIn: ['string'] }
        ],
        surroundingPairs: [
            { open: '{', close: '}' },
            { open: '[', close: ']' },
            { open: '(', close: ')' },
            { open: '"', close: '"' },
            { open: '\'', close: '\'' }
        ]
    });

    monaco.languages.setMonarchTokensProvider(kLangName, {
        tokenPostfix: '.scs',
        defaultToken: '',
        brackets: [
            { open: '{', close: '}', token: 'delimiter.curly' },
            { open: '[', close: ']', token: 'delimiter.square' },
            { open: '(', close: ')', token: 'delimiter.parenthesis' }
        ],
        keywords: kKeywords,
        tokenizer: {
            root: [
                { include: '@whitespace' },
                { include: '@contours' },
                { include: '@contents' },
                { include: '@strings' },
                { include: '@brackets' },
                { include: '@connectors' },
                {
                    regex: /[a-zA-Z_0-9]\w*/,
                    action: {
                        cases: {
                            '@keywords': { token: 'keyword' },
                            '@default': { token: 'identifier' }
                        }
                    }
                },
                { regex: /@([a-zA-Z0-9_]+)/, action: { token: 'alias' } },
                { regex: /([_]?[.]{0,2})?([a-zA-Z0-9_]+)/, action: { token: 'identifier' } }
            ],
            brackets: [
                { regex: /[(\[][*]/, action: { token: 'delimiter' } },
                { regex: /[*][)\]]/, action: { token: 'delimiter' } },
                { regex: /[{}()\[\]]/, action: { token: 'delimiter' } }
            ],
            connectors: [
                { regex: /\s*[_]?([-~][\/|]?)>\s*/, action: { token: 'operator' } },
                { regex: /\s*[_]?<([\/|]?[-~])\s*/, action: { token: 'operator' } },
                { regex: /\s*[_]?((=>)|(<=))\s*/, action: { token: 'operator' } },
                { regex: /\s*([_]?<=>)|([.]{0,2}>|<[.]{0,2})\s*/, action: { token: 'operator' } }
            ],
            contours: [
                { regex: /~?(\[[*])/, action: { token: 'delimiter', next: '@contour' } }
            ],
            contour: [
                { regex: /[*]\]/, action: { token: 'delimiter', next: '@pop' } },
                { regex: /(?!([*][\]]))/, action: { token: 'content', next: '@root' } }
            ],
            contents: [
                { regex: /~?\[/, action: { token: 'delimiter', next: '@content' } }
            ],
            content: [
                { regex: '\\\\.', action: { token: 'string' } },
                { regex: ']', action: { token: 'delimiter', next: '@pop' } },
                { regex: /[^\[\]]+/, action: { token: 'string' } },
                { regex: '.', action: { token: 'string' } }
            ],
            strings: [
                { regex: '~?"', action: { token: 'string', next: '@string' } }
            ],
            string: [
                { regex: '\\\\.', action: { token: 'string' } },
                { regex: '"', action: { token: 'string', next: '@pop' } },
                { regex: /[^\\"]+/, action: { token: 'string' } },
                { regex: '.', action: { token: 'string' } }
            ],
            comment: [
                { regex: /[^\/*]+/, action: { token: 'comment' } },
                { regex: /\*\//, action: { token: 'comment', next: '@pop' } },
                { regex: /[\/*]/, action: { token: 'comment' } }
            ],
            whitespace: [
                { regex: /[ \t\r\n]+/, action: { token: '' } },
                { regex: /\/\*/, action: { token: 'comment', next: '@comment' } },
                { regex: /\/\/.*$/, action: { token: 'comment' } }
            ]
        }
    });

    monaco.editor.defineTheme(kLangName, {
        base: 'vs',
        inherit: true,
        colors: {
            'editor.background': '#f8f8f8',
            'editor.foreground': '#353535',
            'editor.lineHighlightBackground': '#f8f8f8',
            'editor.selectionBackground': '#abdffa',
            'editorLineNumber.foreground': '#bbbbbb',
            'editorIndentGuide.background': '#eaeaea'
        },
        rules: [
            { token: 'delimiter', foreground: '535353', fontStyle: 'italic' },
            { token: 'keyword', foreground: '386ac3' },
            { token: 'identifier', foreground: 'e06c75' },
            { token: 'comment', foreground: '10a567' },
            { token: 'string', foreground: 'e88501' },
            { token: 'operator', foreground: '535353' },
            { token: 'alias', foreground: 'e88501', fontStyle: 'bold' }
        ]
    });
}

class ScsEditor {
    constructor(container, options = {}) {
        this.container = container;
        this.options = options;
        this.value = '';
        this.editor = null;
        this.init();
    }

    init() {
        // Ensure container has proper dimensions
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.minHeight = '0';
        this.container.style.overflow = 'hidden';
        
        this.container.innerHTML = `<div class="scs-editor-container" style="width: 100%; height: 100%;"></div>`;
        this.editorContainer = this.container.querySelector('.scs-editor-container');

        if (typeof monaco === 'undefined') {
            this._showLoading();
            return;
        }

        SCsInitGlobal(monaco);

        this.editor = monaco.editor.create(this.editorContainer, {
            language: kLangName,
            theme: kLangName,
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            ...this.options
        });

        this.editor.onDidChangeModelContent(() => {
            this.value = this.editor.getValue();
        });
    }

    _showLoading() {
        this.editorContainer.innerHTML = `
            <div class="scs-editor-loading">
                <div class="loading-spinner"></div>
                <span>Loading Monaco Editor...</span>
            </div>
        `;
    }

    getValue() {
        return this.editor ? this.editor.getValue() : this.value;
    }

    setValue(value) {
        this.value = value;
        if (this.editor) {
            this.editor.setValue(value);
        }
    }

    focus() {
        if (this.editor) {
            this.editor.focus();
        }
    }

    clear() {
        this.setValue('');
    }

    setReadonly(readonly) {
        if (this.editor) {
            this.editor.updateOptions({ readOnly: readonly });
        }
    }

    updateOptions(options) {
        if (this.editor) {
            this.editor.updateOptions(options);
        }
    }

    dispose() {
        if (this.editor) {
            this.editor.dispose();
            this.editor = null;
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScsEditor;
}
