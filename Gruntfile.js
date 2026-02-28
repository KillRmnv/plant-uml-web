
module.exports = function(grunt) {
    grunt.initConfig({
        copy: {
            scg: {
                files: [
                    // Основные JS файлы из client/static
                    {
                        expand: true,
                        cwd: 'external/sc-web/client/static/components/',
                        src: '**/*',
                        dest: 'static/'
                    },
                    // Дополнительные JS файлы из scg/src (command, listener и др.)
                    {
                        expand: true,
                        cwd: 'external/sc-web/components/scg/src/',
                        src: '*.js',
                        dest: 'static/components/js/scg/'
                    },
                    {
                        expand: true,
                        cwd: 'external/sc-web/components/scg/src/',
                        src: 'listener/**/*',
                        dest: 'static/components/js/scg/'
                    },
                    // Файлы команд (не копируются автоматически)
                    {
                        expand: true,
                        cwd: 'external/sc-web/components/scg/src/command/',
                        src: '*.js',
                        dest: 'static/components/js/scg/command/'
                    }
                ]
            },
            html: {
                files: [
                    // HTML панели
                    {
                        expand: true,
                        cwd: 'external/sc-web/components/scg/static/components/html/',
                        src: '*.html',
                        dest: 'static/components/html/'
                    }
                ]
            }
        },
        watch: {
            scg: {
                files: ['external/sc-web/**'],
                tasks: ['copy:scg', 'copy:html']
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.registerTask('build:scg', ['copy:scg', 'copy:html']);
    grunt.registerTask('watch:scg', ['watch:scg']);
};
