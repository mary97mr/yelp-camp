require('dotenv').config();

var express = require("express");
var app     = express();

var methodOverride = require("method-override");
app.use(methodOverride("_method"));

var mongoose = require("mongoose");
var dbUrl = process.env.DB_URL || 'mongodb://localhost/yelp_camp';
var secret = process.env.SECRET || "thisshouldbeabettersecret";
mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true
})
.then(() => console.log("Connected to DB"))
.catch(err => console.log(err.message));

var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));

app.set("view engine", "ejs");
app.use(express.static("public"));
app.locals.moment = require("moment");

var passport      = require("passport");
var LocalStrategy = require("passport-local");
var flash         = require("connect-flash");

// Requiring Models
var Campground   = require("./models/campground");
var Comment      = require("./models/comment");
var User         = require("./models/user");
var Notification = require("./models/notification");

// Requiring All Routes
var campgroundRoutes = require("./routes/campgrounds");
var commentRoutes    = require("./routes/comments");
var reviewRoutes     = require("./routes/reviews");
var indexRoutes      = require("./routes/index");
var seedDB           = require("./seeds");

var session = require("express-session");
var MongoStore = require("connect-mongo")(session);

var store = new MongoStore({
    url: dbUrl,
    secret,
    touchAfter: 24 * 60 * 60
});
store.on("error", function (e) {
    console.log("SESSION STORE ERROR", e)
})
// SESSION CONFIG
var sessionConfig = {
    store,
    name: "session",
    secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}
app.use(session(sessionConfig));

// PASSPORT CONFIGURATION
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// seedDB(); //seed database

// Passing variables to all the templates
app.use(async function(req, res, next) {
    res.locals.currentUser = req.user;
    if(req.user){
        try {
            let user = await User.findById(req.user._id).populate("notifications", null, {isRead: false}).exec();
            res.locals.notifications = user.notifications.reverse();
        }
        catch(err) {
            req.flash("error", err.message);
            res.redirect("back");
        }
    }
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});

// Using All the templates of the routes
app.use("/campgrounds",campgroundRoutes);
app.use("/campgrounds/:id/comments", commentRoutes);
app.use("/campgrounds/:id/reviews", reviewRoutes);
app.use(indexRoutes);

var port = process.env.PORT || 3000;
// Listen Port Route
app.listen(port, function() {
    console.log(`YelpCamp server running on port ${port}`);
});