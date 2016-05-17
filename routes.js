var User = require('./users.js');
var mongo = require('mongodb');
//var configAuth = require('./auth.js') ttaco

require('./passport.js');
module.exports = function(app, passport) {

    app.get('/', function(req, res) {
        res.render('index.ejs', {
            user: req.user
        });
    });
    app.get('/newpoll', isLoggedIn, function(req, res) {
        //get poll number
        res.render('newpoll.ejs', {
            user: req.user
        });
    });
    app.get('/newpollsucess', isLoggedIn, function(req, res) {
        //get poll number
        res.render('newpollsucess.ejs', {
            user: req.user
        });
    });

    app.post('/newpoll/submit/', isLoggedIn, function(req, res) {
        mongo.connect(process.env.MONGOLAB_URI, function(err, db) {
            db.collection("VoteApp").findOne({
                countOfPolls: {
                    $gt: 0
                }
            }, {
                _id: 0
            }, function(err, pollNumber) {
                console.log(pollNumber.countOfPolls);
                elementsArray = req.body.elements;
                var breakTheElementsApartIntoArray = elementsArray.split(",");
                var mongoPoll = {};
                for (var i = 0, len = breakTheElementsApartIntoArray.length; i < len; i++) {
                    mongoPoll[breakTheElementsApartIntoArray[i].trim()] = 0;
                }
                db.collection("VoteApp").insert({
                    username: req.user.facebook.name,
                    title: req.body.title,
                    poll: mongoPoll,
                    pollID: pollNumber.countOfPolls + 1
                });
                db.collection("VoteApp").updateOne({
                    "countOfPolls": {
                        $gt: 0
                    }
                }, {
                    $inc: {
                        "countOfPolls": 1
                    }
                });
                res.render('newpollsucess.ejs', {
                    user: req.user,
                    pollNum: pollNumber.countOfPolls + 1
                });
            });
        });
    });

    app.post('/pollVote/', function(req, res) {
      console.log("pollVote");
        var breakApart = req.body.Item;
        breakApart = breakApart.split("|");
        var pollb = parseInt(breakApart[1]);
        var vote = breakApart[0];
        //console.log(req.body);

        mongo.connect(process.env.MONGOLAB_URI, function(err, db) {
            console.log(pollb + " " + vote);
            var ip = req.ip.split(":");
            ip = ip[3];
            db.collection("VoteApp").updateOne({
                "pollID": pollb
            }, {
                $inc: {
                    ["poll." + vote]: 1
                }
            }, function(err) {
                if (err) {
                    throw err;
                } else {
                    console.log("sucess");
                }
            });
            db.collection('voters').insert({"ip" : ip , "poll" : pollb} );
            db.collection("VoteApp").findOne({
                "pollID": pollb
            }, {
                _id: 0
            }, function(err, polldata) {
                if (err || polldata === undefined || polldata === null) {
                    res.render('noPoll.ejs', {
                        user: req.user,
                    });
                    return;
                } else {
                    res.redirect(301, '/poll/' + pollb);
                }
            });

        });
    });

    app.get('/managepolls/', isLoggedIn, function(req, res) {
        //get poll number
        res.render('managepolls.ejs', {
            user: req.user
        });
    });
    // /poll is where you can view a poll
    app.get('/poll/*', function(req, res) {
        //get poll number
        var vote = false;
        var ip = req.ip.split(":");
        ip = ip[3];
        console.log(ip);
        var pollNum = parseInt(req.params[0]);
        mongo.connect(process.env.MONGOLAB_URI, function(err, db) {
            db.collection('voters').findOne({
                'ip': ip,
                "poll": pollNum
            }, {
                _id: 0
            }, function(err, dataset) {
                db.collection("VoteApp").findOne({
                    "pollID": pollNum
                }, {
                    _id: 0
                }, function(err, polldata) {
                    if (err || polldata === undefined || polldata === null) {
                        res.render('noPoll.ejs', {
                            user: req.user,
                        });
                        return;
                    } else {
                        if (dataset === null) {

                            res.render('poll.ejs', {
                                user: req.user,
                                polldata: polldata,
                                votedata: false
                            });
                        } else {
                            var result = [];
                            console.log(polldata.poll);
                            for(var i in polldata.poll)
result.push([i, polldata.poll [i]]);
console.log(result);
                            res.render('poll.ejs', {
                                user: req.user,
                                polldata: polldata,
                                votedata: true,
                                chartData: result
                            });
                        }
                    }
                });
            });
        });
    });

    // /pollmanage is where a user can edit their poll
    app.get('/pollmanage', isLoggedIn, function(req, res) {
        //get poll number
        res.render('managepolls.ejs', {
            user: req.user
        });
    });

    app.get('/profile', isLoggedIn, function(req, res) {
        res.render('profile.ejs', {
            user: req.user
        });
    });

    app.get('/auth/facebook', passport.authenticate('facebook'));

    app.get('/auth/facebook/callback',
        passport.authenticate('facebook', {
            successRedirect: '/profile',
            failureRedirect: '/'
        }));

    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });

};

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }

    res.redirect('/');
}
