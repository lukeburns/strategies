var level = require('level');
var repohash = require('repohash');
var strategies = level('./strategies');
var players = level('./players');
var request = require('request');
var zlib = require('zlib');
var tar = require('tar-fs');
var gzip = require('gunzip-maybe');
var exec = require('child_process').exec;

module.exports = {
  getPlayers: getPlayers,
  getPlayer: getPlayer,
  putPlayer: putPlayer,
  getStrategies: getStrategies,
  getStrategy: getStrategy,
  postStrategy: postStrategy,
  putStrategy: putStrategy,
  delStrategy: delStrategy,
  downloadStrategy: downloadStrategy,
  executeStrategy: executeStrategy
}

function getPlayers (cb) {
  var plyrs = {},
      errors = [];

  players.createReadStream({ valueEncoding: 'json' })
  .on('data', function (data) {
    plyrs[data.key] = data.value;
  })
  .on('error', function (err) {
    console.error(err);
  })
  .on('end', function () {
    cb(errors, plyrs);
  })
}

function getPlayer (login, cb) {
  players.get(login, { valueEncoding: 'json' }, cb);
}

function putPlayer (login, info, cb) {
  players.put(login, info, { valueEncoding: 'json' }, cb);
}

function getStrategies (cb) {
  var strats = {},
      errors = [];

  strategies.createReadStream({ valueEncoding: 'json' })
  .on('data', function (data) {
    strats[data.key] = data.value;
  })
  .on('error', function (err) {
    console.error(err);
  })
  .on('end', function () {
    cb(errors, strats);
  })
}

function getStrategy (hash, cb) {
  strategies.get(hash, { valueEncoding: 'json' }, cb);
}

function postStrategy (login, info, cb) {
  var repo = info.repo;
  repohash(login, repo, { bearer: '7fd40bcda9ec84fdb08cb3de45568cf2772f3276' }, function (err, hash) {
    getPlayer(login, function (err, player) {
      if (!player || !player.strategies) {
        // new strategy for new player
        player = { strategies: {} };
        player.strategies[repo] = hash;
        putPlayer(login, player, function () {
          putStrategy(login, hash, info, function (err, res) {
            cb(err, hash, res);
          });
        });
      } else if (player.strategies[repo] !== hash) {
        // new strategy for existing player
        player.strategies[repo] = hash;
        delStrategy(login, repo, player.strategies[repo], function () {
          putPlayer(login, player, function () {
            putStrategy(login, hash, info, function (err, res) {
              cb(err, hash, res);
            });
          });
        });
      } else {
        // update strategy info for existing player
        putStrategy(login, hash, info, function (err, res) {
          cb(err, hash, res);
        });
      }
    });
  });
}

function putStrategy (login, hash, info, cb) {
  var repo = info.repo;

  // create new or update existing strategy
  strategies.get(hash, { valueEncoding: 'json' }, function (err, strategy) {
    var players = {};
    players[login] = info;

    if (!strategy) {
      // create strategy
      strategy = {
        players: players,
        repo: login+'/'+repo
      }
    } else {
      // put player
      strategy.players[login] = info;
    }

    // store
    strategies.put(hash, strategy, { valueEncoding: 'json' }, function (err, res) {
      cb(err, hash, res);
    });
  });
}

function delStrategy (login, repo, hash, cb) {
  repohash(login, repo, { bearer: '7fd40bcda9ec84fdb08cb3de45568cf2772f3276' }, function (err, newHash) {
    strategies.get(hash, { valueEncoding: 'json' }, function (err, strategy) {
      if (strategy && strategy.players[login]) {
        delete strategy.players[login];
        strategies.put(hash, strategy, { valueEncoding: 'json' }, function () {
          cb()
        });
      } else {
        cb('player '+ login +' not using this strategy')
      }
    });
  });
}

function executeStrategy (hash, cb) {
  getStrategy(hash, function (err, strategy) {
    console.log(strategy);
    if (strategy && strategy.players !== {}) {
      var player = strategy.repo.split('/')[0];
      exec('cd ./extractions/'+player+'/strategy-master; node index.js', { env: { game: JSON.stringify(strategy) } }, function (error, stdout, stderr) {
        var log = { error: error, stdout: stdout, stderr: stderr };
        // strategy.logs = strategy.logs || [];
        // strategy.logs.push(log);
        // strategies.put(hash, strategy, { valueEncoding: 'json' }, function () {
        //   cb(log);
        // });
        cb(log);
      });
    } else {
      cb(err);
    }
  });
}

function downloadStrategy (login, repo, cb) {
  var extract = tar.extract('./extractions/'+login);
  request('https://github.com/'+login+'/'+repo+'/archive/master.tar.gz').pipe(gzip()).pipe(extract);
  extract.on('error', function (err) {
    cb(err)
  });
  extract.on('finish', function () {
    cb(null, repo+'-master')
  });
  return extract;
}
