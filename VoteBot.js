var irc = require('slate-irc');
var net = require('net');
var fs = require('fs');
var moment = require('moment');

var HOST = 'localhost';
var PORT = 6667;
var PASS = 'SuperSecretPassHere';
var NICK = 'MovieVote';
var IDPW = 'MovieVotePass';
var CHAN = '#movie-talk';

var PREFIX = '!';
var BOTADM = 'anakata';

var votes = {}, votes_0 = '';
var voted = [], voted_0 = '';

var logJournal = {
  "votes": "votes.json",
  "voted": "voted.json",
  "lori": "lori-timestamp.log",
  "load": function (entry) {
    return JSON.parse(fs.readFileSync(entry));
  },
  "recover": function () {
    votes = this.load(this.votes);
    voted = this.load(this.voted);
  }
};

var commandlist = {
  "!help": "Show this message.",
  "!lori": "When was lori's last message? :P",
  "!pleasetellthem": "Please, tell them :3.",
  "!source": "I'll tell you where my source code is.",
  "!topic": "Show this channel's topic.",
  "!totalvotes": "Show current \x02Global\x0f votes.",
  "!unvote": "Recover your votes.",
  "!vote <something>": "Vote for \x02something\x0f.",
  "!votes <something>": "Show current votes for \x02something\x0f.",
  "!voteclean": "Clean current poll.",
  "!savejournal": "\x034ADMIN\x0f Update Journal files.",
  "!loadjournal": "\x034ADMIN\x0f Reload Journal files."
};

var stringify = JSON.stringify;

logJournal.recover();

var stream = net.connect({
  host: HOST,
  port: PORT
});

var client = irc(stream);

function cleanArray(arr) {
  var i = 0;
  for (i; i < arr.length; i++) {
    if (arr[i] === 0 || arr[i] === '' || arr[i] === null || arr[i] === undefined) {
      arr.splice(i, 1);
      i--;
    }
  }
  return arr;
}

function syncVotes(file, data, data_0, errmsg) {
  var dataString = stringify(data);
  fs.writeFile(file, dataString, function (err) {
    if (err) {
      console.error(errmsg);
      return;
    }
    data_0 = dataString;
  });
}

function syncVotesNow() {
  if (stringify(votes) != votes_0) {
    syncVotes(logJournal.votes, votes, votes_0, 'Couldn\'t save votes :/.');
  }

  if (stringify(voted) != voted_0) {
    syncVotes(logJournal.voted, voted, voted_0, 'Couldn\'t save the ones who voted :(.');
  }
}

function logger () {
  return function (irc) {
    irc.stream.pipe(process.stdout);
  }
}

client.use(logger());

client.pass(PASS);
client.nick(NICK);
client.user(NICK, NICK);

setTimeout(function () {
  client.send('NickServ', 'IDENTIFY ' + IDPW);

  client.join(CHAN);

  client.names(CHAN, function (err, names) {
    console.log(names);
  });


}, 4000);

setInterval(function () {
  syncVotesNow();
}, (10 * 60 * 1000));

client.on('message', function (msg) {
  if (msg.to[0] == '#') {
    var info = '';

    if (msg.message[0] == PREFIX) {
      switch (msg.message.split(' ')[0]) {
        case PREFIX+'vote':
          var username = msg.hostmask.username;
          var payload = msg.message.substr(6);
          votes[payload] = votes[payload] || [];

          if (voted.indexOf(username) == -1) {
            if (votes[payload].indexOf(username) == -1) {
              votes[payload].push(username);
              voted.push(username);
              info = msg.from + ' voted for ' + payload;
            } else {
              info = msg.from + ' already voted for ' + payload;
            }
          } else {
            info = 'Sorry ' + msg.from + ', but you consumed your votes. Now it\'s time to regret it :3\x0313 <3';
          }
          break;
        case PREFIX+'votes':
          var payload = msg.message.substr(7);
          var totalvotes = votes[payload] ? votes[payload].length : 0;

          info = 'Total votes for ' + payload + ' -> ' + totalvotes;
          break;
        case PREFIX+'totalvotes':
          var totalvotes = 0;
          var movies = [];

          client.send(msg.to, 'Total votes');

          for (var movie in votes) {
            movies.push(movie);

            var movievotes = votes[movie] ? votes[movie].length : 0;

            totalvotes += movievotes;
            client.send(msg.to, '    ' + movie + ' -> ' + movievotes);
          }

          info = 'Global -> ' + totalvotes;
          break;
        case PREFIX+'cleanvotes':
          votes = {};
          voted = [];

          info = 'Votes cleaned.';
          break;
        case PREFIX+'unvote':
          var username = msg.hostmask.username;
          var index = voted.indexOf(username);

          if (index != -1) {
            delete voted[index];
            for (var movie in votes) {
              var index = votes[movie].indexOf(username);

              if (index != -1) {
                delete votes[movie][index];
                cleanArray(votes[movie]);
                if (!votes[movie].length) {
                  delete votes[movie];
                }
              }
            }
            cleanArray(voted);
            info = msg.from + ', you\'ve recovered your votes. Have fun!';
          } else {
            info = msg.from + ', you already have your votes.';
          }
        break;
        case PREFIX+'topic':
          info = 'Not working atm sry thx\x0313 <3';
          break;
        case PREFIX+'lori':
          fs.readFile(logJournal.lori, function (err, data) {
            if (err) {
              console.error('There\'s no such a file.');
            }
            client.send(msg.to, data.toString());
          });
          break;
        case PREFIX+'help':
          client.send(msg.to, '========= HELP =========');

          for (var command in commandlist) {
            client.send(msg.to, command + ' || ' + commandlist[command]);
          }

          client.send(msg.to, '======= END HELP =======');
          break;
        case PREFIX+'source':
          info = '\x02https://github.com/karmakata/movie-talk-vote-bot\x034 <3';
          break;
        case PREFIX+'pleasetellthem':
          info = '\x02> Daily reminder that ' + msg.from + ' is a plebe.';
          break;
        case PREFIX+'savejournal':
          var username = msg.hostmask.username;

          if (username === BOTADM) {
            syncVotesNow();
            info = '\x02INFO:\x0310 Vote Journal Updated.';
          } else {
            info = '\x034' + msg.from + ', you\'re not a bot admin';
          }
          break;
        case PREFIX+'loadjournal':
          var username = msg.hostmask.username;

          if (username === BOTADM) {
            logJournal.recover();
            info = '\x02INFO\x0310 Vote Journal reloaded.'
          } else {
            info = '\x034' + msg.from + ', you\'re not a bot admin.';
          }
          break;
        default: info = 'Sorry ' + msg.from + ', I don\'t have that fucking command thx <3';
          break;
      }
      if (info) {
        client.send(msg.to, info);
      }
    } else {
      if (msg.from == 'lorimeyers') {
        fs.writeFile(logJournal.lori, moment.utc().format('MMMM Do HH:mm:ss'), function (err) {
          if (err) {
            console.error('There was an error trying to save this file.');
            return;
          }
          console.log('File saved!');
        });
      }
    }
  } else {
    client.send(msg.from, 'Please, vote publicly. Thanks <3');
  }
});
