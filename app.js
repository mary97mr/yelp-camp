require('dotenv').config();

var express = require("express");
var app = express();

const methodOverride = require("method-override");
app.use(methodOverride("_method"));

const mongoose = require("mongoose");
mongoose.connect('mongodb://localhost/yelp_camp', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true
})
.then(() => console.log("Connected to DB"))
.catch(err => console.log(err.message));

var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended:true}));

app.set("view engine", "ejs");
app.use(express.static("public"));

const passport = require("passport");
const LocalStrategy = require("passport-local");
const flash = require("connect-flash");

// Requiring Models
const Campground = require("./models/campground");
const Comment = require("./models/comment");
const User = require("./models/user");

// Requiring All Routes
const campgroundRoutes = require("./routes/campgrounds");
const commentRoutes = require("./routes/comments");
const indexRoutes = require("./routes/index");
const seedDB = require("./seeds");

// PASSPORT CONFIGURATION

app.use(require("express-session")({
    secret: "My cat is cute",
    resave: false,
    saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// seedDB(); //seed database

// Passing variables to all the templates
app.use(function(req, res, next) {
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});
app.locals.moment = require("moment");

// Using All the templates of the routes
app.use("/campgrounds",campgroundRoutes);
app.use("/campgrounds/:id/comments", commentRoutes);
app.use(indexRoutes);

// Listen Port Route
app.listen(3000, function() {
    console.log("YelpCamp server running on port 3000");
});