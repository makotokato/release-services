'use strict';

require('expose?$!expose?jQuery!jquery');
require('expose?Tether!tether');
require('bootstrap');
var Hawk = require('hawk');
require("./index.scss");

var backend_dashboard_url = process.env.NEO_DASHBOARD_URL || "http://localhost:5000";

var storage_key = 'shipit-credentials';

// Start the ELM application
var url = require('url');
var app = require('./Main.elm').Main.fullscreen({
  backend_dashboard_url: backend_dashboard_url
});

// Local storage ports
app.ports.localstorage_load.subscribe(function(){
  // Load credentials from local storage
  var user = null;
  try {
    user = JSON.parse(window.localStorage.getItem(storage_key));
    user = user.value || user;
  } catch (e) {
    console.warn('Loading user failed', e);
  }
  app.ports.localstorage_get.send(user);
});

app.ports.localstorage_remove.subscribe(function() {
  window.localStorage.removeItem(storage_key);
  app.ports.localstorage_get.send(null);
});

app.ports.localstorage_set.subscribe(function(user) {
  user = user ? user.value : null;
  window.localStorage.setItem(storage_key, JSON.stringify(user));
  app.ports.localstorage_get.send(user);
});

// HAWK auth
app.ports.hawk_build.subscribe(function(request){

  // Build optional cert
  var extData = null;
  if(request.certificate)
    extData = new Buffer(JSON.stringify({certificate: request.certificate})).toString('base64');

  // Generic payload for both headers
  var payload = {
    credentials: {
      id: request.id,
      key: request.key,
      algorithm: 'sha256'
    },
    ext: extData,
  };

  // Build backend & target (optional) headers
  var backend = Hawk.client.header(request.backend.url, request.backend.method, payload);
  var target = null;
  if(request.target)
    target = Hawk.client.header(request.target.url, request.target.method, payload);

  // Send back headers
  app.ports.hawk_get.send({
    workflowId : request.workflowId,
    header_backend : backend.field,
    header_target : target ? target.field : null,
  });
});

app.ports.redirect.subscribe(function(redirect) {
   var redirect_url = url.parse(redirect.url);
   if (redirect.target !== null) {
     var query = {};
     query[redirect.targetName] = url.format({
       protocol: window.location.protocol,
       host: window.location.host,
       port: window.location.port,
       pathname: redirect.target[0]
     });
     query['description'] = redirect.target[1];
     redirect_url = url.format(window.$.extend({}, redirect_url, {
      query: query,
     }));
   } else {
     redirect_url = url.format(redirect_url)
   }
   window.location = redirect_url;
});
