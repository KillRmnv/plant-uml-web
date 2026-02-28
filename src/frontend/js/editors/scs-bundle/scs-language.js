/**
 * SCS Language Registration for Monaco Editor
 * This file registers SCS language support in Monaco loaded via CDN
 */

(function() {
    'use strict';

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

    function registerSCSLanguage() {
        if (typeof monaco === 'undefined') {
            console.warn('[SCS] Monaco not loaded yet, retrying...');
            setTimeout(registerSCSLanguage, 100);
            return;
        }

        // Register language
        monaco.languages.register({ id: kLangName });

        // Register completion provider
        monaco.languages.registerCompletionItemProvider(kLangName, {
            provideCompletionItems: function(model, position) {
                const result = [];

                kKeywords.forEach(function(key) {
                    result.push({
                        label: key,
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        insertText: key
                    });
                });

                kConnectors.forEach(function(key) {
                    result.push({
                        label: key,
                        kind: monaco.languages.CompletionItemKind.Reference,
                        insertText: key
                    });
                });

                return { suggestions: result };
            }
        });

        // Set language configuration
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

        // Set monarch tokenizer
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
                    [
                        /[a-zA-Z_0-9]\w*/,
                        {
                            cases: {
                                '@keywords': { token: 'keyword' },
                                '@default': { token: 'identifier' }
                            }
                        }
                    ],
                    [/@([a-zA-Z0-9_]+)/, { token: 'alias' }],
                    [/[_]?[.]{0,2}[a-zA-Z0-9_]+/, { token: 'identifier' }]
                ],
                brackets: [
                    [/[(\[][*]/, { token: 'delimiter' }],
                    [/[*)]/, { token: 'delimiter' }],
                    [/[{}()\[\]]/, { token: '@brackets' }]
                ],
                connectors: [
                    [/\s*[_]?([-~][\/|]?)?>\s*/, { token: 'operators' }],
                    [/\s*[_]?<([\/|]?[-~])\s*/, { token: 'operators' }],
                    [/\s*[_]?((=>)|(<=))\s*/, { token: 'operators' }],
                    [/\s*([_]?<=>)|([.]{0,2}>|<[.]{0,2})\s*/, { token: 'operators' }]
                ],
                contours: [
                    [/~?(\[[*])/, { token: 'delimiter', next: '@contour' }]
                ],
                contour: [
                    [/\*\]/, { token: 'delimiter', next: '@pop' }],
                    [/(?![*][\]])/, { token: 'contour.internal', next: '@root' }]
                ],
                contents: [
                    [/~?\[/, { token: 'delimiter', next: '@content' }]
                ],
                content: [
                    [/\\\\./, { token: 'content.internal' }],
                    [/\]/, { token: 'delimiter', next: '@pop' }],
                    [/[^\[\]]+/, { token: 'content.internal.escape' }],
                    [/./, { token: 'content.internal' }]
                ],
                strings: [
                    [/~?"/, { token: 'string', next: '@stringenddoublequote' }]
                ],
                stringenddoublequote: [
                    [/\\\\./, { token: 'string' }],
                    [/"(?=.)/, { token: 'string', next: '@pop' }],
                    [/[^\\"]+/, { token: 'string' }],
                    [/./, { token: 'string' }]
                ],
                whitespace: [
                    [/[ \t\r\n]+/, { token: '' }],
                    [/\/\*\*(?!\/)/, { token: 'comment.doc', next: '@doccomment' }],
                    [/\/\*/, { token: 'comment', next: '@comment' }],
                    [/\/\/.*$/, { token: 'comment' }]
                ],
                comment: [
                    [/[^\/*]+/, { token: 'comment' }],
                    [/\*\//, { token: 'comment', next: '@pop' }],
                    [/[\/*]/, { token: 'comment' }]
                ],
                doccomment: [
                    [/[^\/*]+/, { token: 'comment.doc' }],
                    [/\*\//, { token: 'comment.doc', next: '@pop' }],
                    [/[\/*]/, { token: 'comment.doc' }]
                ]
            }
        });

        // Define SCS theme
        monaco.editor.defineTheme('scs', {
            base: 'vs',
            inherit: true,
            colors: {
                'editor.background': '#f8f8f8',
                'editorCursor.foreground': '#000000',
                'editor.foreground': '#353535',
                'editor.lineHighlightBackground': '#f8f8f8',
                'editor.selectionBackground': '#abdffa',
                'editorLineNumber.foreground': '#bbbbbb'
            },
            rules: [
                { token: 'delimiter', foreground: '535353', fontStyle: 'italic' },
                { token: 'keyword', foreground: '386ac3' },
                { token: 'identifier', foreground: 'e06c75' },
                { token: 'alias', foreground: 'e88501', fontStyle: 'bold' },
                { token: 'comment', foreground: '10a567' },
                { token: 'string', foreground: 'e88501' },
                { token: 'operators', foreground: '535353' },
                { token: 'content.internal', foreground: 'e88501', fontStyle: 'italic' },
                { token: 'contour.internal', foreground: 'e88501' }
            ]
        });

        // Expose to global
        window.SCsInitGlobal = function() {
            console.log('[SCS] Language already registered');
        };

        console.log('[SCS] Language registered successfully');
    }

    // Wait for Monaco to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', registerSCSLanguage);
    } else {
        registerSCSLanguage();
    }

    // Also listen for monacoLoaded event
    window.addEventListener('monacoLoaded', registerSCSLanguage);
})();
