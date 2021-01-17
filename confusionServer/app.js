var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

// importing express-session/ file-store
const session = require("express-session");
const FileStore = require("session-file-store")(session);

// import mongoose odm
const mongoose = require("mongoose");

// import router handlers
var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
var dishRouter = require("./routes/dishRouter");

// models schema
const Dishes = require("./models/dishes");

// connect to the mongodb server
const url = "mongodb://localhost:27017/confusion";
const connect = mongoose.connect(url);

connect.then(
	(db) => {
		console.log("Connected to the server...");
	},
	(err) => {
		console.log(err);
	}
);

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// we can use either cookie or session
// app.use(cookieParser("12345-67890-09876-54321")); // secret key
app.use(
	session({
		name: "session-id", // name for the cookie itself (will appear in browser)
		secret: "12345-67890-09876-54321",
		saveUninitialized: false,
		resave: false,
		store: new FileStore(),
	})
);

function auth(req, res, next) {
	console.log("express session: ", req.session);

	// if the incoming request does not include user field in user session
	// --> the user has not been authorized yet
	if (!req.session.user) {
		// expect the user to authorize by including the authorization headers
		var authHeader = req.headers.authorization;

		if (!authHeader) {
			var err = new Error("You are not authenticated");
			err.status = 401; // unauthorized access
			res.setHeader("WWW-Authenticate", "Basic");
			return next(err);
		}

		// Basic YWRtaW46YXNtaW4=
		// 1 --> get the second part of the message and decode
		// username:password123
		// 2 --> split by ":", and get the credentials in the array auth
		var auth = new Buffer.from(authHeader.split(" ")[1], "base64")
			.toString()
			.split(":");
		var username = auth[0];
		var password = auth[1];

		// if credentials are correct
		if (username === "admin" && password === "admin") {
			// set up the user's session on request
			req.session.user = "admin";
			next(); // go to the next middleware
		}
		// if credentials are wrong
		else {
			var err = new Error("Wrong Credentials");
			err.status = 401; // unauthorized access
			res.setHeader("WWW-Authenticate", "Basic");
			return next(err);
		}
	}

	// else if the request already contains the session
	else {
		// if value of the session.user is correct
		if (req.session.user === "admin") {
			// allow the request to pass thru
			next();
		}

		// else if the session has invalid data
		else {
			var err = new Error("Wrong Credentials");
			err.status = 401; // unauthorized access
			return next(err);
		}
	}
}

app.use(auth); // my auth middleware

app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/dishes", dishRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
	next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get("env") === "development" ? err : {};

	// render the error page
	res.status(err.status || 500);
	res.render("error");
});

module.exports = app;
