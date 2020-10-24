var express = require("express");
var router = express.Router();
var middleware = require("../middleware");
var Campground = require("../models/campground");
var User = require("../models/user");
var Notification = require("../models/notification");
var Comment = require("../models/comment");
var Review = require("../models/review");

// Geocoder
var NodeGeocoder = require('node-geocoder');
var options = {
  provider: 'google',
  httpAdapter: 'https',
  apiKey: process.env.GEOCODER_API_KEY,
  formatter: null
};
var geocoder = NodeGeocoder(options);

// multer
var multer = require('multer');
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});

var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

// cloudinary
var cloudinary = require('cloudinary');
const review = require("../models/review");
cloudinary.config({ 
  cloud_name: 'mary97mr', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// INDEX- Show all campgrounds

router.get("/", function(req, res) {
    var noMatch = null;
    if(req.query.search) {
        var regex = new RegExp(escapeRegex(req.query.search), 'gi');
        Campground.find({name: regex}, function(err, allCampgrounds){
            if(err) {
                console.log(err);
            } else {
                if(allCampgrounds.length < 1) {
                    noMatch = "No campgrounds match that query, please try again"
                }
                res.render("campgrounds/index", {campgrounds:allCampgrounds, page: 'campgrounds', noMatch: noMatch});
            }
        });
    } else {
        Campground.find({}, function(err, allCampgrounds){
            if(err) {
                console.log(err);
            } else {
                res.render("campgrounds/index", {campgrounds:allCampgrounds, page: 'campgrounds', noMatch: noMatch});
            }
        });
    }
});

// NEW - Displays a form to create a new campground

router.get("/new", middleware.isLoggedIn, function(req, res) {
    res.render("campgrounds/new"); 
});

// CREATE - Adds new campground to the database

router.post("/", middleware.isLoggedIn, upload.single("img"), function(req, res) {
    geocoder.geocode(req.body.location, function (err, data) {
        if (err || data.status === 'ZERO_RESULTS') {
            req.flash('error', 'Invalid address, try typing a new address');
            return res.redirect('back');	
        }
        //Error handling provided by google docs -https://developers.google.com/places/web-service/autocomplete 
        if (err || data.status === 'REQUEST_DENIED') {
            req.flash('error', 'Something Is Wrong Your Request Was Denied');
        }
        // Error handling provided by google docs -https://developers.google.com/places/web-service/autocomplete 
        if (err || data.status === 'OVER_QUERY_LIMIT') {
                req.flash('error', 'All Requests Used Up');
                return res.redirect('back');
        }
        req.body.campground.lat = data[0].latitude;
        req.body.campground.lng = data[0].longitude;
        req.body.campground.location = data[0].formattedAddress;

        cloudinary.v2.uploader.upload(req.file.path, async function(err, result) {
            // add cloudinary url for the image to the campground object under image property
            req.body.campground.img = result.secure_url;
            req.body.campground.imgId = result.public_id;
            // add author to campground
            req.body.campground.author = {
                id : req.user._id,
                username: req.user.username
            }
            try {
                let campground = await Campground.create(req.body.campground);
                let user = await User.findById(req.user._id).populate("followers").exec();
                let newNotification = { 
                    username: req.user.username, 
                    campgroundId: campground.id
                }
                for(const follower of user.followers) {
                    let notification = await Notification.create(newNotification);
                    follower.notifications.push(notification);
                    follower.save();
                }
                res.redirect("/campgrounds/" + campground.id);
            }
            catch(err) {
                req.flash("error", err.message);
                res.redirect("back");
            }
        });  
    });
});

// SHOW - Displays more info of one campground

router.get("/:id", function(req, res) {
    // find the campground with provided ID
    Campground.findById(req.params.id).populate("comments").populate({
        path: "reviews",
        options: {sort: {createdAt: -1}}
    }).exec(function(err, foundCampground) {
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

router.put("/:id", middleware.checkCampgroundOwnership, upload.single('img'), function(req, res) {
    delete req.body.campground.rating;
    Campground.findById(req.params.id, async function(err, campground) {
        if(err) {
            req.flash("error", err.message);
            res.redirect("back");
        } else {
            if(req.file) {
                try {
                    await cloudinary.v2.uploader.destroy(campground.imgId);
                    var result = await cloudinary.v2.uploader.upload(req.file.path);
                    campground.img = result.secure_url;
                    campground.imgId = result.public_id;
                }
                catch(err) {
                    req.flash("error", err.message);
                    return res.redirect("back");
                }
            }
            if(req.body.location !== campground.location) {
                try {
                    var updatedLocation = await geocoder.geocode(req.body.location);
                    campground.lat = updatedLocation[0].latitude;
                    campground.lng = updatedLocation[0].longitude;
                    campground.location = updatedLocation[0].formattedAddress;
                }
                catch(err) {
                    req.flash("error", err.message);
                    return res.redirect("back");
                }
            }
            campground.name = req.body.campground.name;
            campground.price = req.body.campground.price;
            campground.description = req.body.campground.description;
            campground.save();
            req.flash("success", "Successfully updated");
            res.redirect("/campgrounds/" + campground._id);
        }   
    });
});

// DESTROY - Deletes that specific campground

router.delete("/:id", middleware.checkCampgroundOwnership, function(req, res) {
    Campground.findById(req.params.id, async function(err, campground){
        if(err) {
            req.flash("error", err.message);
            return res.redirect("back");
        }
        try {
            await cloudinary.v2.uploader.destroy(campground.imgId);
            // deletes all comments associated with the campground
            await Comment.remove({"_id": {$in: campground.comments}});
            // deletes all reviews associated with the campground
            await Review.remove({"_id": {$in: campground.review}});
            //  delete the campground
            campground.remove();
            req.flash("success", "Campground deleted successfully");
            res.redirect("/campgrounds");
        }
        catch(err) {
            req.flash("error", err.message);
            return res.redirect("back");
        }
    });
});

function escapeRegex(text) {
    return text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

module.exports = router;