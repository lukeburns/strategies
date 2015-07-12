var express = require('express');
var bodyParser = require('body-parser');
var repohash = require('repohash');
var api = require('./api');

var app = express();

var port = process.env.PORT || 8080;

// todo: authentication

var players = express.Router();
players.get('/', function (req, res, next) {
  api.getPlayers(function (err, players) {
    if (err) console.error(err);
    res.status(201).send(players);
  });
});
players.get('/:login', function (req, res, next) {
  api.getPlayer(req.params.login, function (err, player) {
    if (err) console.error(err);
    res.status(201).send(player);
  });
});
players.get('/:login/:repo', function (req, res, next) {
  // todo: generate hash based on strategy files from .strategies.yml file
  repohash(req.params.login, req.params.repo, { bearer: '7fd40bcda9ec84fdb08cb3de45568cf2772f3276' }, function (err, hash) {
    if (err) {
      res.send(err);
    } else {
      res.status(201).send(hash);
    }
  });
});

var strategies = express.Router();
strategies.get('/', function (req, res, next) {
  api.getStrategies(function (err, strategies) {
    if (err) console.error(err);
    res.status(201).send(strategies);
  })
});

// todo: github webhooks upon post
strategies.post('/', function (req, res, next) {
  var body = req.body;
  var login = body.login;
  body.wallet = JSON.parse(body.wallet);
  delete body.login;

  api.postStrategy(login, body, function (err, hash) {
    // todo:
    // - downloadStrategy -> git clone repo
    api.downloadStrategy(login, body.repo, function (err, path) {
      // todo:
      // - npm install
      // - write logs to repo then submit pull request
      // api.executeStrategy(hash, function (log) {
      //   console.log(log.stdout)
      //   console.log(log.stderr)
      //   res.json(log);
      // });
      res.json(path)
    });
  });
});

strategies.get('/:hash', function (req, res, next) {
  api.getStrategy(req.params.hash, function (err, val) {
    if (err) {
      res.status(404).send(err);
    } else {
      res.status(200).send(val);
    }
  });
});

strategies.get('/:hash/execute', function (req, res, next) {
  api.executeStrategy(req.params.hash, function (log) {
    console.log(log.stdout)
    console.log(log.stderr)
    res.json(log);
  });
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/strategies', strategies);
app.use('/players', players);

app.listen(port);
console.log('Magic happens on port ' + port);
