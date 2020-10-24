var Campground = require("../models/campground"); 
var Comment = require("../models/comment");
var Review = require("../models/review");
var middlewareObj = {};

middlewareObj.checkCampgroundOwnership = function (req, res, next) {
    // is user logged in?
    if(req.isAuthenticated()) {
        Campground.findById(req.params.id, function(err, foundCampground) {
            if(err || !foundCampground) {
                req.flash("error", "Campground not found");
                res.redirect("back");
            } else {
                // does the user own the campground? match ids
                if(foundCampground.author.id.equals(req.user._id) || req.user.isAdmin) {
                    next();
                } else  {
                    req.flash("error", "You dont have the permission to do that");
                    res.redirect("back");
                }
            }
        });
    } else {
        req.flash("error", "You need to  be logged in to do that")
        res.redirect("back");
    }
}

middlewareObj.checkCommentOwnership = function (req, res, next) {
    // is user logged in?
    if(req.isAuthenticated()) {
        Comment.findById(req.params.comment_id, function(err, foundComment) {
            if(err || !foundComment) {
                req.flash("error", "Comment not found");
                res.redirect("back");
            } else {
                // does the user own the comment? match ids
                if(foundComment.author.id.equals(req.user._id) || req.user.isAdmin) {
                    next();
                } else  {
                    req.flash("error", "You dont have the permission to do that");
                    res.redirect("back");
                }
            }
        });
    } else {
        req.flash("error", "You need to  be logged in to do that")
        res.redirect("back");
    }
}
middlewareObj.checkReviewOwnership = function(req, res, next) {
    if(req.isAuthenticated()) {
        Review.findById(req.params.review_id, function(err, foundReview) {
            if(err || !foundReview) {
                req.flash("error", "Review not found");
                res.redirect("back");
            } else {
                // does the user own the comment? match ids
                if(foundReview.author.id.equals(req.user._id) || req.user.isAdmin) {
                    next();
                } else {
                    req.flash("error", "You dont have the permission to do that");
                    res.redirect("back");
                }
            }
        });
    } else {
        req.flash("error", "You need to  be logged in to do that")
        res.redirect("back");
    }
};

middlewareObj.checkReviewExistence = function(req, res, next) {
    if(req.isAuthenticated()) {
        Campground.findById(req.params.id).populate("reviews").exec(function(err, foundCampground) {
            if(err || !foundCampground) {
                req.flash("error", "Campground not found");
                return res.redirect("back");
            } else {
                // check if req.user._id exists in foundCampground.reviews
                var foundUserReview = foundCampground.reviews.some(function(review) {
                    return review.author.id.equals(req.user._id);
                });
                if (foundUserReview) {
                    req.flash("error", "You already wrote a review on this post.");
                    return res.redirect("/campgrounds/" + foundCampground._id);
                }
                next();
            }
        });
    } else {
        req.flash("error", "You need to  be logged in to do that")
        res.redirect("back");
    }
};

middlewareObj.isLoggedIn = function (req, res, next) {
    if(req.isAuthenticated()) {
        return next();
    }
    req.flash("error", "You need to  be logged in");
    res.redirect("/login");
}

module.exports = middlewareObj;