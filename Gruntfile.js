module.exports = function(grunt) {
    grunt.initConfig({
        copy: {
            scg: {
                files: [
                    {
                        expand: true,
                        cwd: 'external/sc-web/client/static/components/',
                        src: '**/*',
                        dest: 'static/'
                    }
                ]
            }
        },
        watch: {
            scg: {
                files: ['external/sc-web/**'],
                tasks: ['copy:scg']
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.registerTask('build:scg', ['copy:scg']);
    grunt.registerTask('watch:scg', ['watch:scg']);
};
