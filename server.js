var express = require('express');
var session = require('cookie-session');
var bodyParser = require('body-parser');
var app = express();
var fs = require('fs');
var formidable = require('formidable');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectID = require('mongodb').ObjectID;

var mongourl = 'mongodb://g1192738:_Bblove630244@ds149672.mlab.com:49672/g1192738';

app.set('view engine', 'ejs');


var users = new Array({
  userid: 'developer',
  password: 'developer'
},{
  userid: 'demo',
  password: 'demo'
},
 {
  userid: 'guest',
  password: 'guest'
}, {
  userid: 'student',
  password: 'student'
}

);


app.use(session({
  name: 'session',
  keys: ['userid', 'authenticated']
}));
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(bodyParser.json());

app.get('/', function (req, res) {
  console.log(req.session);
  if (!req.session.authenticated) {
    res.redirect('/login');
  } else {
    res.status(200);

  }
});

app.get('/login', function (req, res) {
  res.render('login');
});

app.post('/login', function (req, res) {
  for (var i = 0; i < users.length; i++) {
    if (users[i].userid == req.body.userid &&
      users[i].password == req.body.password) {
      req.session.authenticated = true;
      req.session.userid = users[i].userid;
      console.log(req.session);
      res.redirect('/display');
      return;
    }
  }

});


app.get('/display', function (req, res) {
  if (req.session.authenticated == true) {
    MongoClient.connect(mongourl, function (err, db) {
      try {
        assert.equal(err, null);
      } catch (err) {
        res.set({
          "Content-Type": "text/plain"
        });
        res.status(500).end("MongoClient connect() failed!");
      }
      console.log('Connected to MongoDB');
      findPhoto(db, {}, function (restaurants) {
        db.close();
        console.log('Disconnected MongoDB');
        res.render("list.ejs", {
          restaurants: restaurants
        });
      });
    });
  }
});


app.get('/logout', function (req, res) {
  req.session = null;
  console.log('logout successfully!');
  res.redirect('/');
});

app.get('/create', function (req, res) {

  res.render('create');

});

app.post('/create', function (req, res) {
  var form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {
    var filename = files.filetoupload.path;
    if (files.filetoupload.type) {
      var mimetype = files.filetoupload.type;
    }
    fs.readFile(filename, function (err, data) {
      MongoClient.connect(mongourl, function (err, db) {
        var new_r = {}; // document to be inserted
        new_r['restaurant_id'] = fields.restaurant_id;
        new_r['name'] = fields.name;
        new_r['borough'] = fields.borough;
        new_r['cuisine'] = fields.cuisine;
        if (data) {
          new_r['photo'] = new Buffer(data).toString('base64');
          new_r['photo_mimetype'] = files.filetoupload.type;
        }
        new_r['address'] = {
          street: fields.street,
          building: fields.building,
          zipcode: fields.zipcode,
          coord: [fields.lat, fields.lon]
        };
        new_r['grades'] = [{
          user: fields.user,
          score: fields.score
        }];
        new_r['owner'] = req.session.userid;


        assert.equal(err, null);
        console.log('Connected to MongoDB\n');
        insertDocument(db, new_r, function (result) {
          db.close();
          req.session.userid = fields.userid;
        });
      });
    });
    res.redirect('/display');
    return;
  });

});

app.get('/rate', function (req, res) {
  res.render('rate.ejs', {
    _id: req.query._id
  });
});

app.post('/rate', function (req, res) {
  var form = new formidable.IncomingForm();
  form.parse(req, function (err, fields) {
    MongoClient.connect(mongourl, function (err, db) {
      var new_b = {}; // document to be rated
      new_b['score'] = fields.scores;
      new_b['user'] = req.session.userid;

      assert.equal(err, null);
      console.log('Rate POST Connected to MongoDB\n');
      ratingDocument(db, {
        data: new_b,
        id: fields._id
      }, function (result) {
        db.close();
      });
    });

  });
  res.redirect('/display');
  return;
});

app.get('/edit', function (req, res) {
  console.log(JSON.stringify(req.query));
  res.render('edit.ejs', {
    _id: req.query._id
  });
});


app.post('/edit', function (req, res) {
  console.log('About to update ');
  var form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {
    console.log("Receive data:" + JSON.stringify(fields));
    console.log("Receive data files:" + JSON.stringify(files));
    MongoClient.connect(mongourl, function (err, db) {
      assert.equal(err, null);
      console.log('Connected to MongoDB\n');
      var criteria = {};
      criteria['restaurant_id'] = fields._id;
      var newValues = {};
      if (files.filetoupload.type) {
        var mimetype = files.filetoupload.type;
        newValues['mimetype'] = mimetype;
      }
      fs.readFile(files.filetoupload.path, function (err, data) {
        assert.equal(err, null);
        let photo = new Buffer(data).toString('base64');
        console.log("filetoupload mimetype: " + mimetype);
        console.log("filetoupload: " + JSON.stringify(photo + "\n"))
        newValues['photo'] = photo;


        var address = {};
        for (var key in fields) {
          if (key == "_id") {
            continue;
          }
          switch (key) {
            case 'restaurant_id':
              newValues[key] = fields[key];
              break;
            case 'name':
              newValues[key] = fields[key];
              break;
            case 'borough':
              newValues[key] = fields[key];
              break;
            case 'cuisine':
              newValues[key] = fields[key];
              break;
            case 'street':
              newValues[key] = fields[key];
              address[key] = fields[key];
              break;
            case 'building':
              newValues[key] = fields[key];
              address[key] = fields[key];
              break;
            case 'zipcode':
              newValues[key] = fields[key];
              address[key] = fields[key];
              break;
            case 'lat':
              newValues[key] = fields[key];
              address[key] = fields[key];
              break;
            case 'lon':
              newValues[key] = fields[key];
              address[key] = fields[key];
              break;
            case 'user':
              newValues[key] = fields[key];
              break;
            case 'score':
              // newValues[key] = fields[key];
              db.collection('restaurants').updateOne(
                criteria, {
                  $push: {
                    'grades': {
                      user: req.session.userid,
                      score: fields[key]
                    }
                  }
                },
                function (err, result) {
                  assert.equal(err, null);
                  console.log("update was successfully");
                  console.log(result);
                });
              break;
            case 'owner':
              newValues[key] = fields[key]
              break;
              // case 'filetoupload':
              //   //newValues[key] = req.body[key];

              //   break;
            default:
              newValues[key] = fields[key];
              break;
          }
        }
        if (address.lenght > 0) {
          newValues['address'] = address;
        }
        if (Object.keys(newValues).length < 1) {
          return;
        }
        console.log('Preparing update: ' + JSON.stringify(newValues));
        console.log("Criteria: " + JSON.stringify(criteria));
        updateDocument(db, criteria, newValues, function (result) {
          db.close();
        });
      });
      res.redirect('/display');
      return;
    });
  });
});
app.get('/show', function (req, res) {
  MongoClient.connect(mongourl, function (err, db) {
    try {
      assert.equal(err, null);
    } catch (err) {
      res.set({
        "Content-Type": "text/plain"
      });
      res.status(500).end("MongoClient connect() failed!");
    }
    console.log('Connected to MongoDB');
    var criteria = {};
    criteria['_id'] = ObjectID(req.query._id);
db.collection ('restaurants').findOne(criteria, function (err, result) {
      db.close();
      console.log(result);


if (req.session.userid != result.owner){

	res.end("you are not the owner") ;} else{

    var image = new Buffer(result.photo, 'base64');
          var contentType = {};
          contentType['Content-Type'] = result.photo_mimetype;
          console.log(contentType['Content-Type']);


  res.render('photo.ejs', {
          result: result
        });

      }
  //    console.log('Disconnected MongoDB');
  //    console.log('Photo returned = ' + JSON.stringify(photo));




  });
  });
});






app.get('/remove', function(req,res) {

  MongoClient.connect(mongourl, function(err,db) {
    try {
      assert.equal(err,null);
    } catch (err) {
      res.set({"Content-Type":"text/plain"});
      res.status(500).end("MongoClient connect() failed!");
    }
    console.log('Connected to MongoDB');
    var criteria = {};
    criteria['_id'] = ObjectID(req.query._id);
    removeDocument(db,criteria, function(photo) {
      db.close();

      });

 res.redirect('/display'); return;

  });
});

app.get('/api/restaurant/read/name/:rname',function(req,res){
  var criteria = {};
  criteria['name'] = req.params.rname;
  MongoClient.connect(mongourl, function(err, db) {
    assert.equal(err,null);
    console.log('Connected to MongoDB\n');
    db.collection('restaurants').findOne(criteria, function(err, result) {
    if(result == null){
      res.status(200).json({}).end();
    }else {
      console.log(result);
      res.status(200).json(result).end();
    }
    });
    db.close();
  });
});

app.get('/api/restaurant/read/borough/:borough',function(req,res){
  var criteria = {};
  criteria['borough'] = req.params.borough;
  MongoClient.connect(mongourl, function(err, db) {
    assert.equal(err,null);
    console.log('Connected to MongoDB\n');
    showBorough(db, criteria, function(restaurant){
      res.render("searchResult.ejs",{restaurant:restaurant});
    db.close();
  });
  });
});

app.get('/api/restaurant/read/cuisine/:cuisine',function(req,res){
  var criteria = {};
  criteria['cuisine'] = req.params.cuisine;
  MongoClient.connect(mongourl, function(err, db) {
    assert.equal(err,null);
    console.log('Connected to MongoDB\n');
    showCuisine(db, criteria, function(restaurant){
      res.render("searchResult.ejs",{restaurant:restaurant});
    db.close();
  });
  });
});

app.get('*', function (req, res) {
  res.redirect('/login');
});

function showBorough(db, c,callback){
  var restaurant = [];
  cursor = db.collection('restaurants').find(c);
  cursor.each(function(err, doc) {
		assert.equal(err, null);
		if (doc != null) {
			restaurant.push(doc);
		} else {
			console.log("find restaurant done");
			callback(restaurant);
		}
  });
}


function insertDocument(db, r, callback) {
  db.collection('restaurants').insertOne(r, function (err, result) {
    assert.equal(err, null);
    console.log("insert was successful!");
    console.log(result);
    callback(result);
  });
}

function ratingDocument(db, b, callback) {
  console.log("Rating Document get data: " + JSON.stringify(b) + "\n");
  db.collection('restaurants').find({
    'grades.user': b.data.user,
    'restaurant_id': b.id
  }).toArray(function (result) {
    console.log("Rating Document: " + JSON.stringify(result) + "\n");
    if (result) {
      return;
    } else {
      db.collection('restaurants').updateOne({
        'restaurant_id': b.id
      }, {
        $push: {
          "grades": b.data
        }
      }, function (err, results) {
        assert.equal(err, null);
        console.log("Rating Document Update: " + JSON.stringify(results) + "\n");
      });
    }
  });
}

function updateDocument(db, criteria, newValues, callback) {
  db.collection('restaurants').updateOne(
    criteria, {
      $set: newValues
    },
    function (err, result) {
      assert.equal(err, null);
      console.log("update was successfully");
      console.log(result);
      callback(result);
    });
}

function findPhoto(db, criteria, callback) {
  var cursor = db.collection("restaurants").find(criteria);
  var photos = [];
  cursor.each(function (err, doc) {
    assert.equal(err, null);
    if (doc != null) {
      photos.push(doc);
    } else {
      callback(photos);
    }
  });
}



function removeDocument(db,criteria,callback) {
  db.collection('restaurants').remove(criteria,function(err,result) {
    assert.equal(err,null);
    console.log("remove successful!");
    console.log(result);
    callback(result);
  });
}

app.listen(process.env.PORT || 8099);
