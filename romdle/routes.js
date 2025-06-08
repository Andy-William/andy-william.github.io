const express = require('express');
const bot = require('../lib/bot.js').bot;

module.exports = function(app){
  app.use('/romdle', express.static(__dirname + '/static/'));
  app.get('/romdle', (request, response) => {
    const ip = (request.headers['x-forwarded-for'] || request.connection.remoteAddress || '').split(',')[0].trim();
    console.log('romdle from ' + ip);
    response.sendFile(__dirname + '/romdle.html');
  });
  
  app.use('/duodle', express.static(__dirname + '/static/'));
  app.get('/duodle', (request, response) => {
    const ip = (request.headers['x-forwarded-for'] || request.connection.remoteAddress || '').split(',')[0].trim();
    console.log('duodle from ' + ip);
    response.sendFile(__dirname + '/duodle.html');
  });
}

