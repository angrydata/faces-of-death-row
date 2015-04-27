/* global -$ */
'use strict';

var fs = require('fs');

var gulp = require('gulp');
var $ = require('gulp-load-plugins')({
  rename: {
    'gulp-ruby-sass': 'sass'
  }
});
var runSequence = require('run-sequence');
var del = require('del');

var browserSync = require('browser-sync');
var reload = browserSync.reload;

gulp.task('jshint', function() {
  return gulp.src(['app/scripts/**/*.js', '!app/scripts/libs/**/*.js'])
    .pipe($.jshint())
    .pipe($.jshint.reporter('jshint-stylish'))
    .pipe($.if(!browserSync.active, $.jshint.reporter('fail')));
});

gulp.task('scripts', ['jshint'], function() {
  return gulp.src([
      'node_modules/jquery/dist/jquery.js',
      'scripts/libs/jquery-ui-1.10.2.custom.min.js',
      'scripts/libs/filter.js',
      'app/scripts/**/*.js'
    ])
    .pipe($.concat('bundle.js', {newLine: ';'}))
    .pipe(gulp.dest('.tmp/scripts'))
    .pipe($.uglify())
    .pipe($.gzip({append: false}))
    .pipe(gulp.dest('dist/scripts'))
    .pipe($.size({title: 'scripts'}));
});

gulp.task('styles', function () {
  return $.sass('app/styles/', {
    loadPath: ['.'],
    precision: 10,
    sourcemap: true
  })
  .on('error', function(err) {
    console.error('Error', err.message);
  })
  .pipe($.autoprefixer({browsers: ['last 2 versions', 'IE 9', 'IE 8']}))
  .pipe($.sourcemaps.write())
  .pipe(gulp.dest('.tmp/styles'))
  .pipe($.if('*.css', reload({stream: true})))
  .pipe($.if('*.css', $.csso()))
  .pipe(gulp.dest('dist/styles'))
  .pipe($.size({title: 'styles'}));
});

gulp.task('templates', function() {
  var nunjucks = require('nunjucks');
  var map = require('vinyl-map');

  var data = JSON.parse(fs.readFileSync('data.json', 'utf8'));

  // pulls over the bucket and slug data for the preview page
  var packageData = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  data.SITE = packageData.config;

  // disable watching or it'll hang forever
  var env = nunjucks.configure('app', {watch: false});

  env.addFilter('json', function(obj) {
    return JSON.stringify(obj);
  });

  var nunjuckified = map(function(code, filename) {
    return env.renderString(code.toString(), data);
  });

  return gulp.src(['app/**/{*,!_*}.html', '!app/**/_*.html'])
    .pipe(nunjuckified)
    .pipe(gulp.dest('.tmp'))
    .pipe($.minifyHtml())
    .pipe(gulp.dest('dist'))
    .pipe($.size({title: 'html'}));
});

gulp.task('images', function() {
  return gulp.src('app/assets/images/**/*')
  .pipe($.cache($.imagemin({
    progressive: true,
    interlaced: true
  })))
  .pipe(gulp.dest('dist/assets/images'))
  .pipe($.size({title: 'images'}));
});

gulp.task('assets', function() {
  return gulp.src(['app/assets/*', '!app/assets/images/'])
  .pipe(gulp.dest('dist/assets'))
  .pipe($.size({title: 'assets'}));
});

gulp.task('clean', function() {
  del(['.tmp', 'dist/*', '!dist/.git'], {dot: true});
});

gulp.task('serve', ['styles', 'jshint', 'templates'], function() {
  browserSync({
    notify: false,
    logConnections: true,
    logPrefix: 'NEWSAPPS',
    open: false,
    server: {
      baseDir: ['.tmp', 'app'],
      routes: {
        '/bower_components': 'bower_components',
        '/node_modules': 'node_modules'
      }
    }
  });

  gulp.watch(['app/**/*.html'], ['templates', reload]);
  gulp.watch(['data.json'], ['templates', reload]);
  gulp.watch(['app/styles/**/*.scss'], ['styles']);
  gulp.watch(['app/scripts/**/*.js'], ['jshint']);
  gulp.watch(['app/images/**/*'], reload);
  gulp.watch(['app/fonts/**/*'], reload);
});

gulp.task('serve:build', ['default'], function() {
  browserSync({
    notify: false,
    logConnections: true,
    logPrefix: 'NEWSAPPS',
    open: true,
    server: ['dist']
  });
});

gulp.task('default', ['clean'], function(cb) {
  runSequence(['styles', 'scripts', 'templates', 'images', 'assets'], cb);
});

gulp.task('build', ['default']);
