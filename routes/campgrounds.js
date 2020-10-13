var express = require("express");
var router = express.Router();
const middleware = require("../middleware");
const Campground = require("../models/campground");
var NodeGeocoder = require('node-geocoder');

var options = {
  provider: 'google',
  httpAdapter: 'https',
  apiKey: process.env.GEOCODER_API_KEY,
  formatter: null
};
 
var geocoder = NodeGeocoder(options);


// INDEX- Show all campgrounds

router.get("/", function(req, res) {
    Campground.find({}, function(err, allCampgrounds){
        if(err) {
            console.log(err);
        } else {
            res.render("campgrounds/index", {campgrounds:allCampgrounds, page: 'campgrounds'});
        }
    });
});

// NEW - Displays a form to create a new campground

router.get("/new", middleware.isLoggedIn, function(req, res) {
    res.render("campgrounds/new"); 
});

// CREATE - Adds new campground to the database

router.post("/", middleware.isLoggedIn, function(req, res) {
    var name = req.body.name;
    var img = req.body.img;
    var price = req.body.price;
    var description = req.body.description;
    var author = {
        id : req.user._id,
        username: req.user.username
    }

    geocoder.geocode(req.body.location, function (err, data) {
        if (err || !data.length) {
            console.log(err)
            req.flash('error', 'Invalid address');
            return res.redirect("back");
        }
        var lat = data[0].latitude;
        var lng = data[0].longitude;
        var location = data[0].formattedAddress;

        var newCampground = {
            name: name,
            price: price,
            img: img,
            description: description,
            author: author,
            location: location,
            lat: lat,
            lng: lng
        }

        // Create a new campground and save it on DB
        Campground.create(newCampground, function(err, newlyCreated) {
            if(err){
                console.log(err);
            } else {
                res.redirect("/campgrounds");
            }
        });
    });
});

// SHOW - Displays more info of one campground

router.get("/:id", function(req, res) {
    // find the campground with provided ID
    Campground.findById(req.params.id).populate("comments").exec(function(err, foundCampground) {
        if(err || !foundCampground) {
            req.flash("error", "Campground not found");
            res.redirect("back");
        } else {
            res.render("campgrounds/show", {campground: foundCampground});
        }
    });
});

// EDIT - Displays a form to edit one campground

router.get("/:id/edit", middleware.checkCampgroundOwnership, function(req, res) {
    Campground.findById(req.params.id, function(err, foundCampground) {
        if(err) {
            res.redirect("/campgrounds");
        } else {
            res.render("campgrounds/edit", {campground: foundCampground});
        }
    });
});

// UPDATE - Updates that specific campground edit

router.put("/:id", middleware.checkCampgroundOwnership, function(req, res) {
    geocoder.geocode(req.body.location, function (err, data) {
        if (err || !data.length) {
            console.log(err)
            req.flash('error', 'Invalid address');
            return res.redirect("back");
        }
        req.body.campground.lat = data[0].latitude;
        req.body.campground.lng = data[0].longitude;
        req.body.campground.location = data[0].formattedAddress;
        
        Campground.findByIdAndUpdate(req.params.id, req.body.campground, function(err, updatedCampground) {
            if(err) {
                req.flash("error", err.message);
                res.redirect("/campgrounds");
            } else {
                req.flash("success", "Successfully updated");
                res.redirect("/campgrounds/" + req.params.id);
            }
        });
    });
});

// DESTROY - Deletes that specific campground

router.delete("/:id", middleware.checkCampgroundOwnership, function(req, res) {
    Campground.findByIdAndDelete(req.params.id, function(err){
        if(err) {
            res.redirect("/campgrounds");
            console.log(err);
        } else {
            res.redirect("/campgrounds");
        }
    });
});

module.exports = router;