'use strict';

const config = require('config');
const Task = require('../models/task');
const log = require('log')();

const TutorialParser = require('../lib/tutorialParser');

const t = require('i18n');

const LANG = require('config').lang;

t.requirePhrase('tutorial.task', require('../locales/task/' + LANG + '.yml'));


/**
 * Can render many articles, keeping metadata
 * @constructor
 */
function TaskRenderer() {
}

TaskRenderer.prototype.renderContent = function* (task, options) {

  let parser = new TutorialParser(Object.assign({
    resourceWebRoot: task.getResourceWebRoot()
  }, options));

  const tokens = await parser.parse(task.content);

  let content = parser.render(tokens);

  content = await this.addContentPlunkLink(task, content);
  return content;
};


TaskRenderer.prototype.addContentPlunkLink = function*(task, content) {

  var sourcePlunk = await Plunk.findOne({webPath: task.getResourceWebRoot() + '/source'});

  if (sourcePlunk) {

    var files = sourcePlunk.files.toObject();
    var hasTest = false;
    for (var i = 0; i < files.length; i++) {
      if (files[i].filename == 'test.js') hasTest = true;
    }

    var title = hasTest ? t('tutorial.task.open_task.sandbox.tests') : t('tutorial.task.open_task.sandbox.no_tests');

    content += `<p><a href="${sourcePlunk.getUrl()}" target="_blank" data-plunk-id="${sourcePlunk.plunkId}">${title}</a></p>`;
  }

  return content;
};

TaskRenderer.prototype.render = function*(task, options) {

  this.content = await this.renderContent(task, options);
  this.solution = await this.renderSolution(task, options);

  return {
    content:  this.content,
    solution: this.solution
  };
};

TaskRenderer.prototype.renderWithCache = function*(task, options) {
  options = options || {};

  var useCache = !options.refreshCache && !process.env.TUTORIAL_EDIT;

  if (task.rendered && useCache) return task.rendered;

  var rendered = await this.render(task, options);

  task.rendered = rendered;

  await task.persist();

  return rendered;
};


TaskRenderer.prototype.renderSolution = function* (task, options) {

  let parser = new TutorialParser(Object.assign({
    resourceWebRoot: task.getResourceWebRoot()
  }, options));

  const tokens = await parser.parse(task.solution);

  const solutionParts = [];


  // if no #header at start
  // no parts, single solution
  if (tokens.length == 0 || tokens[0].type != 'heading_open') {
    let solution = parser.render(tokens);
    solution = await this.addSolutionPlunkLink(task, solution);
    return solution;
  }


  // otherwise, split into parts
  let currentPart;
  for (let idx = 0; idx < tokens.length; idx++) {
    let token = tokens[idx];
    if (token.type == 'heading_open') {

      let i = idx + 1;
      while (tokens[i].type != 'heading_close') i++;

      let headingTokens = tokens.slice(idx + 1, i);

      currentPart = {
        title: stripTags(parser.render(headingTokens)),
        content: []
      };
      solutionParts.push(currentPart);
      idx = i;
      continue;
    }

    currentPart.content.push(token);
  }

  for (let i = 0; i < solutionParts.length; i++) {
    var part = solutionParts[i];
    part.content = parser.render(part.content);
  }

  var solutionPartLast = solutionParts[solutionParts.length - 1];
  solutionParts[solutionParts.length - 1].content = await this.addSolutionPlunkLink(task, solutionPartLast.content);

  return solutionParts;
};

TaskRenderer.prototype.addSolutionPlunkLink = function*(task, solution) {

  var solutionPlunk = await Plunk.findOne({webPath: task.getResourceWebRoot() + '/solution'});

  if (solutionPlunk) {
    var files = solutionPlunk.files.toObject();
    var hasTest = false;
    for (var i = 0; i < files.length; i++) {
      if (files[i].filename == 'test.js') hasTest = true;
    }

    let title = hasTest ? t('tutorial.task.open_solution.sandbox.tests') : t('tutorial.task.open_solution.sandbox.no_tests');

    solution += `<p><a href="${solutionPlunk.getUrl()}" target="_blank" data-plunk-id="${solutionPlunk.plunkId}">${title}</a></p>`;
  }

  return solution;
};


TaskRenderer.regenerateCaches = function*() {
  var tasks = await Task.find({});

  for (var i = 0; i < tasks.length; i++) {
    var task = tasks[i];
    log.debug("regenerate task", task._id);
    await (new TaskRenderer()).renderWithCache(task, {refreshCache: true});
  }
};


function stripTags(text) {
  return text.replace(/<\/?[a-z].*?>/gim, '');
}

module.exports = TaskRenderer;
