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
app.use(require('body-parser').urlencoded({ extended: true }));

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

// render the add book page
app.get('/addBook', stormpath.getUser, function(request, response) {
	response.render('pages/addBook', { user : request.user.email });
});

// render the my trades page
app.get('/myTrades', stormpath.loginRequired, function(request, response) {
   response.render('pages/myTrades', { user : request.user.email });
});

app.post('/getMyTrades', function(request, response) {
  MongoClient.connect(mongoURL, function(err, db) {
    assert.equal(null, err);
    findUserTrades(db, function(trades) {
      db.close();
      response.json({"trades":trades});
    }, request.body.email);
  });
});

app.post('/getRequestedTrades', function(request, response) {
  MongoClient.connect(mongoURL, function(err, db) {
    assert.equal(null, err);
    findRequestedTrades(db, function(trades) {
      db.close();
      response.json({"trades":trades});
    }, request.body.email);
  });
});

// add book to database
app.post('/addBook', function(request, response){
  MongoClient.connect(mongoURL, function(err, db) {
    assert.equal(null, err);
    insertDocument(db, function() {
        db.close();
        response.json({"data":"Added book"});
    }, request.body.image, request.body.name, request.body.url, request.body.user );
  });
});

// add trade to database
app.post('/addTrade', function(request, response){
  MongoClient.connect(mongoURL, function(err, db) {
    assert.equal(null, err);
    insertDocument2(db, function() {
        db.close();
        response.json({"data":"Added Trade"});
    }, request.body.image, request.body.bookid, request.body.targetUser, request.body.user );
  });
});

// update trade status
app.get('/updateTrade', function(request, response){
  var id = request.query.id;
  var status = request.query.status;
  MongoClient.connect(mongoURL, function(err, db) {
    assert.equal(null, err);
    updateStatus(db, function() {
        db.close();
        response.redirect("/myTrades");
    }, id, status );
  });
});

// render the settings page
app.get('/myInfo', stormpath.loginRequired, function(request, response) {
  request.user.getCustomData(function(err, data) {
    response.render('pages/settings', { firstName : request.user.givenName, custom : data, lastName: request.user.surname });
  });
});

app.post('/updateInfo', stormpath.loginRequired, function(request, response) {
	request.user.getCustomData(function(err, data) {
    data.city = request.body.city;
    data.state = request.body.state;
    // Calling data.save() will persist your changes.
    data.save(function() {
      request.user.givenName = request.body.firstname;
      request.user.surname = request.body.lastname;
      request.user.save();
      response.redirect("/myInfo?updated=true");
    });
  });
});

// render the my books page
app.get('/myBooks', stormpath.loginRequired, function(request, response) {
  MongoClient.connect(mongoURL, function(err, db) {
    assert.equal(null, err);
    findUserBooks(db, function(books) {
      db.close();
      response.render('pages/myBooks', { user : request.user.email, books: books });
    }, request.user.email);
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

// get a single book in the database
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

// delete book
app.get('/deleteBook', function(req, res){
    var id = req.query.id;
    MongoClient.connect(mongoURL, function(err, db) {
      assert.equal(null, err);
      deleteBooks(db, function() {
          db.close();
          res.redirect("/myBooks");
      }, id);
    });
});

// delete trade
app.get('/deleteTrade', function(req, res){
    var id = req.query.id;
    MongoClient.connect(mongoURL, function(err, db) {
      assert.equal(null, err);
      deleteTrades(db, function() {
          db.close();
          res.redirect("/myTrades");
      }, id);
    });
});

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

// query the database to pull all of the books for an user
var findUserBooks = function(db, callback, username) {
  var books = [];
  var cursor = db.collection('Books').find( { "user": username } );
  cursor.each(function(err, doc) {
    assert.equal(err, null);
    if (doc != null) {
       books.push(doc);
    } else {
       callback(books);
    }
  });
};

// query the database to pull trades for this username
var findUserTrades = function(db, callback, username) {
  var trades = [];
  var cursor = db.collection('Trades').find( { "user": username } );
  cursor.each(function(err, doc) {
    assert.equal(err, null);
    if (doc != null) {
       trades.push(doc);
    } else {
       callback(trades);
    }
  });
};

var findRequestedTrades = function(db, callback, username) {
  var trades = [];
  var cursor = db.collection('Trades').find( { "targetUser": username } );
  cursor.each(function(err, doc) {
    assert.equal(err, null);
    if (doc != null) {
       trades.push(doc);
    } else {
       callback(trades);
    }
  });
};

// insert a book into the book database
var insertDocument = function(db, callback, image, name, url, username) {
  console.log(username);
   db.collection('Books').insertOne( {
     "user" : username,
     "url" : url,
     "name" : name,
     "image" : image
   }, function(err, result) {
    assert.equal(err, null);
    callback();
  });
};

// insert a trade into the trade database
var insertDocument2 = function(db, callback, image, bookid, targetUser, username) {
  console.log(username);
   db.collection('Trades').insertOne( {
     "user" : username,
     "status" : "pending",
     "book" : bookid,
     "targetUser" : targetUser,
     "image" : image
   }, function(err, result) {
    assert.equal(err, null);
    callback();
  });
};

// delete a book from the database
var deleteBooks = function(db, callback, id) {
   db.collection('Books').deleteMany(
      {_id: new ObjectId(id)},
      function(err, results) {
         //console.log(results);
         callback();
      }
   );
};

// delete a trade from the database
var deleteTrades = function(db, callback, id) {
   db.collection('Trades').deleteMany(
      {_id: new ObjectId(id)},
      function(err, results) {
         //console.log(results);
         callback();
      }
   );
};

// update the record
var updateStatus = function(db, callback, id, status) {
   db.collection('Trades').updateOne(
      {_id: new ObjectId(id)},
      {
        $set: {"status" : status}
      }, {upsert:true}, function(err, results) {
      //console.log(results);
      callback();
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