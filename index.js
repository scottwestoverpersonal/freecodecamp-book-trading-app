var express = require('express');
var assert = require('assert');
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;
var stormpath = require('express-stormpath');
var app = express();

var mongoURL = 'Your Mongo URL';

app.use(stormpath.init(app, {
  website: true,
    apiKey: {
      id: '', 
      secret: ''
    },
 application: {
   href: '',
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



// get all of the books in the database
app.get('/getBooks', function(req, res){
  MongoClient.connect(mongoURL, function(err, db) {
    assert.equal(null, err);
    findBooks(db, function(books) {
        db.close();
        res.json({"books":books});
    });
  });
});

// get all of the books in the database
app.get('/getBook', function(req, res){
  var bookID = req.param('bookid');
  MongoClient.connect(mongoURL, function(err, db) {
    assert.equal(null, err);
    findBook(db, function(book) {
        db.close();
        res.json({"book":book});
    }, bookID);
  });
});

// get a single book in the database

app.on('stormpath.ready', function() {
  app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
  });
});

// query the database to pull all of the books
var findBooks = function(db, callback) {
  var books = [];
  var cursor =db.collection('Books').find( );
  cursor.each(function(err, doc) {
    assert.equal(err, null);
    if (doc != null) {
      books.push(doc);
    } else {
      callback(books);
    }
  });
};

// query the database to pull a single book from the database
var findBook = function(db, callback, bookid) {
  var books = [];
  var obj_id = new ObjectId(bookid);
  var cursor = db.collection('Books').findOne({"_id":obj_id}, function(err, doc){
    callback(doc);
  });
};

//  https://stark-basin-36303.herokuapp.com/
//  https://nodejs-fcc-scottwestover.c9users.io/
// https://nodejs-fcc-scottwestover.c9users.io/getBook?bookid=58a11ee3f36d2837a7c70acb
/*
<html>
  <head>
    <title>Books API Example</title>
  </head>
  <body>
    <div id="content"></div>
    <script>
      function handleResponse(response) {
        console.log(response);
      for (var i = 0; i < response.items.length; i++) {
        var item = response.items[i];
        // in production code, item.text should have the HTML entities escaped.
        document.getElementById("content").innerHTML += "<br>" + item.volumeInfo.title;
      }
    }
    </script>
    <script src="https://www.googleapis.com/books/v1/volumes?q=harry+potter&callback=handleResponse"></script>
  </body>
</html>
*/