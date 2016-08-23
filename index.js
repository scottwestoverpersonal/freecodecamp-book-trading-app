var express = require('express');
var assert = require('assert');
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;
var stormpath = require('express-stormpath');
var app = express();

var mongoURL = 'mongodb://heroku_qd2czt15:uefp27oepvc3v5ct1rtltmp63v@ds013456.mlab.com:13456/heroku_qd2czt15';

app.use(stormpath.init(app, {
  website: true,
    apiKey: {
      id: '78VXWXWDRKO8EJ0OVYA3GHUK3', 
      secret: '5ygJqmkiVZi3QSWQuTvbQt4DxB86FlupzbqWHtr89FM'
    },
 application: {
   href: 'https://api.stormpath.com/v1/applications/1alAxdEWIbqJRw3CVEychu',
 }
}));

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

// render the main index page
app.get('/', stormpath.getUser, function(request, response) {
  if (request.user) {
		response.render('pages/index', { user : request.user.email });
	}
	else {
		response.render('pages/index', { user : null });
	}
});

// update the users information in the database
app.get('/update', stormpath.loginRequired, function(req, res) {
  // update/create the record with the id of the button just clicked
  MongoClient.connect(mongoURL, function(err, db) {
    assert.equal(null, err);
  
    updateUsers(db, function() {
      updateBars(db, function() {
        db.close();
        res.redirect("/");
      }, req.query.id, req.query.total);
    }, req.user.email, req.query.id, req.query.go);
  });
});

// query the yelp api and user information from the database
app.get('/yelp', stormpath.getUser, function(request, response) {
    yelp.search({ term: 'bar', location: request.query.loc })
  .then(function (data) {
    // get the record for the current user if they are logged in
    if(request.user != undefined){
      MongoClient.connect(mongoURL, function(err, db) {
        assert.equal(null, err);
        findUser(db, function(records) {
          findBars(db, function(barRecords) {
            db.close();
            data['userChoices'] = records;
            data['dbBars'] = barRecords;
            response.json(data);
          });
        }, request.user.email);
      });
    }
    else {
        MongoClient.connect(mongoURL, function(err, db) {
          findBars(db, function(barRecords) {
            data['dbBars'] = barRecords;
            response.json(data);
          });
        });
    }
  })
  .catch(function (err) {
    response.json(data);
  });
});

app.on('stormpath.ready', function() {
  app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
  });
});

// update the user record in the database with the new bar information
var updateUsers = function(db, callback, userid, barid, going) {
  var tempObj = {};
  if(going == "true"){
    tempObj[barid] = true;
  }
  else {
    tempObj[barid] = false;
  }
   db.collection('users').updateOne(
      { "name" : userid },
      {
        $set: tempObj
      }, {upsert:true}, function(err, results) {
      //console.log(results);
      callback();
   });
};

// query the database to pull the user data
var findUser = function(db, callback, username) {
  var records = {};
   var cursor =db.collection('users').find( { "name": username } );
   cursor.each(function(err, doc) {
      assert.equal(err, null);
      if (doc != null) {
         //console.log(doc);
         records = doc;
      } else {
         callback(records);
      }
   });
};

// query the database to pull all of the bar data
var findBars = function(db, callback) {
  var records = {};
   var cursor =db.collection('bars').find();
   cursor.each(function(err, doc) {
      assert.equal(err, null);
      if (doc != null) {
         //console.log(doc);
         records[doc.name] = doc;
      } else {
         callback(records);
      }
   });
};

// update the bar recrod in the database with the number of people going
var updateBars = function(db, callback, barid, total) {
   db.collection('bars').updateOne(
      { "name" : barid },
      {
        $set: {"total" : parseInt(total)}
      }, {upsert:true}, function(err, results) {
      //console.log(results);
      callback();
   });
};


//  https://stark-basin-36303.herokuapp.com/
//  https://nodejs-fcc-scottwestover.c9users.io/