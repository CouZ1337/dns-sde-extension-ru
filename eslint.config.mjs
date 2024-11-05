import globals from "globals";
import pluginJs from "@eslint/js";
import stylisticJs from '@stylistic/eslint-plugin-js'

export default [
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                chrome: 'readonly',
            },
        },
        plugins: {
            '@stylistic/js': stylisticJs,
        },
        rules: {
            indent: [
                'error',
                4,
                {
                    SwitchCase: 1,
                    ignoreComments: false,
                },
            ],
            '@stylistic/js/indent': ['error', 4],
            'max-len': ['error', {
                code: 120,
                comments: 120,
                tabWidth: 4,
                ignoreUrls: true,
            }],
        }
    },
    pluginJs.configs.recommended,
];
