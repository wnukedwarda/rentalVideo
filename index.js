var express = require("express"),
    bodyParser = require("body-parser"),
    async = require("async"),
    mongo = require("mongodb"),
    MongoClient = mongo.MongoClient,
    app = express(),
    dbUrl = "mongodb://grzegorzpietrzyk:Bejson321@cluster0-shard-00-00-ipc3u.mongodb.net:27017,cluster0-shard-00-01-ipc3u.mongodb.net:27017,cluster0-shard-00-02-ipc3u.mongodb.net:27017/videoRental?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin&retryWrites=true&w=majority";

app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());

var routes = {

    "/movies": "movies",
    "/actors": "actors",
    "/categories": "categories",
    "/rents": "rents",
    "/clients": "clients",

    "/movie/:id": "movies",
    "/actor/:id": "actors",
    "/category/:id": "categories",
    "/rent/:id": "rents",
    "/client/:id": "clients"

};

function handleError(res) {

    res.status(500);
    res.json({error: true});

}

function isValidId(id) {
    return true;

}

function createObjectId(id) {

    return new mongo.ObjectId(id);

}

function dbConnect(req, res, callback) {

    MongoClient.connect(dbUrl, function(err, db) {

        if(err) return handleError(res);

        callback(req, res, db);

    });

}

function createItem(req, res) {

    var colname = routes[req.route.path];

    if(colname === "rents") {
        req.body.date = new Date();
    }

    dbConnect(req, res, function(req, res, db) {

        db.collection(colname).insert(req.body, function(err, doc) {

            if(err) return handleError(res);

            res.json(doc[0]);

            db.close();

        });

    });

}

function getItem(req, res) {

    var id = req.params.id,
        isValid = isValidId(id),
        colname = routes[req.route.path];

    if(!isValid) return handleError(res);

    dbConnect(req, res, function(req, res, db) {

        db.collection(colname).find({_id: createObjectId(id)}).toArray(function(err, docs) {

            if(err) return handleError(res);

            res.json(docs[0]);

            db.close();

        });

    });

}

function updateItem(req, res) {

    var id = req.params.id,
        isValid = isValidId(id),
        colname = routes[req.route.path];

    if(!isValid) return handleError(res);

    dbConnect(req, res, function(req, res, db) {

        delete req.body._id;

        db.collection(colname).findAndModify({_id: createObjectId(id)}, {}, {$set: req.body}, {new: true}, function(err, doc) {

            if(err) return handleError(res);

            res.json(doc);

            db.close();

        });

   });

}

function removeItem(req, res) {

    var id = req.params.id,
        isValid = isValidId(id),
        colname = routes[req.route.path];

    if(!isValid) return handleError(res);

    dbConnect(req, res, function(req, res, db) {

        db.collection(colname).findAndRemove({_id: createObjectId(id)}, function(err, doc) {

            if(err) return handleError(res);

            res.json({deleted: true});

            db.close();

        });

    });

}

app.all("*", function(req, res, next) {

    res.format({

        json: function() {
            next();
        },

        html: function() {
            res.redirect("/");
        }

    });

});

app.get("/", function(req, res) {

    res.sendfile("index.html");

});

app.get("/movies", function(req, res) {

    var limit = req.query.limit,
        skip = req.query.skip,
        order = parseInt(req.query.order),
        name = req.query.name,
        regex = new RegExp(name, "ig");

    dbConnect(req, res, function(req, res, db) {
        console.error(res)

        db.collection("movies").find({title: regex}, {sort: {title: order || 1}}).toArray(function(err, docs) {
            console.error(docs)

            if(err) return handleError(res);

            res.json(docs);

            db.close();

        });

    });

});

app.get("/actors", function(req, res) {

    var limit = req.query.limit,
        skip = req.query.skip,
        order = parseInt(req.query.order),
        name = req.query.name,
        regex = new RegExp(name, "ig");

    dbConnect(req, res, function(req, res, db) {

        db.collection("actors").find({name: regex}, {sort: {name: order || 1}}).toArray(function(err, docs) {

            if(err) return handleError(res);

            res.json(docs);

            db.close();

        });

    });

});

app.get("/categories", function(req, res) {

    var order = parseInt(req.query.order),
        name = req.query.name,
        regex = new RegExp(name, "ig");

    dbConnect(req, res, function(req, res, db) {

        db.collection("categories").find({name: regex}, {sort: {name: order || 1}}).toArray(function(err, docs) {

            if(err) return handleError(res);

            res.json(docs);

            db.close();

        });

    });

});

app.get("/clients", function(req, res) {

    var limit = req.query.limit,
        skip = req.query.skip,
        order = parseInt(req.query.order),
        name = req.query.name,
        regex = new RegExp(name, "ig");

    dbConnect(req, res, function(req, res, db) {

        db.collection("clients").find({$or: [{first_name: regex}, {last_name: regex}]}, { sort: {first_name: order || 1}}).toArray(function(err, docs) {

            if(err) return handleError(res);

            docs.forEach(function(doc) {

                doc.name = doc.first_name + " " + doc.last_name;

                delete doc.first_name;
                delete doc.last_name;

            });

            res.json(docs);

            db.close();

        });

    });

});

app.get("/rents", function(req, res) {

    var limit = req.query.limit,
        order = parseInt(req.query.order),
        skip = req.query.skip,
        name = req.query.name,
        regex = new RegExp(name, "ig");

    dbConnect(req, res, function(req, res, db) {

        db.collection("rents").find({}, {    sort: {date: order || 1}}).toArray(function(err, docs) {

            if(err) return handleError(res);

            async.each(docs, function(doc, eachCallback) {

                async.parallel([
                    function(callback) {

                        db.collection("movies").findOne({_id: new mongo.ObjectId(doc.movie_id)}, {fields: {title: 1}}, function(err, movie) {

                            if(err) return handleError(res);

                            delete doc.movie_id;
                            doc.movie_title = movie.title;

                            callback();

                        });

                    },

                    function(callback) {

                        db.collection("clients").findOne({_id: new mongo.ObjectId(doc.client_id)}, {fields: {first_name: 1, last_name: 1}}, function(err, client) {

                            if(err) return handleError(res);

                            delete doc.client_id;
                            doc.client_name = client.first_name + " " + client.last_name;

                            callback();

                        });

                    }
                ], function(err) {

                    if(err) {
                        eachCallback(err);

                        return;
                    }

                    eachCallback();
                });

            }, function(err) {

                if(err) return handleError(res);

                var filteredDocs = docs.filter(function(doc) {

                    return doc.movie_title.match(regex);

                });

                res.json(filteredDocs);
                db.close();

            });

        });

    });

});

app.get("/movie/:id", function(req, res) {

    var id = req.params.id,
        isValid = isValidId(id);

    if(!isValid) return handleError(res);

    dbConnect(req, res, function(req, res, db) {

        db.collection("movies").find({_id: createObjectId(id)}).toArray(function(err, docs) {

            if(err) return handleError(res);

            var movie = docs[0];

            db.collection("rents").count({movie_id: id}, function(err, count) {

                if(err) return handleError(res);

                movie.rent_number = count;
                movie.available = count < movie.quantity;

                res.json(movie);

                db.close();

            });

        });

    });

});

app.get("/actor/:id", getItem);
app.get("/category/:id", getItem);
app.get("/client/:id", getItem);

app.get("/rent/:id", function(req, res) {

    var id = req.params.id,
        isValid = isValidId(id);

    if(!isValid) return handleError(res);

    dbConnect(req, res, function(req, res, db) {

        db.collection("rents").findOne({_id: createObjectId(id)}, function(err, doc) {

            if(err) return handleError(res);

            async.parallel([
                function(callback) {

                    db.collection("movies").findOne({_id: new mongo.ObjectId(doc.movie_id)}, {fields: {title: 1}}, function(err, movie) {

                        if(err) return handleError(res);

                        doc.movie_title = movie.title;

                        callback();

                    });

                },

                function(callback) {

                    db.collection("clients").findOne({_id: new mongo.ObjectId(doc.client_id)}, {fields: {first_name: 1, last_name: 1}}, function(err, client) {

                        if(err) return handleError(res);

                        doc.client_name = client.first_name + " " + client.last_name;

                        callback();

                    });

                }
            ], function(err) {

                if(err) return handleError(res);

                res.json(doc);
                db.close();

            });

        });

    });

});

app.put("/movie/:id", updateItem);
app.put("/actor/:id", updateItem);
app.put("/category/:id", updateItem);
app.put("/client/:id", updateItem);
app.put("/rent/:id", updateItem);

app.post("/movies", createItem);
app.post("/actors", createItem);
app.post("/categories", createItem);
app.post("/clients", createItem);
app.post("/rents", createItem);

app.delete("/movie/:id", removeItem);
app.delete("/actor/:id", removeItem);
app.delete("/category/:id", removeItem);
app.delete("/client/:id", removeItem);
app.delete("/rent/:id", removeItem);

app.get("/info/:colname", function(req, res) {

    var availableNames = ["movies", "actors", "categories", "rents", "clients"],
        colname = req.params.colname,
        name = req.query.name,
        regex = new RegExp(name, "ig"),
        fields = [
            {first_name: regex},
            {last_name: regex},
            {title: regex},
            {name: regex}
        ];

    if(availableNames.indexOf(colname) === -1) return handleError(res);

    dbConnect(req, res, function(req, res, db) {

        if(colname === "rents") {

            db.collection("rents").find({}).toArray(function(err, docs) {

                var count = 0;

                async.each(docs, function(doc, callback) {

                    var rent = doc;

                    db.collection("movies").findOne({_id: new mongo.ObjectId(rent.movie_id)}, {fields: {title: 1}}, function(err, doc) {

                        if(err) {
                            callback(err);

                            return;
                        }

                        if(doc.title.match(regex)) {
                            count++;
                        }

                        callback();

                        return;

                    });

                },
                function(err) {

                    if(err) return handleError(res);

                    res.status(200);
                    res.set("Content-Type", "text/plain");
                    res.send(String(count));

                    db.close();

                });

            });

        } else {

            db.collection(colname).count({$or: fields}, function(err, count) {

                if(err) return handleError(res);

                res.status(200);
                res.set("Content-Type", "text/plain");
                res.send(String(count));

                db.close();

            });

        }

    });

});

app.use(function (req, res, next){
    if (req.headers['x-forwarded-proto'] === 'https') {
      res.redirect('http://' + req.hostname + req.url);
    } else {
      next();
    }
  });

app.listen(process.env.PORT || 8000, function() {
    console.log("Serwer aktywny!");
});