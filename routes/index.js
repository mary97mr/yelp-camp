var express = require("express");
var router = express.Router();

const passport = require("passport");
const User = require("../models/user");

// Root Route
router.get("/", function(req, res) {
    res.render("landing");
});

// ================
// REGISTER ROUTES
// ================

// Shows register Form
router.get("/register", function(req, res) {
    res.render("register", {page: "register"});
});

// handdle sign up logic
router.post("/register", function(req, res) {
    var newUser = new User({username: req.body.username});
    if(req.body.adminCode === "secretcode123") {
        newUser.isAdmin = true;
    }
    User.register(newUser, req.body.password, function(err, userCreated) {
        if(err) {
            console.log(err);
            return res.render("register", {error: err.message});
        }
        passport.authenticate("local")(req, res, function() {
            req.flash("success", "Welcome to yelpCamp " + userCreated.username);
            res.redirect("/campgrounds");
        });
    });
});

// =============
// LOGIN ROUTES
// =============

// Shows Login Form
router.get("/login", function(req, res) {
    res.render("login", {page: "login"});
});

// handdle login logic
router.post("/login",passport.authenticate("local", {
    successRedirect: "/campgrounds",
    failureRedirect: "/login"
}), function(req, res) {
});

// ==============
// LOGOUT ROUTES
// ==============

router.get("/logout", function(req, res) {
    req.logout();
    req.flash("success", "You logged out")
    res.redirect("/campgrounds");
});

module.exports = router;