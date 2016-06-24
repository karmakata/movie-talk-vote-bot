var irc = require('slate-irc');
var net = require('net');
var fs = require('fs');
var moment = require('moment');

var HOST = 'localhost';
var PORT = 6667;
var PASS = 'YourPassHere';
var NICK = 'MovieVote';
var IDPW = 'MovieVoteBotPass';
var CHAN = '#movie-talk';

var votes = {};

var voted = [];

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
  "!voteclean": "Clean current poll."
};

var stream = net.connect({
  host: HOST,
  port: PORT
});

var client = irc(stream);

function logger () {
  return function (irc) {
    irc.stream.pipe(process.stdout);
  }
}

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

client.on('message', function (msg) {
  if (msg.to[0] == '#') {
    var info = '';

    if (msg.message[0] == '!') {
      switch (msg.message.split(' ')[0]) {
        case '!vote':
          var payload = msg.message.substr(6);
          votes[payload] = votes[payload] || [];

          if (voted.indexOf(msg.from) == -1) {
            if (votes[payload].indexOf(msg.from) == -1) {
              votes[payload].push(msg.from);
              voted.push(msg.from);
              info = msg.from + ' voted for ' + payload;
            } else {
              info = msg.from + ' already voted for ' + payload;
            }
          } else {
            info = 'Sorry ' + msg.from + ', but you consumed your votes. Now it\'s time to regret it :3\x0313 <3';
          }
          break;
        case '!votes':
          var payload = msg.message.substr(7);
          var totalvotes = votes[payload] ? votes[payload].length : 0;

          info = 'Total votes for ' + payload + ' -> ' + totalvotes;
          break;
        case '!totalvotes':
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
        case '!cleanvotes':
          votes = {};
          voted = [];

          info = 'Votes cleaned.';
          break;
        case '!unvote':
          delete voted[voted.indexOf(msg.from)];
          for (var movie in votes) {
            var index = votes[movie].indexOf(msg.from);

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
        break;
        case '!topic':
          info = 'Not working atm sry thx\x0313 <3';
          break;
        case '!lori':
          fs.readFile('lori-timestamp.log', function (err, data) {
            if (err) {
              console.error('There\'s no such a file.');
            }
            client.send(msg.to, data.toString());
          });
          break;
        case '!help':
          client.send(msg.to, '========= HELP =========');

          for (var command in commandlist) {
            client.send(msg.to, command + ' || ' + commandlist[command]);
          }

          client.send(msg.to, '======= END HELP =======');
          break;
        case '!source':
          info = '\x02https://github.com/karmakata/movie-talk-vote-bot\x034 <3';
          break;
        case '!pleasetellthem':
          info = '\x02> Daily reminder that ' + msg.from + ' is a plebe.';
          break;
        default: info = 'Sorry ' + msg.from + ', I don\'t have that fucking command thx <3';
          break;
      }
      if (info) {
        client.send(msg.to, info);
      }
    } else {
      if (msg.from == 'lorimeyers') {
        fs.writeFile('lori-timestamp.log', moment.utc().format('MMMM Do HH:mm:ss'), function (err) {
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
